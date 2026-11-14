import "server-only";

import SiteNav from "@/components/site-nav";
import { APP_CONFIG } from "@/lib/config";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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
      .filter((player) => {
        if (!search) return true;
        return player.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))
          || (player.player_tag ?? "").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"));
      })
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

    const metrics = ["wars", "league", "raid", "donations", "games", "capital"] as const;
    const maxima = Object.fromEntries(
      metrics.map((metric) => [metric, Math.max(0, ...baseRows.map((row) => row[metric]) )]),
    ) as Record<(typeof metrics)[number], number>;

    rows = baseRows.map((row) => {
      const index = metrics.reduce((total, metric) => {
        const maximum = maxima[metric];
        return total + (maximum > 0 ? (row[metric] / maximum) * 100 : 0);
      }, 0);
      return { ...row, activityIndex: Math.round(index * 10) / 10 };
    }).sort((a, b) =>
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
  const totals = rows.reduce((acc, row) => ({
    wars: acc.wars + row.wars,
    league: acc.league + row.league,
    raid: acc.raid + row.raid,
    donations: acc.donations + row.donations,
    games: acc.games + row.games,
    capital: acc.capital + row.capital,
  }), { wars: 0, league: 0, raid: 0, donations: 0, games: 0, capital: 0 });

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="connection">DESEMPENHO MENSAL</span>
      </header>
      <SiteNav active="/performance" />
      <section className="page-heading">
        <span className="eyebrow">ATIVIDADE DOS JOGADORES</span>
        <h1>Desempenho <em>mensal</em></h1>
        <p>Índice de atividade independente do ranking oficial. Cada uma das seis categorias contribui com até 100 pontos.</p>
      </section>

      <form className="performance-filters" action="/performance" method="get">
        <label>
          <span>Mês de referência</span>
          <select name="month" defaultValue={selectedMonth}>
            {months.map((month) => <option value={month} key={month}>{monthLabel(month)}</option>)}
          </select>
        </label>
        <label>
          <span>Buscar jogador</span>
          <input name="q" type="search" defaultValue={search} placeholder="Nome ou tag do jogador" />
        </label>
        <label>
          <span>Exibição</span>
          <select name="scope" defaultValue={activeOnly ? "active" : "all"}>
            <option value="all">Todos os jogadores</option>
            <option value="active">Somente membros ativos</option>
          </select>
        </label>
        <button type="submit">Aplicar filtros</button>
      </form>

      {error ? (
        <div className="connection-alert"><strong>Dados indisponíveis</strong><span>{error}</span></div>
      ) : (
        <>
          <section className="metrics performance-summary" aria-label="Totais de atividade do clã">
            <article className="metric-card"><span>⚔</span><small>GUERRAS · ATAQUES</small><strong>{number(totals.wars)}</strong><i>TOTAL NO MÊS</i></article>
            <article className="metric-card"><span>🛡</span><small>LIGA · ATAQUES</small><strong>{number(totals.league)}</strong><i>TOTAL NO MÊS</i></article>
            <article className="metric-card"><span>⛰</span><small>RAIDE · ATAQUES</small><strong>{number(totals.raid)}</strong><i>TOTAL NO MÊS</i></article>
            <article className="metric-card"><span>✦</span><small>DOAÇÕES · TROPAS</small><strong>{number(totals.donations)}</strong><i>TOTAL NO MÊS</i></article>
            <article className="metric-card"><span>🏆</span><small>JOGOS · PONTOS</small><strong>{number(totals.games)}</strong><i>TOTAL NO MÊS</i></article>
            <article className="metric-card"><span>🏰</span><small>CAPITAL · MOEDAS</small><strong>{number(totals.capital)}</strong><i>TOTAL NO MÊS</i></article>
          </section>

          <div className="section-heading">
            <div><span className="eyebrow">{monthLabel(selectedMonth).toUpperCase()}</span><h2>Ranking de desempenho</h2></div>
            <span className="month-pill">{number(rows.length)} jogadores</span>
          </div>

          <div className="performance-table-wrap">
            <table className="performance-table">
              <thead><tr><th>Pos.</th><th>Jogador</th><th>Índice / 600</th><th>Guerras</th><th>Liga</th><th>Raide</th><th>Doações</th><th>Jogos</th><th>Capital</th></tr></thead>
              <tbody>
                {rows.map((row, index) => <tr key={row.id}>
                  <td>{number(index + 1)}</td>
                  <th scope="row"><strong>{row.player}</strong><small>{row.tag}{row.active ? "" : " · Fora do clã"}</small></th>
                  <td><strong>{row.activityIndex.toFixed(1).replace(".", ",")}</strong></td>
                  <td>{number(row.wars)}</td><td>{number(row.league)}</td><td>{number(row.raid)}</td><td>{number(row.donations)}</td><td>{number(row.games)}</td><td>{number(row.capital)}</td>
                </tr>)}
                {rows.length === 0 && <tr><td colSpan={9} className="table-empty">Nenhum jogador encontrado para os filtros selecionados.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
