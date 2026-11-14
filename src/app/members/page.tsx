import "server-only";

import SiteNav from "@/components/site-nav";
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
    timeZone: "America/Sao_Paulo",
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
      .order("total_seconds", { ascending: false });

    if (result.error) throw new Error(result.error.message);
    rows = (result.data ?? []) as MembershipRow[];
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Não foi possível carregar o histórico de permanência.";
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="connection">HISTÓRICO DO CLÃ</span>
      </header>
      <SiteNav active="/members" />
      <section className="page-heading">
        <span className="eyebrow">TEMPO DE CASA</span>
        <h1>Histórico de <em>membros</em></h1>
        <p>O tempo de permanência é acumulado por períodos: pausa quando o jogador sai e continua quando retorna.</p>
      </section>
      {error ? (
        <div className="connection-alert"><strong>Dados indisponíveis</strong><span>{error}</span></div>
      ) : (
        <div className="performance-table-wrap">
          <table className="performance-table">
            <thead><tr><th>Jogador</th><th>Status</th><th>Dias no clã</th><th>Entradas</th><th>Primeira entrada</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.player_tag}>
                  <th scope="row"><strong>{row.player_name}</strong><small>{row.player_tag}</small></th>
                  <td><span className={row.currently_in_clan ? "member-status active" : "member-status inactive"}>{row.currently_in_clan ? "No clã" : "Fora do clã"}</span></td>
                  <td>{number(row.total_days)}</td>
                  <td>{number(row.membership_periods)}</td>
                  <td>{date(row.first_joined_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="table-empty">O histórico será preenchido após a primeira sincronização automática do clã.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
