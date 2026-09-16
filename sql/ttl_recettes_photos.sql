-- ============================================================
-- TTL Alimentation : les recettes deviennent des fiches photo,
-- rangées par catégorie, sucré / salé et tranche de calories.
-- À exécuter une fois dans l'éditeur SQL de Supabase
-- ============================================================

-- calories : la tranche affichée à la cliente
--   repas et petit-déjeuner : 400, 450 ou 500
--   collation               : 250 ou 300
ALTER TABLE ttl_recettes
  ADD COLUMN IF NOT EXISTS calories INT CHECK (calories IN (250, 300, 400, 450, 500)),
  ADD COLUMN IF NOT EXISTS miniature_url TEXT;
