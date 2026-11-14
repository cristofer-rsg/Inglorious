import "server-only";

import SiteNav from "@/components/site-nav";
import { APP_CONFIG } from "@/lib/config";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { addActivityIndex } from "@/lib/performance";

export const dynamic = "force-dynamic";

type SearchParams = {
  month?: string;
  q?: string;
  scope?: string;
};

type PlayerRow = {
  id: string;
  name: string;
  player_tag: string | null;
  active: boolean | null;
};

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

type PlayerPerformance = {
  id: string;
  player: string;
  tag: string;
  active: boolean;
  wars: number;
  league: number;
  raid: number;
  donations: number;
  games: number;
  capital: number;
  activityIndex: number;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

function monthKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

function monthLabel(value: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: APP_CONFIG.timeZone,
  }).format(new Date(`${value}-15T12:00:00Z`));
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

function number(value: number) {
  return numberFormatter.format(value);
}

function safeCount(value: number | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const requestedMonth = typeof params.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
    ? params.month
    : "";
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const activeOnly = params.scope === "active";
  const currentMonth = monthKey();

  let rows: PlayerPerformance[] = [];
  let summaryTotals = { wars: 0, league: 0, raid: 0, donations: 0, games: 0, capital: 0 };
  let months = [currentMonth];
  let error = "";

  try {
    const supabase = createSupabaseAdmin();
    const [playersResult, monthsResult] = await Promise.all([
      supabase.from("players")
        .select("id,name,player_tag,active")
        .order("name", { ascending: true }),
      supabase.from("player_monthly_stats")
        .select("month_key")
        .order("month_key", { ascending: false })
        .limit(6000),
    ]);

    if (playersResult.error) throw new Error(playersResult.error.message);
    if (monthsResult.error) throw new Error(monthsResult.error.message);

    months = [...new Set([
      currentMonth,
      ...(monthsResult.data ?? [])
        .map((row) => row.month_key)
        .filter((value): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)),
    ])].sort((a, b) => b.localeCompare(a));

    const selectedMonth = months.includes(requestedMonth) ? requestedMonth : currentMonth;
    const [statsResult] = await Promise.all([
      supabase.from("player_monthly_performance")
        .select("player,player_tag,war_attacks,league_attacks,raid_attacks,donations,clan_games_points,capital_coins")
        .eq("month_key", selectedMonth),
    ]);

    if (statsResult.error) throw new Error(statsResult.error.message);

    const statsByTag = new Map<string, PerformanceRow>();
    for (const stat of (statsResult.data ?? []) as PerformanceRow[]) {
      const tag = (stat.player_tag ?? "").trim().toUpperCase();
      if (tag) statsByTag.set(tag, stat);
    }

    const players = (playersResult.data ?? []) as PlayerRow[];
    const baseRows = players
      .filter((player) => !activeOnly || player.active !== false)
      .map((player) => {
        const tag = (player.player_tag ?? "").trim().toUpperCase();
        const stat = tag ? statsByTag.get(tag) : undefined;
        return {
          id: player.id,
          player: player.name,
          tag: player.player_tag ?? "",
          active: player.active !== false,
          wars: safeCount(stat?.war_attacks ?? 0),
          league: safeCount(stat?.league_attacks ?? 0),
          raid: safeCount(stat?.raid_attacks ?? 0),
          donations: safeCount(stat?.donations ?? 0),
          games: safeCount(stat?.clan_games_points ?? 0),
          capital: safeCount(stat?.capital_coins ?? 0),
          activityIndex: 0,
        };
      });

    const rankedRows = addActivityIndex(baseRows);

    summaryTotals = rankedRows.reduce((acc, row) => ({
      wars: acc.wars + row.wars,
      league: acc.league + row.league,
      raid: acc.raid + row.raid,
      donations: acc.donations + row.donations,
      games: acc.games + row.games,
      capital: acc.capital + row.capital,
    }), summaryTotals);

    rows = rankedRows
      .filter((row) => !search
        || row.player.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))
        || row.tag.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")))
      .sort((a, b) =>
        b.activityIndex - a.activityIndex
        || b.wars - a.wars
        || b.league - a.league
        || b.raid - a.raid
        || b.donations - a.donations
        || b.games - a.games
        || b.capital - a.capital
        || a.player.localeCompare(b.player, "pt-BR"),
      );
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Não foi possível carregar o desempenho.";
  }

  const selectedMonth = months.includes(requestedMonth) ? requestedMonth : currentMonth;
  const totals = summaryTotals;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="status"><span className="status-dot online" />DESEMPENHO MENSAL</span>
      </header>
      <SiteNav active="/performance" />
      <section className="content gh-content">
        <section className="admin-content performance-content">
          <span className="auth-kicker">CONSULTA PÚBLICA • INDICADORES DO CLÃ</span>
          <h1>Desempenho <em>mensal</em></h1>
          <p>Consulte os indicadores de participação, os totais por atividade e a classificação de desempenho dos jogadores do Inglorious.</p>
          <form className="history-filter performance-filters" action="/performance" method="get">
            <label><span>Mês de referência</span><select name="month" defaultValue={selectedMonth}>{months.map((month) => <option value={month} key={month}>{monthLabel(month)}</option>)}</select></label>
            <label><span>Buscar jogador</span><input name="q" type="search" defaultValue={search} placeholder="Nome ou tag do jogador" /></label>
            <label><span>Exibição</span><select name="scope" defaultValue={activeOnly ? "active" : "all"}><option value="all">Todos os jogadores</option><option value="active">Somente membros ativos</option></select></label>
            <button type="submit">Aplicar filtros</button>
          </form>
          {error ? <div className="connection-alert"><strong>Dados indisponíveis</strong><span>{error}</span></div> : <>
            <div className="performance-period">{monthLabel(selectedMonth)}</div>
            <div className="history-section-title"><h2>Indicadores do clã</h2><span>{number(rows.length)} JOGADORES</span></div>
            <div className="performance-totals">
              <article><small>GUERRAS · ATAQUES</small><b>{number(totals.wars)}</b><span>Total no mês</span></article>
              <article><small>LIGA · ATAQUES</small><b>{number(totals.league)}</b><span>Total no mês</span></article>
              <article><small>RAIDE · ATAQUES</small><b>{number(totals.raid)}</b><span>Total no mês</span></article>
              <article><small>DOAÇÕES · TROPAS</small><b>{number(totals.donations)}</b><span>Total no mês</span></article>
              <article><small>JOGOS · PONTOS</small><b>{number(totals.games)}</b><span>Total no mês</span></article>
              <article><small>CAPITAL · MOEDAS</small><b>{number(totals.capital)}</b><span>Total no mês</span></article>
            </div>
            <div className="history-section-title"><h2>Desempenho dos jogadores</h2><span>{number(rows.length)} JOGADORES</span></div>
            <div className="performance-list">
              {rows.map((row, index) => <article className="performance-card" key={row.id}>
                <div className="performance-card-head">
                  <b><span className="performance-position-badge">{index + 1}</span><span className="performance-player-name">{row.player}</span></b>
                  <strong>{row.activityIndex.toFixed(1).replace(".", ",")}<small> / 600</small></strong>
                </div>
                <div className="performance-progress" role="img" aria-label={`Índice de atividade: ${row.activityIndex} de 600`}><span style={{ width: `${Math.min(row.activityIndex / 6, 100)}%` }} /></div>
                <div className="performance-player-stats">
                  {([
                    ["⚔", "Guerras", row.wars, "Ataques"],
                    ["🏆", "Liga", row.league, "Ataques"],
                    ["🛡", "Raide", row.raid, "Ataques"],
                    ["🤝", "Doações", row.donations, "Tropas"],
                    ["🎮", "Jogos do Clã", row.games, "Pontos"],
                    ["🏰", "Capital", row.capital, "Moedas"],
                  ] as const).map(([icon, label, value, unit]) => <div className="performance-player-stat-row" key={label}>
                    <span className="performance-player-stat-label"><i aria-hidden="true">{icon}</i>{label}</span>
                    <strong className="performance-player-stat-tile"><b>{number(value)}</b><small>{unit}</small></strong>
                  </div>)}
                </div>
                <small className={row.active ? "performance-status active" : "performance-status inactive"}>{row.active ? "ATIVO · NO CLÃ" : "INATIVO · FORA DO CLÃ"}</small>
              </article>)}
              {rows.length === 0 && <div className="empty-state"><b>Nenhum jogador encontrado</b><p>Não há jogadores correspondentes aos filtros selecionados.</p></div>}
            </div>
          </>}
          <a className="back-link" href="/ranking">← Ver ranking oficial</a>
        </section>
        <footer className="footer"><span>INGLORIOUS <b>•</b> DESEMPENHO</span><span>{monthLabel(selectedMonth)}</span></footer>
      </section>
    </main>
  );
}
