import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const COOKIE_NAME = "inglorious_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUsername || !expectedPassword) return false;
  return safeEqual(username.trim(), expectedUsername) && safeEqual(password, expectedPassword);
}

export async function createAdminSession() {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const supabase = createSupabaseAdmin();
  const { error: cleanupError } = await supabase
    .from("device_sessions")
    .delete()
    .eq("role", "admin")
    .lte("expires_at", new Date().toISOString());
  if (cleanupError) throw new Error("Não foi possível limpar sessões administrativas expiradas.");

  const { error } = await supabase.from("device_sessions").insert({
    token_hash: digest(token),
    role: "admin",
    player_name: null,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error("Não foi possível criar a sessão administrativa.");

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("device_sessions")
    .select("role,player_name,expires_at")
    .eq("token_hash", digest(token))
    .eq("role", "admin")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return { role: data.role, playerName: data.player_name ?? "admin", expiresAt: data.expires_at };
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const supabase = createSupabaseAdmin();
    await supabase.from("device_sessions").delete().eq("token_hash", digest(token));
  }
  cookieStore.delete(COOKIE_NAME);
}
