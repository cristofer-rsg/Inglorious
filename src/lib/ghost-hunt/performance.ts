import "server-only";

import { APP_CONFIG } from "@/lib/config";
import { calculatePlayerScore, type ScoringEvent } from "@/lib/scoring";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Player = {
  name: string;
  player_tag: string | null;
  active: boolean | null;
  role: string | null;
};
type Stats = {
  month_key: string;
  player_tag: string | null;
  player: string | null;
  war_attacks: number | null;
  donations: number | null;
  clan_games_points: number | null;
};
type ActivitySource = {
  month_key: string;
  source_key: string;
  player_tag: string | null;
  war_attacks: number | null;
  league_attacks: number | null;
  raid_attacks: number | null;
  updated_at: string | null;
};
type EventRow = ScoringEvent & {
  category: string | null;
  activity: string | null;
  points: number | null;
  created_at: string | null;
};
type RangeQuery<T> = {
  range(from: number, to: number): PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>;
};

export type PerformanceRow = {
  position: number;
  player: string;
  tag: string;
  role: string | null;
  wars: number;
  league: number;
  raid: number;
  donations: number;
  games: number;
  capital: number;
  warsPoints: number;
  leaguePoints: number;
  raidPoints: number;
  donationsPoints: number;
  gamesPoints: number;
  capitalPoints: number;
  warsPercent: number;
  leaguePercent: number;
  raidPercent: number;
  donationsPercent: number;
  gamesPercent: number;
  capitalPercent: number;
  totalPoints: number;
  index: number;
  penalties: number;
  active: boolean;
  lastWarAttacks: number | null;
  lastLeagueAttacks: number | null;
  lastRaidAttacks: number | null;
};

