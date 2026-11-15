import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/auth/admin-session";
import { hasSameOrigin } from "@/lib/auth/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ success: false }, { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } });
  }

  try {
    await destroyAdminSession();
    return NextResponse.redirect(new URL("https://ghosthunt.com.br/inglorious/admin"), { status: 303, headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ success: false }, { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
