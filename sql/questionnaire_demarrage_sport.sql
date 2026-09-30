-- Questionnaire de démarrage (module-0) : le sport se détaille.
-- « Est-ce que tu fais du sport actuellement ? » devient Oui / Non, et si Oui :
-- combien de fois par semaine, quel type de sport (léger / modéré / intense),
-- combien de temps durent les séances.
-- À exécuter dans Supabase → SQL Editor (table déjà existante en prod).

ALTER TABLE questionnaire_demarrage
  ADD COLUMN IF NOT EXISTS sport_frequence TEXT,
  ADD COLUMN IF NOT EXISTS sport_intensite TEXT,
  ADD COLUMN IF NOT EXISTS sport_duree TEXT;

NOTIFY pgrst, 'reload schema';
