import SiteNav from "@/components/site-nav";
import { APP_CONFIG } from "@/lib/config";
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
    timeZone: APP_CONFIG.timeZone,
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
        <a className="brand" href="/"><span className="brand-mark">I</span><span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="status"><span className="status-dot online" />TEMPORADAS ARQUIVADAS</span>
      </header>
      <SiteNav active="/history" />
      <section className="content gh-content">
        <section className="admin-content history-content">
          <span className="auth-kicker">MEMÓRIA DO CLÃ • TEMPORADAS ARQUIVADAS</span>
          <h1>Histórico <em>mensal</em></h1>
          <p>Consulte classificações preservadas ao final de cada temporada e confira a pontuação por categoria.</p>
          {error && <div className="connection-alert"><b>Não foi possível carregar o histórico.</b><span>{error}</span></div>}
          {months.length > 0 && <form className="history-filter" action="/history" method="get">
            <label htmlFor="history-month">Mês de referência</label>
            <select id="history-month" name="month" defaultValue={selectedMonth}>{months.map((month) => <option value={month} key={month}>{monthLabel(month)}</option>)}</select>
            <button type="submit">Consultar</button>
          </form>}
          {selectedMonth ? <>
            <div className="history-section-title"><h2>{monthLabel(selectedMonth)}</h2><span>{number(rows.length)} JOGADORES</span></div>
            <div className="history-ranking">
              {rows.map((row) => <article key={row.id}>
                <b className="history-position">{row.position}</b>
                <div className="history-player"><strong>{row.player}</strong><small>{row.player_tag ?? "TAG NÃO INFORMADA"}</small>
                  <small>Guerras {number(row.wars)} · Liga {number(row.league)} · Doações {number(row.donations)} · Jogos {number(row.games)} · Raide {number(row.raid)} · Capital {number(row.capital)}</small>
                  {row.penalties > 0 && <small className="history-penalty">Penalidades: −{number(row.penalties)} pontos</small>}
                </div>
                <strong className="history-total">{number(row.total)} pts</strong>
              </article>)}
              {rows.length === 0 && <div className="empty-state"><b>Nenhuma temporada arquivada</b><p>Não há registros preservados para este mês.</p></div>}
            </div>
          </> : <div className="empty-state"><span>⌛</span><strong>Nenhuma temporada arquivada</strong><p>O histórico será preenchido automaticamente no fechamento mensal.</p></div>}
          <a className="back-link" href="/ranking">← Voltar ao ranking</a>
        </section>
        <footer className="footer"><span>INGLORIOUS <b>•</b> HISTÓRICO</span><span>Temporadas arquivadas</span></footer>
      </section>
    </main>
  );
}
