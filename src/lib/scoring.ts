export type ScoringEvent = {
  player?: string | null;
  player_tag?: string | null;
  category?: string | null;
  activity?: string | null;
  points?: number | null;
};

export type PlayerScoringResult = {
  wars: number;
  league: number;
  donations: number;
  games: number;
  raid: number;
  capitalCoins: number;
  capitalPoints: number;
  penalties: number;
  total: number;
};

const WEIGHTS = {
  wars: { target: 200, max: 200 },
  league: { target: 140, max: 200 },
  raid: { target: 32, max: 150 },
  donations: { target: 10000, max: 150 },
  games: { target: 10000, max: 100 },
  capital: { target: 250000, max: 200 },
} as const;

const EXCLUDED_ROLES = new Set(["leader", "co_leader", "coleader", "co-leader"]);

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function score(raw: number, target: number, max: number) {
  return Math.round(Math.min(Math.max(raw, 0) / target, 1) * max);
}

export function isRankingEligible(player: {
  eligible?: string | null;
  role?: string | null;
  active?: boolean | null;
}) {
  return player.active !== false
    && (player.eligible ?? "Elegível") === "Elegível"
    && !EXCLUDED_ROLES.has(normalized(player.role).replaceAll(" ", "_"));
}

export function calculatePlayerScore(input: {
  playerName: string;
  playerTag?: string | null;
  allowLegacyNameFallback?: boolean;
  events: ScoringEvent[];
  clanGamesPoints?: number | null;
  donationsTotal?: number | null;
}): PlayerScoringResult {
  const playerKey = normalized(input.playerName);
  const playerTag = normalized(input.playerTag).toUpperCase();
  let warsRaw = 0;
  let leagueRaw = 0;
  let donatedTroops = 0;
  let gamesRaw = 0;
  let raidRaw = 0;
  let capitalCoins = 0;
  let penalties = 0;

  for (const event of input.events) {
    const eventTag = normalized(event.player_tag).toUpperCase();
    if (playerTag && eventTag) {
      if (eventTag !== playerTag) continue;
    } else {
      if (playerTag && input.allowLegacyNameFallback === false && !eventTag) continue;
      if (normalized(event.player) !== playerKey) continue;
    }

    const points = Number(event.points ?? 0);
    if (!Number.isFinite(points) || points === 0) continue;

    const category = normalized(event.category);
    const activity = (event.activity ?? "").trim();

    if (points < 0) {
      penalties += Math.abs(points);
      continue;
    }

    if (category === "guerras") warsRaw += points;
    else if (category === "liga dos clãs") leagueRaw += points;
    else if (category === "doações" && activity.startsWith("TROPAS_DOADAS:")) donatedTroops += points;
    else if (category === "jogos do clã") gamesRaw = Math.max(gamesRaw, points);
    else if (category === "raide de fim de semana") raidRaw += points;
    else if (category === "capital do clã" && activity === "Doação automática de Ouro da Capital") capitalCoins += points;
  }

  if (input.donationsTotal != null && Number.isFinite(Number(input.donationsTotal))) {
    donatedTroops = Math.max(0, Number(input.donationsTotal));
  }
  gamesRaw = Math.max(gamesRaw, Number(input.clanGamesPoints ?? 0));

  const wars = score(warsRaw, WEIGHTS.wars.target, WEIGHTS.wars.max);
  const league = score(leagueRaw, WEIGHTS.league.target, WEIGHTS.league.max);
  const donations = score(donatedTroops, WEIGHTS.donations.target, WEIGHTS.donations.max);
  const games = score(gamesRaw, WEIGHTS.games.target, WEIGHTS.games.max);
  const raid = score(raidRaw, WEIGHTS.raid.target, WEIGHTS.raid.max);
  const capitalPoints = score(capitalCoins, WEIGHTS.capital.target, WEIGHTS.capital.max);

  return {
    wars,
    league,
    donations,
    games,
    raid,
    capitalCoins,
    capitalPoints,
    penalties,
    total: Math.max(0, wars + league + donations + games + raid + capitalPoints - penalties),
  };
}
