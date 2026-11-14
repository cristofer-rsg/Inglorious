import "server-only";

import { APP_CONFIG } from "@/lib/config";

const API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";

export type ClashClanMember = {
  name: string;
  player_tag: string;
  role: "leader" | "co_leader" | "elder" | "member";
};

export type ClashPlayerProfile = {
  tag: string;
  name: string;
  clanCapitalContributions: number;
};

export type ClashDonationProfile = {
  tag: string;
  name: string;
  donations: number;
};

export type ClashGamesProfile = {
  tag: string;
  name: string;
  achievementValue: number;
};

export type ClashRaidMember = {
  tag: string;
  name: string;
  attacks: number;
};

export type ClashRaidSeason = {
  startTime: string;
  state: string;
  members: ClashRaidMember[];
};

export type ClashWarAttack = {
  order: number;
  defenderTag?: string;
  stars: number;
  battleTime?: string;
};

export type ClashWarMember = {
  tag: string;
  name: string;
  mapPosition: number;
  attacks: ClashWarAttack[];
};

export type ClashWar = {
  state: string;
  startTime: string;
  endTime?: string;
  clan: { tag: string; members: ClashWarMember[] };
  opponent: { tag: string; members: Array<{ tag: string; mapPosition: number }> };
};

export type ClashLeagueGroup = {
  state: string;
  season?: string;
  rounds: Array<{ warTags: string[] }>;
};

type ClashApiMember = {
  name?: unknown;
  tag?: unknown;
  role?: unknown;
};

function getApiToken() {
  const token = process.env.CLASH_OF_CLANS_API_TOKEN?.replace(/\s+/g, "");
  if (!token) {
    throw new Error("A chave da API do Clash of Clans não está configurada.");
  }
  return token;
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getApiToken()}`,
      Accept: "application/json",
      "User-Agent": "Inglorious/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`A API do Clash of Clans respondeu HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchCurrentClanMembers(): Promise<ClashClanMember[]> {
  const encodedTag = encodeURIComponent(APP_CONFIG.clanTag);
  const data = await apiGet<{ items?: ClashApiMember[] }>(
    `/clans/${encodedTag}/members?limit=50`,
  );

  if (!Array.isArray(data.items) || data.items.length === 0 || data.items.length > 50) {
    throw new Error("A API retornou uma lista de membros vazia ou inválida. O banco não foi alterado.");
  }

  const seen = new Set<string>();
  return data.items.map((member) => {
    if (typeof member.name !== "string" || !member.name.trim()
      || typeof member.tag !== "string" || !member.tag.trim()) {
      throw new Error("A API retornou um membro sem nome ou tag. O banco não foi alterado.");
    }

    const playerTag = member.tag.trim().toUpperCase();
    if (seen.has(playerTag)) {
      throw new Error(`A API retornou uma tag duplicada: ${playerTag}. O banco não foi alterado.`);
    }
    seen.add(playerTag);

    const role = member.role === "leader" ? "leader"
      : member.role === "coLeader" ? "co_leader"
      : member.role === "admin" ? "elder"
      : member.role === "member" ? "member"
      : null;
    if (!role) {
      throw new Error(`A API retornou um cargo inválido para ${playerTag}. O banco não foi alterado.`);
    }
    return { name: member.name.trim(), player_tag: playerTag, role };
  });
}

export async function fetchCurrentLeagueGroup(): Promise<ClashLeagueGroup | null> {
  const encodedTag = encodeURIComponent(APP_CONFIG.clanTag);
  try {
    const group = await apiGet<{
      state?: unknown;
      season?: unknown;
      rounds?: Array<{ warTags?: unknown }>;
    }>(`/clans/${encodedTag}/currentwar/leaguegroup`);

    if (typeof group.state !== "string" || !Array.isArray(group.rounds)) {
      throw new Error("A API retornou um grupo da Liga em formato inválido.");
    }

    return {
      state: group.state,
      season: typeof group.season === "string" ? group.season : undefined,
      rounds: group.rounds.map((round) => ({
        warTags: Array.isArray(round.warTags)
          ? round.warTags.filter((tag): tag is string => typeof tag === "string" && tag !== "#0")
          : [],
      })),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("HTTP 404")
      && error.message.includes("notFound")) {
      return null;
    }
    throw error;
  }
}

