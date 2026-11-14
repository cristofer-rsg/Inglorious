import { getDashboardData } from "@/lib/dashboard";
import SiteNav from "@/components/site-nav";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export default async function HomePage() {
  const data = await getDashboardData();
  const topThree = data.ranking.slice(0, 3);
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter((player) => player !== undefined);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Inglorious início">
          <span className="brand-mark">I</span>
          <span><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span>
        </a>
        <div className="connection">
          <span className={data.connected ? "status-dot online" : "status-dot"} />
          {data.connected ? "CLÃ CONECTADO" : "AGUARDANDO CONEXÃO"}
        </div>
      </header>
      <SiteNav active="/" />

      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">CLASH OF CLANS · {data.monthLabel.toUpperCase()}</span>
          <h1>HONRA.<br /><em>ESTRATÉGIA.</em><br />GLÓRIA.</h1>
          <p>O desempenho do clã Inglorious, acompanhado em tempo real.</p>
          <a className="primary-link" href="#ranking">ACOMPANHAR RANKING <span>↗</span></a>
        </div>
        <div className="hero-emblem" aria-hidden="true">
          <div className="emblem-ring"><span>I</span></div>
          <i />
        </div>
      </section>

      {!data.connected && (
        <div className="connection-alert">
          <strong>Os dados do clã ainda não estão disponíveis.</strong>
          <span>{data.error ?? "Configure as variáveis de ambiente do servidor para conectar o Supabase."}</span>
        </div>
      )}

      <section className="metrics" aria-label="Resumo do clã">
        <article className="metric-card featured"><span>♛</span><small>PONTOS DO LÍDER</small><strong>{formatNumber(data.leaderPoints)}</strong><i>NO MÊS ATUAL</i></article>
        <article className="metric-card"><span>♟</span><small>JOGADORES ATIVOS</small><strong>{formatNumber(data.activePlayers)}</strong><i>MEMBROS DO CLÃ</i></article>
        <article className="metric-card"><span>▤</span><small>EVENTOS</small><strong>{formatNumber(data.eventCount)}</strong><i>REGISTRADOS NO MÊS</i></article>
      </section>

      <section className="ranking-section" id="ranking">
        <div className="section-heading">
          <div><span className="eyebrow">DISPUTA DO MÊS</span><h2>Ranking em destaque</h2></div>
          <span className="month-pill">{data.monthLabel}</span>
        </div>
        {topThree.length > 0 ? (
          <div className="podium-grid">
            {podiumOrder.map((player) => (
              <article className={`podium-place podium-rank-${player.position}`} key={player.tag || player.player}>
                <span className="podium-medal">{player.position === 1 ? "♛" : player.position === 2 ? "Ⅱ" : "Ⅲ"}</span>
                <strong className="podium-player">{player.player}</strong>
                <small className="podium-tag">{player.tag || "TAG NÃO INFORMADA"}</small>
                <strong className="podium-points">{formatNumber(player.total)} <small>PTS</small></strong>
                <span className="podium-step">{String(player.position).padStart(2, "0")}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span>⚔</span>
            <strong>O campo está pronto.</strong>
            <p>O ranking será exibido assim que os jogadores e eventos forem sincronizados.</p>
          </div>
        )}
      </section>

      <footer className="footer"><span>INGLORIOUS</span><span>CLÃ · #2RVQ9YGRY</span><span>GESTÃO INDEPENDENTE</span></footer>
    </main>
  );
}
