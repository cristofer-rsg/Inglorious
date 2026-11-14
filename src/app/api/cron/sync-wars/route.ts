import { NextResponse } from "next/server";

import { fetchCurrentWar } from "@/lib/clash-api";
import { APP_CONFIG } from "@/lib/config";
import { synchronizeCurrentRoster } from "@/lib/clan-sync";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret)
    && request.headers.get("authorization") === `Bearer ${secret}`;
}

function parseClashTime(value?: string) {
  if (!value) return null;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return new Date(Date.UTC(
    Number(year), Number(month) - 1, Number(day),
    Number(hour), Number(minute), Number(second),
  ));
}

function getMonthKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const [{ members: roster }, war] = await Promise.all([
      synchronizeCurrentRoster(),
      fetchCurrentWar(),
    ]);

    if (war.state === "notInWar") {
      return NextResponse.json({
        success: true,
        state: "notInWar",
        message: "O clã não está em guerra. Nenhum lançamento realizado.",
      });
    }

    if (war.state !== "inWar" && war.state !== "warEnded") {
      return NextResponse.json({
        success: true,
        state: war.state,
        message: "A guerra ainda está em preparação. Pontuação não processada.",
      });
    }

    const startedAt = parseClashTime(war.startTime);
    if (!startedAt) throw new Error("A API não informou um início de guerra válido.");
    const endedAt = parseClashTime(war.endTime);
    const warKey = `${APP_CONFIG.clanTag}:${war.startTime}`;
    const warEnd = endedAt?.getTime();
    const playersByTag = new Map<string, (typeof roster)[number]>(roster.map((player): [string, (typeof roster)[number]] => [player.player_tag, player]));
    const enemyPositions = new Map<string, number>(war.opponent.members.map((member): [string, number] => [member.tag, member.mapPosition]));
    const events: Array<{
      source_key: string;
      war_key: string;
      player_tag: string;
      player: string;
      category: string;
      activity: string;
      points: number;
      battle_time: string | null;
    }> = [];
    const statSources = [];
    const missingPlayers = [];

    for (const member of war.clan.members) {
      const player = playersByTag.get(member.tag);
      if (!player) {
        missingPlayers.push(member.tag);
        continue;
      }

      const attacks = [...member.attacks].sort((a, b) => a.order - b.order);
      statSources.push({
        month_key: getMonthKey(startedAt),
        source_key: `war:${warKey}:${member.tag}`,
        player_tag: member.tag,
        player: player.name,
        war_attacks: attacks.length,
        league_attacks: 0,
        raid_attacks: 0,
      });

      const add = (
        sourceKey: string,
        activity: string,
        points: number,
        battleTime?: Date | null,
      ) => {
        events.push({
          source_key: sourceKey,
          war_key: warKey,
          player_tag: member.tag,
          player: player.name,
          category: "Guerras",
          activity,
          points,
          battle_time: battleTime?.toISOString() ?? null,
        });
      };

      if (attacks.length === 0) {
        if (war.state === "warEnded") {
          add(`${warKey}:${member.tag}:penalty:no-attacks`,
            "Penalidade: não realizou nenhum ataque (−10)", -10);
        }
        continue;
      }

      if (war.state === "warEnded" && attacks.length === 1) {
        add(`${warKey}:${member.tag}:penalty:one-attack`,
          "Penalidade: realizou apenas um ataque (−5)", -5);
      }

      add(`${warKey}:${member.tag}:participation`, "Participou da guerra (+5)", 5);
      if (attacks.length >= 2) {
        add(`${warKey}:${member.tag}:two-attacks`, "Fez os dois ataques (+10)", 10);
      }

      attacks.forEach((attack, index) => {
        const attackNumber = index + 1;
        const order = attack.order || attackNumber;
        const battleTime = parseClashTime(attack.battleTime);
        const defenderPosition = attack.defenderTag
          ? enemyPositions.get(attack.defenderTag)
          : undefined;
        const beforeFinalWindow = Boolean(
          battleTime && warEnd && battleTime.getTime() < warEnd - 12 * 60 * 60 * 1000,
        );

        if (battleTime) {
          const timeLabel = new Intl.DateTimeFormat("pt-BR", {
            timeZone: APP_CONFIG.timeZone,
            dateStyle: "short",
            timeStyle: "medium",
          }).format(battleTime);
          add(`${warKey}:${member.tag}:attack:${order}:battle-time`,
            `Ataque realizado — horário oficial: ${timeLabel} (Brasília)`, 0, battleTime);
        }

        if (defenderPosition === member.mapPosition) {
          add(`${warKey}:${member.tag}:mirror:${order}`, "Acertou o espelho (+5)", 5);
        } else if (attack.defenderTag && defenderPosition !== undefined
          && beforeFinalWindow && attackNumber === 1) {
          add(`${warKey}:${member.tag}:penalty:off-mirror:${order}`,
            "Penalidade: primeiro ataque fora do espelho antes das 12 horas finais (−5)", -5);
        }

        if (attackNumber >= 2 && beforeFinalWindow) {
          add(`${warKey}:${member.tag}:penalty:early-second:${order}`,
            "Penalidade: segundo ataque antes das 12 horas finais (−5)", -5);
        }

        if (attack.stars > 0) {
          const stars = Math.min(attack.stars, 3);
          add(`${warKey}:${member.tag}:attack:${order}:stars`,
            `Fez ${stars} estrela(s) (+${stars})`, stars, battleTime);
        }
      });
    }

    const supabase = createSupabaseAdmin();
    let performanceSync: unknown = null;
    if (statSources.length > 0) {
      const { data, error } = await supabase.rpc("sync_player_monthly_stat_sources", {
        p_sources: statSources,
      });
      if (error) throw new Error(`Falha ao atualizar desempenho das guerras: ${error.message}`);
      performanceSync = Array.isArray(data) ? data[0] : data;
    }

    let completionSync: unknown = null;
    if (war.state === "warEnded") {
      if (!endedAt) throw new Error("A API não informou o encerramento da guerra.");
      const { data, error } = await supabase.rpc("record_clan_war_completion", {
        p_war_key: warKey,
        p_started_at: startedAt.toISOString(),
        p_ended_at: endedAt.toISOString(),
      });
      if (error) throw new Error(`Falha ao registrar encerramento da guerra: ${error.message}`);
      completionSync = Array.isArray(data) ? data[0] : data;
    }

    let scoreSync: unknown = { inserted: 0, skipped: 0 };
    if (events.length > 0) {
      const { data, error } = await supabase.rpc("record_clash_war_events", {
        p_events: events,
      });
      if (error) throw new Error(`Falha ao registrar pontuação da guerra: ${error.message}`);
      scoreSync = Array.isArray(data) ? data[0] : data;
    }

    return NextResponse.json({
      success: true,
      war_key: warKey,
      state: war.state,
      players_in_war: war.clan.members.length,
      attacks_received: war.clan.members.reduce((total, member) => total + member.attacks.length, 0),
      players_without_roster_match: missingPlayers,
      events_evaluated: events.length,
      performance_sync: performanceSync,
      completion_sync: completionSync,
      score_sync: scoreSync,
      synchronized_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inglorious war sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Falha inesperada na sincronização das guerras.",
      },
      { status: 500 },
    );
  }
}
