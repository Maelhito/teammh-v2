-- ============================================================
-- TTL Alimentation : plusieurs plans par apport calorique
-- (N°1, N°2, … pour 1400 kcal, etc.) et miniatures des pages.
-- À exécuter une fois dans l'éditeur SQL de Supabase,
-- après ttl_alimentation_plans.sql
-- ============================================================

ALTER TABLE ttl_plans_alimentaires DROP CONSTRAINT IF EXISTS ttl_plans_alimentaires_calories_key;

ALTER TABLE ttl_plans_alimentaires
  ADD COLUMN IF NOT EXISTS numero INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nb_pages INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS miniatures JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS ttl_plans_alimentaires_calories_numero
  ON ttl_plans_alimentaires (calories, numero);
