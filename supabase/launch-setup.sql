-- RealRates launch setup: run once in Supabase > SQL Editor. Safe to re-run.
-- 1) Anonymous visit counter (no IPs, no cookies, no personal data: just a count per day and page type)
create table if not exists public.daily_visits (
  day date not null,
  kind text not null check (kind in ('visit','submit_view')),
  count integer not null default 0,
  primary key (day, kind)
);
alter table public.daily_visits enable row level security;
-- No policies: nobody reads or writes the table directly. Only the functions below touch it.

create or replace function public.track(p_kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('visit','submit_view') then return; end if;
  insert into public.daily_visits (day, kind, count)
  values ((now() at time zone 'Europe/London')::date, p_kind, 1)
  on conflict (day, kind) do update set count = public.daily_visits.count + 1;
end $$;
grant execute on function public.track(text) to anon, authenticated;

-- 2) Public headline numbers (totals only)
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
grant execute on function public.site_stats() to anon, authenticated;

-- 3) Starter list of common UK agencies and hauliers (skips names already there)
with names(name, kind) as (values
  ('Driver Hire', 'agency'), ('Blue Arrow', 'agency'), ('Adecco', 'agency'), ('Pertemps', 'agency'),
  ('Staffline', 'agency'), ('Randstad', 'agency'), ('Driver Require', 'agency'),
  ('Driving Force Recruitment', 'agency'), ('HGV Drivers UK', 'agency'), ('StaffCo Direct', 'agency'),
  ('Grafters Recruit', 'agency'), ('Drivers Direct Recruitment', 'agency'), ('Connect Driver Solutions', 'agency'),
  ('Gi Group', 'agency'), ('Search Consultancy', 'agency'), ('Kelly Services', 'agency'),
  ('Manpower', 'agency'), ('Hays', 'agency'), ('Reed', 'agency'), ('Tate', 'agency'),
  ('Extra Personnel', 'agency'), ('Logistics Personnel', 'agency'), ('Interaction Recruitment', 'agency'),
  ('Nicholas Associates', 'agency'), ('Prime Appointments', 'agency'), ('Express Recruitment', 'agency'),
  ('Eddie Stobart', 'haulier'), ('Wincanton', 'haulier'), ('DHL Supply Chain', 'haulier'), ('GXO Logistics', 'haulier'),
  ('Culina Group', 'haulier'), ('Maritime Transport', 'haulier'), ('Knights of Old', 'haulier'),
  ('Howard Tenens', 'haulier'), ('Turners (Soham)', 'haulier'), ('Gist', 'haulier'), ('Kuehne+Nagel', 'haulier'),
  ('Clipper Logistics', 'haulier'), ('Royal Mail', 'haulier'), ('Tesco', 'haulier'), ('Asda', 'haulier'),
  ('Sainsbury''s', 'haulier'), ('Morrisons', 'haulier'), ('Aldi', 'haulier'), ('Lidl', 'haulier'),
  ('Co-op', 'haulier'), ('Hoyer', 'haulier'), ('Suttons Group', 'haulier'), ('Bibby Distribution', 'haulier'),
  ('Fowler Welch', 'haulier'), ('Great Bear', 'haulier'), ('John Raymond Transport', 'haulier'),
  ('CEVA Logistics', 'haulier'), ('DFDS', 'haulier'), ('Yusen Logistics', 'haulier'), ('Hermes / Evri', 'haulier'),
  ('DPD', 'haulier'), ('Parcelforce', 'haulier'), ('Palletways', 'haulier'), ('Pall-Ex', 'haulier'),
  ('Wren Kitchens', 'haulier'), ('Arla Foods', 'haulier'), ('Muller', 'haulier'), ('Biffa', 'haulier'),
  ('Veolia', 'haulier'), ('Tarmac', 'haulier'), ('Hanson', 'haulier'), ('Breedon', 'haulier'),
  ('Travis Perkins', 'haulier'), ('Jewson', 'haulier'), ('Booker', 'haulier'), ('Bidfood', 'haulier'),
  ('Brakes', 'haulier'), ('Kinaxia', 'haulier'), ('Boughey Distribution', 'haulier')
)
insert into public.companies (name, kind)
select n.name, n.kind from names n
where not exists (select 1 from public.companies c where lower(c.name) = lower(n.name));
update public.companies set approved = true where created_by is null and approved = false;

select public.site_stats() as stats, (select count(*) from public.companies where approved) as approved_companies;
