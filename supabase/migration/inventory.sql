-- RealRates migration inventory. READ-ONLY: run in Supabase > SQL Editor on the OLD project and
-- on the NEW project, then compare the two results line by line. Shows counts and fingerprints only
-- (no emails, no passwords, no keys).
with
t as (select count(*) n, md5(string_agg(c.relname || ':' || c.relrowsecurity::text, ',' order by c.relname)) h
      from pg_class c join pg_namespace s on s.oid = c.relnamespace
      where s.nspname = 'public' and c.relkind = 'r'),
f as (select count(*) n, md5(string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
                       || md5(pg_get_functiondef(p.oid)) || coalesce((select string_agg(x, ' ' order by x) from unnest(p.proacl::text[]) x), 'default'), ',' order by p.proname, pg_get_function_identity_arguments(p.oid))) h
      from pg_proc p join pg_namespace s on s.oid = p.pronamespace
      left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
      where s.nspname = 'public' and d.objid is null),
pol as (select count(*) n, md5(string_agg(tablename || '.' || policyname || ':' || cmd || ':' || array_to_string(roles, '|')
                         || ':' || coalesce(qual, '') || ':' || coalesce(with_check, ''), ',' order by tablename, policyname)) h
        from pg_policies where schemaname = 'public'),
trg as (select count(*) n, md5(string_agg(c.relname || '.' || tg.tgname || ':' || pg_get_triggerdef(tg.oid), ',' order by c.relname, tg.tgname)) h
        from pg_trigger tg join pg_class c on c.oid = tg.tgrelid join pg_namespace s on s.oid = c.relnamespace
        where s.nspname = 'public' and not tg.tgisinternal),
fk as (select count(*) n, md5(string_agg(conrelid::regclass::text || ':' || conname || ':' || pg_get_constraintdef(oid), ',' order by conrelid::regclass::text, conname)) h
       from pg_constraint where connamespace = 'public'::regnamespace),
g as (select count(*) n, md5(string_agg(table_name || ':' || grantee || ':' || privilege_type, ',' order by table_name, grantee, privilege_type)) h
      from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')),
rows as (select
  (select count(*) from public.companies) companies,
  (select count(*) from public.companies where approved) companies_approved,
  (select count(*) from public.rate_reports) rate_reports,
  (select count(*) from public.comments) comments,
  (select count(*) from public.abuse_reports) abuse_reports,
  (select count(*) from public.removal_requests) removal_requests,
  (select count(*) from public.admins) admins,
  (select count(*) from public.daily_visits) daily_visits,
  (select md5(string_agg(id::text || slug, ',' order by id)) from public.companies) companies_fp,
  (select md5(string_agg(user_id::text, ',' order by user_id)) from public.admins) admins_fp),
au as (select count(*) n, md5(string_agg(id::text, ',' order by id)) h from auth.users),
ai as (select count(*) n, md5(string_agg(user_id::text || ':' || provider, ',' order by user_id, provider)) h from auth.identities)
select item, value from (values
  ('01 public tables (count | fingerprint incl. RLS on/off)', (select n || ' | ' || h from t)),
  ('02 public functions', (select n || ' | ' || h from f)),
  ('03 RLS policies', (select n || ' | ' || h from pol)),
  ('04 triggers', (select n || ' | ' || h from trg)),
  ('05 constraints (PK/FK/check)', (select n || ' | ' || h from fk)),
  ('06 table grants to API roles', (select n || ' | ' || h from g)),
  ('07 tables without RLS', (select coalesce(string_agg(c.relname, ', '), 'none') from pg_class c
                              where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity)),
  ('08 merge_companies callable by anon?', (select has_function_privilege('anon', 'public.merge_companies(uuid,uuid)', 'execute')::text)),
  ('10 companies (all | approved)', (select companies || ' | ' || companies_approved from rows)),
  ('11 rate_reports | comments', (select rate_reports || ' | ' || comments from rows)),
  ('12 abuse_reports | removal_requests', (select abuse_reports || ' | ' || removal_requests from rows)),
  ('13 admins | daily_visits', (select admins || ' | ' || daily_visits from rows)),
  ('14 companies fingerprint (ids+slugs)', (select companies_fp from rows)),
  ('15 admins fingerprint (user ids)', (select admins_fp from rows)),
  ('20 auth users (count | id fingerprint)', (select n || ' | ' || h from au)),
  ('21 auth identities (count | fingerprint)', (select n || ' | ' || h from ai)),
  ('22 admin rows pointing at a missing user', (select count(*)::text from public.admins a left join auth.users u on u.id = a.user_id where u.id is null))
) v(item, value) order by item;
