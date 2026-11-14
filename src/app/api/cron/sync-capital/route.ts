import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/auth/cron";

import { fetchPlayerCapitalProfile } from "@/lib/clash-api";
import { mapWithConcurrency } from "@/lib/concurrency";
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
    const profiles = await mapWithConcurrency(
      members,
      (member) => fetchPlayerCapitalProfile(member.player_tag),
      5,
    );

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.rpc("sync_inglorious_capital_atomic", {
      p_snapshot: profiles.map(({ tag, name, clanCapitalContributions }) => ({
        tag,
        name,
        clancapitalcontributions: clanCapitalContributions,
      })),
    });

    if (error) {
      throw new Error(`Falha ao sincronizar snapshot de Capital: ${error.message}`);
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result || typeof result !== "object" || result.success !== true) {
      throw new Error("Retorno inesperado na sincronização de Capital.");
    }

    return NextResponse.json({
      success: true,
      clan: "Inglorious",
      profiles_received: result.profiles_received,
      baselines: result.baselines,
      synchronized: result.synchronized,
      points_added: result.points_added,
      results: result.results,
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
