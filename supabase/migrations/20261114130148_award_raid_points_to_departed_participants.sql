create or replace function public.apply_automatic_raid_points(p_awards jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  a record;
  v_player text;
  v_tag text;
  v_weekend date;
  v_month text;
  v_attacks integer;
  v_label text;
  v_month_points integer;
  v_legacy_points integer;
  v_event_id bigint;
  v_results jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_awards) is distinct from 'array' then
    raise exception 'p_awards precisa ser uma lista JSON';
  end if;
  if jsonb_array_length(p_awards) > 1000 then
    raise exception 'Lote excede limite';
  end if;

  for a in
    select * from jsonb_to_recordset(p_awards)
      as x(player text, player_tag text, weekend_key date, month_key text, attacks integer, weekend_label text)
  loop
    v_tag := upper(btrim(coalesce(a.player_tag, '')));
    v_weekend := a.weekend_key;
    v_month := a.month_key;
    v_attacks := coalesce(a.attacks, 0);
    v_label := coalesce(a.weekend_label, '');

    if v_tag = '' or v_weekend is null
      or v_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
      or v_attacks < 5 then
      raise exception 'Dados inválidos para pontuação do Raide';
    end if;

    if to_char(v_weekend + 3, 'YYYY-MM') <> v_month then
      raise exception 'Mês inválido para fim de semana %', v_weekend;
    end if;

    -- O jogador pode ter saído do clã depois do Raide; a participação
    -- registrada pela API continua válida para a pontuação daquele fim de semana.
    select name into v_player
    from public.players
    where upper(btrim(player_tag)) = v_tag;

    if not found or v_player is distinct from a.player then
      v_results := v_results || jsonb_build_array(
        jsonb_build_object('player', coalesce(a.player, v_tag), 'status', 'unknown_player')
      );
      continue;
    end if;

    perform pg_advisory_xact_lock(hashtextextended(v_tag || ':' || v_month, 0));

    if exists (
      select 1 from public.raid_point_awards
      where player_tag = v_tag and weekend_key = v_weekend
    ) then
      v_results := v_results || jsonb_build_array(
        jsonb_build_object('player', v_player, 'status', 'already_awarded')
      );
      continue;
    end if;

    if exists (
      select 1
      from public.events e
      where upper(btrim(e.player_tag)) = v_tag
        and e.category = 'Raide de Fim de Semana'
        and (
          e.activity like ('%RAIDE_AUTO:' || v_weekend::text || ':%')
          or e.activity like ('%RAIDE_AUTO:' || (v_weekend - 6)::text || ':%')
          or (
            (e.created_at at time zone 'America/Sao_Paulo')::date
            - ((extract(dow from (e.created_at at time zone 'America/Sao_Paulo'))::integer + 2) % 7)
          ) = v_weekend
        )
    ) then
      v_results := v_results || jsonb_build_array(
        jsonb_build_object('player', v_player, 'status', 'already_awarded')
      );
      continue;
    end if;

    select coalesce(sum(points), 0)
    into v_month_points
    from public.raid_point_awards
    where player_tag = v_tag and month_key = v_month;

    select coalesce(sum(e.points), 0)
    into v_legacy_points
    from public.events e
    where upper(btrim(e.player_tag)) = v_tag
      and e.category = 'Raide de Fim de Semana'
      and e.points > 0
      and not exists (
        select 1 from public.raid_point_awards r where r.event_id = e.id
      )
      and to_char(
        (e.created_at at time zone 'America/Sao_Paulo')::date
        - ((extract(dow from (e.created_at at time zone 'America/Sao_Paulo'))::integer + 2) % 7)
        + 3,
        'YYYY-MM'
      ) = v_month;

    v_month_points := v_month_points + v_legacy_points;

    if v_month_points + 5 > 20 then
      v_results := v_results || jsonb_build_array(
        jsonb_build_object('player', v_player, 'status', 'monthly_limit')
      );
      continue;
    end if;

    insert into public.events(player, player_tag, category, activity, points)
    values (
      v_player,
      v_tag,
      'Raide de Fim de Semana',
      'RAIDE_AUTO:' || v_weekend::text || ':5_ATAQUES | Utilizou 5 ou mais ataques ('
        || v_attacks::text || ' ataques) | ' || v_label,
      5
    )
    returning id into v_event_id;

    insert into public.raid_point_awards(
      player_tag, player, weekend_key, month_key, points, attacks, event_id
    )
    values (v_tag, v_player, v_weekend, v_month, 5, v_attacks, v_event_id);

    v_results := v_results || jsonb_build_array(
      jsonb_build_object('player', v_player, 'status', 'awarded', 'points', 5, 'event_id', v_event_id)
    );
  end loop;

  return jsonb_build_object('success', true, 'results', v_results);
end;
$function$;
