import "server-only";

import SiteNav from "@/components/site-nav";
import { APP_CONFIG } from "@/lib/config";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type MembershipRow = {
  player_tag: string;
  player_name: string;
  currently_in_clan: boolean;
  total_days: number;
  total_seconds: number;
  first_joined_at: string | null;
  latest_joined_at: string | null;
  membership_periods: number;
  has_open_period: boolean;
};

function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: APP_CONFIG.timeZone,
  }).format(new Date(value));
}

export default async function MembersPage() {
  let rows: MembershipRow[] = [];
  let error = "";

  try {
    const supabase = createSupabaseAdmin();
    const result = await supabase
      .from("clan_membership_summary")
      .select("player_tag,player_name,currently_in_clan,total_days,total_seconds,first_joined_at,latest_joined_at,membership_periods,has_open_period")
      .order("currently_in_clan", { ascending: false })
      .order("total_seconds", { ascending: false })
      .order("player_tag", { ascending: true });

    if (result.error) throw new Error(result.error.message);
    rows = (result.data ?? []) as MembershipRow[];
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Não foi possível carregar o histórico de permanência.";
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="status"><span className="status-dot online" />MEMBROS DO CLÃ</span>
      </header>
      <SiteNav active="/clan-time" />
      <section className="content gh-content">
        <section className="admin-content history-content">
          <span className="auth-kicker">CADASTRO E SITUAÇÃO DOS JOGADORES</span>
          <h1>Jogadores <em>do clã</em></h1>
          <p>Consulte o status atual e os períodos de permanência registrados para cada jogador.</p>
          {error ? <div className="connection-alert"><strong>Dados indisponíveis</strong><span>{error}</span></div> : <>
            <div className="history-section-title"><h2>Lista de membros</h2><span>{number(rows.length)} JOGADORES</span></div>
            <div className="history-ranking">
              {rows.map((row, index) => <article key={row.player_tag}>
                <b className="history-position">{index + 1}</b>
                <div className="history-player"><strong>{row.player_name}</strong><small>{row.player_tag}</small>
                  <small>{row.membership_periods} período(s) registrado(s) · Primeira entrada: {date(row.first_joined_at)}</small>
                </div>
                <strong className={row.currently_in_clan ? "member-status active" : "member-status inactive"}>{row.currently_in_clan ? "NO CLÃ" : "FORA DO CLÃ"}</strong>
              </article>)}
              {rows.length === 0 && <div className="empty-state"><b>Nenhum jogador registrado</b><p>O histórico será preenchido pela sincronização automática do roster.</p></div>}
            </div>
          </>}
          <a className="back-link" href="/clan-time">← Ver tempo de clã</a>
        </section>
        <footer className="footer"><span>INGLORIOUS <b>•</b> MEMBROS</span><span>Cadastro automático</span></footer>
      </section>
    </main>
  );
}
