import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminCredentials } from "@/lib/auth/admin-session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("x-real-ip") ?? forwarded ?? "unknown";
}

function hashIp(ip: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET ?? process.env.CRON_SECRET;
  if (!secret) throw new Error("Segredo de proteção de autenticação não configurado.");
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ success: false, error: "Formato inválido." }, { status: 415 });
    }

    const origin = request.headers.get("origin");
    const requestUrl = new URL(request.url);
    if (origin && new URL(origin).origin !== requestUrl.origin) {
      return NextResponse.json({ success: false, error: "Origem não autorizada." }, { status: 403 });
    }

    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "A autenticação administrativa ainda não foi configurada." }, { status: 503 });
    }

    const supabase = createSupabaseAdmin();
    const ipHash = hashIp(getClientIp(request));
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("succeeded", false)
      .gte("attempted_at", windowStart);

    if (countError) throw new Error("Não foi possível validar o limite de tentativas.");
    if ((count ?? 0) >= MAX_FAILED_ATTEMPTS) {
      return NextResponse.json(
        { success: false, error: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente." },
        { status: 429, headers: { "Retry-After": String(WINDOW_MINUTES * 60) } },
      );
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Credenciais inválidas." }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const username = typeof payload.username === "string" ? payload.username : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    if (!username || !password || username.length > 120 || password.length > 256) {
      return NextResponse.json({ success: false, error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    if (!verifyAdminCredentials(username, password)) {
      const { error: attemptError } = await supabase.from("admin_login_attempts").insert({
        ip_hash: ipHash,
        succeeded: false,
      });
      if (attemptError) throw new Error("Não foi possível registrar a tentativa de autenticação.");
      return NextResponse.json({ success: false, error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    const { error: successError } = await supabase.from("admin_login_attempts").insert({
      ip_hash: ipHash,
      succeeded: true,
    });
    if (successError) throw new Error("Não foi possível registrar a autenticação.");
    await createAdminSession();

    await supabase.from("admin_login_attempts")
      .delete()
      .lt("attempted_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inglorious admin login failed:", error);
    return NextResponse.json({ success: false, error: "Não foi possível iniciar a sessão." }, { status: 500 });
  }
}
