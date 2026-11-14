import "server-only";

import { timingSafeEqual } from "node:crypto";

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || !authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const received = Buffer.from(authorization, "utf8");

  return expected.length === received.length
    && timingSafeEqual(expected, received);
}
