import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminCredentials } from "@/lib/auth/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Credenciais inválidas." }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const username = typeof payload.username === "string" ? payload.username : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    if (!username || !password || username.length > 120 || password.length > 256) {
      return NextResponse.json({ success: false, error: "Credenciais inválidas." }, { status: 400 });
    }

    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json({ success: false, error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    await createAdminSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inglorious admin login failed:", error);
    return NextResponse.json({ success: false, error: "Não foi possível iniciar a sessão." }, { status: 500 });
  }
}
