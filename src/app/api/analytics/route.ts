import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

import { hasSameOrigin } from "@/lib/auth/request-origin";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getDeviceType(userAgent: string): "mobile" | "desktop" | "tablet" | "unknown" {
  if (!userAgent) return "unknown";
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
  if (/android|iphone|ipod|mobile/i.test(userAgent)) return "mobile";
  return "desktop";
}

function getReferrerHost(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.slice(0, 160) || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const secret = process.env.ANALYTICS_HASH_SECRET
    ?? process.env.AUTH_RATE_LIMIT_SECRET
    ?? process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ success: false }, { status: 503 });

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 2048) {
      return NextResponse.json({ success: false }, { status: 413 });
    }

    const body: unknown = JSON.parse(rawBody);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const path = (body as Record<string, unknown>).path;
    if (typeof path !== "string" || !path.startsWith("/") || path.includes("?") || path.length > 200) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = request.headers.get("x-real-ip")?.trim() || forwardedFor || "unknown";
    const userAgent = request.headers.get("user-agent") ?? "";
    const visitorHash = createHmac("sha256", secret).update(`${ip}|${userAgent}`).digest("hex");
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("site_analytics_events").insert({
      visitor_hash: visitorHash,
      page_path: path,
      referrer_host: getReferrerHost(request.headers.get("referer")),
      device_type: getDeviceType(userAgent),
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
