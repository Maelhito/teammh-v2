-- ============================================================
-- TIME TO START (TTS) / TIME TO LAST (TTL)
-- Schéma isolé, aucune dépendance sur les tables TTM existantes.
-- Référence uniquement auth.users(id) — jamais user_profiles
-- pour garder TTS/TTL totalement découplé du contenu TTM.
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
