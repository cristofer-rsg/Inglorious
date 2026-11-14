import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/auth/cron";

import { fetchLatestRaidSeason } from "@/lib/clash-api";
import { synchronizeCurrentRoster } from "@/lib/clan-sync";
import { APP_CONFIG } from "@/lib/config";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;



function localDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Data inicial do Raide inválida.");

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function getMonth(date: string) {
  return date.slice(0, 7);
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const [season, rosterResult] = await Promise.all([
      fetchLatestRaidSeason(),
      synchronizeCurrentRoster(),
    ]);
    const roster = rosterResult.members;

    const rosterByTag = new Map<string, (typeof roster)[number]>(roster.map((member): [string, (typeof roster)[number]] => [member.player_tag, member]));
    const seasonDate = localDate(season.startTime);
    const weekday = new Date(`${seasonDate}T12:00:00Z`).getUTCDay();
    const daysSinceFriday = (weekday + 2) % 7;
    const weekendStart = shiftDate(seasonDate, -daysSinceFriday);
    const closingDate = shiftDate(weekendStart, 3);
    const monthKey = getMonth(closingDate);
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
          weekend_label: new Date(`${seasonDate}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" }),
        });
      }
    }

    if (statsSources.length === 0) {
      throw new Error("Nenhum membro da temporada corresponde ao roster atual do clã.");
    }

    const supabase = createSupabaseAdmin();
    const { data: statsData, error: statsError } = await supabase.rpc(
      "sync_player_monthly_stat_sources",
      { p_sources: statsSources },
    );

    if (statsError) {
      throw new Error(`Falha ao sincronizar ataques do Raide: ${statsError.message}`);
    }

    let awardsData: unknown = { success: true, results: [] };
    if (awards.length > 0) {
      const { data, error } = await supabase.rpc("apply_automatic_raid_points", {
        p_awards: awards,
      });

      if (error) {
        throw new Error(`Falha ao lançar pontos automáticos do Raide: ${error.message}`);
      }
      awardsData = Array.isArray(data) ? data[0] : data;
    }

    return NextResponse.json({
      success: true,
      season_state: season.state,
      weekend_start: weekendStart,
      closing_date: closingDate,
      month: monthKey,
      members_in_season: season.members.length,
      members_matched: statsSources.length,
      eligible_for_points: awards.length,
      performance_sync: Array.isArray(statsData) ? statsData[0] : statsData,
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
