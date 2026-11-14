import { redirect } from "next/navigation";
import SiteNav from "@/components/site-nav";
import { getAdminSession } from "@/lib/auth/admin-session";
import { APP_CONFIG } from "@/lib/config";
import { getZonedMonthBounds } from "@/lib/time";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = { month?: string; category?: string };
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
type HistoryEvent = {
  id: number;
  player: string;
  player_tag: string | null;
  category: string;
  activity: string;
  points: number;
  created_at: string;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_CONFIG.timeZone,
  }).format(new Date(value));
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin");

  const params = await searchParams;
  let months: string[] = [];
  let rows: ArchivedRankingRow[] = [];
  let events: HistoryEvent[] = [];
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
      .filter((value): value is string => typeof value === "string" && /^\\d{4}-(0[1-9]|1[0-2])$/.test(value)))];

    selectedMonth = months.includes(params.month ?? "") ? params.month ?? "" : months[0] ?? "";
    if (selectedMonth) {
      const bounds = getZonedMonthBounds(selectedMonth, APP_CONFIG.timeZone);
      const [rankingResult, activityResult] = await Promise.all([
        supabase.from("monthly_rankings")
          .select("id,month_key,player,player_tag,position,wars,league,donations,games,raid,capital,penalties,total")
          .eq("month_key", selectedMonth)
          .is("archived_at", null)
          .order("position", { ascending: true }),
        supabase.from("events")
          .select("id,player,player_tag,category,activity,points,created_at")
          .gte("created_at", bounds.start)
          .lt("created_at", bounds.end)
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);
      if (rankingResult.error) throw new Error(rankingResult.error.message);
      if (activityResult.error) throw new Error(activityResult.error.message);
      rows = (rankingResult.data ?? []) as ArchivedRankingRow[];
      events = (activityResult.data ?? []) as HistoryEvent[];
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Não foi possível carregar o histórico mensal.";
  }

  const categories = [...new Set(events.map((event) => event.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  const selectedCategory = categories.includes(params.category ?? "") ? params.category ?? "todas" : "todas";
  const filteredEvents = selectedCategory === "todas"
    ? events
    : events.filter((event) => event.category === selectedCategory);

  return (
    <main className="app-shell">
      <header className="topbar gh-topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN MANAGEMENT</small></span></a>
        <span className="status"><span className="status-dot online" />ÁREA RESTRITA</span>
      </header>
      <SiteNav active="/history" />
      <section className="content gh-content">
        <section className="admin-content history-content">
          <span className="auth-kicker">ÁREA RESTRITA • ADMINISTRADOR</span>
          <h1>Histórico <em>mensal</em></h1>
          <p>Consulte a classificação final e os lançamentos preservados no Supabase.</p>
          {error && <div className="connection-alert"><b>Não foi possível carregar o histórico.</b><span>{error}</span></div>}
          {months.length > 0 && <form className="history-filter" action="/history" method="get">
            <label htmlFor="history-month">Mês de referência</label>
            <select id="history-month" name="month" defaultValue={selectedMonth}>{months.map((month) => <option value={month} key={month}>{monthLabel(month)}</option>)}</select>
            <label htmlFor="history-category">Filtrar lançamentos por categoria</label>
            <select id="history-category" name="category" defaultValue={selectedCategory}>
              <option value="todas">Todas as categorias</option>
              {categories.map((category) => <option value={category} key={category}>{category}</option>)}
            </select>
            <button type="submit">Consultar</button>
          </form>}
          {selectedMonth ? <>
            <div className="history-section-title"><h2>Ranking de {monthLabel(selectedMonth)}</h2><span>{rows.length ? "CLASSIFICAÇÃO ARQUIVADA" : "SEM CLASSIFICAÇÃO"}</span></div>
            <div className="history-ranking">
              {rows.map((row) => <article key={row.id}>
                <b className="history-position">{row.position}</b>
                <div className="history-player"><strong>{row.player}</strong><small>{row.player_tag ?? "TAG NÃO INFORMADA"}</small>
                  <small>Guerras {number(row.wars)} · Liga {number(row.league)} · Doações {number(row.donations)} · Jogos {number(row.games)} · Raide {number(row.raid)} · Capital {number(row.capital)}</small>
                  {row.penalties > 0 && <small className="history-penalty">Penalidades: −{number(row.penalties)} pontos</small>}
                </div>
                <strong className="history-total">{number(row.total)} pts</strong>
              </article>)}
              {!rows.length && <p>Não há classificação arquivada para este mês.</p>}
            </div>
            <div className="history-section-title"><h2>Lançamentos</h2><span>{number(filteredEvents.length)} REGISTROS</span></div>
            <div className="history-events">
              {filteredEvents.map((event) => <article key={event.id}>
                <div><b>{event.player}</b><small>{formatDate(event.created_at)} · {event.category}</small><p>{event.activity}</p></div>
                <strong className={event.points < 0 ? "negative" : ""}>{event.points < 0 ? "−" : "+"}{number(Math.abs(event.points))} pts</strong>
              </article>)}
              {!filteredEvents.length && <p>{events.length ? "Nenhum lançamento encontrado nesta categoria." : "Nenhum lançamento neste mês."}</p>}
            </div>
          </> : <div className="empty-state"><strong>Nenhuma temporada arquivada</strong><p>O histórico será preenchido automaticamente no fechamento mensal.</p></div>}
          <a className="back-link" href="/admin">← Voltar à administração</a>
        </section>
        <footer className="footer"><span>INGLORIOUS <b>•</b> HISTÓRICO</span><span>Área administrativa</span></footer>
      </section>
    </main>
  );
}
