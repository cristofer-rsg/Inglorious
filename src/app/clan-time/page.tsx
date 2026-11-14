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
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="connection">TEMPO DE CLÃ</span>
      </header>
      <SiteNav active="/clan-time" />
      <section className="page-heading">
        <span className="eyebrow">HISTÓRICO DE PERMANÊNCIA</span>
        <h1>Tempo <em>de clã</em></h1>
        <p>Acompanhe entradas, saídas e o tempo acumulado de cada jogador no Inglorious.</p>
      </section>

      {error ? <div className="connection-alert"><strong>Dados indisponíveis</strong><span>{error}</span></div> : (
        <>
          <div className="clan-time-metrics">
            <article><span>JOGADORES REGISTRADOS</span><strong>{players.length}</strong></article>
            <article><span>NO CLÃ AGORA</span><strong>{activeCount}</strong></article>
            <article><span>PERÍODOS REGISTRADOS</span><strong>{totalPeriods}</strong></article>
          </div>
          <div className="clan-time-notice">
            <strong>Base histórica disponível a partir de {formatDate(firstRecordedAt)}.</strong>
            <span>O tempo anterior ao primeiro registro não é estimado. As entradas e saídas futuras serão contabilizadas pelas sincronizações automáticas do clã.</span>
          </div>

          <div className="section-heading clan-time-heading">
            <div><span className="eyebrow">CLASSIFICAÇÃO</span><h2>Ranking de permanência</h2></div>
            <span className="month-pill">{players.length} jogadores</span>
          </div>

          <div className="clan-time-list">
            {players.map((player, index) => (
              <article className="clan-time-card" key={player.tag}>
                <div className="clan-time-card-head">
                  <span className={`clan-time-position position-${index + 1}`}>{index + 1}</span>
                  <div className="clan-time-player"><strong>{player.name}</strong><small>{player.tag}</small></div>
                  <div className="clan-time-total"><strong>{formatDuration(player.accumulatedMs)}</strong><small>TEMPO ACUMULADO</small></div>
                  <span className={player.isActive ? "clan-time-status active" : "clan-time-status inactive"}>{player.isActive ? "NO CLÃ" : "FORA DO CLÃ"}</span>
                </div>
                <div className="clan-time-details">
                  <div><small>Primeira entrada</small><strong>{formatDate(player.firstEntry)}</strong></div>
                  <div><small>Entrada mais recente</small><strong>{formatDate(player.latestEntry)}</strong></div>
                  <div><small>Períodos registrados</small><strong>{player.periods.length}</strong></div>
                  <div><small>Última saída</small><strong>{formatDate(player.lastExit)}</strong></div>
                </div>
                <details className="clan-time-history">
                  <summary>Ver histórico de permanência ({player.periods.length})</summary>
                  <ol>
                    {player.periods.map((period) => (
                      <li key={period.id}>
                        <span><strong>{formatDate(period.joined_at)}</strong><small>Entrada · {period.entry_source}</small></span>
                        <span><strong>{formatDate(period.left_at)}</strong><small>{period.left_at ? `Saída · ${period.exit_source ?? "registrada"}` : "Permanência atual"}</small></span>
                      </li>
                    ))}
                  </ol>
                </details>
              </article>
            ))}
            {players.length === 0 ? <div className="empty-state"><span>⌛</span><strong>Nenhum período registrado</strong><p>O histórico será preenchido pelas sincronizações automáticas do roster.</p></div> : null}
          </div>
        </>
      )}
    </main>
  );
}
