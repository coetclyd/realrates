-- READ-ONLY. Writes SQL that resets every public function's EXECUTE permissions to exactly what
-- the source project has. Needed because a new Supabase project auto-grants new functions to anon.
select format('revoke all on function public.%I(%s) from public, anon, authenticated, service_role;',
              p.proname, pg_get_function_identity_arguments(p.oid))
       || coalesce((select string_agg(format(' grant execute on function public.%I(%s) to %s;',
                    p.proname, pg_get_function_identity_arguments(p.oid),
                    case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end), '')
                    from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                    where a.privilege_type = 'EXECUTE'
                      and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated', 'service_role'))), '')
from pg_proc p
left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
where p.pronamespace = 'public'::regnamespace and d.objid is null
order by p.proname;
