-- ============================================================
-- Tâches : la validation est portée par la tâche elle-même
-- À exécuter une fois dans l'éditeur SQL de Supabase
-- ============================================================
-- Avant : la coche était rangée dans le programme en cours de la cliente
-- (client_programmes.grid_data.taches_done). Sans programme en cours, la coche
-- ne s'enregistrait nulle part. Désormais : fait_le = moment de la validation,
-- null = pas encore faite.

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS fait_le TIMESTAMPTZ;

-- Reprise des coches déjà posées sur les programmes
UPDATE calendar_events ce
SET fait_le = NOW()
WHERE ce.event_type = 'tache'
  AND ce.fait_le IS NULL
  AND EXISTS (
    SELECT 1 FROM client_programmes cp
    WHERE cp.user_id = ce.target_user_id
      AND cp.grid_data IS NOT NULL
      AND cp.grid_data LIKE '%' || ce.id::text || '%'
  );
