-- Room availability status
-- Run once in the Supabase SQL editor, then run `npx prisma generate` locally
-- (schema.prisma already has the matching `status` field).
--
--   active              listed and bookable (the default)
--   under_construction  listed but greyed out; cannot be booked
--   not_available       hidden from room lists; cannot be booked
--
-- Existing bookings are untouched and still show on the booking calendar.

alter table public.rooms
  add column if not exists status text not null default 'active';

alter table public.rooms
  drop constraint if exists rooms_status_check;

alter table public.rooms
  add constraint rooms_status_check
  check (status in ('active', 'not_available', 'under_construction'));


-- Optional: carry over the rooms that were hard-coded as "under renovation" in
-- the app (F209, F205, PD208, P208). Run the SELECT first to check the matches,
-- then the UPDATE only if those rooms are still being renovated.

select id, "facilityId", name, status
from public.rooms
where regexp_replace(upper("facilityId" || ' ' || name), '[^A-Z0-9 ]', '', 'g')
      ~ '(F209|F205|PD208|P208)';

-- update public.rooms
-- set status = 'under_construction'
-- where regexp_replace(upper("facilityId" || ' ' || name), '[^A-Z0-9 ]', '', 'g')
--       ~ '(F209|F205|PD208|P208)';


-- Changing a room's status later:
-- update public.rooms set status = 'active'             where "facilityId" = 'B356';
-- update public.rooms set status = 'not_available'      where "facilityId" = 'B356';
-- update public.rooms set status = 'under_construction' where "facilityId" = 'B356';
