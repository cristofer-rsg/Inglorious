import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/auth/cron";

import { fetchPlayerCapitalProfile } from "@/lib/clash-api";
import { synchronizeCurrentRoster } from "@/lib/clan-sync";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { members } = await synchronizeCurrentRoster();
    const profiles = [];

    for (const member of members) {
      profiles.push(await fetchPlayerCapitalProfile(member.player_tag));
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const supabase = createSupabaseAdmin();
    const results = [];

    for (const profile of profiles) {
      const { data, error } = await supabase.rpc("sync_capital_gold_contribution", {
        p_player_tag: profile.tag,
        p_player: profile.name,
        p_total: profile.clanCapitalContributions,
      });

      if (error) {
        throw new Error(`Falha ao sincronizar Capital de ${profile.name}: ${error.message}`);
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result || typeof result !== "object"
        || !["baseline", "synced"].includes(result.status)) {
        throw new Error(`Retorno inesperado ao sincronizar Capital de ${profile.name}.`);
      }

      results.push({
        player: profile.name,
        tag: profile.tag,
        status: result.status,
        points: Number(result.points ?? 0),
      });
    }

    return NextResponse.json({
      success: true,
      clan: "Inglorious",
      profiles_received: profiles.length,
      baselines: results.filter((item) => item.status === "baseline").length,
      synchronized: results.filter((item) => item.status === "synced").length,
      points_added: results.reduce((total, item) => total + item.points, 0),
      results,
      synchronized_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inglorious capital sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Falha inesperada na sincronização de Capital.",
      },
      { status: 500 },
    );
  }
}
