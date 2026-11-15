import SiteNav from "@/components/site-nav";
import { APP_CONFIG } from "@/lib/config";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { summarizeMembershipPeriods, type MembershipPeriod, type PlayerMembership } from "@/lib/membership";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Ainda no clã";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: APP_CONFIG.timeZone,
  }).format(new Date(value));
}

function formatDuration(milliseconds: number) {
  const totalHours = Math.max(0, Math.floor(milliseconds / 3_600_000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

export default async function ClanTimePage() {
  let players: PlayerMembership[] = [];
  let totalPeriods = 0;
  let firstRecordedAt: string | null = null;
  let error = "";

  try {
    const supabase = createSupabaseAdmin();
    const { data, error: queryError } = await supabase
      .from("clan_membership_periods")
      .select("id,player_tag,player_name,joined_at,left_at,entry_source,exit_source")
      .order("joined_at", { ascending: true });

    if (queryError) throw new Error(queryError.message);

    const periods = (data ?? []) as MembershipPeriod[];
    totalPeriods = periods.length;
    firstRecordedAt = periods.reduce<string | null>((earliest, period) =>
      !earliest || period.joined_at < earliest ? period.joined_at : earliest, null,
    );
    players = summarizeMembershipPeriods(periods, Date.now());
  } catch {
    error = "Não foi possível consultar o histórico de permanência. Verifique a conexão com o banco de dados.";
  }

  const activeCount = players.filter((player) => player.isActive).length;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/Inglorious/"><span className="brand-mark">I</span><span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <a className="back-link" href="/Inglorious/">← Início</a>
      </header>
      <SiteNav active="/clan-time" />
      <section className="admin-content history-content tenure-content">
        <span className="auth-kicker">HISTÓRICO DE PERMANÊNCIA</span>
        <h1>Tempo <em>de Clã</em></h1>
        <p className="tenure-intro">Acompanhe quanto tempo cada jogador acumulou no Inglorious. Quando alguém sai, o período é encerrado; quando retorna, um novo período começa e o tempo anterior continua somando.</p>

        {error && <div className="connection-alert"><b>Não foi possível carregar o Tempo de Clã.</b><span>{error}</span></div>}

        <div className="tenure-summary">
          <article className="tenure-summary-registered"><small>Jogadores registrados</small><strong>{players.length}</strong></article>
          <article className="tenure-summary-active"><small>No clã agora</small><strong>{activeCount}</strong></article>
          <article className="tenure-summary-inactive"><small>Fora do clã (saíram)</small><strong>{Math.max(0, players.length - activeCount)}</strong></article>
        </div>

        {firstRecordedAt && <div className="tenure-notice">Base histórica disponível a partir de <b>{formatDate(firstRecordedAt)}</b>. O tempo anterior a esse primeiro registro não é estimado. As entradas e saídas passam a ser contabilizadas pelas sincronizações automáticas do clã.</div>}

        <div className="history-section-title"><h2>Ranking de permanência</h2><span>{players.length} JOGADORES</span></div>
        <div className="tenure-list">
          {players.map((player, index) => <article className="tenure-player-card" key={player.tag}>
            <div className="tenure-player-top">
              <div className="tenure-player-heading">
                <span className="tenure-position">{index + 1}</span>
                <div className="tenure-identity"><strong>{player.name}</strong><small>{player.tag}</small></div>
              </div>
              <span className={player.isActive ? "tenure-status" : "tenure-status inactive"}>{player.isActive ? "● NO CLÃ" : "○ FORA DO CLÃ"}</span>
              <div className="tenure-duration"><strong>{formatDuration(player.accumulatedMs)}</strong><small>TEMPO ACUMULADO</small></div>
            </div>
            <div className="tenure-meta">
              <span><b>Primeira entrada</b><strong>{formatDate(player.firstEntry)}</strong></span>
              <span><b>Entrada mais recente</b><strong>{formatDate(player.latestEntry)}</strong></span>
              <span><b>Períodos registrados</b><strong>{player.periods.length}</strong></span>
              <span><b>Última saída</b><strong>{formatDate(player.lastExit)}</strong></span>
            </div>
            <details className="tenure-history"><summary>Ver histórico de permanência ({player.periods.length})</summary>
              <div className="tenure-history-list">{player.periods.map((period) => <div className="tenure-history-item" key={period.id}>
                <span>Entrada: {formatDate(period.joined_at)}</span><strong>{period.left_at ? `Saída: ${formatDate(period.left_at)}` : "Em andamento"}</strong>
              </div>)}</div>
            </details>
          </article>)}
          {players.length === 0 && <div className="tenure-empty">Ainda não há períodos de permanência registrados.</div>}
        </div>
        <a className="back-link" href="/Inglorious/">← Voltar ao início</a>
      </section>
    </main>
  );
}
