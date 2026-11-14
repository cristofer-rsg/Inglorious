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

    const { data: donationData, error: donationError } = await supabase.rpc(
      "sync_clash_donations",
      { p_month_key: monthKey, p_snapshot: snapshot },
    );

    if (donationError) {
      throw new Error(`Falha ao atualizar totais de doações: ${donationError.message}`);
    }

    const { data: statsData, error: statsError } = await supabase.rpc(
      "sync_player_monthly_donations",
      { p_month_key: monthKey, p_snapshot: snapshot },
    );

    if (statsError) {
      throw new Error(`Falha ao atualizar desempenho mensal de doações: ${statsError.message}`);
    }

    const donationResult = Array.isArray(donationData) ? donationData[0] : donationData;
    const statsResult = Array.isArray(statsData) ? statsData[0] : statsData;

    return NextResponse.json({
      success: true,
      month: monthKey,
      members_received: snapshot.length,
      donation_sync: donationResult,
      performance_sync: statsResult,
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
