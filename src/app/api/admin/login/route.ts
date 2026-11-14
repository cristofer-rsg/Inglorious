import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminCredentials } from "@/lib/auth/admin-session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_RETENTION_HOURS = 24;

function jsonResponse(
  body: { success: boolean; error?: string },
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", ...extraHeaders },
  });
}

function getClientIp(request: Request) {
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashIp(ip: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET ?? process.env.CRON_SECRET;
  if (!secret) throw new Error("Segredo de proteção de autenticação não configurado.");
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse({ success: false, error: "Formato inválido." }, 415);
    }

    const origin = request.headers.get("origin");
    const requestUrl = new URL(request.url);
    if (!origin || new URL(origin).origin !== requestUrl.origin) {
      return jsonResponse({ success: false, error: "Origem não autorizada." }, 403);
    }

    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      return jsonResponse({ success: false, error: "A autenticação administrativa ainda não foi configurada." }, 503);
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ success: false, error: "Credenciais inválidas." }, 400);
    }

    const payload = body as Record<string, unknown>;
    const username = typeof payload.username === "string" ? payload.username : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    if (!username || !password || username.length > 120 || password.length > 256) {
      return jsonResponse({ success: false, error: "Usuário ou senha incorretos." }, 401);
    }

    const supabase = createSupabaseAdmin();
    const ipHash = hashIp(getClientIp(request));
    const retentionStart = new Date(Date.now() - ATTEMPT_RETENTION_HOURS * 60 * 60 * 1000).toISOString();
    const { error: cleanupError } = await supabase
      .from("admin_login_attempts")
      .delete()
      .lt("attempted_at", retentionStart);
    if (cleanupError) throw new Error("Não foi possível limpar o histórico antigo de autenticação.");

    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("succeeded", false)
      .gte("attempted_at", windowStart);

    if (countError) throw new Error("Não foi possível validar o limite de tentativas.");
    if ((count ?? 0) >= MAX_FAILED_ATTEMPTS) {
      return jsonResponse(
        { success: false, error: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente." },
        429,
        { "Retry-After": String(WINDOW_MINUTES * 60) },
      );
    }

    if (!verifyAdminCredentials(username, password)) {
      const { error: attemptError } = await supabase.from("admin_login_attempts").insert({
        ip_hash: ipHash,
        succeeded: false,
      });
      if (attemptError) throw new Error("Não foi possível registrar a tentativa de autenticação.");
      return jsonResponse({ success: false, error: "Usuário ou senha incorretos." }, 401);
    }

    const { error: successError } = await supabase.from("admin_login_attempts").insert({
      ip_hash: ipHash,
      succeeded: true,
    });
    if (successError) throw new Error("Não foi possível registrar a autenticação.");
    await createAdminSession();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Inglorious admin login failed:", error);
    return jsonResponse({ success: false, error: "Não foi possível iniciar a sessão." }, 500);
  }
}
