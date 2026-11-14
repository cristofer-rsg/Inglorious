import { getDashboardData } from "@/lib/dashboard";
import SiteNav from "@/components/site-nav";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  all?: string;
};

function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [data, params] = await Promise.all([getDashboardData(), searchParams]);
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const showAll = params.all === "1";
  const filteredRanking = data.ranking.filter((player) => !search
    || player.player.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))
    || player.tag.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const visibleRanking = search || showAll ? filteredRanking : filteredRanking.slice(0, 5);
  const showExpand = !search && !showAll && filteredRanking.length > 5;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="connection"><span className={data.connected ? "status-dot online" : "status-dot"} />{data.connected ? "CLÃ CONECTADO" : "AGUARDANDO CONEXÃO"}</span>
      </header>
      <SiteNav active="/ranking" />
      <section className="page-heading"><span className="eyebrow">TEMPORADA · {data.monthLabel.toUpperCase()}</span><h1>Ranking <em>geral</em></h1><p>Classificação mensal por pontuação oficial acumulada.</p></section>
      {!data.connected && <div className="connection-alert"><strong>Dados indisponíveis</strong><span>{data.error}</span></div>}

      <form className="ranking-search" action="/ranking" method="get">
        <label htmlFor="ranking-search-input">Buscar jogador pelo nome ou tag</label>
        <div><input id="ranking-search-input" name="q" type="search" defaultValue={search} placeholder="Digite o nome ou #TAG do jogador" /><button type="submit">Buscar</button></div>
      </form>

      <section className="ranking-list full-ranking">
        {visibleRanking.map((player) => (
          <article className={`ranking-row rank-${player.position}`} key={player.id}>
            <span className="position">{String(player.position).padStart(2, "0")}</span>
            <div className="player-info"><strong>{player.player}</strong><small>{player.tag || "TAG NÃO INFORMADA"}</small></div>
            <div className="player-score"><strong>{number(player.total)}</strong><small>PTS</small></div>
          </article>
        ))}
        {visibleRanking.length === 0 && <div className="empty-state"><span>♛</span><strong>Nenhum jogador encontrado</strong><p>Confira o nome ou a tag informada.</p></div>}
      </section>

      {showExpand ? (
        <a className="ranking-expand" href="/ranking?all=1">Ver classificação completa ({number(filteredRanking.length)} jogadores)</a>
      ) : null}
      {showAll && !search ? <a className="ranking-expand" href="/ranking">Mostrar somente os cinco primeiros</a> : null}
    </main>
  );
}
