-- ROLLBACK for 2026-11-11-work-types.sql. DRAFT, NOT APPLIED.
-- Only safe while no non-HGV reports and no 'employer' companies exist (it refuses otherwise).
-- Merge-order note: roll back the CODE first (revert the PR), then run this.

begin;

do $$ begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'rate_reports' and column_name = 'work_type') then
    raise exception 'work_type column not found; nothing to roll back';
  end if;
  if exists (select 1 from public.rate_reports where work_type <> 'hgv')
     or exists (select 1 from public.companies where kind = 'employer') then
    raise exception 'non-HGV data exists; rollback would lose it';
  end if;
end $$;

drop function if exists public.search_rates(text, text, text, text, text, text);
drop function if exists public.public_comments(uuid);

-- Original definitions, copied from supabase/schema.sql and supabase/launch-setup.sql
create or replace function public.search_rates(
  p_region text default null, p_licence text default null,
  p_job_type text default null, p_shift text default null, p_postcode text default null)
returns table (company_id uuid, name text, slug text, kind text, areas text,
               reports bigint, median_rate numeric, min_rate numeric, max_rate numeric,
               last_report date)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.slug, c.kind,
         left(string_agg(distinct coalesce(r.site_town, initcap(replace(r.region,'-',' '))), ', '), 80),
         count(*),
         round(percentile_cont(0.5) within group (order by r.hourly_rate)::numeric, 2),
         min(r.hourly_rate), max(r.hourly_rate),
         max(r.worked_month)
  from public.rate_reports r
  join public.companies c on c.id = r.company_id and c.approved
  where (p_region is null or r.region = p_region)
    and (p_licence is null or r.licence = p_licence)
    and (p_job_type is null or r.job_type = p_job_type)
    and (p_shift is null or r.shift = p_shift)
    and (p_postcode is null or r.postcode_area = upper(p_postcode))
  group by c.id
  having count(*) >= 3
  order by 7 desc, 6 desc
  limit 100;
$$;

create or replace function public.company_detail(p_slug text)
returns json language sql stable security definer set search_path = public as $$
  with c as (select * from public.companies where slug = p_slug and approved),
  r as (select r.* from public.rate_reports r join c on c.id = r.company_id)
  select case when not exists (select 1 from c) then null else json_build_object(
    'id', (select id from c), 'name', (select name from c), 'slug', (select slug from c),
    'kind', (select kind from c),
    'reports', (select count(*) from r),
    'stats', case when (select count(*) from r) >= 3 then json_build_object(
        'median', (select round(percentile_cont(0.5) within group (order by hourly_rate)::numeric, 2) from r),
        'min', (select min(hourly_rate) from r),
        'max', (select max(hourly_rate) from r),
        'median_night_out', (select round(percentile_cont(0.5) within group (order by night_out)::numeric, 2) from r where night_out is not null),
        'pct_paid_correctly', (select round(100.0 * count(*) filter (where paid_correctly = 'yes') / count(*)) from r),
        'pct_often_cancelled', (select round(100.0 * count(*) filter (where cancellations = 'often') / count(*)) from r),
        'last_report', (select max(worked_month) from r),
        'areas', (select left(string_agg(distinct coalesce(site_town, initcap(replace(region,'-',' '))), ', '), 120) from r)
      ) else null end,
    'breakdown', coalesce((
      select json_agg(b order by b.median desc) from (
        select licence, job_type, count(*) as reports,
               round(percentile_cont(0.5) within group (order by hourly_rate)::numeric, 2) as median,
               min(hourly_rate) as min, max(hourly_rate) as max
        from r group by licence, job_type having count(*) >= 3
      ) b), '[]'::json)
  ) end;
$$;

create or replace function public.public_comments(p_company uuid)
returns table (id uuid, body text, worked_month date, licence text, job_type text)
language sql stable security definer set search_path = public as $$
  select cm.id, cm.body, r.worked_month, r.licence, r.job_type
  from public.comments cm join public.rate_reports r on r.id = cm.report_id
  where cm.company_id = p_company and cm.status = 'approved'
  order by cm.created_at desc limit 50;
$$;

create or replace function public.site_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'reports', (select count(*) from public.rate_reports),
    'reports_7d', (select count(*) from public.rate_reports where created_at > now() - interval '7 days'),
    'companies_live', (select count(*) from (
        select company_id from public.rate_reports r
        join public.companies c on c.id = r.company_id and c.approved
        group by company_id having count(*) >= 3) x),
    'companies_live_yh', (select count(*) from (
        select company_id from public.rate_reports r
        join public.companies c on c.id = r.company_id and c.approved
        where r.region = 'yorkshire-humber'
        group by company_id having count(*) >= 3) x),
    'reports_yh', (select count(*) from public.rate_reports where region = 'yorkshire-humber'),
    'regions', (select count(distinct region) from public.rate_reports),
    'visits_7d', coalesce((select sum(count) from public.daily_visits where kind = 'visit' and day > (now() at time zone 'Europe/London')::date - 7), 0),
    'submit_views_7d', coalesce((select sum(count) from public.daily_visits where kind = 'submit_view' and day > (now() at time zone 'Europe/London')::date - 7), 0),
    'visits_total', coalesce((select sum(count) from public.daily_visits where kind = 'visit'), 0),
    'counting_since', (select min(day) from public.daily_visits)
  );
$$;

grant execute on function public.search_rates(text, text, text, text, text) to anon, authenticated;
grant execute on function public.public_comments(uuid) to anon, authenticated;

alter table public.rate_reports drop constraint rate_reports_hgv_details_check;
alter table public.rate_reports drop constraint rate_reports_hgv_only_extras_check;
alter table public.rate_reports alter column licence set not null;
alter table public.rate_reports alter column job_type set not null;
alter table public.rate_reports add constraint rate_reports_licence_check check (licence in ('C1','C','C+E'));
alter table public.rate_reports add constraint rate_reports_job_type_check
  check (job_type in ('trunking','multi-drop','tipper','tanker','adr','general','other'));
drop index if exists public.rate_reports_work_type_idx;
alter table public.rate_reports drop column work_type;
alter table public.companies drop constraint companies_kind_check;
alter table public.companies add constraint companies_kind_check check (kind in ('agency','haulier'));

commit;
