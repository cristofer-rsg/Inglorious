import type { ReactNode } from "react";
import SiteNav from "@/components/site-nav";

function PointRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rules-point-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function RulesTable({
  title,
  rows,
  penalties = false,
}: {
  title: string;
  rows: { label: string; value: string }[];
  penalties?: boolean;
}) {
  return (
    <div className={`rules-table${penalties ? " rules-penalties" : ""}`}>
      <div className="rules-table-head">
        <span>{title}</span>
        <b>Pontos</b>
      </div>
      {rows.map((row) => (
        <PointRow key={row.label} label={row.label} value={row.value} />
      ))}
    </div>
  );
}

function RuleCard({
  icon,
  title,
  subtitle,
  maximum,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  maximum?: string;
  children: ReactNode;
}) {
  return (
    <article className="rules-card">
      <div className="rules-card-heading">
        <span className="rules-icon">{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {maximum ? (
        <div className="rules-points">
          <PointRow label="Máximo no ranking" value={maximum} />
        </div>
      ) : null}
      {children}
    </article>
  );
}

export default function RulesPage() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">I</span>
          <span className="brand-copy">
            <strong>INGLORIOUS</strong>
            <small>CLAN COMMUNITY</small>
          </span>
        </a>
        <span className="status">
          <span className="status-dot online" />
          REGRAS OFICIAIS
        </span>
      </header>
      <SiteNav active="/rules" />
      <section className="content gh-content">
        <section className="admin-content rules-content">
          <span className="auth-kicker">TRANSPARÊNCIA • CRITÉRIOS OFICIAIS</span>
          <h1>Regras do <em>ranking</em></h1>
          <p>
            Consulte os critérios de pontuação, os ataques, as penalidades e os
            limites aplicados às atividades do clã Inglorious.
          </p>

          <div className="rules-grid">
            <RuleCard
              icon="⚔️"
              title="Guerras normais"
              subtitle="Objetivo: Participar das guerras e realizar os ataques."
              maximum="200 pontos"
            >
              <RulesTable
                title="Ação (Objetivo)"
                rows={[
                  { label: "Participar da guerra", value: "+5" },
                  { label: "Realizar os dois ataques", value: "+10" },
                  { label: "Acertar o espelho (por ataque)", value: "+5" },
                ]}
              />
              <div className="rules-table">
                <div className="rules-subrow">Bônus por estrelas (por ataque)</div>
                <PointRow label="• 1 estrela" value="+1" />
                <PointRow label="• 2 estrelas" value="+2" />
                <PointRow label="• 3 estrelas" value="+3" />
              </div>
              <RulesTable
                title="Penalidades"
                penalties
                rows={[
                  { label: "Não realizar nenhum ataque", value: "−10" },
                  { label: "Realizar apenas um ataque", value="−5" },
                  {
                    label: "Realizar o segundo ataque antes das 12 horas finais",
                    value: "−5",
                  },
                  {
                    label: "Primeiro ataque fora do espelho antes das 12 horas finais",
                    value: "−5",
                  },
                ]}
              />
              <div className="rules-timing">
                <b>◷ Regra dos ataques</b>
                <p>
                  Antes das 12 horas finais, o primeiro ataque deve respeitar o
                  espelho. O segundo ataque pode ser feito fora do espelho quando
                  faltarem 12 horas ou menos. Se o jogador não tiver realizado
                  nenhum ataque antes desse período, poderá fazer os dois ataques
                  fora do espelho nas 12 horas finais.
                </p>
              </div>
            </RuleCard>

            <RuleCard
              icon="🏆"
              title="Liga dos Clãs"
              subtitle="Objetivo: Realizar os 7 ataques da Liga."
              maximum="200 pontos"
            >
              <RulesTable
                title="Ação (Objetivo)"
                rows={[
                  { label: "Realizar um ataque", value: "+5" },
                  { label: "Acertar o espelho (por ataque)", value: "+5" },
                ]}
              />
              <div className="rules-table">
                <div className="rules-subrow">Bônus por estrelas (por ataque)</div>
                <PointRow label="• 1 estrela" value="+1" />
                <PointRow label="• 2 estrelas" value="+2" />
                <PointRow label="• 3 estrelas" value="+3" />
                <PointRow label="Concluir os 7 ataques da Liga" value="+10" />
              </div>
              <RulesTable
                title="Penalidades"
                penalties
                rows={[
                  { label: "Não realizar o ataque do dia", value="−5" },
                  { label: "Atacar fora do espelho", value="−5" },
                ]}
              />
              <p className="rules-note">
                A penalidade por ataque diário não realizado é aplicada após o
                encerramento daquela guerra da Liga.
              </p>
            </RuleCard>

            <RuleCard
              icon="🛡️"
              title="Raide de Fim de Semana"
              subtitle="Objetivo: 32 pontos brutos"
              maximum="150 pontos"
            >
              <p className="rules-note rules-long-note">
                Em cada fim de semana, o jogador recebe +5 pontos brutos ao
                utilizar 5 ou mais ataques. O bônus é automático, é concedido uma
                única vez por jogador em cada fim de semana e respeita o limite
                automático de 20 pontos brutos por mês. A pontuação bruta é
                convertida proporcionalmente para até 150 pontos no ranking.
              </p>
            </RuleCard>

            <RuleCard
              icon="🤝"
              title="Doações de tropas"
              subtitle="Objetivo: 10.000 tropas"
              maximum="150 pontos"
            >
              <p className="rules-note rules-long-note">
                A sincronização considera a quantidade de tropas efetivamente
                doadas pelo jogador durante o mês. Doações recebidas não contam.
                A pontuação cresce proporcionalmente ao total doado até atingir
                10.000 tropas, que correspondem ao máximo de 150 pontos no ranking.
              </p>
            </RuleCard>

            <RuleCard
              icon="🎮"
              title="Jogos do Clã"
              subtitle="Objetivo: 10.000 pontos pessoais"
              maximum="100 pontos"
            >
              <p className="rules-note rules-long-note">
                É considerada a pontuação pessoal obtida pelo jogador nos Jogos
                do Clã durante o mês, sincronizada pelo progresso individual da
                conquista Games Champion. A pontuação cresce proporcionalmente
                até 10.000 pontos pessoais, que correspondem ao máximo de 100
                pontos no ranking.
              </p>
            </RuleCard>

            <RuleCard
              icon="🏰"
              title="Ouro doado à Capital"
              subtitle="Objetivo: 250.000 de ouro doado"
              maximum="200 pontos"
            >
              <p className="rules-note rules-long-note">
                Conta somente o aumento nas contribuições de ouro feitas pelo
                jogador à Capital do Clã. O ouro recebido, saqueado ou conquistado
                nos raides não conta como doação. A pontuação cresce
                proporcionalmente até 250.000 moedas doadas, que correspondem ao
                máximo de 200 pontos no ranking.
              </p>
            </RuleCard>

            <RuleCard
              icon="⚔️"
              title="Regras obrigatórias das guerras"
              subtitle="Prazo dos ataques e regra do espelho"
            >
              <div className="rules-points">
                <PointRow
                  label="Primeiro ataque antes das 12 horas finais"
                  value="Deve respeitar o espelho"
                />
                <PointRow
                  label="Segundo ataque"
                  value="Liberado nas últimas 12 horas, inclusive fora do espelho"
                />
                <PointRow
                  label="Dois ataques guardados"
                  value="Podem ser feitos fora do espelho nas últimas 12 horas"
                />
                <PointRow
                  label="Primeiro ataque fora do espelho antes das 12 horas finais"
                  value="−5 pontos"
                />
                <PointRow label="Não realizar nenhum ataque" value="−10 pontos" />
                <PointRow label="Realizar apenas um ataque" value="−5 pontos" />
                <PointRow label="Pontuação final" value="Pode ficar negativa" />
              </div>
              <p className="rules-note rules-long-note">
                A ausência dos dois ataques gera penalidade de −10 pontos e a
                realização de apenas um ataque gera penalidade de −5 pontos. A
                exigência do espelho vale somente para o primeiro ataque realizado
                antes das 12 horas finais. O segundo ataque pode ser feito em
                qualquer alvo quando faltarem 12 horas ou menos. Se o jogador
                guardar os dois ataques, poderá realizar ambos fora do espelho
                nesse período. A penalidade de −5 por sair do espelho aplica-se
                somente ao primeiro ataque feito antes das 12 horas finais. O
                segundo ataque realizado antes desse período continua sujeito à
                penalidade de horário.
              </p>
            </RuleCard>

            <RuleCard
              icon="📈"
              title="Ranking e desempenho"
              subtitle="Entenda a diferença entre os dois indicadores"
            >
              <div className="rules-points">
                <PointRow
                  label="Ranking mensal"
                  value="Mostra somente os pontos acumulados"
                />
                <PointRow
                  label="Desempenho geral"
                  value="Mostra somente a porcentagem"
                />
                <PointRow
                  label="Detalhamento por atividade"
                  value="Mostra pontos e percentual"
                />
                <PointRow label="Referência geral" value="1.000 pontos = 100%" />
              </div>
              <p className="rules-note rules-long-note">
                A porcentagem geral corresponde à pontuação líquida dividida por
                10. Exemplo: 790 pontos representam 79% de desempenho.
              </p>
            </RuleCard>
          </div>

          <a className="back-link" href="/ranking">
            ← Consultar ranking
          </a>
        </section>
        <footer className="footer">
          <span>INGLORIOUS <b>•</b> REGRAS</span>
          <span>Regulamento de pontuação</span>
        </footer>
      </section>
    </main>
  );
}
