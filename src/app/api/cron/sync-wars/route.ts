import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/auth/cron";

import { fetchCurrentWar } from "@/lib/clash-api";
import { APP_CONFIG } from "@/lib/config";
import { getKnownPlayersByTags, synchronizeCurrentRoster } from "@/lib/clan-sync";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { parseClashApiTimestamp } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function getMonthKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const [, war] = await Promise.all([
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

    const startedAt = parseClashApiTimestamp(war.startTime);
    if (!startedAt) throw new Error("A API não informou um início de guerra válido.");
    const endedAt = war.endTime ? parseClashApiTimestamp(war.endTime) : null;
    const warKey = `${APP_CONFIG.clanTag}:${war.startTime}`;
    const warEnd = endedAt?.getTime();
    const playersByTag = await getKnownPlayersByTags(war.clan.members.map((member) => member.tag));
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

      add(`${warKey}:${member.tag}:participation`, "Participou da guerra (+5)", 5);

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

      if (attacks.length >= 2) {
        add(`${warKey}:${member.tag}:two-attacks`, "Fez os dois ataques (+10)", 10);
      }

      attacks.forEach((attack, index) => {
        const attackNumber = index + 1;
        const order = attack.order || attackNumber;
        const battleTime = attack.battleTime ? parseClashApiTimestamp(attack.battleTime) : null;
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
    if (war.state === "warEnded" && !endedAt) {
      throw new Error("A API não informou o encerramento da guerra.");
    }

    const { data: atomicResult, error: atomicError } = await supabase.rpc(
      "sync_inglorious_wars_atomic",
      {
        p_sources: statSources,
        p_events: events,
        p_war_key: warKey,
        p_started_at: startedAt.toISOString(),
        p_ended_at: endedAt?.toISOString() ?? null,
        p_record_completion: war.state === "warEnded",
      },
    );
    if (atomicError) {
      throw new Error(`Falha na sincronização transacional das guerras: ${atomicError.message}`);
    }

    const result = Array.isArray(atomicResult) ? atomicResult[0] : atomicResult;
    const performanceSync = result?.performance_sync ?? null;
    const completionSync = result?.completion_sync ?? null;
    const scoreSync = result?.score_sync ?? { inserted: 0 };


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
