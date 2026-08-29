-- ============================================================
-- RENOMMAGE TTS → TTL — à exécuter dans l'éditeur SQL Supabase
--
-- L'offre « Time To Start » n'existe plus. Tout ce qui portait son nom
-- devient « Time To Last ». Il ne reste que deux offres : TTM puis TTL.
--
-- À LANCER **AVANT** de pousser le code renommé en production :
-- le code déployé cherchera les tables ttl_*, qui n'existent qu'après ce
-- script. Aucune cliente réelle n'est sur TTS ni sur TTL aujourd'hui
-- (3 clientes en TTM, 1 compte de test) : la bascule est sans risque.
--
-- Le script est rejouable : le relancer une seconde fois ne casse rien.
-- ============================================================

-- ─── 1. Les onze tables tts_* deviennent ttl_* ──────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'modules', 'modules_videos', 'modules_progress',
    'programmes', 'videos', 'recettes', 'capsules',
    'seances_progress', 'objectifs', 'demandes_bilan', 'subscriptions'
  ] LOOP
    IF to_regclass('public.tts_' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', 'tts_' || t, 'ttl_' || t);
    END IF;
  END LOOP;
END $$;

-- ─── 2. Les index et contraintes qui portaient tts_ dans leur nom ───────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT indexname FROM pg_indexes
           WHERE schemaname = 'public' AND indexname LIKE 'tts\_%' LOOP
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I', r.indexname, 'ttl_' || substr(r.indexname, 5));
  END LOOP;
  FOR r IN SELECT indexname FROM pg_indexes
           WHERE schemaname = 'public' AND indexname LIKE 'idx\_tts\_%' LOOP
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I', r.indexname, 'idx_ttl_' || substr(r.indexname, 9));
  END LOOP;
END $$;

-- ─── 3. Plus aucune offre ne peut valoir 'TTS' ──────────────────────────────
-- On retire d'abord les contrôles qui autorisaient encore la valeur.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conrelid::regclass AS tbl, conname FROM pg_constraint
           WHERE contype = 'c'
             AND conrelid IN ('offres_clientes'::regclass, 'offres_clientes_historique'::regclass)
             AND pg_get_constraintdef(oid) LIKE '%TTS%' LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
  END LOOP;
END $$;

UPDATE offres_clientes             SET offre       = 'TTL' WHERE offre       = 'TTS';
UPDATE offres_clientes_historique  SET offre_avant = 'TTL' WHERE offre_avant = 'TTS';
UPDATE offres_clientes_historique  SET offre_apres = 'TTL' WHERE offre_apres = 'TTS';

ALTER TABLE offres_clientes
  ADD CONSTRAINT offres_clientes_offre_check CHECK (offre IN ('TTM', 'TTL'));
ALTER TABLE offres_clientes_historique
  ADD CONSTRAINT offres_clientes_historique_offre_avant_check CHECK (offre_avant IN ('TTM', 'TTL'));
ALTER TABLE offres_clientes_historique
  ADD CONSTRAINT offres_clientes_historique_offre_apres_check CHECK (offre_apres IN ('TTM', 'TTL'));

-- ─── 4. Les deux espaces de stockage d'images et de documents ───────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('ttl-images', 'ttl-images', true), ('ttl-docs', 'ttl-docs', true)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Vérification — doit renvoyer 0 ligne ────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'tts%';
