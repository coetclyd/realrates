-- Pre-load common UK HGV agencies and hauliers so the name box suggests them.
-- Safe to re-run: skips names that already exist.
with names(name, kind) as (values
  -- Driving agencies
  ('Driver Hire', 'agency'), ('Blue Arrow', 'agency'), ('Adecco', 'agency'), ('Pertemps', 'agency'),
  ('Staffline', 'agency'), ('Randstad', 'agency'), ('Driver Require', 'agency'),
  ('Driving Force Recruitment', 'agency'), ('HGV Drivers UK', 'agency'), ('StaffCo Direct', 'agency'),
  ('Grafters Recruit', 'agency'), ('Drivers Direct Recruitment', 'agency'), ('Connect Driver Solutions', 'agency'),
  ('Gi Group', 'agency'), ('Search Consultancy', 'agency'), ('Kelly Services', 'agency'),
  ('Manpower', 'agency'), ('Hays', 'agency'), ('Reed', 'agency'), ('Tate', 'agency'),
  ('Extra Personnel', 'agency'), ('Logistics Personnel', 'agency'), ('Interaction Recruitment', 'agency'),
  ('Nicholas Associates', 'agency'), ('Prime Appointments', 'agency'), ('Express Recruitment', 'agency'),
  -- Hauliers and own-fleet operators
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

-- New names are held for approval by default; approve this starter list.
update public.companies set approved = true where created_by is null and approved = false;

select count(*) as approved_companies from public.companies where approved;
