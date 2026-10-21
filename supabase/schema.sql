-- RealRates database schema
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Safe to run once on a fresh project.

-- =========================================================
-- Reference lists (kept as CHECK constraints for simplicity)
-- =========================================================
-- Regions: north-east, north-west, yorkshire-humber, east-midlands, west-midlands,
--          east-of-england, london, south-east, south-west, wales, scotland, northern-ireland

-- =========================================================
-- Tables
-- =========================================================
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  slug text not null unique,
  kind text not null check (kind in ('agency','haulier')),
  approved boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.rate_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  region text not null check (region in ('north-east','north-west','yorkshire-humber','east-midlands','west-midlands','east-of-england','london','south-east','south-west','wales','scotland','northern-ireland')),
  postcode_area text check (postcode_area is null or postcode_area ~ '^[A-Z]{1,2}$'),
  site_town text check (site_town is null or char_length(site_town) <= 60),
  client_name text check (client_name is null or char_length(client_name) <= 80),
  licence text not null check (licence in ('C1','C','C+E')),
  job_type text not null check (job_type in ('trunking','multi-drop','tipper','tanker','adr','general','other')),
  shift text not null check (shift in ('day','night','weekend','tramping')),
  hourly_rate numeric(5,2) not null check (hourly_rate between 10 and 60),
  overtime_rate numeric(5,2) check (overtime_rate is null or overtime_rate between 10 and 90),
  night_out numeric(5,2) check (night_out is null or night_out between 0 and 100),
  pay_route text not null check (pay_route in ('agency_paye','umbrella','ltd','direct')),
  cancellations text not null check (cancellations in ('never','sometimes','often')),
  paid_correctly text not null check (paid_correctly in ('yes','mostly','no')),
  worked_month date not null check (extract(day from worked_month) = 1 and worked_month >= date '2020-01-01'),
  created_at timestamptz not null default now()
);
create index on public.rate_reports (company_id);
create index on public.rate_reports (region);
create index on public.rate_reports (user_id, created_at);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.rate_reports(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 3 and 300),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  flags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.comments (company_id, status);

