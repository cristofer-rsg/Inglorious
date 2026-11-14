import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/auth/cron";

import { fetchLatestRaidSeason } from "@/lib/clash-api";
import { getKnownPlayersByTags, synchronizeCurrentRoster } from "@/lib/clan-sync";
import { APP_CONFIG } from "@/lib/config";
import { getRaidWeekend } from "@/lib/raid-calendar";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;


export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const [season] = await Promise.all([
      fetchLatestRaidSeason(),
      synchronizeCurrentRoster(),
    ]);
    const rosterByTag = await getKnownPlayersByTags(
      season.members.map((member) => member.tag),
    );
    const raidWeekend = getRaidWeekend(season.startTime, APP_CONFIG.timeZone);
    const { weekendStart, closingDate, monthKey } = raidWeekend;
    const [raidYear, raidMonth, raidDay] = weekendStart.split("-");
    const weekendLabel = `${raidDay}/${raidMonth}/${raidYear}`;
    const statsAnchor = weekendStart;

    const statsSources = [];
    const awards = [];

    for (const member of season.members) {
      const player = rosterByTag.get(member.tag);
      if (!player) continue;

      statsSources.push({
        month_key: monthKey,
        source_key: `raid:${statsAnchor}:${member.tag}`,
        player_tag: member.tag,
        player: player.name,
        war_attacks: 0,
        league_attacks: 0,
        raid_attacks: member.attacks,
      });

      if (member.attacks >= 5) {
        awards.push({
          player: player.name,
          player_tag: member.tag,
          weekend_key: weekendStart,
          month_key: monthKey,
          attacks: member.attacks,
          weekend_label: weekendLabel,
        });
      }
    }

    if (statsSources.length === 0) {
      throw new Error("Nenhum membro da temporada corresponde ao roster atual do clã.");
    }

    const supabase = createSupabaseAdmin();
    const { data: atomicResult, error: atomicError } = await supabase.rpc(
      "sync_inglorious_raid_atomic",
      {
        p_sources: statsSources,
        p_awards: awards,
      },
    );

    if (atomicError) {
      throw new Error(`Falha na sincronização transacional do Raide: ${atomicError.message}`);
    }

    const result = Array.isArray(atomicResult) ? atomicResult[0] : atomicResult;
    const performanceSync = result?.performance_sync ?? null;
    const awardsData = result?.awards_sync ?? { success: true, results: [] };

    return NextResponse.json({
      success: true,
      season_state: season.state,
      weekend_start: weekendStart,
      closing_date: closingDate,
      month: monthKey,
      members_in_season: season.members.length,
      members_matched: statsSources.length,
      eligible_for_points: awards.length,
      performance_sync: performanceSync,
      awards: awardsData,
      synchronized_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inglorious Raid sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Falha inesperada na sincronização do Raide.",
      },
      { status: 500 },
    );
  }
}
