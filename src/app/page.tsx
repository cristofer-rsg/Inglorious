import { getDashboardData } from "@/lib/dashboard";
import SiteNav from "@/components/site-nav";
import HomeRankingList from "@/components/home-ranking-list";
import ClanCommunityCard from "@/components/clan-community-card";
import { APP_CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";

function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: APP_CONFIG.timeZone,
  }).format(new Date(value));
}

export default async function HomePage() {
  const data = await getDashboardData();
  const topThree = data.ranking.slice(0, 3);
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter((player) => player !== undefined);
  const metrics = [
    { icon: "♛", label: "PONTOS DO LÍDER", value: number(data.leaderPoints), note: "No mês atual", tone: "gold" },
    { icon: "♟", label: "JOGADORES ATIVOS", value: number(data.activePlayers), note: "Membros do clã", tone: "neutral" },
    { icon: "⚔", label: "JOGADORES NO RANKING", value: number(data.ranking.length), note: "Classificados no mês", tone: "neutral" },
    { icon: "▤", label: "ATIVIDADES", value: number(data.eventCount), note: "Eventos registrados", tone: "neutral" },
  ];

  return (
    <main className="app-shell gh-home gh-home-v2">
      <header className="topbar gh-topbar">
        <a className="brand" href="/Inglorious/" aria-label="Inglorious início">
          <span className="brand-mark">I</span>
          <span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span>
        </a>
        <div className="topbar-right">
          <span className={data.connected ? "status" : "status status-offline"}>
            <span className="status-dot" /> {data.connected ? "CLÃ CONECTADO" : "AGUARDANDO CONEXÃO"}
          </span>
          <a className="avatar" href="/Inglorious/admin" aria-label="Acesso administrativo">IG</a>
        </div>
      </header>
      <SiteNav active="/" />

      <section className="content gh-content gh-home-content">
        <section className="gh-v2-hero">
          <div className="gh-v2-hero-art gh-v2-castle-art" aria-hidden="true">
            <svg className="gh-v2-castle" viewBox="0 0 420 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="ingCastleGold" x1="210" y1="18" x2="210" y2="282" gradientUnits="userSpaceOnUse"><stop stopColor="#F2D99C"/><stop offset=".48" stopColor="#C49A4D"/><stop offset="1" stopColor="#765326"/></linearGradient>
                <linearGradient id="ingCastleGlow" x1="210" y1="40" x2="210" y2="270" gradientUnits="userSpaceOnUse"><stop stopColor="#E7C77F" stopOpacity=".34"/><stop offset="1" stopColor="#A87932" stopOpacity=".02"/></linearGradient>
              </defs>
              <path d="M45 263H375" stroke="#D9B56E" strokeOpacity=".42" strokeWidth="2"/>
              <path d="M73 263V157H116V112H151V157H177V92H243V157H269V112H304V157H347V263H73Z" fill="url(#ingCastleGlow)" stroke="url(#ingCastleGold)" strokeWidth="2.4"/>
              <path d="M62 157V126H78V112H94V126H110V157M139 157V91H155V75H171V91H187V157M233 157V91H249V75H265V91H281V157M310 157V126H326V112H342V126H358V157" fill="#241B10" stroke="url(#ingCastleGold)" strokeWidth="2.2" strokeLinejoin="round"/>
              <path d="M177 92V53H194V36H210V53H227V92" fill="#302314" stroke="url(#ingCastleGold)" strokeWidth="2.4" strokeLinejoin="round"/>
              <path d="M210 36V13L239 23L210 31" fill="#D8B36C" fillOpacity=".85"/>
              <path d="M151 75V39L167 48L151 54M265 75V39L281 48L265 54" stroke="#D8B36C" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M193 263V220C193 205 201 194 210 194C219 194 227 205 227 220V263" fill="#17120D" stroke="#D8B36C" strokeWidth="2"/>
              <path d="M91 180H110V205H91V180ZM145 180H164V205H145V180ZM256 180H275V205H256V180ZM310 180H329V205H310V180Z" fill="#E0BE79" fillOpacity=".32" stroke="#D8B36C" strokeOpacity=".72" strokeWidth="1.5"/>
              <path d="M49 263L73 243H347L371 263" stroke="#D8B36C" strokeOpacity=".55" strokeWidth="1.5"/>
            </svg>
            <span className="gh-v2-castle-halo" />
          </div>
          <div className="gh-v2-hero-copy">
            <div className="gh-v2-welcome-row">
              <div className="gh-v2-eyebrow"><span className="gh-v2-live-dot" /> BEM-VINDO, GUERREIRO <span>•</span> {data.monthLabel.toUpperCase()}</div>
              <a className="gh-v2-switch-clan" href="https://ghosthunt.com.br/" aria-label="Voltar à página de escolha dos clãs">⇄ <span>TROCAR CLÃ</span></a>
            </div>
            <h1>BEM-VINDO,<br/><em>INGLÓRIO</em></h1>
            <p>O desempenho do Ghost Hunt em um só lugar.</p>
            <a className="gh-v2-hero-link" href="/Inglorious/ranking">ACOMPANHAR RANKING <b>↗</b></a>
          </div>
          <div className="gh-v2-season-stamp"><small>TEMPORADA</small><strong>{data.monthLabel.split(" de ")[0].slice(0,3).toUpperCase()}</strong><span>{data.monthLabel.split(" de ")[1] ?? ""}</span></div>
        </section>

        {!data.connected && <div className="connection-alert"><b>Dados do clã temporariamente indisponíveis.</b><span>Confira a conexão com o Supabase.</span>{data.error && <small>{data.error}</small>}</div>}

        <section className="gh-v2-stats" aria-label="Resumo do clã">
          {metrics.map((metric) => <article className={`gh-v2-stat ${metric.tone}`} key={metric.label}>
            <span className="gh-v2-stat-icon">{metric.icon}</span>
            <div><small>{metric.label}</small><strong>{metric.value}</strong><span>{metric.note}</span></div>
          </article>)}
        </section>

        <section className="gh-v2-season-strip">
          <div className="gh-v2-season-emblem">♜</div>
          <div><small>TEMPORADA EM ANDAMENTO</small><strong>{data.monthLabel}</strong><span>Participe, some pontos e dispute o topo.</span></div>
          <a href="/Inglorious/rules">VER REGRAS <b>›</b></a>
        </section>

        <ClanCommunityCard />

        <section className="gh-v2-section gh-v2-ranking-section" id="ranking">
          <div className="gh-v2-section-head"><div><small>DISPUTA DO MÊS</small><h2>Ranking em destaque</h2></div><a href="/Inglorious/ranking">VER TUDO ↗</a></div>
          <div className="gh-v2-podium">
            {podiumOrder.length ? podiumOrder.map((player) => (
              <a className={`gh-v2-podium-card rank-${player.position}`} href="/Inglorious/ranking" key={player.id}>
                <span className="gh-v2-medal">{player.position === 1 ? "👑" : player.position === 2 ? "🥈" : "🥉"}</span>
                <span className="gh-v2-player-avatar">{player.player.slice(0,1).toUpperCase()}</span>
                <b>{player.player}</b><strong>{number(player.total)} <small>PTS</small></strong><span className="gh-v2-rank-label">{player.position}º LUGAR</span>
              </a>
            )) : <p className="recent-members-empty">{data.connected ? "O pódio aparecerá quando houver jogadores classificados." : "Aguardando conexão para carregar o ranking."}</p>}
          </div>
          <div className="gh-v2-full-ranking-head"><div><small>CLASSIFICAÇÃO GERAL</small><h3>Todos os jogadores</h3></div><span>{data.monthLabel.toUpperCase()}</span></div>
          <section className="ranking-panel">
            <div className="ranking-head"><span>JOGADOR</span><span>PONTUAÇÃO</span></div>
            {data.ranking.length ? <HomeRankingList players={data.ranking} /> : <div className="empty-state"><span className="empty-icon">♜</span><b>{data.connected ? "Ainda não há jogadores classificados" : "Conectando os dados do clã"}</b><p>O ranking será exibido assim que houver dados sincronizados.</p></div>}
          </section>
        </section>

        <section className="recent-members-panel gh-recent gh-v2-recent">
          <div className="recent-members-heading"><div><p className="overline">CHEGARAM RECENTEMENTE</p><h2>Novos membros</h2></div><span>{number(data.newMembers.length)} RECENTES</span></div>
          {data.newMembers.length ? <div className="recent-members-list">{data.newMembers.map((member) => <article key={member.playerTag}>
            <span className="recent-member-shield">♜</span><div><b>{member.playerName}</b><small>{member.playerTag}</small></div>
            <time>{shortDate(member.enteredAt)}</time><strong>NOVO</strong>
          </article>)}</div> : <p className="recent-members-empty">Nenhuma nova entrada identificada nos últimos 30 dias.</p>}
        </section>
        <footer className="footer"><span>INGLORIOUS <b>•</b> CENTRAL DO CLÃ</span><span>Dados do Supabase • Atualizado ao abrir</span></footer>
      </section>
    </main>
  );
}
