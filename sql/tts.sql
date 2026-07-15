-- ============================================================
-- TIME TO START (TTS) / TIME TO LAST (TTL)
-- Les tables tts_* (modules, programmes, vidéos, recettes) sont
-- isolées : aucune FK vers les tables TTM, tout référence
-- uniquement auth.users(id). Un split TTS/TTL est délibérément
-- différé tant qu'aucune app cliente TTL n'existe et que son
-- contenu ne diverge pas de celui de TTS.
-- offres_clientes / offres_clientes_historique sont volontairement
-- transverses : elles pilotent aussi TTM et piloteront plus tard
-- l'app cliente TTL. Gérées via l'endpoint neutre
-- app/api/admin/offres (hors du namespace tts-ttl), qui peut lire
-- user_profiles à des fins d'affichage — ce n'est pas TTS/TTL qui
-- va chercher dans TTM.
-- RLS activé sans policy = accès exclusif via service role (admin),
-- jamais en lecture/écriture directe coach ou cliente.
-- À exécuter dans l'éditeur SQL Supabase.
-- ============================================================

-- 1. Aiguillage d'offre (table neutre)
CREATE TABLE IF NOT EXISTS offres_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  offre TEXT NOT NULL CHECK (offre IN ('TTS', 'TTM', 'TTL')),
  date_debut DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offres_clientes_user ON offres_clientes(user_id);

-- 2. Historique des changements d'offre (garde-fou)
CREATE TABLE IF NOT EXISTS offres_clientes_historique (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  offre_avant TEXT CHECK (offre_avant IN ('TTS', 'TTM', 'TTL')),
  offre_apres TEXT NOT NULL CHECK (offre_apres IN ('TTS', 'TTM', 'TTL')),
  hors_ordre BOOLEAN DEFAULT false,
  -- true si la transition ne respecte pas l'ordre normal TTS -> TTM -> TTL
  confirmed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offres_historique_user ON offres_clientes_historique(user_id);

-- 3. Modules d'onboarding (Démarrage / Sport / Nutrition / Mindset / ...)
CREATE TABLE IF NOT EXISTS tts_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  -- parcours linéaire imposé : un module se débloque une fois le précédent terminé
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tts_modules_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES tts_modules(id) ON DELETE CASCADE NOT NULL,
  titre TEXT NOT NULL,
  lien_youtube TEXT NOT NULL,
  cover_url TEXT,
  ordre INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tts_modules_videos_module ON tts_modules_videos(module_id);

CREATE TABLE IF NOT EXISTS tts_modules_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES tts_modules_videos(id) ON DELETE CASCADE NOT NULL,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_tts_modules_progress_user ON tts_modules_progress(user_id);

-- 4. Programmes sport mensuels (1 mois = exactement 3 vidéos)
CREATE TABLE IF NOT EXISTS tts_programmes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_mois INT NOT NULL UNIQUE,
  titre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tts_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID REFERENCES tts_programmes(id) ON DELETE CASCADE NOT NULL,
  titre TEXT NOT NULL,
  lien_youtube TEXT NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tts_videos_programme ON tts_videos(programme_id);

-- 5. Recettes (bibliothèque libre, pas liée à un mois)
CREATE TABLE IF NOT EXISTS tts_recettes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  photo_url TEXT,
  texte TEXT,
  ingredients TEXT,
  macros JSONB,
  -- ex: { "calories": 420, "proteines": 32, "glucides": 38, "lipides": 14 }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS strict : aucune policy = accès uniquement via service role
-- (API routes admin avec requireAdmin()), jamais côté client direct.
-- ============================================================

ALTER TABLE offres_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offres_clientes_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_modules_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_modules_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tts_recettes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 2 — description + document optionnel sur les vidéos
-- d'onboarding, buckets storage pour upload direct (images,
-- documents type devoirs). À exécuter après le bloc ci-dessus.
-- ============================================================

ALTER TABLE tts_modules_videos
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS doc_url TEXT,
  ADD COLUMN IF NOT EXISTS doc_name TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-images', 'tts-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-docs', 'tts-docs', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- MIGRATION 3 — description, matériel, image de couverture sur
-- chaque vidéo sport (tts_videos). À exécuter après les blocs
-- précédents.
-- ============================================================

ALTER TABLE tts_videos
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS materiel TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- ============================================================
-- MIGRATION 4 — capsules motivation (contenu court, libre,
-- non lié à un mois ni à un module) + catégorie/durée sur les
-- recettes pour la bibliothèque. À exécuter après les blocs
-- précédents.
-- ============================================================

CREATE TABLE IF NOT EXISTS tts_capsules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  lien_youtube TEXT NOT NULL,
  description TEXT,
  duree_minutes INT,
  cover_url TEXT,
  ordre INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tts_capsules ENABLE ROW LEVEL SECURITY;

ALTER TABLE tts_recettes
  ADD COLUMN IF NOT EXISTS categorie TEXT CHECK (categorie IN ('petit_dej', 'dejeuner', 'diner', 'collation')),
  ADD COLUMN IF NOT EXISTS duree_minutes INT;

-- ============================================================
-- MIGRATION 5 — validation des séances sport par semaine.
-- Le programme du mois (3 vidéos) est répété chaque semaine ;
-- valider une séance en semaine 2 ne la valide pas en semaine 3.
-- À exécuter après les blocs précédents.
-- ============================================================

CREATE TABLE IF NOT EXISTS tts_seances_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES tts_videos(id) ON DELETE CASCADE NOT NULL,
  semaine INT NOT NULL CHECK (semaine BETWEEN 1 AND 4),
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id, semaine)
);

CREATE INDEX IF NOT EXISTS idx_tts_seances_progress_user ON tts_seances_progress(user_id);

ALTER TABLE tts_seances_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 6 — objectif capturé à l'inscription + demandes de
-- bilan (CTA de conversion vers Time To Move, uniquement visible
-- côté admin qui recontacte la cliente).
-- À exécuter après les blocs précédents.
-- ============================================================

CREATE TABLE IF NOT EXISTS tts_objectifs (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  objectif TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tts_objectifs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS tts_demandes_bilan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  traite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tts_demandes_bilan_user ON tts_demandes_bilan(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_demandes_bilan_traite ON tts_demandes_bilan(traite);

ALTER TABLE tts_demandes_bilan ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 7 — abonnement Stripe TTS. L'accès à /tts est payant
-- (contrairement à TTM, géré manuellement hors app). Le statut
-- fait foi via les webhooks Stripe, jamais via le client.
-- À exécuter après les blocs précédents.
-- ============================================================

CREATE TABLE IF NOT EXISTS tts_subscriptions (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  offer_slug TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete',
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tts_subscriptions_customer ON tts_subscriptions(stripe_customer_id);

ALTER TABLE tts_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION 8 — gels de streak (protège la flamme sans la
-- réinitialiser) et jours d'entraînement choisis par la cliente.
-- streak_freezes rejoint streak_current/streak_last_activity sur
-- user_profiles (déjà partagé entre TTM et TTS pour la même
-- raison : une cliente n'a qu'une offre active à la fois).
-- À exécuter après les blocs précédents.
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS streak_freezes INT NOT NULL DEFAULT 0;

ALTER TABLE tts_objectifs
  ADD COLUMN IF NOT EXISTS jours_entrainement TEXT[] DEFAULT '{}';
