-- Ajout de 4 questions au questionnaire de démarrage (module-0) :
-- niveau d'énergie, niveau de sommeil, niveau de confiance (note sur 10)
-- et taille de pantalon.
-- À exécuter dans Supabase → SQL Editor (table déjà existante en prod).

ALTER TABLE questionnaire_demarrage
  ADD COLUMN IF NOT EXISTS niveau_energie TEXT,
  ADD COLUMN IF NOT EXISTS niveau_sommeil TEXT,
  ADD COLUMN IF NOT EXISTS niveau_confiance TEXT,
  ADD COLUMN IF NOT EXISTS taille_pantalon TEXT;