export type PerformanceData = {
  monthKey: string;
  monthLabel: string;
  months: string[];
  rows: PerformanceRow[];
  totals: {
    wars: number;
    league: number;
    raid: number;
    donations: number;
    games: number;
    capital: number;
  };
  connected: boolean;
  error?: string;
};

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value || "2026"}-${parts.find((part) => part.type === "month")?.value || "01"}`;
}

async function allRows<T>(query: RangeQuery<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

function monthLabel(key: string) {
  const value = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: APP_CONFIG.timeZone,
  }).format(new Date(`${key}-15T12:00:00-03:00`));
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function safeCount(value: number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function indexEventsByPlayer(events: EventRow[]) {
  const byTag = new Map<string, EventRow[]>();
  const byName = new Map<string, EventRow[]>();
  const byLegacyName = new Map<string, EventRow[]>();

  for (const event of events) {
    const nameKey = (event.player ?? "").trim().toLocaleLowerCase("pt-BR");
    const tagKey = (event.player_tag ?? "").trim().toUpperCase();

    if (nameKey) {
      const named = byName.get(nameKey);
      if (named) named.push(event);
      else byName.set(nameKey, [event]);

      if (!tagKey) {
        const legacy = byLegacyName.get(nameKey);
        if (legacy) legacy.push(event);
        else byLegacyName.set(nameKey, [event]);
      }
    }

    if (tagKey) {
      const tagged = byTag.get(tagKey);
      if (tagged) tagged.push(event);
      else byTag.set(tagKey, [event]);
    }
  }

  return { byTag, byName, byLegacyName };
}

export async function getPerformanceData(
  requestedMonth?: string,
  useManualDonationFallback = false,
): Promise<PerformanceData> {
  const fallbackMonth = currentMonth();
  try {
    const db = createSupabaseAdmin();
    const [playersResult, allStats, activitySources] = await Promise.all([
      db.from("players").select("name,player_tag,active,role").order("name", { ascending: true }),
      allRows<Stats>(db.from("player_monthly_stats")
        .select("month_key,player_tag,player,war_attacks,donations,clan_games_points")
        .order("month_key", { ascending: false })
        .order("player_tag", { ascending: true }) as unknown as RangeQuery<Stats>),
      allRows<ActivitySource>(db.from("player_monthly_stat_sources")
        .select("month_key,source_key,player_tag,war_attacks,league_attacks,raid_attacks,updated_at")
        .order("updated_at", { ascending: false })
        .order("source_key", { ascending: true }) as unknown as RangeQuery<ActivitySource>),
    ]);
    if (playersResult.error) throw new Error(playersResult.error.message);

    const months = Array.from(new Set([
      fallbackMonth,
      ...allStats.map((row) => row.month_key).filter(Boolean),
    ])).sort().reverse();
    const monthKey = requestedMonth
      && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
      && months.includes(requestedMonth)
      ? requestedMonth
      : fallbackMonth;
    const stats = allStats.filter((row) => row.month_key === monthKey);
    const monthActivitySources = activitySources.filter((row) => row.month_key === monthKey);

    const { data: completedWars, error: completedWarsError } = await db
      .from("clan_war_completions")
      .select("war_key,ended_at")
      .order("ended_at", { ascending: false })
      .limit(1);
    if (completedWarsError) throw new Error(completedWarsError.message);
    const latestWarKey = completedWars?.[0]?.war_key || "";

    const latestLeagueDay = activitySources
      .map((row) => row.source_key.match(/^league:(\d{8})T\d{6}(?:\.\d+)?Z:/)?.[1] || "")
      .sort()
      .at(-1) || "";
    const latestLeagueStartDay = latestLeagueDay
      ? new Date(Date.UTC(
        Number(latestLeagueDay.slice(0, 4)),
        Number(latestLeagueDay.slice(4, 6)) - 1,
        Number(latestLeagueDay.slice(6, 8)) - 6,
      )).toISOString().slice(0, 10).replace(/-/g, "")
      : "";

    const raidSources = activitySources.filter((row) => /^raid:\d{4}-\d{2}-\d{2}:/.test(row.source_key));
    const latestRaidSync = raidSources.reduce(
      (latest, row) => row.updated_at && row.updated_at > latest ? row.updated_at : latest,
      "",
    );
    const latestRaidAnchor = raidSources.find((row) => row.updated_at === latestRaidSync)
      ?.source_key.match(/^raid:(\d{4}-\d{2}-\d{2}):/)?.[1] || "";

    const lastActivityByTag = new Map<string, {
      war: number | null;
      league: number | null;
      raid: number | null;
    }>();
    for (const source of activitySources) {
      const tag = (source.player_tag || "").trim().toUpperCase();
      if (!tag) continue;
      const current = lastActivityByTag.get(tag) || { war: null, league: null, raid: null };
      if (latestWarKey && source.source_key.startsWith(`war:${latestWarKey}:`)) {
        current.war = source.war_attacks == null ? null : safeCount(source.war_attacks);
      }
      const leagueDay = source.source_key.match(/^league:(\d{8})T\d{6}(?:\.\d+)?Z:/)?.[1] || "";
      if (latestLeagueDay && leagueDay >= latestLeagueStartDay && leagueDay <= latestLeagueDay) {
        current.league = (current.league ?? 0) + safeCount(source.league_attacks);
      }
      if (latestRaidAnchor && source.source_key.startsWith(`raid:${latestRaidAnchor}:`)) {
        current.raid = source.raid_attacks == null ? null : safeCount(source.raid_attacks);
      }
      lastActivityByTag.set(tag, current);
    }

    const start = new Date(`${monthKey}-01T00:00:00-03:00`);
    const [year, month] = monthKey.split("-").map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00-03:00`);
    const events = await allRows<EventRow>(db.from("events")
      .select("player,player_tag,category,activity,points,created_at")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: true })
      .order("player_tag", { ascending: true })
      .order("activity", { ascending: true }) as unknown as RangeQuery<EventRow>);

    const eventIndexes = indexEventsByPlayer(events);

    const statsByTag = new Map(
      stats.filter((row) => row.player_tag)
        .map((row) => [String(row.player_tag).trim().toUpperCase(), row]),
    );
    const statsByName = new Map(
      stats.filter((row) => row.player)
        .map((row) => [String(row.player).trim().toLocaleLowerCase("pt-BR"), row]),
    );

    const rows = ((playersResult.data ?? []) as Player[]).map((player) => {
      const tag = (player.player_tag ?? "").trim().toUpperCase();
      const nameKey = player.name.trim().toLocaleLowerCase("pt-BR");
      const stat = (tag ? statsByTag.get(tag) : undefined) || statsByName.get(nameKey);
      const playerEvents = tag
        ? [
          ...(eventIndexes.byTag.get(tag) ?? []),
          ...(eventIndexes.byLegacyName.get(nameKey) ?? []),
        ]
        : eventIndexes.byName.get(nameKey) ?? [];
      const recordedDonations = safeCount(stat?.donations);
      const donationFallback = useManualDonationFallback
        ? playerEvents
          .filter((event) => (event.category ?? "").trim().toLocaleLowerCase("pt-BR") === "doações"
            && (event.activity ?? "").startsWith("TROPAS_DOADAS:"))
          .reduce((sum, event) => sum + safeCount(event.points), 0)
        : 0;
      const donations = recordedDonations > 0 ? recordedDonations : donationFallback;
      const games = Math.max(safeCount(stat?.clan_games_points), ...playerEvents
        .filter((event) => (event.category ?? "").trim().toLocaleLowerCase("pt-BR") === "jogos do clã")
        .map((event) => safeCount(event.points)), 0);
      const scoring = calculatePlayerScore({
        playerName: player.name,
        playerTag: player.player_tag,
        events: playerEvents,
        clanGamesPoints: games,
        donationsTotal: donations,
      });
      const rawWarAttacks = safeCount(stat?.war_attacks);
      const latestActivity = tag ? lastActivityByTag.get(tag) : undefined;
      const leagueAttacks = playerEvents
        .filter((event) => (event.category ?? "").trim().toLocaleLowerCase("pt-BR") === "liga dos clãs"
          && (event.activity ?? "").startsWith("Realizou ataque "))
        .length;
      const raidAttacks = playerEvents
        .filter((event) => (event.category ?? "").trim().toLocaleLowerCase("pt-BR") === "raide de fim de semana")
        .reduce((sum, event) => {
          const match = (event.activity ?? "").match(/(\d+)\s+ataque/i);
          return sum + (match ? Number(match[1]) : 0);
        }, 0);
      const capitalCoins = playerEvents
        .filter((event) => (event.category ?? "").trim().toLocaleLowerCase("pt-BR") === "capital do clã")
        .reduce((sum, event) => sum + safeCount(event.points), 0);
      return {
        position: 0,
        player: player.name,
        tag: player.player_tag || "",
        role: player.role,
        wars: rawWarAttacks,
        league: leagueAttacks,
        raid: raidAttacks,
        donations,
        games,
        capital: capitalCoins,
        warsPoints: scoring.wars,
        leaguePoints: scoring.league,
        raidPoints: scoring.raid,
        donationsPoints: scoring.donations,
        gamesPoints: scoring.games,
        capitalPoints: scoring.capitalPoints,
        warsPercent: Math.round(scoring.wars / 200 * 100),
        leaguePercent: Math.round(scoring.league / 200 * 100),
        raidPercent: Math.round(scoring.raid / 150 * 100),
        donationsPercent: Math.round(scoring.donations / 150 * 100),
        gamesPercent: Math.round(scoring.games / 100 * 100),
        capitalPercent: Math.round(scoring.capitalPoints / 200 * 100),
        totalPoints: scoring.total,
        index: Math.round(scoring.total / 10),
        penalties: scoring.penalties,
        active: player.active !== false,
        lastWarAttacks: latestActivity?.war ?? null,
        lastLeagueAttacks: latestActivity?.league ?? null,
        lastRaidAttacks: latestActivity?.raid ?? null,
      };
    });

    const totals = {
      wars: rows.reduce((sum, row) => sum + row.wars, 0),
      league: rows.reduce((sum, row) => sum + row.league, 0),
      raid: rows.reduce((sum, row) => sum + row.raid, 0),
      donations: rows.reduce((sum, row) => sum + row.donations, 0),
      games: rows.reduce((sum, row) => sum + row.games, 0),
      capital: rows.reduce((sum, row) => sum + row.capital, 0),
    };
    return { monthKey, monthLabel: monthLabel(monthKey), months, rows, totals, connected: true };
  } catch (error) {
    return {
      monthKey: fallbackMonth,
      monthLabel: monthLabel(fallbackMonth),
      months: [fallbackMonth],
      rows: [],
      totals: { wars: 0, league: 0, raid: 0, donations: 0, games: 0, capital: 0 },
      connected: false,
      error: error instanceof Error ? error.message : "Falha ao carregar desempenho.",
    };
  }
}
