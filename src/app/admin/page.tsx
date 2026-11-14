import Link from "next/link";
import SiteNav from "@/components/site-nav";
import AdminLoginForm from "./login-form";
import { getAdminSession } from "@/lib/auth/admin-session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = {
  success?: string;
  error?: string;
};

type AdminOverview = {
  activePlayers: number | null;
  eventCount: number | null;
  lastRosterSync: string | null;
  error: boolean;
};

type AdminPlayer = {
  id: string;
  name: string;
  player_tag: string | null;
};

type AnalyticsSummary = {
  total_views: number;
  unique_visitors: number;
  top_pages: Array<{ page_path: string; views: number }>;
  device_breakdown: Array<{ device_type: string; views: number }>;
};

type AdminEvent = {
  id: number;
  player: string;
  player_tag: string | null;
  category: string;
  activity: string;
  points: number;
  created_at: string;
};

async function getAdminOverview(): Promise<AdminOverview> {
  try {
    const supabase = createSupabaseAdmin();
    const [players, events, sync] = await Promise.all([
      supabase.from("players").select("name", { count: "exact", head: true }).eq("active", true),
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("clan_sync_state").select("synced_at").order("synced_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const failed = Boolean(players.error || events.error || sync.error);
    return {
      activePlayers: players.error ? null : players.count ?? 0,
      eventCount: events.error ? null : events.count ?? 0,
      lastRosterSync: sync.error ? null : sync.data?.synced_at ?? null,
      error: failed,
    };
  } catch {
    return { activePlayers: null, eventCount: null, lastRosterSync: null, error: true };
  }
}

async function getAdminAnalytics(): Promise<AnalyticsSummary | null> {
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

async function getAdminData() {
  const supabase = createSupabaseAdmin();
  const [playersResult, eventsResult] = await Promise.all([
    supabase.from("players").select("id,name,player_tag").order("name", { ascending: true }),
    supabase.from("events").select("id,player,player_tag,category,activity,points,created_at")
      .order("created_at", { ascending: false }).limit(100),
  ]);

  if (playersResult.error || eventsResult.error) {
    return { players: [] as AdminPlayer[], events: [] as AdminEvent[], error: true };
  }

  const players = (playersResult.data ?? []) as AdminPlayer[];
  const events = ((eventsResult.data ?? []) as AdminEvent[])
    .filter((event) => event.activity.startsWith("MANUAL:")
      || event.activity.startsWith("TROPAS_DOADAS: manual -"))
    .slice(0, 20);

  return { players, events, error: false };
}

function formatSyncDate(value: string | null) {
  if (!value) return "Ainda não executada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: process.env.APP_TIME_ZONE || "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: process.env.APP_TIME_ZONE || "America/Sao_Paulo",
  }).format(new Date(value));
}

function editableActivity(event: AdminEvent) {
  if (event.activity.startsWith("TROPAS_DOADAS: manual -")) {
    return event.activity.slice("TROPAS_DOADAS: manual -".length).trim();
  }
  return event.activity.replace(/^MANUAL:\s*/, "");
}

function editableCategory(event: AdminEvent) {
  return event.points < 0 ? "Penalidade" : event.category;
}

function editablePoints(event: AdminEvent) {
  return event.category === "Doações" ? event.points : Math.abs(event.points);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [session, params] = await Promise.all([getAdminSession(), searchParams]);
  const [overview, adminData, analytics] = session
    ? await Promise.all([getAdminOverview(), getAdminData(), getAdminAnalytics()])
    : [null, null, null];

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

          {params.success ? <div className="admin-success" role="status">{params.success}</div> : null}
          {params.error ? <div className="admin-error" role="alert">{params.error}</div> : null}

          <div className="admin-section-heading"><h2>Visão geral do clã</h2><span>CONSULTA SOMENTE LEITURA</span></div>
          <div className="admin-cards admin-overview-grid">
            <article><strong>Jogadores ativos</strong><b>{overview?.activePlayers ?? "—"}</b><span>Cadastro atual de jogadores marcados como ativos.</span></article>
            <article><strong>Eventos registrados</strong><b>{overview?.eventCount ?? "—"}</b><span>Lançamentos automáticos e manuais no banco independente.</span></article>
            <article><strong>Última sincronização</strong><b className="admin-sync-value">{formatSyncDate(overview?.lastRosterSync ?? null)}</b><span>Último registro de sincronização do roster.</span></article>
          </div>
          {overview?.error || adminData?.error ? <div className="connection-alert"><strong>Leitura parcial</strong><span>Não foi possível consultar todos os indicadores e lançamentos. Verifique a conexão com o Supabase.</span></div> : null}

          <div className="admin-section-heading"><h2>Análise de acessos</h2><span>ÚLTIMOS 30 DIAS</span></div>
          {analytics ? (
            <>
              <div className="admin-cards admin-overview-grid">
                <article><strong>Visualizações</strong><b>{new Intl.NumberFormat("pt-BR").format(analytics.total_views)}</b><span>Páginas abertas nos últimos 30 dias.</span></article>
                <article><strong>Visitantes distintos</strong><b>{new Intl.NumberFormat("pt-BR").format(analytics.unique_visitors)}</b><span>Identificadores anônimos por hash protegido.</span></article>
              </div>
              <div className="admin-analytics-grid">
                <article><h3>Páginas mais acessadas</h3>
                  {analytics.top_pages.length > 0 ? analytics.top_pages.map((page) => <div className="admin-analytics-row" key={page.page_path}><span>{page.page_path}</span><strong>{new Intl.NumberFormat("pt-BR").format(page.views)}</strong></div>) : <p>Sem acessos registrados no período.</p>}
                </article>
                <article><h3>Acessos por dispositivo</h3>
                  {analytics.device_breakdown.length > 0 ? analytics.device_breakdown.map((device) => <div className="admin-analytics-row" key={device.device_type}><span>{device.device_type}</span><strong>{new Intl.NumberFormat("pt-BR").format(device.views)}</strong></div>) : <p>Sem dados de dispositivo no período.</p>}
                </article>
              </div>
              <p className="admin-help">O sistema registra caminho da página, domínio de referência e tipo de dispositivo. O endereço IP não é armazenado; o identificador do visitante é gerado por hash HMAC.</p>
            </>
          ) : <div className="admin-empty">A análise de acessos ficará disponível após a configuração do segredo de hash e o primeiro acesso ao aplicativo.</div>}
          <a className="admin-export-link" href="/api/admin/export">Exportar histórico completo de eventos (CSV)</a>

          <div className="admin-section-heading"><h2>Lançar pontuação manual</h2><span>ADMINISTRADOR</span></div>
          <p className="admin-help">Os lançamentos manuais ficam identificados e podem ser editados ou excluídos nesta tela. Raide e Capital continuam sob sincronização automática para evitar duplicidade.</p>
          {adminData && adminData.players.length > 0 ? (
            <form className="admin-event-form" action="/api/admin/events" method="post">
              <input type="hidden" name="action" value="create" />
              <label><span>Jogador</span><select name="player_id" required>{adminData.players.map((player) => <option value={player.id} key={player.id}>{player.name}{player.player_tag ? ` · ${player.player_tag}` : ""}</option>)}</select></label>
              <label><span>Categoria</span><select name="category" defaultValue="Guerras"><option value="Guerras">Guerras</option><option value="Liga dos Clãs">Liga dos Clãs</option><option value="Doações">Doações</option><option value="Jogos do Clã">Jogos do Clã</option><option value="Penalidade">Penalidade</option></select></label>
              <label><span>Descrição</span><input name="activity" required minLength={2} maxLength={180} placeholder="Descreva o lançamento" /></label>
              <label><span>Pontos ou tropas</span><input name="points" type="number" required min={1} max={100000} defaultValue={5} /></label>
              <button type="submit">Salvar lançamento</button>
              <small>Doações: informe a quantidade de tropas. Jogos do Clã: use 10, 15, 20 ou 25. Penalidades: informe o valor positivo a descontar.</small>
            </form>
          ) : <div className="admin-empty">Nenhum jogador cadastrado para receber lançamentos.</div>}

          <div className="admin-section-heading"><h2>Editar e excluir lançamentos</h2><span>{adminData?.events.length ?? 0} REGISTROS MANUAIS</span></div>
          <div className="admin-manual-events">
            {adminData?.events.map((event) => (
              <details className="admin-event-item" key={event.id}>
                <summary>
                  <span><strong>{event.player}</strong><small>{event.category} · {formatEventDate(event.created_at)}</small></span>
                  <b className={event.points < 0 ? "negative" : ""}>{event.points < 0 ? "−" : "+"}{number(Math.abs(event.points))}{event.category === "Doações" ? " tropas" : " pts"}</b>
                </summary>
                <form className="admin-event-edit" action="/api/admin/events" method="post">
                  <input type="hidden" name="action" value="update" />
                  <input type="hidden" name="event_id" value={event.id} />
                  <label><span>Jogador</span><select name="player_id" defaultValue={adminData.players.find((player) => player.player_tag === event.player_tag)?.id ?? adminData.players[0]?.id}>{adminData.players.map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}</select></label>
                  <label><span>Categoria</span><select name="category" defaultValue={editableCategory(event)}><option value="Guerras">Guerras</option><option value="Liga dos Clãs">Liga dos Clãs</option><option value="Doações">Doações</option><option value="Jogos do Clã">Jogos do Clã</option><option value="Penalidade">Penalidade</option></select></label>
                  <label><span>Descrição</span><input name="activity" required minLength={2} maxLength={180} defaultValue={editableActivity(event)} /></label>
                  <label><span>Pontos ou tropas</span><input name="points" type="number" required min={1} max={100000} defaultValue={editablePoints(event)} /></label>
                  <button type="submit">Salvar alterações</button>
                </form>
                <form className="admin-event-delete" action="/api/admin/events" method="post">
                  <input type="hidden" name="action" value="delete" />
                  <input type="hidden" name="event_id" value={event.id} />
                  <label><input type="checkbox" name="confirm" value="yes" required /> Confirmo a exclusão permanente deste lançamento.</label>
                  <button type="submit">Excluir lançamento</button>
                </form>
              </details>
            ))}
            {adminData?.events.length === 0 ? <div className="admin-empty">Ainda não existem lançamentos manuais.</div> : null}
          </div>

          <div className="admin-section-heading"><h2>Automações</h2><span>AGUARDANDO ATIVAÇÃO</span></div>
          <div className="admin-cards">
            <article><strong>Sincronizações automáticas</strong><span>As sete rotas de sincronização estão implementadas e protegidas. Os agendamentos permanecem desativados até a etapa de publicação autorizada.</span></article>
            <article><strong>Dados automáticos</strong><span>Guerras, Liga, Raide, doações, Jogos do Clã, Capital e roster são tratados pelas rotas automáticas, sem lançamentos manuais duplicados.</span></article>
          </div>
          <form action="/api/admin/logout" method="post"><button type="submit">Encerrar sessão</button></form>
        </section>
      )}
      <footer className="footer"><span>INGLORIOUS · ADMIN</span><Link href="/">VOLTAR AO SITE</Link></footer>
    </main>
  );
}
