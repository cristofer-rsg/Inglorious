import SiteNav from "@/components/site-nav";

export default function RulesPage() {
  const rules = [
    { title: "Guerras do Clã", target: "200 pontos", detail: "Participação: +5; realizar os dois ataques: +10; cada ataque no espelho: +5; cada estrela: +1. Ao encerrar a guerra, não atacar gera −10 e realizar apenas um ataque gera −5. O primeiro ataque fora do espelho antes das 12 horas finais gera −5; o segundo ataque antes das 12 horas finais também gera −5." },
    { title: "Liga dos Clãs", target: "140 pontos de referência", detail: "Cada ataque concluído soma +5; cada estrela soma +1; acertar o espelho soma +5. Atacar fora do espelho gera −5 e deixar de realizar o ataque diário gera −5 após o encerramento da guerra. Completar os sete ataques da liga concede bônus único de +10 no mês." },
    { title: "Raide de Fim de Semana", target: "32 pontos de referência", detail: "O bônus automático é de 5 pontos quando o jogador realiza pelo menos cinco ataques no fim de semana, respeitando o limite mensal de 20 pontos." },
    { title: "Doações", target: "10.000 tropas", detail: "A pontuação acompanha o total mensal acumulado de tropas doadas, tratando corretamente a reinicialização sazonal do contador da API." },
    { title: "Jogos do Clã", target: "10.000 pontos", detail: "A pontuação acompanha proporcionalmente o total mensal obtido, até o limite de 10.000 pontos, que corresponde à pontuação máxima da categoria." },
    { title: "Capital do Clã", target: "250.000 moedas", detail: "A contagem começa após a primeira leitura de referência da API; contribuições anteriores à linha de base não são lançadas retroativamente." },
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/"><span className="brand-mark">I</span><span><strong>INGLORIOUS</strong><small>CLAN COMMUNITY</small></span></a>
        <span className="connection">REGRAS OFICIAIS</span>
      </header>
      <SiteNav active="/rules" />
      <section className="page-heading"><span className="eyebrow">TRANSPARÊNCIA E CRITÉRIOS</span><h1>Regras do <em>ranking</em></h1><p>Critérios reproduzidos do comportamento funcional atual do Ghost Hunt e adaptados ao clã Inglorious.</p></section>
      <section className="rules-list">
        {rules.map((rule, index) => <article className="rule-card" key={rule.title}><span className="rule-index">{String(index + 1).padStart(2, "0")}</span><div><h2>{rule.title}</h2><p>{rule.detail}</p></div><strong>{rule.target}</strong></article>)}
      </section>
      <section className="eligibility-note"><h2>Elegibilidade</h2><p>O ranking considera jogadores ativos e elegíveis. Líderes e vice-líderes não participam da classificação.</p></section>
    </main>
  );
}
