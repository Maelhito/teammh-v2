-- ============================================================
-- TTL Alimentation : plans alimentaires par apport calorique
-- et nouvelles catégories de recettes.
-- À exécuter une fois dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. Plans alimentaires : un PDF par apport calorique (1400 à 1800 kcal).
-- pages = liste des URLs des images de chaque page, générées depuis le PDF
-- au moment de l'envoi dans l'admin.
CREATE TABLE IF NOT EXISTS ttl_plans_alimentaires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calories INT NOT NULL UNIQUE,
  pdf_url TEXT NOT NULL,
  pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ttl_plans_alimentaires ENABLE ROW LEVEL SECURITY;

-- 2. Recettes : trois catégories (repas, petit-déjeuner, collation)
-- et un goût sucré / salé pour le petit-déjeuner et la collation.
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'ttl_recettes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%categorie%'
  LOOP
    EXECUTE format('ALTER TABLE ttl_recettes DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

UPDATE ttl_recettes SET categorie = 'repas' WHERE categorie IN ('dejeuner', 'diner');

ALTER TABLE ttl_recettes
  ADD CONSTRAINT ttl_recettes_categorie_check CHECK (categorie IN ('repas', 'petit_dej', 'collation'));

ALTER TABLE ttl_recettes
  ADD COLUMN IF NOT EXISTS gout TEXT CHECK (gout IN ('sucre', 'sale'));
