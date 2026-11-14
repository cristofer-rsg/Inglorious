import "server-only";

import SiteNav from "@/components/site-nav";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PerformanceRow = {
  player: string | null;
  player_tag: string | null;
  war_attacks: number | null;
  league_attacks: number | null;
  raid_attacks: number | null;
  donations: number | null;
  clan_games_points: number | null;
  capital_coins: number | null;
};

function monthKey() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

function number(value: number | null) {
  return new Intl.NumberFormat("pt-BR").format(Number(value ?? 0));
}

export default async function PerformancePage() {
  const currentMonth = monthKey();
  let rows: PerformanceRow[] = [];
  let error = "";

  try {
    const supabase = createSupabaseAdmin();
    const result = await supabase.from("player_monthly_performance")
      .select("player,player_tag,war_attacks,league_attacks,raid_attacks,donations,clan_games_points,capital_coins")
      .eq("month_key", currentMonth)
      .order("player", { ascending: true });
    if (result.error) throw new Error(result.error.message);
    rows = (result.data ?? []) as PerformanceRow[];
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Não foi possível carregar o desempenho.";
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="connection">DESEMPENHO MENSAL</span>
      </header>
      <SiteNav active="/performance" />
      <section className="page-heading"><span className="eyebrow">ATIVIDADE DOS JOGADORES</span><h1>Desempenho <em>mensal</em></h1><p>Esta área apresenta quantidades e registros, não pontos do ranking.</p></section>
      {error ? <div className="connection-alert"><strong>Dados indisponíveis</strong><span>{error}</span></div> : (
        <div className="performance-table-wrap">
          <table className="performance-table">
            <thead><tr><th>Jogador</th><th>Guerras</th><th>Liga</th><th>Raide</th><th>Doações</th><th>Jogos</th><th>Ouro</th></tr></thead>
            <tbody>
              {rows.map((row) => <tr key={row.player_tag ?? row.player ?? Math.random().toString(36)}>
                <th scope="row"><strong>{row.player ?? "Jogador"}</strong><small>{row.player_tag ?? ""}</small></th>
                <td>{number(row.war_attacks)}</td><td>{number(row.league_attacks)}</td><td>{number(row.raid_attacks)}</td><td>{number(row.donations)}</td><td>{number(row.clan_games_points)}</td><td>{number(row.capital_coins)}</td>
              </tr>)}
              {rows.length === 0 && <tr><td colSpan={7} className="table-empty">Nenhum registro de desempenho para este mês.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
