-- Phase de démarrage TTM : ajoute une colonne "phase" sur offres_clientes
-- À exécuter dans Supabase → SQL Editor
--
-- Logique :
--   - 'demarrage' : la cliente vient d'arriver, tous les modules du programme sont
--     verrouillés SAUF le module de démarrage (module 0). Aucune séance. Elle doit
--     faire son module de démarrage, puis le coach l'active (appel de démarrage).
--   - 'demarree'  : accès complet (modules + séances).
--
-- Les clientes DÉJÀ existantes ont déjà démarré → on les passe toutes en 'demarree'.
-- Les nouvelles lignes créées ensuite héritent du DEFAULT 'demarrage'.
-- Côté application, une cliente SANS ligne offres_clientes est traitée comme
-- 'demarree' (accès complet) — aucune régression pour l'existant.

ALTER TABLE offres_clientes
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'demarrage'
  CHECK (phase IN ('demarrage', 'demarree'));

-- Migration de l'existant : toutes les clientes actuelles ont déjà démarré
UPDATE offres_clientes SET phase = 'demarree';
