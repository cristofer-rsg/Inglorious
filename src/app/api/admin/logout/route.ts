import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/auth/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  if (!origin || new URL(origin).origin !== requestUrl.origin) {
    return NextResponse.json({ success: false }, { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  await destroyAdminSession();
  return NextResponse.redirect(new URL("/admin", requestUrl.origin), { status: 303, headers: { "Cache-Control": "no-store, max-age=0" } });
}
