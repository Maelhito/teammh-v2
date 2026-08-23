-- ============================================================
-- ÉTAPE 2 — Le rendez-vous devient un instant, plus une heure de papier
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================
--
-- Jusqu'ici : date DATE + heure TIME, sans fuseau. Un coach à Brisbane tapait
-- 9:00, la cliente à Nouméa lisait « 9:00 » — alors que le moment réel chez
-- elle était 10:00. C'est le rendez-vous manqué.
--
-- Désormais : starts_at TIMESTAMPTZ porte l'instant unique, et timezone garde
-- le fuseau DE SAISIE (celui dans lequel l'auteur a tapé l'heure). Le second
-- sert à deux choses : réafficher « posé à 9h heure de Brisbane », et faire
-- glisser correctement les récurrences au changement d'heure.
--
-- date et heure restent en place : elles sont encore lues par du code, et on
-- ne coupe pas la branche avant d'avoir basculé toutes les lectures.

-- ─── GARDE-FOU D'ORDRE ────────────────────────────────────────────────────
-- Ce backfill lit user_profiles.timezone. Tant que les 27 'Europe/Paris'
-- hérités n'ont pas été retirés (sql/nettoyage_fuseaux_herites.sql), ils sont
-- faux — et les recopier dans starts_at décalerait les rendez-vous de ces
-- clientes de 9 heures, de façon définitive et invisible.
DO $$
DECLARE nb INT;
BEGIN
  SELECT count(*) INTO nb FROM user_profiles WHERE timezone = 'Europe/Paris';
  IF nb > 5 THEN
    RAISE EXCEPTION
      'STOP : % profils sont encore à Europe/Paris. Exécute d''abord sql/nettoyage_fuseaux_herites.sql, sinon ce backfill fige des horaires faux.', nb;
  END IF;
END $$;

-- ─── Colonnes ─────────────────────────────────────────────────────────────
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone  TEXT;

-- ─── Backfill ─────────────────────────────────────────────────────────────
-- Convention retenue pour l'existant : l'heure déjà en base est interprétée
-- comme l'heure LOCALE DE LA CLIENTE. C'est ce qu'elle lit sur son calendrier
-- depuis toujours et ce sur quoi elle s'organise ; la migration ne doit rien
-- déplacer sous ses pieds. Le coach, lui, verra désormais cette heure
-- convertie chez lui — ce qui est précisément la correction recherchée.

-- 1. Événements rattachés à une cliente dont on connaît le fuseau.
UPDATE calendar_events e
SET    starts_at = (e.date + e.heure) AT TIME ZONE COALESCE(p.timezone, 'Pacific/Noumea'),
       timezone  = COALESCE(p.timezone, 'Pacific/Noumea')
FROM   user_profiles p
WHERE  p.user_id = e.target_user_id
  AND  e.heure IS NOT NULL
  AND  e.starts_at IS NULL;

-- 2. Le reste : événements diffusés à toutes (target_user_id NULL, visios de
--    groupe) ou cliente sans profil. Repli sur Nouméa, où vit la quasi-totalité
--    des clientes. Ces lignes se corrigeront à la première modification.
UPDATE calendar_events e
SET    starts_at = (e.date + e.heure) AT TIME ZONE 'Pacific/Noumea',
       timezone  = 'Pacific/Noumea'
WHERE  e.heure IS NOT NULL
  AND  e.starts_at IS NULL;

-- Les événements SANS heure (séances, tâches) gardent starts_at à NULL : ce
-- sont des « jours locaux », pas des instants. Leur date se lit dans le fuseau
-- de la personne, elle ne se convertit pas.

CREATE INDEX IF NOT EXISTS idx_calendar_events_starts_at ON calendar_events(starts_at);

-- ─── VÉRIFICATION (à lancer après) ────────────────────────────────────────
-- SELECT
--   count(*) FILTER (WHERE heure IS NOT NULL)                        AS avec_heure,
--   count(*) FILTER (WHERE heure IS NOT NULL AND starts_at IS NULL)  AS non_converties,
--   count(*) FILTER (WHERE heure IS NULL)                            AS sans_heure
-- FROM calendar_events;
-- -- attendu : non_converties = 0
