import { getDashboardData } from "@/lib/dashboard";
import SiteNav from "@/components/site-nav";
import HomeRankingList from "@/components/home-ranking-list";

export const dynamic = "force-dynamic";

function getPreviousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function RankingPage() {
  const data = await getDashboardData();
  const previousData = await getDashboardData(getPreviousMonthKey(data.monthKey));
  const previousWinners = previousData.connected ? previousData.ranking.filter((player) => player.position <= 2) : [];
  const winnerTags = new Set(previousWinners.map((player) => player.tag.trim().toUpperCase()).filter(Boolean));
  const winnerNames = new Set(previousWinners.map((player) => player.player.trim().toLocaleLowerCase("pt-BR")));
  const ranking = data.ranking
    .filter((player) => !winnerTags.has(player.tag.trim().toUpperCase())
      && !winnerNames.has(player.player.trim().toLocaleLowerCase("pt-BR")))
    .map((player, index) => ({ ...player, position: index + 1 }));

  return (
    <main className="app-shell gh-home gh-home-v2">
      <header className="topbar">
        <a className="brand" href="/Inglorious/"><span className="brand-mark">I</span><span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className={data.connected ? "status" : "status status-offline"}><span className="status-dot" />{data.connected ? "CLÃ CONECTADO" : "AGUARDANDO CONEXÃO"}</span>
      </header>
      <SiteNav active="/ranking" />
      <section className="content gh-content gh-home-content">
        <section className="admin-content history-content">
          <span className="auth-kicker">CLASSIFICAÇÃO OFICIAL • TEMPORADA ATUAL</span>
          <h1>Ranking <em>do clã</em></h1>
          <p>Acompanhe a pontuação dos jogadores, consulte os detalhes por categoria e veja quem está liderando o mês.</p>
          {!data.connected && <div className="connection-alert"><b>Não foi possível carregar o ranking.</b><span>Confira a conexão do servidor com o Supabase.</span>{data.error && <small>{data.error}</small>}</div>}
          <div className="gh-v2-full-ranking-head"><div><small>CLASSIFICAÇÃO GERAL</small><h3>Todos os jogadores</h3></div><span>{data.monthLabel.toUpperCase()}</span></div>
          <div className="ranking-panel">
            <div className="ranking-head"><span>JOGADOR</span><span>PONTUAÇÃO</span></div>
            {ranking.length ? <HomeRankingList players={ranking} /> : <div className="empty-state"><span className="empty-icon">♜</span><b>{data.connected ? "Ainda não há jogadores classificados" : "Conectando os dados do clã"}</b><p>O ranking será exibido assim que os dados estiverem disponíveis.</p></div>}
          </div>
          <a className="back-link" href="/Inglorious/">← Voltar ao início</a>
        </section>
        <footer className="footer"><span>INGLORIOUS <b>•</b> RANKING</span><span>{data.monthLabel}</span></footer>
      </section>
    </main>
  );
}
