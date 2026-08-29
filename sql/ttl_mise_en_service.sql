-- ============================================================
-- TTL — les trois colonnes qui manquent encore
-- À exécuter dans Supabase → SQL Editor, après le script de renommage.
-- Aucune donnée n'est touchée : on ajoute trois colonnes, c'est tout.
-- Rejouable sans risque.
-- ============================================================

-- ─── 1. Accès payant, ou attribué par l'admin ───────────────────────────────
-- L'accès à /ttl exigeait un abonnement Stripe actif, sans exception. Une
-- cliente basculée en TTL depuis l'Admin arrivait donc sur la page de paiement
-- — vide, faute de configuration Stripe — et n'en sortait pas.
--
--   false (défaut) : offre attribuée depuis l'Admin. Accès immédiat.
--   true           : inscription publique via /inscription-ttl. L'accès
--                    s'ouvre quand l'abonnement Stripe est actif.
--
-- Le défaut à false est volontaire : si quoi que ce soit oublie de renseigner
-- la colonne, la cliente garde l'accès plutôt que d'être enfermée dehors.
ALTER TABLE offres_clientes
  ADD COLUMN IF NOT EXISTS paiement_requis BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. La flamme ──────────────────────────────────────────────────────────
-- Cette colonne n'a jamais été créée : toute lecture de la série échouait en
-- silence, ce qui affichait une flamme à zéro pour tout le monde sur TTL.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS streak_freezes INT NOT NULL DEFAULT 0;

-- ─── 3. Les jours d'entraînement choisis par la cliente ─────────────────────
-- Même migration jamais passée : l'écran « mes jours d'entraînement » du profil
-- TTL n'avait nulle part où écrire, et le rappel du jour de séance ne partait
-- jamais.
ALTER TABLE ttl_objectifs
  ADD COLUMN IF NOT EXISTS jours_entrainement TEXT[] DEFAULT '{}';

-- ─── Vérification — les trois lignes doivent apparaître ─────────────────────
SELECT table_name, column_name FROM information_schema.columns
WHERE (table_name = 'offres_clientes' AND column_name = 'paiement_requis')
   OR (table_name = 'user_profiles'   AND column_name = 'streak_freezes')
   OR (table_name = 'ttl_objectifs'   AND column_name = 'jours_entrainement');
