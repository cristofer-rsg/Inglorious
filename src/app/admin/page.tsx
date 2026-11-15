import Link from "next/link";
import AdminNavigation from "@/components/admin-navigation";
import AdminLoginForm from "./login-form";
import { getAdminSession } from "@/lib/auth/admin-session";

export const dynamic = "force-dynamic";

type SearchParams = {
  success?: string;
  error?: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [session, params] = await Promise.all([getAdminSession(), searchParams]);

  return (
    <main className="app-shell">
      <header className="topbar gh-topbar admin-header">
        <a className="brand" href="/Inglorious/">
          <span className="brand-mark">I</span>
          <span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN MANAGEMENT</small></span>
        </a>
        {session ? (
          <form className="admin-topbar-logout" action="/inglorious/api/admin/logout" method="post">
            <button type="submit">Sair</button>
          </form>
        ) : <span className="status"><span className="status-dot online" />ÁREA RESTRITA</span>}
      </header>
      {session ? <AdminNavigation current="/admin" /> : null}
      {!session ? (
        <section className="admin-content auth-card admin-panel">
          <span className="eyebrow">ACESSO PROTEGIDO</span>
          <h1>Administração <em>do clã</em></h1>
          <p>Entre com as credenciais administrativas configuradas no ambiente seguro do servidor.</p>
          <AdminLoginForm />
          {!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD ? (
            <div className="connection-alert"><strong>Configuração pendente</strong><span>As variáveis ADMIN_USERNAME e ADMIN_PASSWORD ainda precisam ser cadastradas no ambiente do servidor antes do primeiro acesso.</span></div>
          ) : null}
        </section>
      ) : (
        <section className="admin-content admin-panel admin-panel-wide">
          <span className="auth-kicker">SESSÃO SEGURA • ADMINISTRADOR</span>
          <h1>Central de <em>administração</em></h1>
          <p>Bem-vindo, {session.playerName}. Escolha uma ferramenta para consultar os registros do Inglorious.</p>
          {params.success ? <div className="admin-success" role="status">{params.success}</div> : null}
          {params.error ? <div className="admin-error" role="alert">{params.error}</div> : null}
          <div className="admin-tools">
            <Link className="admin-tool-card" href="/admin/analytics">
              <span>▥</span><div><b>Analytics do aplicativo</b><small>Visitantes, visualizações e páginas mais acessadas</small></div>
            </Link>
          </div>
          <section className="export-center" aria-labelledby="export-title">
            <div className="export-heading">
              <span className="auth-kicker">RELATÓRIOS E ARQUIVOS</span>
              <h2 id="export-title">Central de <em>exportações</em></h2>
              <p>Baixe uma cópia dos dados para conferência, arquivo ou análise externa.</p>
            </div>
            <div className="export-options">
              <a className="export-option export-csv" href="/Inglorious/api/admin/export">
                <span className="export-file-icon">CSV</span>
                <span className="export-option-copy"><b>Histórico completo em CSV</b><small>Registros automáticos preservados no Inglorious, com jogadores, categorias, atividades e pontuação.</small><small className="export-meta">.CSV · Compatível com planilhas e sistemas</small></span>
                <strong aria-hidden="true">↓</strong>
              </a>
            </div>
            <p className="export-footnote">O arquivo é gerado no momento da solicitação e exige sessão administrativa válida.</p>
          </section>
          <div className="admin-notice">
            <b>Recursos preservados</b>
            <span>Cadastros e lançamentos são recebidos pelas sincronizações automáticas do clã. A edição manual permanece desativada.</span>
          </div>
          <Link className="back-link" href="/Inglorious/">← Abrir ranking público</Link>
        </section>
      )}
      <footer className="footer"><span>INGLORIOUS · ADMIN</span><Link href="/Inglorious/">VOLTAR AO SITE</Link></footer>
    </main>
  );
}
