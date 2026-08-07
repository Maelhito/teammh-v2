-- Questionnaire de démarrage (module-0, point 1 "Vidéo de présentation")
-- À exécuter dans Supabase → SQL Editor
--
-- Les 4 réponses d'objectifs sont AUSSI recopiées dans user_profiles
-- (objectif_4mois_poids, objectif_4mois_bienetre, objectif_12mois_poids,
-- objectif_12mois_bienetre) au moment de la sauvegarde, pour que la cliente les
-- retrouve dans son profil et le coach dans sa fiche.

CREATE TABLE IF NOT EXISTS questionnaire_demarrage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Objectifs 4 mois
  objectif_4mois_poids TEXT,
  objectif_4mois_bienetre TEXT,
  -- Objectifs 12 mois
  objectif_12mois_poids TEXT,
  objectif_12mois_bienetre TEXT,

  -- Accompagnement
  freins TEXT,
  aide_accompagnement TEXT,

  -- Sport
  sport_actuel TEXT,
  douleurs_contreindications TEXT,
  balance TEXT,
  metre_ruban TEXT,

  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_demarrage_user
  ON questionnaire_demarrage(user_id);

-- updated_at automatique (réutilise la fonction set_updated_at si déjà créée)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_questionnaire_demarrage_updated_at ON questionnaire_demarrage;
CREATE TRIGGER trg_questionnaire_demarrage_updated_at
BEFORE UPDATE ON questionnaire_demarrage
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
