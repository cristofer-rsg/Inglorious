import SiteNav from "@/components/site-nav";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = { month?: string };

type ArchivedRankingRow = {
  id: number;
  month_key: string;
  player: string;
  player_tag: string | null;
  position: number;
  wars: number;
  league: number;
  donations: number;
  games: number;
  raid: number;
  capital: number;
  penalties: number;
  total: number;
};

function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function monthLabel(value: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value}-15T12:00:00Z`));
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  let months: string[] = [];
  let rows: ArchivedRankingRow[] = [];
  let selectedMonth = "";
  let error = "";

  try {
    const supabase = createSupabaseAdmin();
    const monthsResult = await supabase.from("monthly_rankings")
      .select("month_key")
      .is("archived_at", null)
      .order("month_key", { ascending: false })
      .limit(1000);

    if (monthsResult.error) throw new Error(monthsResult.error.message);
    months = [...new Set((monthsResult.data ?? [])
      .map((row) => row.month_key)
      .filter((value): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)))];

    selectedMonth = months.includes(params.month ?? "") ? params.month ?? "" : months[0] ?? "";
    if (selectedMonth) {
      const result = await supabase.from("monthly_rankings")
        .select("id,month_key,player,player_tag,position,wars,league,donations,games,raid,capital,penalties,total")
        .eq("month_key", selectedMonth)
        .is("archived_at", null)
        .order("position", { ascending: true });

      if (result.error) throw new Error(result.error.message);
      rows = (result.data ?? []) as ArchivedRankingRow[];
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Não foi possível carregar o histórico mensal.";
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="connection">TEMPORADAS ARQUIVADAS</span>
      </header>
      <SiteNav active="/history" />
      <section className="page-heading"><span className="eyebrow">MEMÓRIA DO CLÃ</span><h1>Histórico <em>mensal</em></h1><p>Classificações preservadas ao final de cada temporada.</p></section>
      {error ? <div className="connection-alert"><strong>Dados indisponíveis</strong><span>{error}</span></div> : (
        <>
          {months.length > 0 ? (
            <form className="history-filter" action="/history" method="get">
              <label htmlFor="history-month">Mês de referência</label>
              <select id="history-month" name="month" defaultValue={selectedMonth}>
                {months.map((month) => <option value={month} key={month}>{monthLabel(month)}</option>)}
              </select>
              <button type="submit">Consultar</button>
            </form>
          ) : null}
          {selectedMonth ? (
            <>
              <div className="section-heading"><div><span className="eyebrow">CLASSIFICAÇÃO ARQUIVADA</span><h2>{monthLabel(selectedMonth)}</h2></div><span className="month-pill">{number(rows.length)} jogadores</span></div>
              <div className="performance-table-wrap">
                <table className="performance-table history-table">
                  <thead><tr><th>Pos.</th><th>Jogador</th><th>Pontos</th><th>Guerras</th><th>Liga</th><th>Doações</th><th>Jogos</th><th>Raide</th><th>Capital</th><th>Penalidades</th></tr></thead>
                  <tbody>
                    {rows.map((row) => <tr key={row.id}>
                      <td>{number(row.position)}</td>
                      <th scope="row"><strong>{row.player}</strong><small>{row.player_tag ?? "TAG NÃO INFORMADA"}</small></th>
                      <td><strong>{number(row.total)}</strong></td>
                      <td>{number(row.wars)}</td><td>{number(row.league)}</td><td>{number(row.donations)}</td><td>{number(row.games)}</td><td>{number(row.raid)}</td><td>{number(row.capital)}</td><td>{number(row.penalties)}</td>
                    </tr>)}
                    {rows.length === 0 ? <tr><td colSpan={10} className="table-empty">Não há registros arquivados para este mês.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="empty-state"><span>⌛</span><strong>Nenhuma temporada arquivada</strong><p>O histórico será preenchido automaticamente no fechamento mensal, após a ativação autorizada das automações.</p></div>
          )}
        </>
      )}
    </main>
  );
}
