import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/auth/cron";

import { fetchPlayerDonationProfile } from "@/lib/clash-api";
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
      const profile = await fetchPlayerDonationProfile(member.player_tag);
      snapshot.push({
        player_tag: profile.tag,
        player: profile.name,
        donations: profile.donations,
      });
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const monthKey = getMonthKey();
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase.rpc("sync_inglorious_donations_atomic", {
      p_month_key: monthKey,
      p_snapshot: snapshot,
    });

    if (error) {
      throw new Error(`Falha ao sincronizar doações e desempenho mensal: ${error.message}`);
    }

    const result = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: true,
      month: monthKey,
      members_received: snapshot.length,
      donation_sync: result?.donation_sync ?? null,
      performance_sync: result?.performance_sync ?? null,
      synchronized_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inglorious donation sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Falha inesperada na sincronização de doações.",
      },
      { status: 500 },
    );
  }
}
