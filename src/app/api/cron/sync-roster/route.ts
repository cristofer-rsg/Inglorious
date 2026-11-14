import { NextResponse } from "next/server";

import { fetchCurrentClanMembers } from "@/lib/clash-api";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const members = await fetchCurrentClanMembers();
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.rpc("sync_inglorious_clan_roster", {
      p_members: members,
    });

    if (error) {
      throw new Error(`Falha ao sincronizar o roster: ${error.message}`);
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result || typeof result !== "object" || result.success !== true) {
      throw new Error("A sincronização do roster retornou um resultado inesperado.");
    }

    return NextResponse.json({
      success: true,
      clan: "Inglorious",
      members_received: members.length,
      synchronization: result,
      synchronized_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inglorious roster sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Falha inesperada na sincronização.",
      },
      { status: 500 },
    );
  }
}
