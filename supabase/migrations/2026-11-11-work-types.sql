-- APPLIED to production (ikjzwuapnkyltlktkoyl) on 2026-11-11, approved by Clyde.
-- Opens rate reporting to all shift workers (HGV, van, warehouse, care, security ...), not just HGV drivers.
--
-- Safe order: apply this BEFORE merging the matching code. The current live code keeps working afterwards:
--   * every existing report becomes work_type 'hgv' (they are all HGV)
--   * search_rates keeps its old parameters (new p_work_type is optional) and only adds a column
--   * company_detail keeps 'stats' and 'breakdown' (now HGV-only) and adds 'sections'
--   * public_comments only adds a column
-- Anonymity is unchanged: every figure still needs 3+ reports, now counted within one work type, so
-- reports of different kinds of work are never pooled together.
-- Rollback: 2026-11-11-work-types-ROLLBACK.sql (only valid while no non-HGV reports exist).

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'rate_reports' and column_name = 'work_type') then
    raise exception 'work_type already exists; stop and review before re-running';
  end if;
end $$;

-- 1) Reports: what kind of work, with HGV-only details required for HGV and blank for everything else
alter table public.rate_reports
  add column work_type text not null default 'hgv'
  check (work_type in ('hgv','van','forklift','warehouse','factory','care','security','cleaning','hospitality','retail','other'));

alter table public.rate_reports alter column licence drop not null;
alter table public.rate_reports alter column job_type drop not null;
alter table public.rate_reports drop constraint if exists rate_reports_licence_check;
alter table public.rate_reports drop constraint if exists rate_reports_job_type_check;
-- Written to fail closed: a NULL inside a CHECK would otherwise count as a pass.
alter table public.rate_reports add constraint rate_reports_hgv_details_check check (
  case when work_type = 'hgv'
       then coalesce(licence in ('C1','C','C+E'), false)
        and coalesce(job_type in ('trunking','multi-drop','tipper','tanker','adr','general','other'), false)
       else licence is null and job_type is null end);
alter table public.rate_reports add constraint rate_reports_hgv_only_extras_check check (
  case when work_type = 'hgv' then true
       else night_out is null and coalesce(shift <> 'tramping', false) end);
create index if not exists rate_reports_work_type_idx on public.rate_reports (work_type);

-- 2) Companies: direct employers that aren't hauliers
alter table public.companies drop constraint if exists companies_kind_check;
alter table public.companies add constraint companies_kind_check check (kind in ('agency','haulier','employer'));

-- 3) Search: one row per company AND work type, each needing 3+ reports
drop function if exists public.search_rates(text, text, text, text, text);
create function public.search_rates(
  p_region text default null, p_licence text default null,
  p_job_type text default null, p_shift text default null, p_postcode text default null,
  p_work_type text default null)
returns table (company_id uuid, name text, slug text, kind text, areas text,
               reports bigint, median_rate numeric, min_rate numeric, max_rate numeric,
               last_report date, work_type text)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.slug, c.kind,
         left(string_agg(distinct coalesce(r.site_town, initcap(replace(r.region,'-',' '))), ', '), 80),
         count(*),
         round(percentile_cont(0.5) within group (order by r.hourly_rate)::numeric, 2),
         min(r.hourly_rate), max(r.hourly_rate),
         max(r.worked_month),
         r.work_type
  from public.rate_reports r
  join public.companies c on c.id = r.company_id and c.approved
  where (p_region is null or r.region = p_region)
    and (p_licence is null or r.licence = p_licence)
    and (p_job_type is null or r.job_type = p_job_type)
    and (p_shift is null or r.shift = p_shift)
    and (p_postcode is null or r.postcode_area = upper(p_postcode))
    and (p_work_type is null or r.work_type = p_work_type)
  group by c.id, r.work_type
  having count(*) >= 3
  order by 7 desc, 6 desc
  limit 100;
$$;
revoke all on function public.search_rates(text, text, text, text, text, text) from public;
grant execute on function public.search_rates(text, text, text, text, text, text) to anon, authenticated;

