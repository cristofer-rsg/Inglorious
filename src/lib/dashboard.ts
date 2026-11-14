import "server-only";

import { APP_CONFIG } from "@/lib/config";
import { calculatePlayerScore, isRankingEligible, type ScoringEvent } from "@/lib/scoring";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type PlayerRow = {
  name: string;
  player_tag: string | null;
  active: boolean | null;
  eligible: string | null;
  role: string | null;
};

type EventRow = ScoringEvent & {
  id: number;
  created_at: string;
  battle_time: string | null;
};

type MonthlyStatRow = {
  player_tag: string | null;
  player: string | null;
  clan_games_points: number | null;
};

export type RankingRow = {
  position: number;
  player: string;
  tag: string;
  total: number;
  wars: number;
  league: number;
  donations: number;
  games: number;
  raid: number;
  capitalCoins: number;
  capitalPoints: number;
  penalties: number;
};

export type DashboardData = {
  monthKey: string;
  monthLabel: string;
  leaderPoints: number;
  activePlayers: number;
  eventCount: number;
  ranking: RankingRow[];
  connected: boolean;
  error?: string;
};

function getCurrentMonthKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

function getMonthBounds(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    start: new Date(`${monthKey}-01T00:00:00-03:00`).toISOString(),
    end: new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00-03:00`).toISOString(),
  };
}

function getMonthLabel(monthKey: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: APP_CONFIG.timeZone,
  }).format(new Date(`${monthKey}-15T12:00:00-03:00`));
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

async function fetchMonthEvents(start: string, end: string): Promise<EventRow[]> {
  const supabase = createSupabaseAdmin();
  const pageSize = 1000;
  const rows: EventRow[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("events")
      .select("id,player,player_tag,category,activity,points,created_at,battle_time")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Falha ao consultar eventos: ${error.message}`);
    const page = (data ?? []) as EventRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

export async function getDashboardData(): Promise<DashboardData> {
  const monthKey = getCurrentMonthKey();
  const monthLabel = getMonthLabel(monthKey);

  try {
    const supabase = createSupabaseAdmin();
    const bounds = getMonthBounds(monthKey);

    const [playersResult, events, statsResult] = await Promise.all([
      supabase
        .from("players")
        .select("name,player_tag,active,eligible,role")
        .order("name", { ascending: true }),
      fetchMonthEvents(bounds.start, bounds.end),
      supabase
        .from("player_monthly_stats")
        .select("player_tag,player,clan_games_points")
        .eq("month_key", monthKey),
    ]);

    if (playersResult.error) throw new Error(`Falha ao consultar jogadores: ${playersResult.error.message}`);
    if (statsResult.error) throw new Error(`Falha ao consultar estatísticas mensais: ${statsResult.error.message}`);

    const players = (playersResult.data ?? []) as PlayerRow[];
    const stats = (statsResult.data ?? []) as MonthlyStatRow[];
    const gamesByTag = new Map<string, number>(
      stats
        .filter((row) => row.player_tag)
        .map((row): [string, number] => [String(row.player_tag).trim().toUpperCase(), Number(row.clan_games_points ?? 0)]),
    );
    const gamesByName = new Map<string, number>(
      stats
        .filter((row) => row.player)
        .map((row): [string, number] => [String(row.player).trim().toLocaleLowerCase("pt-BR"), Number(row.clan_games_points ?? 0)]),
    );

    const playerNameCounts = new Map<string, number>();
    for (const player of players) {
      const key = player.name.trim().toLocaleLowerCase("pt-BR");
      playerNameCounts.set(key, (playerNameCounts.get(key) ?? 0) + 1);
    }

    const ranking = players
      .filter(isRankingEligible)
      .map((player) => {
        const normalizedName = player.name.trim().toLocaleLowerCase("pt-BR");
        const games = player.player_tag
          ? gamesByTag.get(player.player_tag.trim().toUpperCase()) ?? 0
          : gamesByName.get(normalizedName) ?? 0;
        const score = calculatePlayerScore({
          playerName: player.name,
          playerTag: player.player_tag,
          allowLegacyNameFallback: playerNameCounts.get(normalizedName) === 1,
          events,
          clanGamesPoints: games,
        });

        return {
          position: 0,
          player: player.name,
          tag: player.player_tag ?? "",
          total: score.total,
          wars: score.wars,
          league: score.league,
          donations: score.donations,
          games: score.games,
          raid: score.raid,
          capitalCoins: score.capitalCoins,
          capitalPoints: score.capitalPoints,
          penalties: score.penalties,
        };
      })
      .sort((a, b) =>
        b.total - a.total
        || b.wars - a.wars
        || b.league - a.league
        || b.raid - a.raid
        || b.capitalPoints - a.capitalPoints
        || b.donations - a.donations
        || b.games - a.games
        || a.player.localeCompare(b.player, "pt-BR"),
      )
      .map((row, index) => ({ ...row, position: index + 1 }));

    return {
      monthKey,
      monthLabel,
      leaderPoints: ranking[0]?.total ?? 0,
      activePlayers: players.filter((player) => player.active !== false).length,
      eventCount: events.length,
      ranking,
      connected: true,
    };
  } catch (error) {
    return {
      monthKey,
      monthLabel,
      leaderPoints: 0,
      activePlayers: 0,
      eventCount: 0,
      ranking: [],
      connected: false,
      error: error instanceof Error ? error.message : "Não foi possível carregar os dados do clã.",
    };
  }
}
