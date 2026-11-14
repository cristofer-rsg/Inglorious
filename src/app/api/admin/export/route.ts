import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin-session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportEvent = {
  id: number;
  player: string;
  player_tag: string | null;
  category: string;
  activity: string;
  points: number;
  created_at: string;
  battle_time: string | null;
};

function csvCell(value: string | number | null) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdmin();
    const rows: ExportEvent[] = [];
    const pageSize = 1000;

    for (let offset = 0; offset < 100000; offset += pageSize) {
      const { data, error } = await supabase
        .from("events")
        .select("id,player,player_tag,category,activity,points,created_at,battle_time")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) throw new Error(error.message);
      const page = (data ?? []) as ExportEvent[];
      rows.push(...page);
      if (page.length < pageSize) break;
    }

    const header = ["ID", "Jogador", "TAG", "Categoria", "Atividade", "Pontos ou tropas", "Criado em", "Horário da batalha"];
    const lines = [
      header.map(csvCell).join(";"),
      ...rows.map((row) => [
        row.id,
        row.player,
        row.player_tag,
        row.category,
        row.activity,
        row.points,
        row.created_at,
        row.battle_time,
      ].map(csvCell).join(";")),
    ];

    return new NextResponse(`\uFEFF${lines.join("\r\n")}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="inglorious-eventos.csv"',
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Não foi possível gerar a planilha." }, { status: 500 });
  }
}
