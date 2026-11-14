"use client";

import { useMemo, useState } from "react";
import type { RankingRow } from "@/lib/dashboard";

const categories = [
  { key: "wars", label: "Guerras" },
  { key: "league", label: "Liga" },
  { key: "donations", label: "Doações" },
  { key: "games", label: "Jogos" },
  { key: "raid", label: "Raide" },
  { key: "capitalPoints", label: "Capital" },
] as const;

function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export default function RankingList({ players }: { players: RankingRow[] }) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return players;
    return players.filter((player) => player.player.toLocaleLowerCase("pt-BR").includes(term)
      || player.tag.toLocaleLowerCase("pt-BR").includes(term));
  }, [players, search]);
  const visible = search.trim() || showAll ? filtered : filtered.slice(0, 5);
  const leader = players[0];

  return <>
    <div className="ranking-search">
      <input aria-label="Buscar jogador" placeholder="Buscar por nome ou tag..." value={search} onChange={(event) => setSearch(event.target.value)} />
      <small>{filtered.length} de {players.length} jogador(es)</small>
    </div>
    {visible.map((player) => {
      const isExpanded = expanded.has(player.id);
      return <article className={`ranking-entry${player.position <= 3 ? ` ranking-top-${player.position}` : ""}`} key={player.id}>
        <div className="ranking-row ranking-row-toggle">
          <span className="ranking-player">
            <b className="ranking-position">{player.position === 1 ? "🥇" : player.position === 2 ? "🥈" : player.position === 3 ? "🥉" : number(player.position)}</b>
            <span><b>{player.player}</b><small>{player.active ? "NO CLÃ" : "FORA DO CLÃ"}{player.tag ? " · " + player.tag : ""}</small></span>
          </span>
          <span className="ranking-score"><strong>{number(player.total)} pts</strong>
            <button className="ranking-details-button" type="button" aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Ocultar" : "Ver"} pontuação por categoria de ${player.player}`}
              onClick={() => setExpanded((current) => {
                const next = new Set(current);
                if (next.has(player.id)) next.delete(player.id);
                else next.add(player.id);
                return next;
              })}>{isExpanded ? "Recolher" : "Detalhes"} <i>{isExpanded ? "−" : "+"}</i></button>
          </span>
        </div>
        {isExpanded && <div className="ranking-breakdown">
          <div className="ranking-breakdown-heading">PONTUAÇÃO POR CATEGORIA {player.position === 1 ? "· LÍDER / REFERÊNCIA" : `(vs. ${leader?.player ?? "1º colocado"})`}</div>
          <div className="ranking-breakdown-grid">{categories.map((category) => {
            const value = player[category.key];
            const delta = value - (leader?.[category.key] ?? value);
            return <span className={delta > 0 ? "is-above" : delta < 0 ? "is-below" : "is-equal"} key={category.key}>
              <small>{category.label}</small><b><span>{number(value)} pts</span><strong>{delta > 0 ? "↑ +" + number(delta) : delta < 0 ? "↓ −" + number(Math.abs(delta)) : "= 0"}</strong></b>
            </span>;
          })}</div>
          {player.penalties > 0 && <div className="ranking-penalties"><div className="ranking-penalties-heading"><b>PENALIDADES APLICADAS</b></div><div className="ranking-penalties-total"><span>Total descontado</span><b>−{number(player.penalties)} pts</b></div></div>}
        </div>}
      </article>;
    })}
    {!visible.length && <div className="empty-state"><b>Nenhum jogador encontrado</b><p>Confira o nome ou a tag pesquisada.</p></div>}
    {!search.trim() && filtered.length > 5 && <div className="ranking-actions">
      <button className="outline-button" type="button" onClick={() => setShowAll((value) => !value)}>
        {showAll ? "Mostrar somente os 5 primeiros" : "Ver classificação completa"} <span>{showAll ? "↑" : "↓"}</span>
      </button>
    </div>}
  </>;
}
