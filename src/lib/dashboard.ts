import "server-only";

import { APP_CONFIG } from "@/lib/config";
import { calculatePlayerScore, isRankingEligible, type ScoringEvent } from "@/lib/scoring";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getZonedMonthBounds } from "@/lib/time";
import { createMonthlyStatMaps } from "@/lib/monthly-stats";

type PlayerRow = {
  id: string;
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
  donations: number | null;
};

type NewMemberRow = {
  player_name: string;
  player_tag: string;
  entered_at: string;
};

export type RankingRow = {
  id: string;
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
  active: boolean;
  role: string | null;
};

export type DashboardData = {
  monthKey: string;
  monthLabel: string;
  leaderPoints: number;
  activePlayers: number;
  eventCount: number;
  ranking: RankingRow[];
  newMembers: Array<{ playerName: string; playerTag: string; enteredAt: string }>;
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

function getMonthLabel(monthKey: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: APP_CONFIG.timeZone,
  }).format(new Date(`${monthKey}-15T12:00:00Z`));
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
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Falha ao consultar eventos: ${error.message}`);
    const page = (data ?? []) as EventRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

export async function getDashboardData(monthOverride?: string): Promise<DashboardData> {
  const currentMonth = getCurrentMonthKey();
  const monthKey = monthOverride && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthOverride)
    ? monthOverride
    : currentMonth;
  const monthLabel = getMonthLabel(monthKey);

  try {
    const supabase = createSupabaseAdmin();
    const bounds = getZonedMonthBounds(monthKey, APP_CONFIG.timeZone);

    const [playersResult, events, statsResult] = await Promise.all([
      supabase
        .from("players")
        .select("id,name,player_tag,active,eligible,role")
        .order("name", { ascending: true }),
      fetchMonthEvents(bounds.start, bounds.end),
      supabase
        .from("player_monthly_stats")
        .select("player_tag,player,clan_games_points,donations")
        .eq("month_key", monthKey),
    ]);

    if (playersResult.error) throw new Error(`Falha ao consultar jogadores: ${playersResult.error.message}`);
    if (statsResult.error) throw new Error(`Falha ao consultar estatísticas mensais: ${statsResult.error.message}`);

    const players = (playersResult.data ?? []) as PlayerRow[];
    const stats = (statsResult.data ?? []) as MonthlyStatRow[];
    const monthlyMaps = createMonthlyStatMaps(stats);
    const { byTag: gamesByTag, byName: gamesByName } = monthlyMaps.clanGames;
    const { byTag: donationsByTag, byName: donationsByName } = monthlyMaps.donations;

    const activeTags = new Set(
      players
        .filter((player) => player.active !== false && player.player_tag)
        .map((player) => player.player_tag!.trim().toUpperCase()),
    );

    let newMembers: DashboardData["newMembers"] = [];
    const recentThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    if (monthKey === currentMonth) {
      const newMembersResult = await supabase
        .from("clan_member_entry_history")
        .select("player_name,player_tag,entered_at")
        .eq("is_baseline", false)
        .gte("entered_at", recentThreshold)
        .order("entered_at", { ascending: false })
        .limit(5);

      if (!newMembersResult.error) {
        const seenTags = new Set<string>();
        newMembers = ((newMembersResult.data ?? []) as NewMemberRow[])
          .filter((member) => {
            const tag = member.player_tag.trim().toUpperCase();
            if (!activeTags.has(tag) || seenTags.has(tag)) return false;
            seenTags.add(tag);
            return true;
          })
          .map((member) => ({
            playerName: member.player_name,
            playerTag: member.player_tag,
            enteredAt: member.entered_at,
          }));
      }
    }

    const playerNameCounts = new Map<string, number>();
    for (const player of players) {
      const key = player.name.trim().toLocaleLowerCase("pt-BR");
      playerNameCounts.set(key, (playerNameCounts.get(key) ?? 0) + 1);
    }

    const eventsByTag = new Map<string, EventRow[]>();
    const legacyEventsByName = new Map<string, EventRow[]>();
    for (const event of events) {
      const tag = (event.player_tag ?? "").trim().toUpperCase();
      const name = (event.player ?? "").trim().toLocaleLowerCase("pt-BR");
      if (tag) {
        const grouped = eventsByTag.get(tag) ?? [];
        grouped.push(event);
        eventsByTag.set(tag, grouped);
      } else if (name) {
        const grouped = legacyEventsByName.get(name) ?? [];
        grouped.push(event);
        legacyEventsByName.set(name, grouped);
      }
    }

    const ranking = players
      .filter(isRankingEligible)
      .map((player) => {
        const normalizedName = player.name.trim().toLocaleLowerCase("pt-BR");
        const hasUniqueLegacyName = playerNameCounts.get(normalizedName) === 1;
        const games = player.player_tag
          ? gamesByTag.get(player.player_tag.trim().toUpperCase()) ?? 0
          : hasUniqueLegacyName
            ? gamesByName.get(normalizedName) ?? 0
            : 0;
        const donations = player.player_tag
          ? donationsByTag.get(player.player_tag.trim().toUpperCase())
          : hasUniqueLegacyName
            ? donationsByName.get(normalizedName)
            : undefined;
        const playerTag = (player.player_tag ?? "").trim().toUpperCase();
        const playerEvents = playerTag
          ? [
              ...(eventsByTag.get(playerTag) ?? []),
              ...(hasUniqueLegacyName ? legacyEventsByName.get(normalizedName) ?? [] : []),
            ]
          : hasUniqueLegacyName
            ? legacyEventsByName.get(normalizedName) ?? []
            : [];
        const score = calculatePlayerScore({
          playerName: player.name,
          playerTag: player.player_tag,
          donationsTotal: donations,
          allowLegacyNameFallback: hasUniqueLegacyName,
          events: playerEvents,
          clanGamesPoints: games,
        });

        return {
          id: player.id,
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
          active: player.active !== false,
          role: player.role,
        };
      })
      .filter((row) => row.active || row.total > 0)
      .sort((a, b) =>
        b.total - a.total
        || b.wars - a.wars
        || b.league - a.league
        || b.raid - a.raid
        || b.capitalPoints - a.capitalPoints
        || b.donations - a.donations
        || b.games - a.games
        || a.player.localeCompare(b.player, "pt-BR")
        || a.tag.localeCompare(b.tag, "pt-BR"),
      )
      .map((row, index) => ({ ...row, position: index + 1 }));

    return {
      monthKey,
      monthLabel,
      leaderPoints: ranking[0]?.total ?? 0,
      activePlayers: players.filter((player) => player.active !== false).length,
      eventCount: events.length,
      ranking,
      newMembers,
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
      newMembers: [],
      connected: false,
      error: error instanceof Error ? error.message : "Não foi possível carregar os dados do clã.",
    };
  }
}
