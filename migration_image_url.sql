-- Migration : ajout de la colonne image_url dans programmes et seances
ALTER TABLE programmes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE seances    ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Rafraîchir le cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
