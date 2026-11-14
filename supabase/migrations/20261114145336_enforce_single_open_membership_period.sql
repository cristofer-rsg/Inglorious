-- Enforce at most one active membership interval per player tag.
-- Closed intervals remain available for accumulated-time calculations.
create unique index if not exists clan_membership_one_open_period_per_tag_uidx
on public.clan_membership_periods (upper(btrim(player_tag)))
where left_at is null;
