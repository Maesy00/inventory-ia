-- À exécuter une seule fois dans Supabase → SQL Editor, sur le projet
-- « Divers.ia » (le même que Coach.ia, Brain.ia et Pause).
-- Crée la table d'Inventory.ia, protégée par RLS : chaque utilisateur ne
-- voit et ne modifie que ses propres entrées.

create table if not exists inventory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  date date not null,
  rating smallint check (rating between 1 and 5),
  author text,
  medium text,
  location text,
  notes text default '',
  created_at timestamptz not null default now()
);

create index if not exists inventory_entries_user_date_idx
  on inventory_entries (user_id, date desc);

alter table inventory_entries enable row level security;

create policy "Users can view own inventory entries"
  on inventory_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own inventory entries"
  on inventory_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own inventory entries"
  on inventory_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own inventory entries"
  on inventory_entries for delete
  using (auth.uid() = user_id);

-- Ajout ultérieur (livres) : à exécuter si la table existait déjà.
alter table inventory_entries add column if not exists author text;
