-- Trigger : maintient updated_at à jour automatiquement sur modules_content
-- À exécuter dans Supabase → SQL Editor
--
-- Pourquoi : les routes de sauvegarde (video, video-title, pdf, image-confirm,
-- canva-link) font un upsert({ slug, [field]: valeur }) sans jamais renseigner
-- updated_at explicitement. La colonne a un DEFAULT NOW() qui ne s'applique
-- qu'à la création de la ligne (INSERT) — sur un UPDATE, updated_at ne bouge
-- jamais sans trigger. Résultat : impossible de savoir quand un module a
-- vraiment été modifié pour la dernière fois (ce qui a compliqué le diagnostic
-- de la perte de contenu sur module-7/module-8).

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_modules_content_updated_at ON modules_content;

CREATE TRIGGER trg_modules_content_updated_at
BEFORE UPDATE ON modules_content
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
