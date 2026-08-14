-- Table pour lier un programme à une cliente
create table if not exists client_programmes (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid not null,
  programme_id     uuid not null references programmes(id) on delete cascade,
  date_debut       date not null,
  statut           text not null default 'en_cours' check (statut in ('en_cours', 'termine', 'pause')),
  seances_effectuees int not null default 0,
  created_at       timestamptz default now()
);

create index if not exists client_programmes_user_idx on client_programmes(user_id);
create index if not exists client_programmes_statut_idx on client_programmes(statut);

-- Copie profonde du programme (grille remappée aux jours choisis)
alter table client_programmes add column if not exists grid_data text;
