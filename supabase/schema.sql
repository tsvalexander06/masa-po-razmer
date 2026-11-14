-- Облачна база за админа на konvektomat.store (Supabase).
-- Пуска се веднъж: Supabase → SQL Editor → New query → постави целия файл → Run.
-- Може да се пусне повторно без вреда.
-- ПРЕДИ ДА ГО ПУСНЕШ: смени имейла най-долу с имейла, с който ще влизаш в админа.

-- 1. Кой има достъп: само имейлите в тази таблица (дори някой да си направи профил, не вижда нищо).
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;            -- без правила: не се чете отвън

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins
                 where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- 2. Данни: поръчки, фира в склада, настройки. Всеки ред: id + данните като JSON + кога е променен.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create table if not exists public.orders  (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.offcuts (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.kv      (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.counters (name text primary key, value integer not null);

do $$
declare t text;
begin
  foreach t in array array['orders','offcuts','kv'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop trigger if exists %I on public.%I', 'touch_' || t, t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.touch_updated_at()', 'touch_' || t, t);
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

alter table public.counters enable row level security;
drop policy if exists admin_read on public.counters;
create policy admin_read on public.counters for select to authenticated using (public.is_admin());

-- 3. Поредни номера (№ на поръчка, Ф- на фира): раздават се от базата, за да не се повтарят
--    при две устройства. Връща първия номер от блок с p_count номера; p_min = не по-малко от.
create or replace function public.take_serial(p_name text, p_count integer, p_min integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.counters(name, value) values (p_name, greatest(coalesce(p_min, 1), 1))
    on conflict (name) do nothing;
  update public.counters
     set value = greatest(value, coalesce(p_min, 1)) + greatest(coalesce(p_count, 0), 0)
   where name = p_name
  returning value - greatest(coalesce(p_count, 0), 0) into v;
  return v;
end $$;
revoke execute on function public.take_serial(text, integer, integer) from public, anon;
grant execute on function public.take_serial(text, integer, integer) to authenticated;

-- 4. PDF-ите на поръчките: частна кофа "docs", само за админите.
insert into storage.buckets (id, name, public) values ('docs', 'docs', false)
  on conflict (id) do update set public = false;
drop policy if exists docs_admin_select on storage.objects;
drop policy if exists docs_admin_insert on storage.objects;
drop policy if exists docs_admin_update on storage.objects;
drop policy if exists docs_admin_delete on storage.objects;
create policy docs_admin_select on storage.objects for select to authenticated using (bucket_id = 'docs' and public.is_admin());
create policy docs_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'docs' and public.is_admin());
create policy docs_admin_update on storage.objects for update to authenticated using (bucket_id = 'docs' and public.is_admin());
create policy docs_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'docs' and public.is_admin());

-- 5. Админи: смени имейла (може и няколко реда за повече хора).
insert into public.admins (email) values ('ТВОЯТ@ИМЕЙЛ.com') on conflict do nothing;
