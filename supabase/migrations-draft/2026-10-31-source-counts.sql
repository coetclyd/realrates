-- DRAFT, NOT APPLIED. Needs Clyde's approval before running on the live project (ikjzwuapnkyltlktkoyl).
-- Adds an anonymous daily count of visits per campaign source (?utm_source=poster / facebook / school ...).
--
-- Additive only: one new table + two new functions. Nothing existing is altered or dropped.
-- Privacy: stores (day, source label, count). No IP, cookie, user id, URL or free text. Unknown labels become 'other',
-- so a pasted email address or name in ?utm_source= can never be stored.
-- Rollback: see the bottom of this file.

begin;

-- Collision guard: stop if any of these objects already exist, so this file (and its rollback) can never
-- touch something it did not create.
do $$
begin
  if to_regclass('public.daily_source_visits') is not null
     or to_regprocedure('public.track_source(text)') is not null
     or to_regprocedure('public.source_stats()') is not null then
    raise exception 'source-counts objects already exist; stop and review before re-running';
  end if;
end $$;

create table public.daily_source_visits (
  day date not null,
  source text not null check (source in
    ('poster','facebook','reddit','school','tiktok','x','bluesky','youtube','whatsapp','email','other')),
  count integer not null default 0 check (count >= 0),
  primary key (day, source)
);
alter table public.daily_source_visits enable row level security;
-- No policies: nobody reads or writes the table directly. Only the functions below touch it.
revoke all on table public.daily_source_visits from anon, authenticated;

create or replace function public.track_source(p_source text)
returns void language plpgsql security definer set search_path = public as $$
declare
  s text := lower(left(coalesce(p_source, ''), 32));
begin
  if s = '' then return; end if;
  if s not in ('poster','facebook','reddit','school','tiktok','x','bluesky','youtube','whatsapp','email') then
    s := 'other';
  end if;
  insert into public.daily_source_visits (day, source, count)
  values ((now() at time zone 'Europe/London')::date, s, 1)
  on conflict (day, source) do update set count = public.daily_source_visits.count + 1;
end $$;
revoke all on function public.track_source(text) from public;
grant execute on function public.track_source(text) to anon, authenticated;

-- Totals per source: last 7 days and all time. Numbers only.
create or replace function public.source_stats()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(row_to_json(t) order by t.total desc), '[]'::json) from (
    select source,
           coalesce(sum(count) filter (where day > (now() at time zone 'Europe/London')::date - 7), 0) as last_7d,
           sum(count) as total
      from public.daily_source_visits
     group by source
  ) t;
$$;
revoke all on function public.source_stats() from public;
grant execute on function public.source_stats() to anon, authenticated;

commit;

-- Post-check (read-only):
--   select * from public.daily_source_visits order by day desc, source;   -- expect 0 rows straight after applying
--   select public.source_stats();                                         -- expect []
--
-- ROLLBACK (only if needed; removes the source counts, nothing else):
--   begin;
--   drop function if exists public.source_stats();
--   drop function if exists public.track_source(text);
--   drop table if exists public.daily_source_visits;
--   commit;
