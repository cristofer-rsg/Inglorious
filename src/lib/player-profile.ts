import "server-only";

import { APP_CONFIG } from "@/lib/config";
import { calculatePlayerScore, isRankingEligible, type ScoringEvent } from "@/lib/scoring";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getZonedMonthBounds } from "@/lib/time";

type PlayerRecord = {
  name: string;
  player_tag: string;
  active: boolean | null;
  eligible: string | null;
  role: string | null;
};

type MonthlyStat = {
  player_tag: string | null;
  player: string | null;
  donations: number | null;
  clan_games_points: number | null;
};

type ProfileEvent = ScoringEvent & {
  id: number;
  created_at: string;
  battle_time: string | null;
};

export type PlayerProfile = {
  name: string;
  tag: string;
  active: boolean;
  eligible: boolean;
  role: string | null;
  monthKey: string;
  monthLabel: string;
  total: number;
  wars: number;
  league: number;
  donations: number;
  games: number;
  raid: number;
  capitalCoins: number;
  capitalPoints: number;
  penalties: number;
  penaltyEvents: ProfileEvent[];
  recentEvents: ProfileEvent[];
};

function getCurrentMonthKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value ?? "2026"}-${parts.find((part) => part.type === "month")?.value ?? "01"}`;
}

function getMonthLabel(monthKey: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: APP_CONFIG.timeZone,
  }).format(new Date(`${monthKey}-15T12:00:00Z`));
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

export async function getPlayerProfile(tag: string): Promise<PlayerProfile | null> {
  const normalizedTag = tag.trim().toUpperCase();
  if (!/^#[0289PYLQGRJCUV]{3,15}$/.test(normalizedTag)) return null;

  const db = createSupabaseAdmin();
  const { data: playerData, error: playerError } = await db.from("players")
    .select("name,player_tag,active,eligible,role")
    .eq("player_tag", normalizedTag)
    .maybeSingle();

  if (playerError) throw new Error("Não foi possível consultar o jogador.");
  if (!playerData) return null;

  const player = playerData as PlayerRecord;
  if (player.active === false) return null;

  const monthKey = getCurrentMonthKey();
  const bounds = getZonedMonthBounds(monthKey, APP_CONFIG.timeZone);
  const [recentResult, monthlyStatsResult, monthEvents] = await Promise.all([
    db.from("events")
      .select("id,player,player_tag,category,activity,points,created_at,battle_time")
      .eq("player_tag", normalizedTag)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(30),
    db.from("player_monthly_stats")
      .select("player_tag,player,donations,clan_games_points")
      .eq("month_key", monthKey)
      .eq("player_tag", normalizedTag)
      .maybeSingle(),
    (async () => {
      const rows: ProfileEvent[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await db.from("events")
          .select("id,player,player_tag,category,activity,points,created_at,battle_time")
          .eq("player_tag", normalizedTag)
          .gte("created_at", bounds.start)
          .lt("created_at", bounds.end)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + 999);
        if (error) throw error;
        const batch = (data ?? []) as ProfileEvent[];
        rows.push(...batch);
        if (batch.length < 1000) break;
      }
      return rows;
    })(),
  ]);

  if (recentResult.error || monthlyStatsResult.error) {
    throw new Error("Não foi possível carregar o histórico de pontuação.");
  }

  const recentEvents = (recentResult.data ?? []) as ProfileEvent[];
  const monthlyStat = monthlyStatsResult.data as MonthlyStat | null;
  const penaltyEvents = monthEvents.filter((event) => Number(event.points ?? 0) < 0);
  const eligible = isRankingEligible(player);
  const scoring = calculatePlayerScore({
    playerName: player.name,
    playerTag: normalizedTag,
    events: monthEvents,
    donationsTotal: monthlyStat?.donations ?? undefined,
    clanGamesPoints: monthlyStat?.clan_games_points ?? 0,
  });

  return {
    name: player.name,
    tag: normalizedTag,
    active: Boolean(player.active ?? true),
    eligible,
    role: player.role,
    monthKey,
    monthLabel: getMonthLabel(monthKey),
    total: eligible ? scoring.total : 0,
    wars: scoring.wars,
    league: scoring.league,
    donations: scoring.donations,
    games: scoring.games,
    raid: scoring.raid,
    capitalCoins: scoring.capitalCoins,
    capitalPoints: scoring.capitalPoints,
    penalties: scoring.penalties,
    penaltyEvents,
    recentEvents,
  };
}
