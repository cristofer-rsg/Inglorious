import Link from "next/link";
import AdminNavigation from "@/components/admin-navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type AnalyticsSummary = {
  total_views: number;
  unique_visitors: number;
  top_pages: Array<{ page_path: string; views: number }>;
  device_breakdown: Array<{ device_type: string; views: number }>;
};

async function getAnalytics(): Promise<AnalyticsSummary | null> {
  try {
    const supabase = createSupabaseAdmin();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.rpc("get_inglorious_analytics_summary", { p_since: since });
    if (error || !data || typeof data !== "object") return null;
    return data as AnalyticsSummary;
  } catch {
    return null;
  }
}

function format(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export default async function AdminAnalyticsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin");
  const analytics = await getAnalytics();

  return (
    <main className="app-shell">
      <header className="topbar gh-topbar admin-header">
        <a className="brand" href="/Inglorious/"><span className="brand-mark">I</span><span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN MANAGEMENT</small></span></a>
        <form className="admin-topbar-logout" action="/inglorious/api/admin/logout" method="post"><button type="submit">Sair</button></form>
      </header>
      <AdminNavigation current="/admin/analytics" />
      <section className="admin-content admin-panel admin-panel-wide analytics-content">
        <span className="auth-kicker">SESSÃO SEGURA • ESTATÍSTICAS DO SITE</span>
        <h1>Analytics <em>do Inglorious</em></h1>
        <p>Acompanhe os acessos, descubra as páginas mais visitadas e veja de onde vêm os visitantes.</p>
        <div className="analytics-status">
          <span className="analytics-status-dot" aria-hidden="true" />
          <div><b>Analytics integrado ao Inglorious</b><small>As visitas públicas são registradas de forma agregada. Áreas administrativas e login ficam fora da coleta.</small></div>
        </div>
        {analytics ? (
          <>
            <div className="analytics-kpis">
              <article><span>Visitantes únicos</span><strong>{format(analytics.unique_visitors)}</strong><small>Nos últimos 30 dias</small></article>
              <article><span>Visualizações</span><strong>{format(analytics.total_views)}</strong><small>Páginas públicas acessadas</small></article>
            </div>
            <div className="analytics-breakdown-grid">
              <section className="analytics-list-card"><h3>Páginas mais acessadas</h3>
                {analytics.top_pages.length ? <ol>{analytics.top_pages.map((page) => <li key={page.page_path}><div><span>{page.page_path}</span><b>{format(page.views)}</b></div></li>)}</ol> : <p className="analytics-empty">Sem acessos registrados no período.</p>}
              </section>
              <section className="analytics-list-card"><h3>Acessos por dispositivo</h3>
                {analytics.device_breakdown.length ? <ol>{analytics.device_breakdown.map((device) => <li key={device.device_type}><div><span>{device.device_type}</span><b>{format(device.views)}</b></div></li>)}</ol> : <p className="analytics-empty">Sem dados de dispositivo no período.</p>}
              </section>
            </div>
          </>
        ) : <div className="admin-empty">A análise de acessos ficará disponível após a configuração do segredo de hash e o primeiro acesso ao aplicativo.</div>}
        <p className="analytics-privacy">O sistema registra caminho da página, domínio de referência e tipo de dispositivo. O endereço IP não é armazenado; o identificador do visitante é gerado por hash HMAC.</p>
        <Link className="back-link" href="/admin">← Voltar à administração</Link>
      </section>
      <footer className="footer"><span>INGLORIOUS · ADMIN</span><Link href="/Inglorious/">VOLTAR AO SITE</Link></footer>
    </main>
  );
}