create table public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 300),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.removal_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  company text check (company is null or char_length(company) <= 100),
  page_url text check (page_url is null or char_length(page_url) <= 300),
  message text not null check (char_length(message) between 10 and 2000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Helper: is the current user an admin?
-- =========================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- =========================================================
-- Triggers
-- =========================================================

-- Companies: build slug, force unapproved unless admin, limit new names per user
create or replace function public.companies_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; candidate text; n int := 0;
begin
  new.name := regexp_replace(trim(new.name), '\s+', ' ', 'g');
  if not public.is_admin() then
    new.approved := false;
    new.created_by := auth.uid();
    if (select count(*) from public.companies
        where created_by = auth.uid() and created_at > now() - interval '24 hours') >= 3 then
      raise exception 'RATE_LIMIT_COMPANY';
    end if;
  end if;
  base := trim(both '-' from regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g'));
  if base = '' then base := 'company'; end if;
  candidate := base;
  while exists (select 1 from public.companies where slug = candidate) loop
    n := n + 1; candidate := base || '-' || n;
  end loop;
  new.slug := candidate;
  return new;
end $$;
create trigger companies_before_insert before insert on public.companies
  for each row execute function public.companies_before_insert();

-- Rate reports: max 5 per user per day, no future months, own user only
create or replace function public.rate_reports_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  if new.user_id is null then raise exception 'NOT_SIGNED_IN'; end if;
  if new.worked_month > date_trunc('month', now())::date then
    raise exception 'FUTURE_MONTH';
  end if;
  if (select count(*) from public.rate_reports
      where user_id = new.user_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'RATE_LIMIT';
  end if;
  return new;
end $$;
create trigger rate_reports_before_insert before insert on public.rate_reports
  for each row execute function public.rate_reports_before_insert();

-- Comments: always pending, attach to own report, auto-flag risky content
create or replace function public.comments_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; f text[] := '{}'; b text;
begin
  new.user_id := auth.uid();
  new.status := 'pending';
  select * into r from public.rate_reports where id = new.report_id;
  if r is null or r.user_id <> new.user_id then raise exception 'BAD_REPORT'; end if;
  new.company_id := r.company_id;
  b := new.body;
  if b ~ '(\+44|\m0)\s?\d[\d\s]{8,}' then f := array_append(f, 'phone number'); end if;
  if b ~* '[^@\s]+@[^@\s]+\.[a-z]{2,}' then f := array_append(f, 'email address'); end if;
  if b ~* '\m(mr|mrs|ms|miss|dr)\.?\s+[a-z]+' or b ~* '\m(called|named|manager is|boss is|planner is)\s+[a-z]+' then
    f := array_append(f, 'possible personal name');
  end if;
  if b ~* '\m(fuck\w*|shit\w*|cunt\w*|twat\w*|wank\w*|bastard\w*|bitch\w*|prick\w*)' then f := array_append(f, 'profanity'); end if;
  new.flags := f;
  return new;
end $$;
create trigger comments_before_insert before insert on public.comments
  for each row execute function public.comments_before_insert();

-- =========================================================
-- Row-level security
-- =========================================================
alter table public.admins enable row level security;
alter table public.companies enable row level security;
alter table public.rate_reports enable row level security;
alter table public.comments enable row level security;
alter table public.abuse_reports enable row level security;
alter table public.removal_requests enable row level security;

create policy "admins readable by admins" on public.admins for select using (public.is_admin());

create policy "companies readable" on public.companies for select
  using (approved or created_by = auth.uid() or public.is_admin());
create policy "signed-in users add companies" on public.companies for insert to authenticated
  with check (true);
create policy "admins update companies" on public.companies for update using (public.is_admin());
create policy "admins delete companies" on public.companies for delete using (public.is_admin());

-- Raw reports are never public: only the submitter and admins can read them.
create policy "own or admin read reports" on public.rate_reports for select
  using (user_id = auth.uid() or public.is_admin());
create policy "signed-in users add reports" on public.rate_reports for insert to authenticated
  with check (user_id = auth.uid());
create policy "own or admin delete reports" on public.rate_reports for delete
  using (user_id = auth.uid() or public.is_admin());

create policy "own or admin read comments" on public.comments for select
  using (user_id = auth.uid() or public.is_admin());
create policy "signed-in users add comments" on public.comments for insert to authenticated
  with check (user_id = auth.uid());
create policy "admins update comments" on public.comments for update using (public.is_admin());
create policy "own or admin delete comments" on public.comments for delete
  using (user_id = auth.uid() or public.is_admin());

create policy "anyone can report a comment" on public.abuse_reports for insert to anon, authenticated
  with check (resolved = false);
create policy "admins manage abuse reports" on public.abuse_reports for select using (public.is_admin());
create policy "admins resolve abuse reports" on public.abuse_reports for update using (public.is_admin());

create policy "anyone can request removal" on public.removal_requests for insert to anon, authenticated
  with check (resolved = false);
create policy "admins read removal requests" on public.removal_requests for select using (public.is_admin());
create policy "admins resolve removal requests" on public.removal_requests for update using (public.is_admin());

-- =========================================================
-- Public read functions (aggregates only, minimum 3 reports)
-- =========================================================

-- Approved companies for the submit dropdown and sitemap
create or replace function public.list_companies()
returns table (id uuid, name text, slug text, kind text)
language sql stable security definer set search_path = public as $$
  select id, name, slug, kind from public.companies where approved order by name;
$$;

-- Search results: one row per company, only where the filtered set has 3+ reports
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

-- Company page: headline stats plus breakdowns (each breakdown row needs 3+ reports)
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

-- Approved comments for a company, with no user information
create or replace function public.public_comments(p_company uuid)
returns table (id uuid, body text, worked_month date, licence text, job_type text)
language sql stable security definer set search_path = public as $$
  select cm.id, cm.body, r.worked_month, r.licence, r.job_type
  from public.comments cm join public.rate_reports r on r.id = cm.report_id
  where cm.company_id = p_company and cm.status = 'approved'
  order by cm.created_at desc limit 50;
$$;

-- Admin: merge a duplicate company into another
create or replace function public.merge_companies(p_from uuid, p_into uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if p_from = p_into then raise exception 'SAME_COMPANY'; end if;
  update public.rate_reports set company_id = p_into where company_id = p_from;
  update public.comments set company_id = p_into where company_id = p_from;
  delete from public.companies where id = p_from;
end $$;

-- Execute rights
revoke all on function public.merge_companies(uuid, uuid) from public, anon;
grant execute on function public.merge_companies(uuid, uuid) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.list_companies() to anon, authenticated;
grant execute on function public.search_rates(text, text, text, text, text) to anon, authenticated;
grant execute on function public.company_detail(text) to anon, authenticated;
grant execute on function public.public_comments(uuid) to anon, authenticated;
