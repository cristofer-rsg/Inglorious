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
