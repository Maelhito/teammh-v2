-- Fondations de données pour les offres "Time To Start" (TTS) et "Time To Live" (TTL).
-- 100% isolé de TTM : aucune table existante n'est modifiée par cette migration.

-- =========================================================
-- offres_clientes : offre actuelle d'un utilisateur
-- =========================================================
create table if not exists offres_clientes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  offre_actuelle text not null check (offre_actuelle in ('tts', 'ttm', 'ttl')),
  updated_at timestamptz not null default now()
);

create index if not exists idx_offres_clientes_offre_actuelle
  on offres_clientes (offre_actuelle);

-- =========================================================
-- offres_clientes_historique : trace de chaque changement d'offre
-- =========================================================
create table if not exists offres_clientes_historique (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ancienne_offre text check (ancienne_offre in ('tts', 'ttm', 'ttl')),
  nouvelle_offre text not null check (nouvelle_offre in ('tts', 'ttm', 'ttl')),
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id)
);

create index if not exists idx_offres_clientes_historique_user_id
  on offres_clientes_historique (user_id);

-- =========================================================
-- tts_modules : modules d'onboarding TTS / TTL
-- =========================================================
create table if not exists tts_modules (
  id uuid primary key default gen_random_uuid(),
  offre text not null check (offre in ('tts', 'ttl')),
  titre text not null,
  description text,
  contenu text,
  type text not null check (type in ('video', 'document', 'mixed')),
  ordre integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tts_modules_offre on tts_modules (offre);
create index if not exists idx_tts_modules_ordre on tts_modules (ordre);

-- =========================================================
-- tts_programmes : blocs de 3 séances sport
-- =========================================================
create table if not exists tts_programmes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  actif boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_tts_programmes_actif on tts_programmes (actif);

-- =========================================================
-- tts_videos : vidéos liées à un programme
-- =========================================================
create table if not exists tts_videos (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references tts_programmes(id) on delete cascade,
  titre text not null,
  url_youtube text not null,
  ordre integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tts_videos_programme_id on tts_videos (programme_id);
create index if not exists idx_tts_videos_ordre on tts_videos (ordre);

-- =========================================================
-- tts_recettes
-- =========================================================
create table if not exists tts_recettes (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  categorie text not null check (categorie in ('petit_dej', 'dejeuner', 'diner', 'collation')),
  photo_url text,
  texte_preparation text not null,
  ingredients jsonb not null,
  calories numeric,
  lipides_g numeric,
  glucides_g numeric,
  proteines_g numeric,
  offres_autorisees text[] not null default array['tts', 'ttl'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tts_recettes_categorie on tts_recettes (categorie);
create index if not exists idx_tts_recettes_offres_autorisees
  on tts_recettes using gin (offres_autorisees);

-- =========================================================
-- Row Level Security
-- =========================================================
alter table offres_clientes enable row level security;
alter table offres_clientes_historique enable row level security;
alter table tts_modules enable row level security;
alter table tts_programmes enable row level security;
alter table tts_videos enable row level security;
alter table tts_recettes enable row level security;

-- Helper implicite : un utilisateur est admin si
-- auth.users.raw_user_meta_data->>'role' = 'admin'

-- ---------------------------------------------------------
-- offres_clientes
-- ---------------------------------------------------------
create policy "offres_clientes_select_self_or_admin"
  on offres_clientes for select
  using (
    auth.uid() = user_id
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "offres_clientes_admin_insert"
  on offres_clientes for insert
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "offres_clientes_admin_update"
  on offres_clientes for update
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "offres_clientes_admin_delete"
  on offres_clientes for delete
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------
-- offres_clientes_historique (admin uniquement, y compris lecture)
-- ---------------------------------------------------------
create policy "offres_clientes_historique_admin_select"
  on offres_clientes_historique for select
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "offres_clientes_historique_admin_insert"
  on offres_clientes_historique for insert
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "offres_clientes_historique_admin_update"
  on offres_clientes_historique for update
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "offres_clientes_historique_admin_delete"
  on offres_clientes_historique for delete
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------
-- tts_modules (lecture conditionnée à l'offre de l'utilisateur)
-- ---------------------------------------------------------
create policy "tts_modules_select_by_offre_or_admin"
  on tts_modules for select
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from offres_clientes oc
      where oc.user_id = auth.uid()
        and (
          oc.offre_actuelle = tts_modules.offre
          or (oc.offre_actuelle = 'ttl' and tts_modules.offre = 'tts')
        )
    )
  );

create policy "tts_modules_admin_insert"
  on tts_modules for insert
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "tts_modules_admin_update"
  on tts_modules for update
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "tts_modules_admin_delete"
  on tts_modules for delete
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------
-- tts_programmes (pas de notion d'offre, tts et ttl voient tout)
-- ---------------------------------------------------------
create policy "tts_programmes_select_by_offre_or_admin"
  on tts_programmes for select
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from offres_clientes oc
      where oc.user_id = auth.uid()
        and oc.offre_actuelle in ('tts', 'ttl')
    )
  );

create policy "tts_programmes_admin_insert"
  on tts_programmes for insert
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "tts_programmes_admin_update"
  on tts_programmes for update
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "tts_programmes_admin_delete"
  on tts_programmes for delete
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------
-- tts_videos (suit le même accès que le programme parent)
-- ---------------------------------------------------------
create policy "tts_videos_select_by_offre_or_admin"
  on tts_videos for select
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from offres_clientes oc
      where oc.user_id = auth.uid()
        and oc.offre_actuelle in ('tts', 'ttl')
    )
  );

create policy "tts_videos_admin_insert"
  on tts_videos for insert
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "tts_videos_admin_update"
  on tts_videos for update
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "tts_videos_admin_delete"
  on tts_videos for delete
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------
-- tts_recettes (lecture basée sur offres_autorisees)
-- ---------------------------------------------------------
create policy "tts_recettes_select_by_offre_or_admin"
  on tts_recettes for select
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from offres_clientes oc
      where oc.user_id = auth.uid()
        and oc.offre_actuelle = any (tts_recettes.offres_autorisees)
    )
  );

create policy "tts_recettes_admin_insert"
  on tts_recettes for insert
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "tts_recettes_admin_update"
  on tts_recettes for update
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "tts_recettes_admin_delete"
  on tts_recettes for delete
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
