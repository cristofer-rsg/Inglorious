import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/auth/cron";

import { fetchCurrentLeagueGroup, fetchLeagueWar } from "@/lib/clash-api";
import { APP_CONFIG } from "@/lib/config";
import { synchronizeCurrentRoster } from "@/lib/clan-sync";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseClashTime(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!match) throw new Error(`Horário inválido retornado pela API: ${value}`);
  const [, year, month, day, hour, minute, second] = match;
  return new Date(Date.UTC(
    Number(year), Number(month) - 1, Number(day),
    Number(hour), Number(minute), Number(second),
  ));
}

function getMonthKey(date = new Date()) {
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
    const { members: roster } = await synchronizeCurrentRoster();
    const playersByTag = new Map<string, (typeof roster)[number]>(roster.map((player): [string, (typeof roster)[number]] => [player.player_tag, player]));
    const supabase = createSupabaseAdmin();
    const group = await fetchCurrentLeagueGroup();
    const seasonMonth = group?.season && /^\d{6}$/.test(group.season)
      ? `${group.season.slice(0, 4)}-${group.season.slice(4, 6)}`
      : getMonthKey();
    const monthKey = seasonMonth;

    const { data: monthlyRows, error: monthlyError } = await supabase
      .from("player_monthly_stats")
      .select("player_tag,player,league_attacks")
      .eq("month_key", monthKey)
      .gte("league_attacks", 7);

    if (monthlyError) {
      throw new Error(`Falha ao consultar conclusão da Liga: ${monthlyError.message}`);
    }

    const bonusEvents = (monthlyRows ?? []).flatMap((row) => {
      const tag = String(row.player_tag ?? "").toUpperCase();
      const player = playersByTag.get(tag);
      if (!player) return [];
      return [{
        source_key: `league-completion:${monthKey.replace("-", "")}:${tag}`,
        war_key: `league:${monthKey.replace("-", "")}`,
        player_tag: tag,
        player: player.name,
        activity: "Completou os 7 ataques da Liga dos Clãs (+10 bônus)",
        points: 10,
      }];
    });

    const syncLeagueBonus = async (): Promise<unknown> => {
      if (bonusEvents.length === 0) return { inserted: 0, skipped: 0 };
      const { data, error } = await supabase.rpc("record_clash_league_events", {
        p_events: bonusEvents,
      });
      if (error) throw new Error(`Falha ao lançar bônus de conclusão da Liga: ${error.message}`);
      return Array.isArray(data) ? data[0] : data;
    };

    if (!group || group.state === "notInWar") {
      const bonusSync = await syncLeagueBonus();
      return NextResponse.json({
        success: true,
        month: monthKey,
        league_state: group?.state ?? "no_active_group",
        bonus_sync: bonusSync,
        message: "Não há grupo ativo da Liga. Os dados históricos foram preservados.",
      });
    }

    const warTags = [...new Set(group.rounds.flatMap((round) => round.warTags))]
      .filter((tag) => tag && tag !== "#0");
    if (warTags.length === 0) {
      const bonusSync = await syncLeagueBonus();
      return NextResponse.json({
        success: true,
        month: monthKey,
        league_state: group.state,
        bonus_sync: bonusSync,
        message: "O grupo da Liga ainda não disponibilizou guerras.",
      });
    }

    const allEvents: Array<{
      source_key: string;
      war_key: string;
      player_tag: string;
      player: string;
      activity: string;
      points: number;
    }> = [];
    const allStatSources = [];
    const failedWars = [];

    for (const warTag of warTags) {
      try {
        const war = await fetchLeagueWar(warTag);
        if (war.state !== "inWar" && war.state !== "warEnded") continue;
        const startedAt = parseClashTime(war.startTime);
        const warTime = war.startTime;
        const warKey = `league:${warTag.toUpperCase()}`;
        const enemyPositions = new Map(
          war.opponent.members.map((member) => [member.tag, member.mapPosition]),
        );

        for (const member of war.clan.members) {
          const player = playersByTag.get(member.tag);
          if (!player) continue;
          const attacks = [...member.attacks].sort((a, b) => a.order - b.order);

          allStatSources.push({
            month_key: getMonthKey(startedAt),
            source_key: `league:${warTag.toUpperCase()}:${member.tag}`,
            player_tag: member.tag,
            player: player.name,
            war_attacks: 0,
            league_attacks: attacks.length,
            raid_attacks: 0,
          });

          const add = (suffix: string, activity: string, points: number) => {
            allEvents.push({
              source_key: `${warTag.toUpperCase()}:${member.tag}:${suffix}`,
              war_key: warKey,
              player_tag: member.tag,
              player: player.name,
              activity,
              points,
            });
          };

          if (war.state === "warEnded" && attacks.length === 0) {
            add("penalty:missed-daily-attack",
              "Penalidade: não realizou o ataque do dia na Liga (−5)", -5);
          }

          attacks.forEach((attack, index) => {
            const order = attack.order || index + 1;
            const stars = Math.max(0, Math.min(3, attack.stars));
            add(`attack:${order}:completed`, `Realizou ataque ${order} (+5)`, 5);

            if (stars > 0) {
              add(`attack:${order}:stars`,
                `Conquistou ${stars} estrela(s) no ataque ${order} (+${stars})`, stars);
            }

            const defenderPosition = attack.defenderTag
              ? enemyPositions.get(attack.defenderTag)
              : undefined;
            if (defenderPosition === member.mapPosition) {
              add(`mirror:${order}`, `Acertou o espelho no ataque ${order} (+5)`, 5);
            } else if (attack.defenderTag && defenderPosition !== undefined) {
              add(`penalty:off-mirror:${order}`,
                "Penalidade: atacou fora do espelho na Liga (−5)", -5);
            }
          });
        }
      } catch (error) {
        failedWars.push(`${warTag}: ${error instanceof Error ? error.message : "erro desconhecido"}`);
      }
    }

    if (failedWars.length > 0) {
      throw new Error(
        `Sincronização incompleta da Liga; nenhuma estatística ou pontuação da rodada foi gravada. ${failedWars.join(" | ")}`,
      );
    }

    const { data: atomicResult, error: atomicError } = await supabase.rpc(
      "sync_inglorious_league_atomic",
      {
        p_sources: allStatSources,
        p_events: allEvents,
        p_bonus_events: bonusEvents,
      },
    );
    if (atomicError) {
      throw new Error(`Falha na sincronização transacional da Liga: ${atomicError.message}`);
    }

    const result = Array.isArray(atomicResult) ? atomicResult[0] : atomicResult;
    const performanceSync = result?.performance_sync ?? null;
    const scoreSync = result?.score_sync ?? { inserted: 0, skipped: 0 };
    const bonusSync = result?.bonus_sync ?? { inserted: 0, skipped: 0 };

    return NextResponse.json({
      success: true,
      month: monthKey,
      season: group.season ?? null,
      wars_checked: warTags.length,
      events_evaluated: allEvents.length,
      stat_sources: allStatSources.length,
      bonus_sync: bonusSync,
      performance_sync: performanceSync,
      score_sync: scoreSync,
      synchronized_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inglorious League sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Falha inesperada na sincronização da Liga.",
      },
      { status: 500 },
    );
  }
}
