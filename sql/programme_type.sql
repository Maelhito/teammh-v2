-- ============================================================
-- MIGRATION — Ajout type de programme N1 / N2
-- À exécuter dans l'éditeur SQL Supabase
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS programme_type  TEXT DEFAULT 'N1',
  ADD COLUMN IF NOT EXISTS programme_duree TEXT DEFAULT '16_semaines';

-- Valeurs possibles :
--   programme_type  : 'N1' | 'N2'
--   programme_duree : '16_semaines' | '6_mois' | '12_mois'
