-- Migration : ajout du lien Canva "Guide des équivalences" pour module-3
ALTER TABLE modules_content
ADD COLUMN IF NOT EXISTS lien_canva_equivalences TEXT;
