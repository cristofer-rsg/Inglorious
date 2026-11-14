import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/site-nav";
import { getPlayerProfile } from "@/lib/player-profile";
import { APP_CONFIG } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Perfil do jogador | Inglorious",
  description: "Pontuação mensal e histórico de atividade do jogador no Inglorious.",
};

type Props = { params: Promise<{ tag: string }> };
function fmt(value: number) { return new Intl.NumberFormat("pt-BR").format(value); }
function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_CONFIG.timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const metrics = [
  ["Guerras", "wars", "pontos"],
  ["Liga", "league", "pontos"],
  ["Doações", "donations", "pontos"],
  ["Jogos do clã", "games", "pontos"],
  ["Raide", "raid", "pontos"],
  ["Moedas da Capital", "capitalCoins", "moedas"],
] as const;

export default async function PlayerProfilePage({ params }: Props) {
  const { tag } = await params;
  let profile;
  try {
    profile = await getPlayerProfile(decodeURIComponent(tag));
  } catch {
    throw new Error("Não foi possível carregar o perfil deste jogador.");
  }
  if (!profile) notFound();

  return (
    <main className="app-shell player-profile-shell">
      <header className="topbar gh-topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <Link className="back-link" href="/ranking">← Ranking</Link>
      </header>
      <SiteNav active="/ranking" />
      <section className="content gh-content">
        <section className="admin-content player-profile-content">
          <span className="auth-kicker">PERFIL DO JOGADOR • {profile.monthLabel.toUpperCase()}</span>
          <div className="player-profile-hero">
            <span className="player-profile-avatar">{profile.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <h1>{profile.name}</h1>
              <p>{profile.tag}</p>
              <span className={profile.eligible ? "player-profile-status eligible" : "player-profile-status"}>{profile.eligible ? "ELEGÍVEL" : "NÃO ELEGÍVEL"}</span>
              {profile.role && <small className="performance-leader-role">{profile.role.toLocaleUpperCase("pt-BR")}</small>}
            </div>
          </div>
          <article className="player-profile-total"><small>PONTUAÇÃO DO MÊS</small><strong>{fmt(profile.total)} <i>pts</i></strong><span>{profile.monthLabel}</span></article>
          <div className="history-section-title"><h2>Resumo por categoria</h2><span>ACUMULADO DO MÊS</span></div>
          <div className="player-profile-metrics">
            {metrics.map(([label, key, unit]) => <article key={key}><small>{label}</small><b>{fmt(profile[key])}</b><span>{unit}</span></article>)}
          </div>
          {profile.penalties > 0 && <p className="player-profile-penalty">Penalidades no mês: <b>−{fmt(profile.penalties)} pts</b></p>}
          <div className="history-section-title"><h2>Histórico recente</h2><span>{profile.recentEvents.length} REGISTROS</span></div>
          <div className="history-events player-profile-events">
            {profile.recentEvents.map((event) => <article key={event.id}>
              <div><b>{event.category || "Lançamento"}</b><small>{date(event.created_at)}</small><p>{event.activity || "Sem descrição"}</p></div>
              <strong className={Number(event.points || 0) < 0 ? "negative" : ""}>{Number(event.points || 0) > 0 ? "+" : ""}{fmt(Number(event.points || 0))} pts</strong>
            </article>)}
            {!profile.recentEvents.length && <p>Nenhum lançamento encontrado para este jogador.</p>}
          </div>
          <Link className="back-link player-profile-back" href="/ranking">← Voltar ao ranking do clã</Link>
        </section>
        <footer className="footer"><span>INGLORIOUS <b>•</b> PERFIL DO JOGADOR</span><span>{profile.monthLabel}</span></footer>
      </section>
    </main>
  );
}
