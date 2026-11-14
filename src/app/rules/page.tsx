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
        <a className="brand" href="/"><span className="brand-mark">I</span><span><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="connection">REGRAS OFICIAIS</span>
      </header>
      <SiteNav active="/rules" />
      <section className="page-heading"><span className="eyebrow">TRANSPARÊNCIA E CRITÉRIOS</span><h1>Regras do <em>ranking</em></h1><p>Regras de pontuação reproduzidas do Ghost Hunt e aplicadas de forma independente ao clã Inglorious.</p></section>
      <section className="rules-list">
        {rules.map((rule, index) => <article className="rule-card" key={rule.title}><span className="rule-index">{String(index + 1).padStart(2, "0")}</span><div><h2>{rule.title}</h2><p>{rule.detail}</p></div><strong>{rule.target}</strong></article>)}
      </section>
      <section className="eligibility-note"><h2>Elegibilidade e classificação</h2><p>O ranking considera jogadores ativos e elegíveis. Líderes e vice-líderes não participam da classificação. Guerras, Liga e Raide não possuem teto geral além dos limites específicos descritos; penalidades são descontadas e o total nunca fica abaixo de zero.</p></section>
    </main>
  );
}