-- 4) Company page: a section per work type (3+ reports each). 'stats'/'breakdown' kept, HGV only,
--    so the code that is live today keeps working.
create or replace function public.company_detail(p_slug text)
returns json language sql stable security definer set search_path = public as $$
  with c as (select * from public.companies where slug = p_slug and approved),
  r as (select r.* from public.rate_reports r join c on c.id = r.company_id),
  sec as (
    select r.work_type,
           count(*) as reports,
           round(percentile_cont(0.5) within group (order by r.hourly_rate)::numeric, 2) as median,
           min(r.hourly_rate) as min, max(r.hourly_rate) as max,
           round(percentile_cont(0.5) within group (order by r.night_out)::numeric, 2) as median_night_out,
           round(100.0 * count(*) filter (where r.paid_correctly = 'yes') / count(*)) as pct_paid_correctly,
           round(100.0 * count(*) filter (where r.cancellations = 'often') / count(*)) as pct_often_cancelled,
           max(r.worked_month) as last_report,
           left(string_agg(distinct coalesce(r.site_town, initcap(replace(r.region,'-',' '))), ', '), 120) as areas
    from r group by r.work_type having count(*) >= 3)
  select case when not exists (select 1 from c) then null else json_build_object(
    'id', (select id from c), 'name', (select name from c), 'slug', (select slug from c),
    'kind', (select kind from c),
    'reports', (select count(*) from r),
    'sections', coalesce((select json_agg(row_to_json(sec) order by sec.reports desc) from sec), '[]'::json),
    'stats', (select json_build_object('median', median, 'min', min, 'max', max,
                'median_night_out', median_night_out, 'pct_paid_correctly', pct_paid_correctly,
                'pct_often_cancelled', pct_often_cancelled, 'last_report', last_report, 'areas', areas)
              from sec where work_type = 'hgv'),
    'breakdown', coalesce((
      select json_agg(b order by b.median desc) from (
        select licence, job_type, count(*) as reports,
               round(percentile_cont(0.5) within group (order by hourly_rate)::numeric, 2) as median,
               min(hourly_rate) as min, max(hourly_rate) as max
        from r where work_type = 'hgv' group by licence, job_type having count(*) >= 3
      ) b), '[]'::json)
  ) end;
$$;

-- 5) Comments: shown only for work types that have 3+ reports (same rule as the figures)
drop function if exists public.public_comments(uuid);
create function public.public_comments(p_company uuid)
returns table (id uuid, body text, worked_month date, licence text, job_type text, work_type text)
language sql stable security definer set search_path = public as $$
  select cm.id, cm.body, r.worked_month, r.licence, r.job_type, r.work_type
  from public.comments cm join public.rate_reports r on r.id = cm.report_id
  where cm.company_id = p_company and cm.status = 'approved'
    and (select count(*) from public.rate_reports x
         where x.company_id = p_company and x.work_type = r.work_type) >= 3
  order by cm.created_at desc limit 50;
$$;
revoke all on function public.public_comments(uuid) from public;
grant execute on function public.public_comments(uuid) to anon, authenticated;

-- 6) Headline numbers: a company is "live" once any one kind of work there has 3+ reports
create or replace function public.site_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'reports', (select count(*) from public.rate_reports),
    'reports_7d', (select count(*) from public.rate_reports where created_at > now() - interval '7 days'),
    'companies_live', (select count(distinct company_id) from (
        select r.company_id from public.rate_reports r
        join public.companies c on c.id = r.company_id and c.approved
        group by r.company_id, r.work_type having count(*) >= 3) x),
    'companies_live_yh', (select count(distinct company_id) from (
        select r.company_id from public.rate_reports r
        join public.companies c on c.id = r.company_id and c.approved
        where r.region = 'yorkshire-humber'
        group by r.company_id, r.work_type having count(*) >= 3) x),
    'reports_yh', (select count(*) from public.rate_reports where region = 'yorkshire-humber'),
    'regions', (select count(distinct region) from public.rate_reports),
    'visits_7d', coalesce((select sum(count) from public.daily_visits where kind = 'visit' and day > (now() at time zone 'Europe/London')::date - 7), 0),
    'submit_views_7d', coalesce((select sum(count) from public.daily_visits where kind = 'submit_view' and day > (now() at time zone 'Europe/London')::date - 7), 0),
    'visits_total', coalesce((select sum(count) from public.daily_visits where kind = 'visit'), 0),
    'counting_since', (select min(day) from public.daily_visits)
  );
$$;

commit;

-- Post-checks (read-only):
--   select work_type, count(*) from public.rate_reports group by 1;          -- every existing row: hgv
--   select public.site_stats();                                              -- same numbers as before
--   select * from public.search_rates();                                     -- same rows as before, plus work_type
--
-- ROLLBACK: supabase/migrations-draft/2026-11-11-work-types-ROLLBACK.sql (revert the code first).
