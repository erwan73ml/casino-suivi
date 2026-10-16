-- Suivi des gains et pertes : casino & paris sportifs.
-- Peut être exécuté dans le même projet Supabase que « Mon Budget » : les tables sont préfixées « jeux_ ».

create table if not exists public.jeux_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  type text not null check (type in ('gain', 'perte')),
  categorie text not null check (categorie in ('casino', 'paris_sportifs')),
  -- Montant net en centimes, toujours positif : le type indique s'il s'agit d'un gain ou d'une perte.
  montant_cents bigint not null check (montant_cents > 0 and montant_cents <= 100000000000),
  commentaire text check (commentaire is null or char_length(commentaire) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jeux_operations_user_date_idx on public.jeux_operations (user_id, date desc);

create table if not exists public.jeux_reglages (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  limite_pertes_cents bigint check (limite_pertes_cents is null or (limite_pertes_cents > 0 and limite_pertes_cents <= 100000000000)),
  limite_periode text not null default 'mois' check (limite_periode in ('semaine', 'mois', 'annee')),
  updated_at timestamptz not null default now()
);

create or replace function public.jeux_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists jeux_operations_touch on public.jeux_operations;
create trigger jeux_operations_touch before update on public.jeux_operations
  for each row execute function public.jeux_touch_updated_at();
drop trigger if exists jeux_reglages_touch on public.jeux_reglages;
create trigger jeux_reglages_touch before update on public.jeux_reglages
  for each row execute function public.jeux_touch_updated_at();

-- Chaque utilisateur ne voit et ne modifie que ses propres lignes.
alter table public.jeux_operations enable row level security;
alter table public.jeux_reglages enable row level security;

drop policy if exists "jeux_operations_select" on public.jeux_operations;
drop policy if exists "jeux_operations_insert" on public.jeux_operations;
drop policy if exists "jeux_operations_update" on public.jeux_operations;
drop policy if exists "jeux_operations_delete" on public.jeux_operations;
create policy "jeux_operations_select" on public.jeux_operations for select to authenticated using ((select auth.uid()) = user_id);
create policy "jeux_operations_insert" on public.jeux_operations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "jeux_operations_update" on public.jeux_operations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "jeux_operations_delete" on public.jeux_operations for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "jeux_reglages_select" on public.jeux_reglages;
drop policy if exists "jeux_reglages_insert" on public.jeux_reglages;
drop policy if exists "jeux_reglages_update" on public.jeux_reglages;
drop policy if exists "jeux_reglages_delete" on public.jeux_reglages;
create policy "jeux_reglages_select" on public.jeux_reglages for select to authenticated using ((select auth.uid()) = user_id);
create policy "jeux_reglages_insert" on public.jeux_reglages for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "jeux_reglages_update" on public.jeux_reglages for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "jeux_reglages_delete" on public.jeux_reglages for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.jeux_operations, public.jeux_reglages from anon;
grant select, insert, update, delete on public.jeux_operations, public.jeux_reglages to authenticated;
