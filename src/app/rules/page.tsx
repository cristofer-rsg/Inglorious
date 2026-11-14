import SiteNav from "@/components/site-nav";

export default function RulesPage() {
  const rules = [
    { title: "Guerras do Clã", target: "200 pontos", detail: "Participação, dois ataques, ataques no espelho, estrelas e penalidades são contabilizados conforme as regras automáticas do código atual." },
    { title: "Liga dos Clãs", target: "140 pontos de referência", detail: "Cada ataque concluído soma participação, estrelas e bônus de espelho. A conclusão dos sete ataques no mês concede bônus único de 10 pontos." },
    { title: "Raide de Fim de Semana", target: "32 pontos de referência", detail: "O bônus automático é de 5 pontos quando o jogador realiza pelo menos cinco ataques no fim de semana, respeitando o limite mensal de 20 pontos." },
    { title: "Doações", target: "10.000 tropas", detail: "A pontuação acompanha o total mensal acumulado de tropas doadas, tratando corretamente a reinicialização sazonal do contador da API." },
    { title: "Jogos do Clã", target: "10.000 pontos", detail: "A pontuação automática considera as faixas de 4.000, 6.000, 8.000 e 10.000 pontos, mantendo também o total real obtido pelo jogador." },
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
