create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.war_penalty_history (
  id bigint generated always as identity primary key,
  source_key text not null unique,
  war_key text not null,
  player_tag text not null,
  player_name text not null,
  activity text not null,
  points integer not null check (points < 0),
  event_id text,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists war_penalty_history_player_month_idx
  on private.war_penalty_history (player_tag, occurred_at desc);
create index if not exists war_penalty_history_war_idx
  on private.war_penalty_history (war_key);

insert into private.war_penalty_history
  (source_key, war_key, player_tag, player_name, activity, points, event_id, occurred_at)
select
  a.source_key, a.war_key, a.player_tag, e.player, e.activity, e.points,
  a.event_id, e.created_at
from public.clash_war_automation a
join public.events e on e.id::text = a.event_id
where e.points < 0 and lower(e.activity) like '%penalidade%'
on conflict (source_key) do nothing;

create or replace function public.record_clash_war_events(p_events jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'public'
as $function$
declare
  item jsonb;
  inserted_key text;
  new_event_id bigint;
  inserted_count integer := 0;
begin
  if jsonb_typeof(p_events) is distinct from 'array' then
    raise exception 'p_events precisa ser um array JSON';
  end if;
  if jsonb_array_length(p_events) > 5000 then
    raise exception 'Lote de eventos excede o limite permitido';
  end if;
  for item in select value from jsonb_array_elements(p_events)
  loop
    if nullif(btrim(item->>'source_key'),'') is null
       or nullif(btrim(item->>'war_key'),'') is null
       or nullif(btrim(item->>'player'),'') is null
       or nullif(btrim(item->>'player_tag'),'') is null
       or nullif(btrim(item->>'category'),'') is null
       or nullif(btrim(item->>'activity'),'') is null
       or (item->>'points') is null
       or (item->>'points') !~ '^-?[0-9]+$' then
      raise exception 'Evento de guerra inválido';
    end if;
    if (item->>'points')::numeric not between -2147483648 and 2147483647 then
      raise exception 'Pontuação fora do intervalo permitido';
    end if;
    inserted_key := null;
    insert into public.clash_war_automation(source_key,war_key,player_tag)
    values (item->>'source_key',item->>'war_key',upper(btrim(item->>'player_tag')))
    on conflict(source_key) do nothing returning source_key into inserted_key;
    if inserted_key is not null then
      insert into public.events(player,player_tag,category,activity,points,battle_time)
      values (
        btrim(item->>'player'), upper(btrim(item->>'player_tag')),
        btrim(item->>'category'), btrim(item->>'activity'),
        (item->>'points')::integer,
        nullif(item->>'battle_time','')::timestamptz
      ) returning id into new_event_id;
      update public.clash_war_automation set event_id=new_event_id::text
      where source_key=inserted_key;

      if (item->>'points')::integer < 0
         and lower(item->>'activity') like '%penalidade%' then
        insert into private.war_penalty_history
          (source_key,war_key,player_tag,player_name,activity,points,event_id,occurred_at)
        values (
          item->>'source_key',item->>'war_key',upper(btrim(item->>'player_tag')),
          btrim(item->>'player'),btrim(item->>'activity'),
          (item->>'points')::integer,new_event_id::text,
          coalesce(nullif(item->>'battle_time','')::timestamptz,now())
        )
        on conflict(source_key) do nothing;
      end if;

      inserted_count := inserted_count+1;
    end if;
  end loop;
  return jsonb_build_object('inserted',inserted_count);
end;
$function$;
