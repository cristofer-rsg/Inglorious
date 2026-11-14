import "server-only";

import { APP_CONFIG } from "@/lib/config";

const API_BASE_URL = "https://cocproxy.royaleapi.dev/v1";

export type ClashClanMember = {
  name: string;
  player_tag: string;
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

type ClashApiMember = {
  name?: unknown;
  tag?: unknown;
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

    return { name: member.name.trim(), player_tag: playerTag };
  });
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