export async function fetchLeagueWar(warTag: string): Promise<ClashWar> {
  const encodedTag = encodeURIComponent(warTag);
  const war = await apiGet<{
    state?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    clan?: { tag?: unknown; members?: Array<{
      tag?: unknown; name?: unknown; mapPosition?: unknown;
      attacks?: Array<{ order?: unknown; defenderTag?: unknown; stars?: unknown; battleTime?: unknown }>;
    }> };
    opponent?: { tag?: unknown; members?: Array<{
      tag?: unknown; name?: unknown; mapPosition?: unknown;
      attacks?: Array<{ order?: unknown; defenderTag?: unknown; stars?: unknown; battleTime?: unknown }>;
    }> };
  }>(`/clanwarleagues/wars/${encodedTag}`);

  if (typeof war.state !== "string" || !["preparation", "inWar", "warEnded"].includes(war.state)
    || typeof war.startTime !== "string" || !war.startTime
    || typeof war.clan?.tag !== "string" || typeof war.opponent?.tag !== "string"
    || !Array.isArray(war.clan.members) || !Array.isArray(war.opponent.members)) {
    throw new Error(`Guerra da Liga ${warTag} incompleta ou inválida.`);
  }

  const ownClan = war.clan.tag.toUpperCase() === APP_CONFIG.clanTag.toUpperCase()
    ? war.clan : war.opponent;
  const enemyClan = ownClan === war.clan ? war.opponent : war.clan;
  const members = (ownClan.members ?? []).map((member) => {
    if (typeof member.tag !== "string" || typeof member.name !== "string"
      || typeof member.mapPosition !== "number") {
      throw new Error(`Membro inválido na guerra da Liga ${warTag}.`);
    }
    return {
      tag: member.tag.toUpperCase(),
      name: member.name,
      mapPosition: member.mapPosition,
      attacks: (member.attacks ?? []).map((attack) => ({
        order: typeof attack.order === "number" ? attack.order : 0,
        defenderTag: typeof attack.defenderTag === "string" ? attack.defenderTag : undefined,
        stars: typeof attack.stars === "number" ? attack.stars : 0,
        battleTime: typeof attack.battleTime === "string" ? attack.battleTime : undefined,
      })),
    };
  });
  const opponents = (enemyClan.members ?? []).map((member) => {
    if (typeof member.tag !== "string" || typeof member.mapPosition !== "number") {
      throw new Error(`Adversário inválido na guerra da Liga ${warTag}.`);
    }
    return { tag: member.tag.toUpperCase(), mapPosition: member.mapPosition };
  });

  return {
    state: war.state,
    startTime: war.startTime,
    endTime: typeof war.endTime === "string" ? war.endTime : undefined,
    clan: { tag: APP_CONFIG.clanTag, members },
    opponent: { tag: String(enemyClan.tag), members: opponents },
  };
}

export async function fetchCurrentWar(): Promise<ClashWar> {
  const encodedTag = encodeURIComponent(APP_CONFIG.clanTag);
  const war = await apiGet<{
    state?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    clan?: { tag?: unknown; members?: Array<{
      tag?: unknown; name?: unknown; mapPosition?: unknown;
      attacks?: Array<{ order?: unknown; defenderTag?: unknown; stars?: unknown; battleTime?: unknown }>;
    }> };
    opponent?: { tag?: unknown; members?: Array<{
      tag?: unknown; name?: unknown; mapPosition?: unknown;
      attacks?: Array<{ order?: unknown; defenderTag?: unknown; stars?: unknown; battleTime?: unknown }>;
    }> };
  }>(`/clans/${encodedTag}/currentwar`);

  if (war.state === "notInWar") {
    return {
      state: "notInWar",
      startTime: "",
      clan: { tag: APP_CONFIG.clanTag, members: [] },
      opponent: { tag: "", members: [] },
    };
  }

  if (typeof war.state !== "string" || !["preparation", "inWar", "warEnded"].includes(war.state)
    || typeof war.startTime !== "string" || !war.startTime
    || typeof war.clan?.tag !== "string" || typeof war.opponent?.tag !== "string"
    || !Array.isArray(war.clan.members) || !Array.isArray(war.opponent.members)) {
    throw new Error("A API retornou uma guerra incompleta ou em formato inesperado.");
  }

  const ownClan = war.clan.tag.toUpperCase() === APP_CONFIG.clanTag.toUpperCase()
    ? war.clan : war.opponent;
  const enemyClan = ownClan === war.clan ? war.opponent : war.clan;

  const members = (ownClan.members ?? []).map((member) => {
    if (typeof member.tag !== "string" || typeof member.name !== "string"
      || typeof member.mapPosition !== "number" || !Number.isInteger(member.mapPosition)) {
      throw new Error("A guerra contém um membro do clã em formato inválido.");
    }
    const attacks = (member.attacks ?? []).map((attack) => ({
      order: typeof attack.order === "number" ? attack.order : 0,
      defenderTag: typeof attack.defenderTag === "string" ? attack.defenderTag : undefined,
      stars: typeof attack.stars === "number" ? attack.stars : 0,
      battleTime: typeof attack.battleTime === "string" ? attack.battleTime : undefined,
    }));
    return {
      tag: member.tag.toUpperCase(),
      name: member.name,
      mapPosition: member.mapPosition,
      attacks,
    };
  });

  const opponents = (enemyClan.members ?? []).map((member) => {
    if (typeof member.tag !== "string" || typeof member.mapPosition !== "number") {
      throw new Error("A guerra contém um adversário em formato inválido.");
    }
    return { tag: member.tag.toUpperCase(), mapPosition: member.mapPosition };
  });

  return {
    state: war.state,
    startTime: war.startTime,
    endTime: typeof war.endTime === "string" ? war.endTime : undefined,
    clan: { tag: APP_CONFIG.clanTag, members },
    opponent: { tag: String(enemyClan.tag), members: opponents },
  };
}

