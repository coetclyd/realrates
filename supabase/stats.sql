-- Public headline numbers for the home page counter (totals only, nothing identifying).
-- Paste into Supabase > SQL Editor and click Run. Safe to re-run.
create or replace function public.site_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'reports', (select count(*) from public.rate_reports),
    'companies_live', (select count(*) from (
        select company_id from public.rate_reports r
        join public.companies c on c.id = r.company_id and c.approved
        group by company_id having count(*) >= 3) x),
    'regions', (select count(distinct region) from public.rate_reports)
  );
$$;
grant execute on function public.site_stats() to anon, authenticated;
select public.site_stats();
