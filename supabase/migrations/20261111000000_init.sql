-- Cover Manager schema
-- One rota serves both Week A and Week B, so slots are just weekday + period.

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  teaches text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.rota_slots (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  kind text not null check (kind in ('lesson', 'tutor')),
  day smallint not null check (day between 1 and 5),
  period text not null check (period in ('P1','P2','P3','P4','TA','TB','P5','P6')),
  option smallint check (option in (1, 2)), -- 1st / 2nd likely cover; null for tutor
  unique (staff_id, day, period)
);
create index rota_slots_day_period on public.rota_slots (day, period);

-- Every cover actually set. Never deleted by the weekly reset: "this week" is
-- worked out from cover_date, so history is kept for good.
create table public.covers (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete restrict,
  cover_date date not null,
  period text not null check (period in ('P1','P2','P3','P4','TA','TB','P5','P6')),
  absent_teacher text,
  class_name text,
  notes text,
  on_rota boolean not null default true, -- false when used outside their rota slots
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (staff_id, cover_date, period)
);
create index covers_date on public.covers (cover_date);
create index covers_staff_date on public.covers (staff_id, cover_date);

-- Monday of the week a cover falls in (usage resets each Monday).
create or replace function public.week_start(d date) returns date
language sql immutable as $$ select d - (extract(isodow from d)::int - 1) $$;

-- Who may use the app. Add rows here to give someone access.
create table public.allowed_users (
  email text primary key
);

create or replace function public.is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

alter table public.staff enable row level security;
alter table public.rota_slots enable row level security;
alter table public.covers enable row level security;
alter table public.allowed_users enable row level security;

create policy "allowed users" on public.staff for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());
create policy "allowed users" on public.rota_slots for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());
create policy "allowed users" on public.covers for all to authenticated
  using (public.is_allowed()) with check (public.is_allowed());
create policy "read own row" on public.allowed_users for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Replace the whole rota in one transaction (used by the spreadsheet import).
-- Staff missing from the new file are marked inactive, never deleted, so
-- their cover history stays intact.
create or replace function public.import_rota(payload jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  r jsonb;
  s jsonb;
  sid uuid;
  n_staff int := 0;
  n_slots int := 0;
  n_inactive int := 0;
begin
  if not public.is_allowed() then
    raise exception 'not allowed';
  end if;

  for r in select * from jsonb_array_elements(payload) loop
    insert into staff (code, name, teaches, active)
    values (r->>'code', r->>'name', nullif(r->>'teaches', ''), true)
    on conflict (code) do update
      set name = excluded.name,
          teaches = coalesce(excluded.teaches, staff.teaches),
          active = true
    returning id into sid;
    n_staff := n_staff + 1;

    delete from rota_slots where staff_id = sid;
    for s in select * from jsonb_array_elements(r->'slots') loop
      insert into rota_slots (staff_id, kind, day, period, option)
      values (sid, s->>'kind', (s->>'day')::smallint, s->>'period', nullif(s->>'option', '')::smallint)
      on conflict (staff_id, day, period) do nothing;
      n_slots := n_slots + 1;
    end loop;
  end loop;

  update staff set active = false
  where active and code not in (select x->>'code' from jsonb_array_elements(payload) x);
  get diagnostics n_inactive = row_count;
  delete from rota_slots where staff_id in (select id from staff where not active);

  return jsonb_build_object('staff', n_staff, 'slots', n_slots, 'deactivated', n_inactive);
end $$;

-- Cover counts per person over a date range (runs with the caller's RLS).
create or replace function public.cover_counts(from_date date, to_date date)
returns table (staff_id uuid, total bigint, weeks bigint, last_date date)
language sql stable security invoker set search_path = public as $$
  select c.staff_id,
         count(*) as total,
         count(distinct public.week_start(c.cover_date)) as weeks,
         max(c.cover_date) as last_date
  from covers c
  where c.cover_date between from_date and to_date
  group by c.staff_id
$$;

-- Covers per week over a date range, for the history chart.
create or replace function public.weekly_totals(from_date date, to_date date)
returns table (week date, total bigint, people bigint)
language sql stable security invoker set search_path = public as $$
  select public.week_start(c.cover_date) as week,
         count(*) as total,
         count(distinct c.staff_id) as people
  from covers c
  where c.cover_date between from_date and to_date
  group by 1
  order by 1
$$;
