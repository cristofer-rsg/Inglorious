import Link from "next/link";
import { redirect } from "next/navigation";
import SiteNav from "@/components/site-nav";
import AdminLoginForm from "./login-form";
import { getAdminSession } from "@/lib/auth/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();

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
        <section className="admin-panel">
          <span className="eyebrow">SESSÃO AUTENTICADA</span>
          <h1>Painel <em>administrativo</em></h1>
          <p>Bem-vindo, {session.playerName}. A sessão expira automaticamente em 12 horas.</p>
          <div className="admin-cards">
            <article><strong>Sincronizações</strong><span>As rotinas permanecem desativadas até autorização de ativação.</span></article>
            <article><strong>Dados do clã</strong><span>Consultas administrativas serão liberadas após a auditoria de permissões.</span></article>
            <article><strong>Controles</strong><span>Nenhuma operação manual ou alteração de pontuação está habilitada nesta etapa.</span></article>
          </div>
          <form action="/api/admin/logout" method="post"><button formAction="/api/admin/logout" type="submit">Encerrar sessão</button></form>
        </section>
      )}
      <footer className="footer"><span>INGLORIOUS · ADMIN</span><Link href="/">VOLTAR AO SITE</Link></footer>
    </main>
  );
}
