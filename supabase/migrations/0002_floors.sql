-- ============================================================
-- RackDoc v2 — Floor plans
-- Floors hold multiple cabinets placed on a tile grid.
-- Run after 0001_init.sql.
-- ============================================================

create table public.floors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  grid_cols int not null default 12 check (grid_cols between 2 and 60),
  grid_rows int not null default 8 check (grid_rows between 2 and 60),
  notes jsonb,
  notes_html text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index floors_org_idx on public.floors (org_id);

create trigger floors_touch before update on public.floors
  for each row execute function public.touch_updated_at();

-- Cabinet placement on a floor (tile coordinates, 0-based; rotation in degrees)
alter table public.cabinets
  add column floor_id uuid references public.floors (id) on delete set null,
  add column floor_x int,
  add column floor_y int,
  add column floor_rotation int not null default 0
    check (floor_rotation in (0, 90, 180, 270));

create index cabinets_floor_idx on public.cabinets (floor_id);

-- ---------- RLS ----------
alter table public.floors enable row level security;

create policy "floors_select_member" on public.floors for select
  using (public.is_org_member(org_id));
create policy "floors_insert_editor" on public.floors for insert
  with check (public.has_org_role(org_id, 'editor'));
create policy "floors_update_editor" on public.floors for update
  using (public.has_org_role(org_id, 'editor'));
create policy "floors_delete_admin" on public.floors for delete
  using (public.has_org_role(org_id, 'admin'));
