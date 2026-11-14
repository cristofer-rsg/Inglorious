import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin-session";
import { hasSameOrigin } from "@/lib/auth/request-origin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = new Set(["Guerras", "Liga dos Clãs", "Doações", "Jogos do Clã", "Penalidade"]);

function redirect(request: Request, key: "success" | "error", message: string) {
  const url = new URL("/admin", request.url);
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, 303);
}

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseEvent(form: FormData) {
  const playerId = field(form, "player_id");
  const category = field(form, "category");
  const activity = field(form, "activity").slice(0, 180);
  const rawPoints = Number(field(form, "points"));

  if (!playerId || !CATEGORIES.has(category) || activity.length < 2 || !Number.isSafeInteger(rawPoints)) {
    throw new Error("Confira jogador, categoria, descrição e quantidade de pontos.");
  }

  if (category === "Doações") {
    if (rawPoints < 1 || rawPoints > 100000) throw new Error("Informe entre 1 e 100.000 tropas doadas.");
    return {
      playerId,
      category: "Doações",
      activity: `TROPAS_DOADAS: manual - ${activity}`,
      points: rawPoints,
    };
  }

  if (category === "Jogos do Clã" && ![10, 15, 20, 25].includes(rawPoints)) {
    throw new Error("Os Jogos do Clã aceitam as faixas de 10, 15, 20 ou 25 pontos.");
  }

  if (category === "Penalidade") {
    if (rawPoints < 1 || rawPoints > 200) throw new Error("A penalidade deve estar entre 1 e 200 pontos.");
    return {
      playerId,
      category: "Guerras",
      activity: `MANUAL: Penalidade - ${activity}`,
      points: -rawPoints,
    };
  }

  if (rawPoints < 0 || rawPoints > 1000) {
    throw new Error("O lançamento deve estar entre 0 e 1.000 pontos.");
  }

  return {
    playerId,
    category,
    activity: `MANUAL: ${activity}`,
    points: rawPoints,
  };
}

function isManualEvent(activity: string | null) {
  return activity?.startsWith("MANUAL:") === true
    || activity?.startsWith("TROPAS_DOADAS: manual -") === true;
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return redirect(request, "error", "Origem não autorizada.");
  if (!(await getAdminSession())) return redirect(request, "error", "Sessão administrativa expirada.");

  try {
    const form = await request.formData();
    const action = field(form, "action");
    const supabase = createSupabaseAdmin();

    if (action === "delete") {
      const id = Number(field(form, "event_id"));
      if (!Number.isSafeInteger(id) || id <= 0 || field(form, "confirm") !== "yes") {
        return redirect(request, "error", "Confirme a exclusão do lançamento selecionado.");
      }

      const { data: existing, error: readError } = await supabase
        .from("events")
        .select("id,activity")
        .eq("id", id)
        .maybeSingle();

      if (readError) throw new Error("Não foi possível localizar o lançamento.");
      if (!existing || !isManualEvent(existing.activity)) {
        return redirect(request, "error", "Somente lançamentos manuais podem ser excluídos por esta tela.");
      }

      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw new Error("Não foi possível excluir o lançamento.");
      return redirect(request, "success", "Lançamento manual excluído.");
    }

    const parsed = parseEvent(form);
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id,name,player_tag")
      .eq("id", parsed.playerId)
      .maybeSingle();

    if (playerError || !player) {
      return redirect(request, "error", "O jogador selecionado não foi encontrado.");
    }

    const eventData = {
      player_id: player.id,
      player: player.name,
      player_tag: player.player_tag,
      category: parsed.category,
      activity: parsed.activity,
      points: parsed.points,
    };

    if (action === "update") {
      const id = Number(field(form, "event_id"));
      if (!Number.isSafeInteger(id) || id <= 0) {
        return redirect(request, "error", "Identificador de lançamento inválido.");
      }

      const { data: existing, error: readError } = await supabase
        .from("events")
        .select("id,activity")
        .eq("id", id)
        .maybeSingle();

      if (readError) throw new Error("Não foi possível localizar o lançamento.");
      if (!existing || !isManualEvent(existing.activity)) {
        return redirect(request, "error", "Somente lançamentos manuais podem ser editados por esta tela.");
      }

      const { error } = await supabase.from("events").update(eventData).eq("id", id);
      if (error) throw new Error("Não foi possível atualizar o lançamento.");
      return redirect(request, "success", "Lançamento manual atualizado.");
    }

    if (action !== "create") return redirect(request, "error", "Operação administrativa inválida.");

    const { error } = await supabase.from("events").insert(eventData);
    if (error) throw new Error("Não foi possível salvar o lançamento.");
    return redirect(request, "success", "Lançamento manual salvo.");
  } catch (error) {
    return redirect(
      request,
      "error",
      error instanceof Error ? error.message : "Não foi possível concluir a operação.",
    );
  }
}
