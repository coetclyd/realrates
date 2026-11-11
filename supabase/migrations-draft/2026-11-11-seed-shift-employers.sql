-- DRAFT, NOT APPLIED. Run AFTER 2026-11-11-work-types.sql (needs the 'employer' company kind).
-- Adds well-known UK shift-work employers and agencies to the company picker so people outside
-- driving find their employer, and so the same company isn't added twice under slightly different
-- names. Skips any name already there. Seeded names are approved; nothing shows publicly until a
-- kind of work there has 3+ reports.
begin;
create temp table seed_names(name text, kind text) on commit drop;
insert into seed_names(name, kind) values
  -- agencies
  ('Indeed Flex', 'agency'), ('Proman', 'agency'), ('Medacs Healthcare', 'agency'), ('Pulse Healthcare', 'agency'),
  -- warehouse, logistics, factory
  ('Amazon', 'employer'), ('Ocado', 'employer'), ('Cranswick', 'employer'), ('2 Sisters Food Group', 'employer'),
  ('Bakkavor', 'employer'), ('Greencore', 'employer'), ('Moy Park', 'employer'), ('Warburtons', 'employer'),
  ('Hovis', 'employer'), ('Jaguar Land Rover', 'employer'), ('Nissan', 'employer'), ('JCB', 'employer'),
  -- retail
  ('Marks & Spencer', 'employer'), ('Boots', 'employer'), ('Primark', 'employer'), ('Next', 'employer'),
  ('B&M', 'employer'), ('Argos', 'employer'), ('Iceland', 'employer'), ('Greggs', 'employer'),
  -- hospitality
  ('Whitbread', 'employer'), ('JD Wetherspoon', 'employer'), ('Mitchells & Butlers', 'employer'),
  ('Greene King', 'employer'), ('McDonald''s', 'employer'), ('KFC', 'employer'), ('Costa Coffee', 'employer'),
  -- facilities, cleaning, security
  ('Compass Group', 'employer'), ('Sodexo', 'employer'), ('ISS', 'employer'), ('Mitie', 'employer'),
  ('OCS', 'employer'), ('Securitas', 'employer'), ('G4S', 'employer'), ('Bidvest Noonan', 'employer'),
  -- care
  ('Bupa', 'employer'), ('HC-One', 'employer'), ('Barchester Healthcare', 'employer'), ('Care UK', 'employer'),
  ('Four Seasons Health Care', 'employer'), ('Home Instead', 'employer');
insert into public.companies (name, kind)
select n.name, n.kind from seed_names n
where not exists (select 1 from public.companies c where lower(c.name) = lower(n.name));
-- approve only these seeded names (never someone's pending submission)
update public.companies c set approved = true
where c.created_by is null and not c.approved and c.name in (select name from seed_names);
commit;
-- Undo (only while none of these has reports):
--   delete from public.companies c where c.kind in ('agency','employer') and c.created_by is null
--     and c.name in (...the names above...) and not exists (select 1 from public.rate_reports r where r.company_id = c.id);
