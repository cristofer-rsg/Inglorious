import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/auth/cron";
import { APP_CONFIG } from "@/lib/config";
import { getDashboardData } from "@/lib/dashboard";
import { getZonedMonthBounds } from "@/lib/time";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getPreviousMonthKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const previous = new Date(Date.UTC(year, month - 2, 15));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const monthKey = getPreviousMonthKey();
    const supabase = createSupabaseAdmin();
    const existing = await supabase
      .from("monthly_rankings")
      .select("id", { count: "exact", head: true })
      .eq("month_key", monthKey)
      .is("archived_at", null);

    if (existing.error) throw new Error(existing.error.message);
    if ((existing.count ?? 0) > 0) {
      return NextResponse.json({
        success: true,
        month: monthKey,
        archived_players: existing.count,
        already_archived: true,
      });
    }

    const bounds = getZonedMonthBounds(monthKey, APP_CONFIG.timeZone);
    const [eventCount, statsCount] = await Promise.all([
      supabase.from("events").select("id", { count: "exact", head: true })
        .gte("created_at", bounds.start).lt("created_at", bounds.end),
      supabase.from("player_monthly_stats").select("player_tag", { count: "exact", head: true })
        .eq("month_key", monthKey),
    ]);

    if (eventCount.error || statsCount.error) {
      throw new Error("Não foi possível verificar os dados disponíveis para arquivamento.");
    }

    if ((eventCount.count ?? 0) === 0 && (statsCount.count ?? 0) === 0) {
      return NextResponse.json({
        success: true,
        month: monthKey,
        archived_players: 0,
        message: "O mês não possui dados de atividade; nenhum ranking vazio foi arquivado.",
      });
    }

    const snapshot = await getDashboardData(monthKey);
    if (!snapshot.connected) {
      throw new Error(snapshot.error ?? "Não foi possível calcular o ranking do mês anterior.");
    }

    const rows = snapshot.ranking.map((player) => ({
      month_key: monthKey,
      player: player.player,
      player_tag: player.tag || null,
      position: player.position,
      eligible: "Elegível",
      wars: player.wars,
      league: player.league,
      donations: player.donations,
      games: player.games,
      raid: player.raid,
      capital: player.capitalCoins,
      penalties: player.penalties,
      total: player.total,
    }));

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        month: monthKey,
        archived_players: 0,
        message: "Não há jogadores elegíveis para arquivar neste mês.",
      });
    }

    const { error } = await supabase.from("monthly_rankings").insert(rows);
    if (error) {
      const retryCheck = await supabase
        .from("monthly_rankings")
        .select("id", { count: "exact", head: true })
        .eq("month_key", monthKey)
        .is("archived_at", null);
      if (!retryCheck.error && (retryCheck.count ?? 0) > 0) {
        return NextResponse.json({
          success: true,
          month: monthKey,
          archived_players: retryCheck.count,
          already_archived: true,
        });
      }
      throw new Error(`Falha ao gravar o histórico mensal: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      month: monthKey,
      archived_players: rows.length,
      already_archived: false,
    });
  } catch (error) {
    console.error("Inglorious monthly archive failed:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Falha ao arquivar o ranking mensal.",
    }, { status: 500 });
  }
}
