"use client";

import { useState } from "react";

type PerformanceFiltersProps = {
  months: string[];
  selectedMonth: string;
  search: string;
  selectedEvent: string;
  selectedSituation: string;
  order: string;
  monthLabels: Record<string, string>;
};

export default function PerformanceFilters({
  months,
  selectedMonth,
  search,
  selectedEvent,
  selectedSituation,
  order,
  monthLabels,
}: PerformanceFiltersProps) {
  const [event, setEvent] = useState(selectedEvent);
  const [situation, setSituation] = useState(selectedSituation);

  function handleEventChange(value: string) {
    setEvent(value);
    setSituation("");
  }

  return (
    <form className="history-filter performance-filter" action="/performance" method="get">
      <label htmlFor="month">Mês de referência</label>
      <select id="month" name="month" defaultValue={selectedMonth}>
        {months.map((month) => <option value={month} key={month}>{monthLabels[month] ?? month}</option>)}
      </select>
      <label htmlFor="q">Buscar jogador</label>
      <input id="q" name="q" type="search" placeholder="Nome ou tag" defaultValue={search} />
      <label htmlFor="event">Evento recente</label>
      <select
        id="event"
        name="event"
        value={event}
        onChange={(change) => handleEventChange(change.target.value)}
      >
        <option value="">Classificação geral</option>
        <option value="war">Última Guerra</option>
        <option value="league">Última batalha da Liga</option>
        <option value="raid">Última Raide</option>
      </select>
      <label htmlFor="situation">Situação</label>
      <select
        id="situation"
        name="situation"
        value={situation}
        onChange={(change) => setSituation(change.target.value)}
        disabled={!event}
      >
        <option value="">Todas as situações</option>
        <option value="attacked">Com ataques</option>
        <option value="no-attack">Sem ataques</option>
        {event !== "raid" && <option value="no-data">Não Participou</option>}
      </select>
      <label htmlFor="order">Ordenação</label>
      <select id="order" name="order" defaultValue={order}>
        <option value="desc">Maior para menor</option>
        <option value="asc">Menor para maior</option>
      </select>
      <button type="submit">Consultar</button>
    </form>
  );
}
