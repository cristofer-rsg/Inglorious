import "server-only";

import SiteNav from "@/components/site-nav";
import PerformanceFilters from "@/components/performance-filters";
import { APP_CONFIG } from "@/lib/config";
import { getPerformanceData, type PerformanceRow } from "@/lib/ghost-hunt/performance";

export const dynamic = "force-dynamic";

type SearchParams = {
  month?: string;
  q?: string;
  event?: string;
  situation?: string;
  order?: string;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");
const metrics = [
  { key: "wars", label: "Guerras", unit: "Ataques", points: "warsPoints", percent: "warsPercent", icon: "⚔" },
  { key: "league", label: "Liga", unit: "Ataques", points: "leaguePoints", percent: "leaguePercent", icon: "🏆" },
  { key: "raid", label: "Raide", unit: "Ataques", points: "raidPoints", percent: "raidPercent", icon: "🛡" },
  { key: "donations", label: "Doações", unit: "Tropas", points: "donationsPoints", percent: "donationsPercent", icon: "🤝" },
  { key: "games", label: "Jogos do Clã", unit: "Pontos", points: "gamesPoints", percent: "gamesPercent", icon: "🎮" },
  { key: "capital", label: "Capital", unit: "Moedas", points: "capitalPoints", percent: "capitalPercent", icon: "🏰" },
] as const;

type MetricKey = typeof metrics[number]["key"];
type EventKey = "war" | "league" | "raid";

function roleLabel(role: string) {
  const normalized = role.trim().toLocaleLowerCase("pt-BR").replaceAll("-", "_").replaceAll(" ", "_");
  if (normalized === "leader") return "LÍDER";
  if (normalized === "co_leader" || normalized === "coleader") return "CO-LÍDER";
  if (normalized === "member") return "MEMBRO";
  if (normalized === "elder") return "ANCIÃO";
  return role.toLocaleUpperCase("pt-BR");
}

function number(value: number) {
  return numberFormatter.format(value);
}

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

function eventAttacks(row: PerformanceRow, event: EventKey): number | null {
  if (event === "war") return row.lastWarAttacks;
  if (event === "league") return row.lastLeagueAttacks;
  return row.lastRaidAttacks ?? 0;
}

function eventLabel(event: EventKey) {
  if (event === "war") return "Última Guerra";
  if (event === "league") return "Última batalha da Liga";
  return "Última Raide";
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const currentMonth = monthKey();
  const requestedMonth = typeof params.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
    ? params.month
    : "";
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const event = ["war", "league", "raid"].includes(params.event ?? "") ? params.event as EventKey : "";
  const allowedSituations = event === "raid" ? ["attacked", "no-attack"] : ["attacked", "no-attack", "no-data"];
  const situation = event && allowedSituations.includes(params.situation ?? "") ? params.situation ?? "" : "";
  const order = params.order === "asc" ? "asc" : "desc";

  const data = await getPerformanceData(requestedMonth || undefined, true);
  const selectedMonth = data.months.includes(requestedMonth) ? requestedMonth : data.monthKey || currentMonth;
  const allRows = data.rows;
  const activeRows = allRows.filter((row) => row.active);
  const leadershipRows = activeRows.map((row) => ({
    ...row,
    roleLabel: row.role ? roleLabel(row.role) : "",
  })).sort((a, b) =>
    b.totalPoints - a.totalPoints
    || b.warsPoints - a.warsPoints
    || b.leaguePoints - a.leaguePoints
    || b.raidPoints - a.raidPoints
    || b.capitalPoints - a.capitalPoints
    || b.donationsPoints - a.donationsPoints
    || b.gamesPoints - a.gamesPoints
    || a.player.localeCompare(b.player, "pt-BR"),
  ).map((row, index) => ({ ...row, position: index + 1 }));

  const eventRows = event
    ? [...leadershipRows].sort((a, b) => {
      const left = eventAttacks(a, event);
      const right = eventAttacks(b, event);
      if (left === null) return right === null ? a.player.localeCompare(b.player, "pt-BR") : 1;
      if (right === null) return -1;
      return (order === "asc" ? left - right : right - left) || a.player.localeCompare(b.player, "pt-BR");
    })
    : leadershipRows;

  const filteredBySituation = eventRows.filter((row) => {
    if (!event || !situation) return true;
    const attacks = eventAttacks(row, event);
    if (situation === "attacked") return attacks !== null && attacks > 0;
    if (situation === "no-attack") return attacks === 0;
    return attacks === null;
  });
  const normalizedSearch = search.toLocaleLowerCase("pt-BR");
  const visibleRows = filteredBySituation.filter((row) =>
    !normalizedSearch
    || row.player.toLocaleLowerCase("pt-BR").includes(normalizedSearch)
    || row.tag.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
  );

  const totals = metrics.map((metric) => ({
    ...metric,
    value: activeRows.reduce((sum, row) => sum + row[metric.key as MetricKey], 0),
  }));
  const eventCounts = event ? {
    attacked: eventRows.filter((row) => {
      const attacks = eventAttacks(row, event);
      return attacks !== null && attacks > 0;
    }).length,
    noAttack: eventRows.filter((row) => eventAttacks(row, event) === 0).length,
    noData: eventRows.filter((row) => eventAttacks(row, event) === null).length,
  } : null;

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
          <p>Consulte a participação, os indicadores por atividade, as avaliações dos eventos recentes e as penalidades registradas. A classificação desta aba usa a pontuação oficial e seus critérios de desempate, sem alterar a aba Ranking e Pontos.</p>

          <PerformanceFilters
            months={data.months}
            selectedMonth={selectedMonth}
            search={search}
            selectedEvent={event}
            selectedSituation={situation}
            order={order}
            monthLabels={Object.fromEntries(data.months.map((month) => [month, monthLabel(month)]))}
          />

          {!data.connected ? (
            <div className="connection-alert"><strong>Dados indisponíveis</strong><span>{data.error ?? "Não foi possível carregar o desempenho."}</span></div>
          ) : (
            <>
              <div className="performance-period">{monthLabel(selectedMonth)}</div>
              {!event && (
                <>
                  <div className="history-section-title"><h2>Indicadores do clã</h2><span>{number(activeRows.length)} JOGADORES ATIVOS</span></div>
                  <div className="performance-totals">
                    {totals.map((metric) => <article key={metric.key}><small>{metric.label.toLocaleUpperCase("pt-BR")} · {metric.unit.toLocaleUpperCase("pt-BR")}</small><b>{number(metric.value)}</b><span>Total no mês</span></article>)}
                  </div>
                </>
              )}

              {event && eventCounts && (
                <>
                  <div className="history-section-title"><h2>{eventLabel(event)}</h2><span>EVENTO RECENTE</span></div>
                  <div className={event === "raid" ? "performance-activity-summary performance-activity-summary-raid" : "performance-activity-summary"}>
                    <article className="activity-summary-attacked"><small>Com ataques</small><b>{number(eventCounts.attacked)}</b><span>Jogadores</span></article>
                    <article className="activity-summary-no-attack"><small>Sem ataques</small><b>{number(eventCounts.noAttack)}</b><span>Registro confirmado</span></article>
                    {event !== "raid" && <article className="activity-summary-no-data"><small>Não Participou</small><b>{number(eventCounts.noData)}</b><span>Sem registro de participação</span></article>}
                  </div>
                </>
              )}

              <div className="history-section-title"><h2>{event ? "Avaliação dos jogadores" : "Desempenho dos jogadores"}</h2><span>{number(visibleRows.length)} JOGADORES</span></div>
              <p className="performance-result-count">{number(visibleRows.length)} de {number(filteredBySituation.length)} jogador(es){event ? ` • ${eventLabel(event)}` : " • Classificação por pontuação oficial"}</p>
              <div className="performance-list">
                {visibleRows.map((row) => {
                  const attacks = event ? eventAttacks(row, event) : null;
                  return (
                    <article className={event ? "performance-card performance-card-event" : "performance-card"} key={row.tag || row.player}>
                      <div className="performance-card-head">
                        <b>
                          <span className="performance-position-badge">{row.position}</span>
                          <span className="performance-player-name">{row.player}</span>
                          {row.roleLabel && <small className="performance-leader-role">{row.roleLabel}</small>}
                        </b>
                        {event ? (
                          <span className={attacks === null ? "performance-event-inline no-data" : attacks === 0 ? "performance-event-inline no-attack" : "performance-event-inline attacked"}>
                            {attacks === null ? "Não Participou" : `${number(attacks)} ${attacks === 1 ? "ataque" : "ataques"}`}
                          </span>
                        ) : null}
                      </div>
                      {!event && (
                        <>
                          <div className="performance-player-stats">
                            {metrics.map((metric) => {
                              const value = row[metric.key as MetricKey];
                              return (
                                <div className="performance-player-stat-row" key={metric.key}>
                                  <span className="performance-player-stat-label"><i aria-hidden="true">{metric.icon}</i>{metric.label}</span>
                                  <strong className="performance-player-stat-tile"><b>{number(value)}</b><small>{metric.unit}</small></strong>
                                </div>
                              );
                            })}
                          </div>
                          <small className={row.active ? "performance-status active" : "performance-status inactive"}>{row.active ? "ATIVO · NO CLÃ" : "INATIVO · FORA DO CLÃ"}</small>
                        </>
                      )}
                    </article>
                  );
                })}
                {visibleRows.length === 0 && <div className="empty-state"><b>Nenhum jogador encontrado</b><p>Não há jogadores correspondentes aos filtros selecionados.</p></div>}
              </div>
            </>
          )}
          <a className="back-link" href="/ranking">← Ver ranking oficial</a>
        </section>
        <footer className="footer"><span>INGLORIOUS <b>•</b> DESEMPENHO</span><span>{monthLabel(selectedMonth)}</span></footer>
      </section>
    </main>
  );
}
