import Link from "next/link";
import SiteNav from "@/components/site-nav";
import AdminLoginForm from "./login-form";
import { getAdminSession } from "@/lib/auth/admin-session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AdminOverview = {
  activePlayers: number | null;
  pendingAccounts: number | null;
  approvedAccounts: number | null;
  lastRosterSync: string | null;
  error: boolean;
};

async function getAdminOverview(): Promise<AdminOverview> {
  try {
    const supabase = createSupabaseAdmin();
    const [players, pending, approved, sync] = await Promise.all([
      supabase.from("players").select("name", { count: "exact", head: true }).eq("active", true),
      supabase.from("player_accounts").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("player_accounts").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("clan_sync_state").select("synced_at").order("synced_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const failed = Boolean(players.error || pending.error || approved.error || sync.error);
    return {
      activePlayers: players.error ? null : players.count ?? 0,
      pendingAccounts: pending.error ? null : pending.count ?? 0,
      approvedAccounts: approved.error ? null : approved.count ?? 0,
      lastRosterSync: sync.error ? null : sync.data?.synced_at ?? null,
      error: failed,
    };
  } catch {
    return { activePlayers: null, pendingAccounts: null, approvedAccounts: null, lastRosterSync: null, error: true };
  }
}

function formatSyncDate(value: string | null) {
  if (!value) return "Ainda não executada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: process.env.APP_TIME_ZONE || "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminPage() {
  const session = await getAdminSession();
  const overview = session ? await getAdminOverview() : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span><strong>INGLORIOUS</strong><small>ADMIN CONTROL</small></span></a>
        <span className="connection">ÁREA RESTRITA</span>
      </header>
      <SiteNav active="/admin" />
      {!session ? (
        <section className="admin-panel">
          <span className="eyebrow">ACESSO PROTEGIDO</span>
          <h1>Administração <em>do clã</em></h1>
          <p>Entre com as credenciais administrativas configuradas no ambiente seguro do servidor.</p>
          <AdminLoginForm />
          {!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD ? (
            <div className="connection-alert"><strong>Configuração pendente</strong><span>As variáveis ADMIN_USERNAME e ADMIN_PASSWORD ainda precisam ser cadastradas no ambiente do servidor antes do primeiro acesso.</span></div>
          ) : null}
        </section>
      ) : (
        <section className="admin-panel admin-panel-wide">
          <span className="eyebrow">SESSÃO AUTENTICADA</span>
          <h1>Painel <em>administrativo</em></h1>
          <p>Bem-vindo, {session.playerName}. A sessão expira automaticamente em 12 horas.</p>
          <div className="admin-section-heading"><h2>Visão geral do clã</h2><span>CONSULTA SOMENTE LEITURA</span></div>
          <div className="admin-cards admin-overview-grid">
            <article><strong>Jogadores ativos</strong><b>{overview?.activePlayers ?? "—"}</b><span>Cadastro atual de jogadores marcados como ativos.</span></article>
            <article><strong>Contas pendentes</strong><b>{overview?.pendingAccounts ?? "—"}</b><span>Solicitações aguardando aprovação administrativa.</span></article>
            <article><strong>Contas aprovadas</strong><b>{overview?.approvedAccounts ?? "—"}</b><span>Contas de jogadores liberadas para acesso.</span></article>
            <article><strong>Última sincronização</strong><b className="admin-sync-value">{formatSyncDate(overview?.lastRosterSync ?? null)}</b><span>Último registro de sincronização do roster.</span></article>
          </div>
          {overview?.error ? <div className="connection-alert"><strong>Leitura parcial</strong><span>Não foi possível consultar todos os indicadores. Verifique a conexão e as permissões do banco.</span></div> : null}
          <div className="admin-section-heading"><h2>Automações</h2><span>INATIVAS</span></div>
          <div className="admin-cards">
            <article><strong>Sincronizações automáticas</strong><span>As sete rotas estão implementadas e protegidas, mas não foram agendadas nem ativadas.</span></article>
            <article><strong>Operações administrativas</strong><span>Este painel está em modo somente leitura. Nenhuma alteração manual de jogadores, eventos ou pontuação está disponível.</span></article>
          </div>
          <form action="/api/admin/logout" method="post"><button type="submit">Encerrar sessão</button></form>
        </section>
      )}
      <footer className="footer"><span>INGLORIOUS · ADMIN</span><Link href="/">VOLTAR AO SITE</Link></footer>
    </main>
  );
}
