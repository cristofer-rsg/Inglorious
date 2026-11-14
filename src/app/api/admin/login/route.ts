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
    const credentialsValid = verifyAdminCredentials(username, password);
    const now = Date.now();
    const { data: allowed, error: rateLimitError } = await supabase.rpc("register_admin_login_attempt", {
      p_ip_hash: ipHash,
      p_succeeded: credentialsValid,
      p_window_start: new Date(now - WINDOW_MINUTES * 60 * 1000).toISOString(),
      p_retention_start: new Date(now - ATTEMPT_RETENTION_HOURS * 60 * 60 * 1000).toISOString(),
      p_max_failed_attempts: MAX_FAILED_ATTEMPTS,
    });

    if (rateLimitError) throw new Error("Não foi possível validar o limite de tentativas.");
    if (!allowed) {
      return jsonResponse(
        { success: false, error: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente." },
        429,
        { "Retry-After": String(WINDOW_MINUTES * 60) },
      );
    }

    if (!credentialsValid) {
      return jsonResponse({ success: false, error: "Usuário ou senha incorretos." }, 401);
    }

    await createAdminSession();
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Inglorious admin login failed:", error);
    return jsonResponse({ success: false, error: "Não foi possível iniciar a sessão." }, 500);
  }
}
