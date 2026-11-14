import "server-only";

import { fetchCurrentClanMembers } from "@/lib/clash-api";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function synchronizeCurrentRoster() {
  const members = await fetchCurrentClanMembers();
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.rpc("sync_inglorious_clan_roster", {
    p_members: members,
  });

  if (error) {
    throw new Error(`Falha ao sincronizar roster do Inglorious: ${error.message}`);
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== "object" || result.success !== true) {
    throw new Error("A sincronização do roster retornou um resultado inesperado.");
  }

  return { members, result };
}

export type KnownClanPlayer = {
  id: string;
  name: string;
  player_tag: string;
  active: boolean;
  eligible: string | null;
  role: string | null;
};

export async function getKnownPlayersByTags(tags: readonly string[]) {
  const normalizedTags = [...new Set(tags.map((tag) => tag.trim().toUpperCase()).filter(Boolean))];
  if (normalizedTags.length === 0) return new Map<string, KnownClanPlayer>();

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("players")
    .select("id,name,player_tag,active,eligible,role")
    .in("player_tag", normalizedTags);

  if (error) {
    throw new Error(`Falha ao consultar histórico dos jogadores do clã: ${error.message}`);
  }

  const players = (data ?? []) as KnownClanPlayer[];
  return new Map(players.map((player): [string, KnownClanPlayer] => [
    player.player_tag.trim().toUpperCase(),
    player,
  ]));
}
