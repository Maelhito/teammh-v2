-- ============================================================
-- Tâches récurrentes (TTM)
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase, AVANT le déploiement.
-- ============================================================

-- « Toutes les N semaines / N jours / N mois » : `recurrence` garde le motif
-- (daily / weekly / monthly), `recurrence_intervalle` dit tous les combien.
--   toutes les 2 semaines  → weekly + 2
--   toutes les 4 semaines  → weekly + 4
--   le 1er de chaque mois  → monthly + 1, avec une date de départ un 1er
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS recurrence_intervalle INTEGER NOT NULL DEFAULT 1;

-- Une tâche récurrente se valide jour par jour : cocher « boire 2 L » lundi
-- ne doit pas la cocher mardi. Une ligne = « validée ce jour-là ».
-- (Une tâche unique continue d'utiliser calendar_events.fait_le.)
CREATE TABLE IF NOT EXISTS taches_validations (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jour       DATE NOT NULL,                       -- le jour, chez la cliente
  fait_le    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, jour)
);

CREATE INDEX IF NOT EXISTS idx_taches_validations_user_jour
  ON taches_validations(user_id, jour);

-- Même régime que le reste : tout passe par le client admin côté serveur.
ALTER TABLE taches_validations ENABLE ROW LEVEL SECURITY;
