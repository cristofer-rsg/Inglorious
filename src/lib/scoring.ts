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

const DONATIONS_CAP = 50;
const DONATION_TROOPS_PER_POINT = 100;
const CLAN_GAMES_CAP = 25;
const CAPITAL_COINS_PER_POINT = 2500;

const EXCLUDED_ROLES = new Set(["leader", "co_leader", "coleader", "co-leader"]);

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR");
}

export function isRankingEligible(player: {
  eligible?: string | null;
  role?: string | null;
  active?: boolean | null;
}) {
  return (player.eligible ?? "Elegível") === "Elegível"
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
  let wars = 0;
  let league = 0;
  let legacyDonationPoints = 0;
  let donatedTroops = 0;
  let games = 0;
  let raid = 0;
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

    if (category === "guerras") wars += points;
    else if (category === "liga dos clãs") league += points;
    else if (category === "doações") {
      if (activity.startsWith("TROPAS_DOADAS:")) donatedTroops += points;
      else legacyDonationPoints += points;
    } else if (category === "jogos do clã") games = Math.max(games, points);
    else if (category === "raide de fim de semana") raid += points;
    else if (category === "capital do clã") capitalCoins += points;
  }

  if (input.donationsTotal != null && Number.isFinite(Number(input.donationsTotal))) {
    donatedTroops = Math.max(0, Number(input.donationsTotal));
  }

  const monthlyGames = Number(input.clanGamesPoints ?? 0);
  if (Number.isFinite(monthlyGames)) {
    games = Math.max(games, Math.max(0, monthlyGames));
  }

  const donations = Math.min(
    DONATIONS_CAP,
    legacyDonationPoints + Math.floor(donatedTroops / DONATION_TROOPS_PER_POINT),
  );
  games = Math.min(CLAN_GAMES_CAP, games);
  const capitalPoints = Math.floor(capitalCoins / CAPITAL_COINS_PER_POINT);

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
