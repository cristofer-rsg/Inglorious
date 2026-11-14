import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/auth/cron";

import { fetchPlayerGamesProfile } from "@/lib/clash-api";
import { synchronizeCurrentRoster } from "@/lib/clan-sync";
import { APP_CONFIG } from "@/lib/config";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getMonthKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { members } = await synchronizeCurrentRoster();
    const snapshot = [];

    for (const member of members) {
      const profile = await fetchPlayerGamesProfile(member.player_tag);
      snapshot.push({
        player_tag: profile.tag,
        player: profile.name,
        achievement_value: profile.achievementValue,
      });
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const monthKey = getMonthKey();
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase.rpc("auto_sync_clash_games", {
      p_month_key: monthKey,
      p_snapshot: snapshot,
    });

    if (error) {
      throw new Error(`Falha ao sincronizar Jogos do Clã: ${error.message}`);
    }

    const { data: performanceData, error: performanceError } = await supabase.rpc(
      "sync_player_monthly_clan_games",
      { p_month_key: monthKey },
    );

    if (performanceError) {
      throw new Error(`Falha ao atualizar desempenho dos Jogos do Clã: ${performanceError.message}`);
    }

    const result = Array.isArray(data) ? data[0] : data;
    const performance = Array.isArray(performanceData) ? performanceData[0] : performanceData;

    return NextResponse.json({
      success: true,
      month: monthKey,
      players_received: snapshot.length,
      games_sync: result,
      performance_sync: performance,
      synchronized_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inglorious Clan Games sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Falha inesperada na sincronização dos Jogos do Clã.",
      },
      { status: 500 },
    );
  }
}
