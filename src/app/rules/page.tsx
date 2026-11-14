import SiteNav from "@/components/site-nav";

export default function RulesPage() {
  const rules = [
    {
      title: "Guerras do Clã",
      target: "Sem teto mensal",
      detail: "Participação na guerra: +5 pontos; realizar os dois ataques: +10; cada ataque no espelho: +5; cada estrela conquistada: +1. Ao encerrar a guerra, não realizar nenhum ataque gera −10 e realizar apenas um ataque gera −5. O primeiro ataque fora do espelho antes das 12 horas finais gera −5; o segundo ataque antes das 12 horas finais também gera −5.",
    },
    {
      title: "Liga dos Clãs",
      target: "+10 no bônus",
      detail: "Cada ataque concluído soma +5 pontos; cada estrela soma +1; acertar o espelho soma +5. Cada ataque fora do espelho gera −5 e deixar de realizar o ataque do dia gera −5 após o encerramento da guerra. Completar os sete ataques da Liga concede um bônus único de +10 no mês.",
    },
    {
      title: "Raide de Fim de Semana",
      target: "+5 por fim de semana",
      detail: "O sistema concede automaticamente +5 pontos quando o jogador realiza pelo menos cinco ataques no fim de semana. O limite é de 20 pontos por mês. A participação continua válida mesmo que o jogador saia do clã depois do Raide.",
    },
    {
      title: "Doações",
      target: "Máximo de 50 pontos",
      detail: "Cada 100 tropas doadas equivalem a 1 ponto. O total é acumulado no mês e limitado a 50 pontos. A sincronização considera a reinicialização sazonal do contador da API sem duplicar doações.",
    },
    {
      title: "Jogos do Clã",
      target: "Máximo de 25 pontos",
      detail: "A pontuação acompanha a faixa mensal alcançada pelo jogador e considera o maior resultado registrado no mês, limitada a 25 pontos.",
    },
    {
      title: "Capital do Clã",
      target: "1 ponto / 2.500 moedas",
      detail: "Cada 2.500 moedas doadas à Capital equivalem a 1 ponto. A sincronização registra somente o aumento desde a primeira leitura de referência, sem atribuir contribuições anteriores à ativação.",
    },
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span className="brand-copy"><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="status"><span className="status-dot online" />REGRAS OFICIAIS</span>
      </header>
      <SiteNav active="/rules" />
      <section className="content gh-content">
        <section className="admin-content rules-content">
          <span className="auth-kicker">TRANSPARÊNCIA • CRITÉRIOS OFICIAIS</span>
          <h1>Regras do <em>ranking</em></h1>
          <p>Consulte os critérios de pontuação e os limites aplicados às atividades do clã Inglorious. As regras abaixo são independentes das regras do Ghost Hunt.</p>
          <article className="rules-highlight"><span>📊</span><div><b>Como funciona a pontuação</b><p>Os pontos são calculados automaticamente a partir dos eventos sincronizados. Penalidades são descontadas conforme as regras de cada categoria.</p></div></article>
          <section className="rules-card rules-attack-section" aria-labelledby="war-attack-rules">
            <div className="rules-card-heading"><span className="rules-icon">⚔️</span><div><h2 id="war-attack-rules">Regras de ataques — Guerra do Clã</h2><p>Pontuação e penalidades por participação em cada guerra</p></div></div>
            <div className="rules-attack-grid">
              <div className="rules-attack-item"><b>+5 pontos</b><span>Participar da guerra realizando pelo menos um ataque</span></div>
              <div className="rules-attack-item"><b>+10 pontos</b><span>Realizar os dois ataques disponíveis</span></div>
              <div className="rules-attack-item"><b>+5 pontos</b><span>Acertar o espelho em cada ataque</span></div>
              <div className="rules-attack-item"><b>+1 ponto</b><span>Por estrela conquistada em cada ataque</span></div>
              <div className="rules-attack-item penalty"><b>−10 pontos</b><span>Não realizar nenhum ataque até o encerramento da guerra</span></div>
              <div className="rules-attack-item penalty"><b>−5 pontos</b><span>Realizar somente um dos dois ataques</span></div>
              <div className="rules-attack-item penalty"><b>−5 pontos</b><span>Primeiro ataque fora do espelho antes das 12 horas finais</span></div>
              <div className="rules-attack-item penalty"><b>−5 pontos</b><span>Realizar o segundo ataque antes das 12 horas finais</span></div>
            </div>
            <p className="rules-note">As penalidades são aplicadas automaticamente quando a guerra termina. Os critérios de espelho e horário seguem os dados oficiais recebidos da API do Clash of Clans.</p>
          </section>
          <div className="rules-grid">
            {rules.map((rule, index) => <article className="rules-card" key={rule.title}>
              <div className="rules-card-heading"><span className="rules-icon">{["⚔️","🏆","🛡️","🤝","🎮","🏰"][index]}</span><div><h2>{rule.title}</h2><p>Critério de pontuação do mês</p></div></div>
              <div className="rules-points"><div className="rules-point-row"><span>Referência</span><b>{rule.target}</b></div></div>
              <p className="rules-note">{rule.detail}</p>
            </article>)}
          </div>
          <section className="rules-card rules-final">
            <div className="rules-card-heading"><span className="rules-icon">⚖️</span><div><h2>Elegibilidade e classificação</h2><p>Critérios para aparecer no ranking mensal</p></div></div>
            <p className="rules-note">O ranking considera jogadores elegíveis. Líderes e vice-líderes não participam da classificação. Quem sair do clã depois de conquistar pontos mantém a pontuação obtida no mês; jogadores fora do clã sem atividade no período não aparecem no ranking. Guerras, Liga e Raide não possuem teto geral além dos limites específicos descritos; penalidades são descontadas e o total nunca fica abaixo de zero.</p>
          </section>
          <a className="back-link" href="/ranking">← Consultar ranking</a>
        </section>
        <footer className="footer"><span>INGLORIOUS <b>•</b> REGRAS</span><span>Regulamento de pontuação</span></footer>
      </section>
    </main>
  );
}
