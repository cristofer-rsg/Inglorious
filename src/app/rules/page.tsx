import SiteNav from "@/components/site-nav";

const secondaryRules = [
  {
    icon: "🛡️",
    title: "Raide de Fim de Semana",
    target: "+5 por fim de semana",
    detail: "O sistema concede automaticamente +5 pontos quando o jogador realiza pelo menos cinco ataques no fim de semana. O bônus é concedido uma única vez por jogador em cada fim de semana e respeita o limite de 20 pontos por mês. A participação continua válida mesmo que o jogador saia do clã depois do Raide.",
  },
  {
    icon: "🤝",
    title: "Doações de tropas",
    target: "50 pontos",
    detail: "Cada 100 tropas efetivamente doadas equivalem a 1 ponto. O total é acumulado no mês e limitado a 50 pontos. A sincronização considera a reinicialização sazonal do contador da API sem duplicar doações.",
  },
  {
    icon: "🎮",
    title: "Jogos do Clã",
    target: "25 pontos",
    detail: "A pontuação acompanha a faixa mensal alcançada pelo jogador e considera o maior resultado registrado no mês, limitada a 25 pontos.",
  },
  {
    icon: "🏰",
    title: "Capital do Clã",
    target: "1 ponto / 2.500 moedas",
    detail: "Cada 2.500 moedas doadas à Capital equivalem a 1 ponto. A sincronização registra somente o aumento desde a primeira leitura de referência, sem atribuir contribuições anteriores à ativação.",
  },
];

function PointRow({ label, value }: { label: string; value: string }) {
  return <div className="rules-point-row"><span>{label}</span><b>{value}</b></div>;
}

export default function RulesPage() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">I</span>
          <span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span>
        </a>
        <span className="status"><span className="status-dot online" />REGRAS OFICIAIS</span>
      </header>
      <SiteNav active="/rules" />
      <section className="content gh-content">
        <section className="admin-content rules-content">
          <span className="auth-kicker">TRANSPARÊNCIA • CRITÉRIOS OFICIAIS</span>
          <h1>Regras do <em>ranking</em></h1>
          <p>Consulte os critérios de pontuação, os ataques, as penalidades e os limites aplicados às atividades do clã Inglorious.</p>

          <article className="rules-highlight">
            <span>📊</span>
            <div>
              <b>Como funciona a pontuação</b>
              <p>Os pontos são calculados automaticamente a partir dos eventos sincronizados. Cada atividade segue seus próprios critérios e limites; as penalidades são descontadas conforme as regras de cada categoria.</p>
            </div>
          </article>

          <div className="rules-grid">
            <article className="rules-card">
              <div className="rules-card-heading">
                <span className="rules-icon">⚔️</span>
                <div><h2>Guerras do Clã</h2><p>Objetivo: participar da guerra e realizar os dois ataques.</p></div>
              </div>
              <div className="rules-points">
                <PointRow label="Referência" value="Sem teto mensal" />
              </div>
              <div className="rules-table">
                <div className="rules-table-head"><span>Ações e pontuação</span><b>Pontos</b></div>
                <PointRow label="Participar da guerra" value="+5" />
                <PointRow label="Realizar os dois ataques" value="+10" />
                <PointRow label="Acertar o espelho (por ataque)" value="+5" />
                <div className="rules-subrow">Estrelas conquistadas</div>
                <PointRow label="Cada estrela" value="+1" />
              </div>
              <div className="rules-table rules-penalties">
                <div className="rules-table-head"><span>Penalidades</span><b>Pontos</b></div>
                <PointRow label="Não realizar nenhum ataque" value="−10" />
                <PointRow label="Realizar apenas um ataque" value="−5" />
                <PointRow label="Primeiro ataque fora do espelho antes das 12 horas finais" value="−5" />
                <PointRow label="Segundo ataque realizado antes das 12 horas finais" value="−5" />
              </div>
              <div className="rules-timing">
                <b>◷ Atenção ao prazo dos ataques</b>
                <p>As penalidades de espelho e de horário são aplicadas conforme o momento em que cada ataque é realizado. A ausência dos dois ataques gera −10 pontos; realizar somente um gera −5 pontos. O primeiro ataque fora do espelho antes das 12 horas finais e o segundo ataque realizado antes desse período geram −5 pontos cada.</p>
              </div>
            </article>

            <article className="rules-card">
              <div className="rules-card-heading">
                <span className="rules-icon">🏆</span>
                <div><h2>Liga dos Clãs</h2><p>Objetivo: participar dos sete dias e concluir os sete ataques.</p></div>
              </div>
              <div className="rules-points">
                <PointRow label="Referência" value="+10 pontos de bônus" />
              </div>
              <div className="rules-table">
                <div className="rules-table-head"><span>Ações e pontuação</span><b>Pontos</b></div>
                <PointRow label="Cada ataque concluído" value="+5" />
                <PointRow label="Acertar o espelho (por ataque)" value="+5" />
                <div className="rules-subrow">Estrelas conquistadas</div>
                <PointRow label="Cada estrela" value="+1" />
                <PointRow label="Completar os sete ataques da Liga" value="+10" />
              </div>
              <div className="rules-table rules-penalties">
                <div className="rules-table-head"><span>Penalidades</span><b>Pontos</b></div>
                <PointRow label="Ataque fora do espelho" value="−5" />
                <PointRow label="Não realizar o ataque do dia (após o encerramento da batalha)" value="−5" />
              </div>
              <p className="rules-note">O bônus de +10 é concedido uma única vez no mês, quando o jogador conclui os sete ataques da Liga. A penalidade por ataque diário não realizado é aplicada após o encerramento daquela batalha.</p>
            </article>

            {secondaryRules.map((rule) => (
              <article className="rules-card" key={rule.title}>
                <div className="rules-card-heading">
                  <span className="rules-icon">{rule.icon}</span>
                  <div><h2>{rule.title}</h2><p>Critério de pontuação do mês</p></div>
                </div>
                <div className="rules-points"><PointRow label="Referência" value={rule.target} /></div>
                <p className="rules-note">{rule.detail}</p>
              </article>
            ))}
          </div>

          <section className="rules-card rules-final">
            <div className="rules-card-heading">
              <span className="rules-icon">⚖️</span>
              <div><h2>Elegibilidade e classificação</h2><p>Critérios para aparecer no ranking mensal</p></div>
            </div>
            <div className="rules-points">
              <PointRow label="Líder e vice-líderes" value="Não participam da classificação" />
              <PointRow label="Jogador que sai do clã após pontuar" value="Mantém os pontos obtidos no mês" />
              <PointRow label="Jogador fora do clã sem atividade no período" value="Não aparece no ranking" />
              <PointRow label="Pontuação total" value="Nunca fica abaixo de zero" />
            </div>
            <p className="rules-note">O ranking considera jogadores elegíveis. Guerras, Liga e Raide não possuem teto geral além dos limites específicos descritos para cada atividade.</p>
          </section>

          <a className="back-link" href="/ranking">← Consultar ranking</a>
        </section>
        <footer className="footer"><span>INGLORIOUS <b>•</b> REGRAS</span><span>Regulamento de pontuação</span></footer>
      </section>
    </main>
  );
}
