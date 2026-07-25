-- ============================================================
-- RackDoc — Datacenter Cabinet Documentation
-- Initial schema: organizations, members, invites, cabinets, devices
-- Run this in the Supabase SQL editor (or via supabase db push).
-- ============================================================

-- ---------- Enums ----------
create type public.org_role as enum ('owner', 'admin', 'editor', 'viewer');
create type public.cabinet_post_type as enum ('two_post', 'four_post');
create type public.door_type as enum ('none', 'front', 'rear', 'front_rear');
create type public.pdu_mount as enum ('none', 'front', 'rear', 'front_rear');
create type public.cable_entry as enum ('top', 'bottom', 'both');
create type public.device_depth as enum ('full', 'three_quarter', 'half', 'short');
create type public.device_face as enum ('front', 'rear');

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  -- Auto-accept any pending invites for this email
  insert into public.organization_members (org_id, user_id, role)
  select i.org_id, new.id, i.role
  from public.organization_invites i
  where lower(i.email) = lower(new.email)
  on conflict do nothing;
  delete from public.organization_invites where lower(email) = lower(new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Organizations ----------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.org_role not null default 'editor',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

-- Creator automatically becomes owner
create or replace function public.handle_new_org()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.organization_members (org_id, user_id, role)
  values (new.id, auth.uid(), 'owner');
  return new;
end;
$$;

create trigger on_org_created
  after insert on public.organizations
  for each row execute function public.handle_new_org();

-- ---------- Membership helpers (security definer avoids RLS recursion) ----------
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where org_id = p_org and user_id = auth.uid()
  );
$$;

create or replace function public.org_role_of(p_org uuid)
returns public.org_role
language sql stable security definer set search_path = public
as $$
  select role from public.organization_members
  where org_id = p_org and user_id = auth.uid();
$$;

create or replace function public.has_org_role(p_org uuid, p_min public.org_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case public.org_role_of(p_org)
    when 'owner'  then true
    when 'admin'  then p_min in ('admin', 'editor', 'viewer')
    when 'editor' then p_min in ('editor', 'viewer')
    when 'viewer' then p_min = 'viewer'
    else false
  end;
$$;

-- ---------- Cabinets ----------
create table public.cabinets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  location text,
  post_type public.cabinet_post_type not null default 'four_post',
  height_u int not null default 42 check (height_u between 4 and 60),
  door public.door_type not null default 'front',
  pdu_mount public.pdu_mount not null default 'rear',
  pdu_both_sides boolean not null default true,
  power_from_floor boolean not null default true,
  cable_entry public.cable_entry not null default 'bottom',
  notes jsonb,
  notes_html text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cabinets_org_idx on public.cabinets (org_id);

-- ---------- Devices ----------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid not null references public.cabinets (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  device_type text not null default 'server',
  position_u int not null check (position_u >= 1),
  height_u int not null default 1 check (height_u between 1 and 24),
  depth public.device_depth not null default 'full',
  face public.device_face not null default 'front',
  color text,
  manufacturer text,
  model text,
  serial_number text,
  asset_tag text,
  notes jsonb,
  notes_html text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index devices_cabinet_idx on public.devices (cabinet_id);

-- ---------- updated_at maintenance ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cabinets_touch before update on public.cabinets
  for each row execute function public.touch_updated_at();
create trigger devices_touch before update on public.devices
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
alter table public.cabinets enable row level security;
alter table public.devices enable row level security;

-- Profiles: read your own, plus profiles of people who share an org with you
create policy "profiles_select" on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.organization_members me
      join public.organization_members them on them.org_id = me.org_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Organizations
create policy "orgs_select_member" on public.organizations for select
  using (public.is_org_member(id));
create policy "orgs_insert_any_auth" on public.organizations for insert
  with check (auth.uid() is not null and created_by = auth.uid());
create policy "orgs_update_admin" on public.organizations for update
  using (public.has_org_role(id, 'admin'));
create policy "orgs_delete_owner" on public.organizations for delete
  using (public.org_role_of(id) = 'owner');

-- Members
create policy "members_select_member" on public.organization_members for select
  using (public.is_org_member(org_id));
create policy "members_insert_admin" on public.organization_members for insert
  with check (public.has_org_role(org_id, 'admin'));
create policy "members_update_admin" on public.organization_members for update
  using (public.has_org_role(org_id, 'admin') and role <> 'owner')
  with check (role <> 'owner');
create policy "members_delete" on public.organization_members for delete
  using (
    (user_id = auth.uid() and role <> 'owner')                -- leave org yourself
    or (public.has_org_role(org_id, 'admin') and role <> 'owner')
  );

-- Invites
create policy "invites_select" on public.organization_invites for select
  using (
    public.has_org_role(org_id, 'admin')
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy "invites_insert_admin" on public.organization_invites for insert
  with check (public.has_org_role(org_id, 'admin'));
create policy "invites_delete_admin" on public.organization_invites for delete
  using (public.has_org_role(org_id, 'admin'));

-- Accept an invite addressed to the signed-in user's email
create or replace function public.accept_invite(p_invite uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_invite public.organization_invites;
  v_email text;
begin
  select coalesce(auth.jwt() ->> 'email', '') into v_email;
  select * into v_invite from public.organization_invites where id = p_invite;
  if v_invite.id is null or lower(v_invite.email) <> lower(v_email) then
    raise exception 'Invite not found for this account';
  end if;
  insert into public.organization_members (org_id, user_id, role)
  values (v_invite.org_id, auth.uid(), v_invite.role)
  on conflict do nothing;
  delete from public.organization_invites where id = p_invite;
end;
$$;

-- Cabinets
create policy "cabinets_select_member" on public.cabinets for select
  using (public.is_org_member(org_id));
create policy "cabinets_insert_editor" on public.cabinets for insert
  with check (public.has_org_role(org_id, 'editor'));
create policy "cabinets_update_editor" on public.cabinets for update
  using (public.has_org_role(org_id, 'editor'));
create policy "cabinets_delete_admin" on public.cabinets for delete
  using (public.has_org_role(org_id, 'admin'));

-- Devices (permission derives from the cabinet's org)
create or replace function public.cabinet_org(p_cabinet uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select org_id from public.cabinets where id = p_cabinet;
$$;

create policy "devices_select_member" on public.devices for select
  using (public.is_org_member(public.cabinet_org(cabinet_id)));
create policy "devices_insert_editor" on public.devices for insert
  with check (public.has_org_role(public.cabinet_org(cabinet_id), 'editor'));
create policy "devices_update_editor" on public.devices for update
  using (public.has_org_role(public.cabinet_org(cabinet_id), 'editor'));
create policy "devices_delete_editor" on public.devices for delete
  using (public.has_org_role(public.cabinet_org(cabinet_id), 'editor'));
