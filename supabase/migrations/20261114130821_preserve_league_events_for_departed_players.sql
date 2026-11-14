create or replace function public.record_clash_league_events(p_events jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  item jsonb;
  v_key text;
  v_tag text;
  v_player text;
  v_war text;
  v_activity text;
  v_points integer;
  v_event_id text;
  v_inserted integer := 0;
  v_skipped integer := 0;
begin
  if jsonb_typeof(p_events) is distinct from 'array' then
    raise exception 'Formato de eventos inválido';
  end if;
  if jsonb_array_length(p_events)>5000 then raise exception 'Lote excede limite'; end if;
  perform pg_advisory_xact_lock(hashtext('inglorious_league_event_batch'));
  for item in select value from jsonb_array_elements(p_events)
  loop
    v_key:=nullif(btrim(item->>'source_key'),'');
    v_tag:=upper(btrim(coalesce(item->>'player_tag','')));
    v_player:=nullif(btrim(item->>'player'),'');
    v_war:=nullif(btrim(item->>'war_key'),'');
    v_activity:=coalesce(item->>'activity','');
    if v_key is null or v_tag='' or v_player is null or v_war is null then
      raise exception 'Dados incompletos no evento da Liga';
    end if;
    if coalesce(item->>'points','0') !~ '^-?[0-9]+$'
       or coalesce(item->>'points','0')::numeric not between -2147483648 and 2147483647 then
      raise exception 'Pontuação inválida na Liga';
    end if;
    v_points:=coalesce((item->>'points')::integer,0);
    if exists(select 1 from public.clash_league_automation where source_key=v_key) then
      v_skipped:=v_skipped+1; continue;
    end if;
    if not exists(select 1 from public.players p where upper(btrim(p.player_tag))=v_tag) then
      insert into public.clash_league_automation(source_key,war_key,player_tag,event_id)
      values(v_key,v_war,v_tag,null) on conflict(source_key) do nothing;
      v_skipped:=v_skipped+1; continue;
    end if;
    v_event_id:=null;
    if v_points<>0 then
      insert into public.events(player,player_tag,category,activity,points)
      values(v_player,v_tag,'Liga dos Clãs',v_activity,v_points)
      returning id::text into v_event_id;
      v_inserted:=v_inserted+1;
    else
      v_skipped:=v_skipped+1;
    end if;
    insert into public.clash_league_automation(source_key,war_key,player_tag,event_id)
    values(v_key,v_war,v_tag,v_event_id) on conflict(source_key) do nothing;
  end loop;
  return jsonb_build_object('inserted',v_inserted,'skipped',v_skipped);
end;
$function$;