export async function fetchLatestRaidSeason(): Promise<ClashRaidSeason> {
  const encodedTag = encodeURIComponent(APP_CONFIG.clanTag);
  const data = await apiGet<{ items?: Array<{
    startTime?: unknown;
    state?: unknown;
    members?: Array<{ tag?: unknown; name?: unknown; attacks?: unknown }>;
  }> }>(`/clans/${encodedTag}/capitalraidseasons?limit=1`);

  const season = data.items?.[0];
  if (!season || typeof season.startTime !== "string" || !season.startTime
    || !Array.isArray(season.members) || season.members.length === 0) {
    throw new Error("A API não retornou uma temporada válida do Raide. Nenhum dado foi alterado.");
  }

  const seen = new Set<string>();
  const members = season.members.map((member) => {
    if (typeof member.tag !== "string" || !member.tag.trim()
      || typeof member.name !== "string" || !member.name.trim()
      || typeof member.attacks !== "number" || !Number.isSafeInteger(member.attacks)
      || member.attacks < 0) {
      throw new Error("A temporada do Raide contém um membro inválido.");
    }

    const tag = member.tag.trim().toUpperCase();
    if (seen.has(tag)) throw new Error(`Tag duplicada no Raide: ${tag}`);
    seen.add(tag);
    return { tag, name: member.name.trim(), attacks: member.attacks };
  });

  return {
    startTime: season.startTime,
    state: typeof season.state === "string" ? season.state : "unknown",
    members,
  };
}

export async function fetchPlayerGamesProfile(playerTag: string): Promise<ClashGamesProfile> {
  const normalizedTag = playerTag.trim().toUpperCase();
  if (!/^#[A-Z0-9]{3,15}$/.test(normalizedTag)) {
    throw new Error(`Tag de jogador inválida: ${playerTag}`);
  }

  const profile = await apiGet<{
    tag?: unknown;
    name?: unknown;
    achievements?: Array<{ name?: unknown; value?: unknown }>;
  }>(`/players/${encodeURIComponent(normalizedTag)}`);

  const returnedTag = typeof profile.tag === "string" ? profile.tag.trim().toUpperCase() : "";
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  const achievement = profile.achievements?.find(
    (item) => typeof item.name === "string"
      && item.name.trim().toLocaleLowerCase("en-US") === "games champion",
  );
  const value = achievement?.value;

  if (returnedTag !== normalizedTag || !name
    || typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Perfil ou conquista Games Champion inválida para ${normalizedTag}.`);
  }

  return { tag: returnedTag, name, achievementValue: value };
}

export async function fetchPlayerDonationProfile(playerTag: string): Promise<ClashDonationProfile> {
  const normalizedTag = playerTag.trim().toUpperCase();
  if (!/^#[A-Z0-9]{3,15}$/.test(normalizedTag)) {
    throw new Error(`Tag de jogador inválida: ${playerTag}`);
  }

  const profile = await apiGet<{
    tag?: unknown;
    name?: unknown;
    donations?: unknown;
  }>(`/players/${encodeURIComponent(normalizedTag)}`);

  const returnedTag = typeof profile.tag === "string" ? profile.tag.trim().toUpperCase() : "";
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  const donations = profile.donations;

  if (returnedTag !== normalizedTag || !name
    || typeof donations !== "number" || !Number.isSafeInteger(donations) || donations < 0) {
    throw new Error(`Perfil ou total de doações inválido para ${normalizedTag}. Nenhum lançamento foi feito.`);
  }

  return { tag: returnedTag, name, donations };
}

export async function fetchPlayerCapitalProfile(playerTag: string): Promise<ClashPlayerProfile> {
  const normalizedTag = playerTag.trim().toUpperCase();
  if (!/^#[A-Z0-9]{3,15}$/.test(normalizedTag)) {
    throw new Error(`Tag de jogador inválida: ${playerTag}`);
  }

  const profile = await apiGet<{
    tag?: unknown;
    name?: unknown;
    clanCapitalContributions?: unknown;
  }>(`/players/${encodeURIComponent(normalizedTag)}`);

  const returnedTag = typeof profile.tag === "string" ? profile.tag.trim().toUpperCase() : "";
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  const total = profile.clanCapitalContributions;

  if (returnedTag !== normalizedTag || !name
    || typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) {
    throw new Error(`Perfil ou total de Capital inválido para ${normalizedTag}. Nenhum lançamento foi feito.`);
  }

  return { tag: returnedTag, name, clanCapitalContributions: total };
}
