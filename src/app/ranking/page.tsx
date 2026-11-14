import { getDashboardData } from "@/lib/dashboard";
import SiteNav from "@/components/site-nav";
import RankingList from "@/components/ranking-list";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const data = await getDashboardData();
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className={data.connected ? "status" : "status status-offline"}><span className="status-dot" />{data.connected ? "CLÃ CONECTADO" : "AGUARDANDO CONEXÃO"}</span>
      </header>
      <SiteNav active="/ranking" />
      <section className="content gh-content">
        <section className="admin-content history-content">
          <span className="auth-kicker">CLASSIFICAÇÃO OFICIAL • TEMPORADA ATUAL</span>
          <h1>Ranking <em>do clã</em></h1>
          <p>Acompanhe a pontuação dos jogadores, consulte os detalhes por categoria e veja quem está liderando o mês.</p>
          {!data.connected && <div className="connection-alert"><b>Não foi possível carregar o ranking.</b><span>Confira a conexão do servidor com o Supabase.</span>{data.error && <small>{data.error}</small>}</div>}
          <div className="history-section-title"><h2>Classificação de {data.monthLabel}</h2><span>{data.ranking.length} JOGADORES</span></div>
          <div className="ranking-panel">
            <div className="ranking-head"><span>JOGADOR</span><span>PONTUAÇÃO</span></div>
            {data.ranking.length ? <RankingList players={data.ranking} /> : <div className="empty-state"><span className="empty-icon">♜</span><b>{data.connected ? "Ainda não há jogadores classificados" : "Conectando os dados do clã"}</b><p>O ranking será exibido assim que os dados estiverem disponíveis.</p></div>}
          </div>
          <a className="back-link" href="/">← Voltar ao início</a>
        </section>
        <footer className="footer"><span>INGLORIOUS <b>•</b> RANKING</span><span>{data.monthLabel}</span></footer>
      </section>
    </main>
  );
}
