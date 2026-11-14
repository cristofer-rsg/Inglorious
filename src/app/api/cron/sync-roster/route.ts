import { NextResponse } from "next/server";

import { synchronizeCurrentRoster } from "@/lib/clan-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret)
    && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { members, result } = await synchronizeCurrentRoster();
    return NextResponse.json({
      success: true,
      clan: "Inglorious",
      members_received: members.length,
      synchronization: result,
      synchronized_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inglorious roster sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Falha inesperada na sincronização.",
      },
      { status: 500 },
    );
  }
}
