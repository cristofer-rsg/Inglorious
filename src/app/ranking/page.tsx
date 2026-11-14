import { getDashboardData } from "@/lib/dashboard";
import SiteNav from "@/components/site-nav";

export const dynamic = "force-dynamic";

function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export default async function RankingPage() {
  const data = await getDashboardData();

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="connection"><span className={data.connected ? "status-dot online" : "status-dot"} />{data.connected ? "CLÃ CONECTADO" : "AGUARDANDO CONEXÃO"}</span>
      </header>
      <SiteNav active="/ranking" />
      <section className="page-heading"><span className="eyebrow">TEMPORADA · {data.monthLabel.toUpperCase()}</span><h1>Ranking <em>geral</em></h1><p>Classificação mensal por pontuação acumulada.</p></section>
      {!data.connected && <div className="connection-alert"><strong>Dados indisponíveis</strong><span>{data.error}</span></div>}
      <section className="ranking-list full-ranking">
        {data.ranking.map((player) => (
          <article className={`ranking-row rank-${player.position}`} key={player.id}>
            <span className="position">{String(player.position).padStart(2, "0")}</span>
            <div className="player-info"><strong>{player.player}</strong><small>{player.tag || "TAG NÃO INFORMADA"}</small></div>
            <div className="player-score"><strong>{number(player.total)}</strong><small>PTS</small></div>
          </article>
        ))}
        {data.ranking.length === 0 && <div className="empty-state"><span>♛</span><strong>Nenhum resultado neste mês</strong><p>Os jogadores elegíveis aparecerão aqui após a sincronização.</p></div>}
      </section>
    </main>
  );
}
