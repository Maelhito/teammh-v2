-- Suivi des mesures TTM : poids, mensurations et photos de progression
-- À exécuter dans Supabase → SQL Editor
--
-- Rythme prévu : une prise de mesures toutes les 2 semaines (poids + mensurations).
-- Les photos sont libres (quand la cliente veut).

-- ── Mesures (poids + mensurations) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mesures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,

  poids NUMERIC(5,2),           -- kg
  tour_taille NUMERIC(5,1),     -- cm
  tour_hanches NUMERIC(5,1),
  tour_cuisse NUMERIC(5,1),
  tour_bras NUMERIC(5,1),
  tour_poitrine NUMERIC(5,1),

  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- une seule prise de mesures par jour et par cliente
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_mesures_user_date ON mesures(user_id, date DESC);

-- ── Photos de progression ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos_progression (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  angle TEXT NOT NULL CHECK (angle IN ('face', 'profil', 'dos')),
  -- chemin dans le bucket privé "photos-progression" (jamais une URL publique)
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_progression_user
  ON photos_progression(user_id, date DESC);

-- updated_at automatique sur mesures
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mesures_updated_at ON mesures;
CREATE TRIGGER trg_mesures_updated_at
BEFORE UPDATE ON mesures
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
