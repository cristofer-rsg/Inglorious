create or replace function public.get_inglorious_analytics_summary(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'total_views',
    count(*),
    'unique_visitors',
    count(distinct visitor_hash),
    'top_pages',
    coalesce((
      select jsonb_agg(
        jsonb_build_object('page_path', page_path, 'views', views)
        order by views desc, page_path asc
      )
      from (
        select page_path, count(*)::integer as views
        from public.site_analytics_events
        where created_at >= coalesce(p_since, now() - interval '30 days')
        group by page_path
        order by count(*) desc, page_path asc
        limit 5
      ) pages
    ), '[]'::jsonb),
    'device_breakdown',
    coalesce((
      select jsonb_agg(
        jsonb_build_object('device_type', device_type, 'views', views)
        order by views desc, device_type asc
      )
      from (
        select device_type, count(*)::integer as views
        from public.site_analytics_events
        where created_at >= coalesce(p_since, now() - interval '30 days')
        group by device_type
      ) devices
    ), '[]'::jsonb)
  )
  from public.site_analytics_events
  where created_at >= coalesce(p_since, now() - interval '30 days');
$$;

revoke all on function public.get_inglorious_analytics_summary(timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_inglorious_analytics_summary(timestamptz)
  to service_role;
