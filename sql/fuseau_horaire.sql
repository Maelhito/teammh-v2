-- ============================================================
-- ÉTAPE 1 — Une seule source de vérité pour le fuseau horaire
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================
--
-- Avant cette migration, le fuseau d'une personne vivait à trois endroits :
--   • push_subscriptions.timezone  → capté UNE seule fois, au premier
--     abonnement push, et jamais remis à jour (une cliente partie en France
--     gardait Pacific/Noumea indéfiniment) ;
--   • auth.users.user_metadata.timezone → écrit par PATCH /api/coach/profil,
--     que rien n'appelait ;
--   • nulle part pour toute personne sans notifications activées.
--
-- Désormais : user_profiles.timezone fait foi pour tout le monde — cliente,
-- coach, admin. Les deux autres emplacements deviennent des replis en lecture.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  -- true  = le fuseau suit automatiquement l'appareil (cas normal : la cliente
  --         part en vacances, ses horaires suivent).
  -- false = la personne a choisi son fuseau à la main dans son profil ; la
  --         détection automatique ne doit plus l'écraser.
  ADD COLUMN IF NOT EXISTS timezone_auto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS timezone_updated_at TIMESTAMPTZ;

-- Backfill : on récupère ce que l'on sait déjà des abonnements push, en
-- prenant l'abonnement le plus récent de chaque personne.
UPDATE user_profiles p
SET    timezone            = s.timezone,
       timezone_updated_at = NOW()
FROM (
  -- Un seul fuseau par personne. Si elle a plusieurs appareils déclarant des
  -- fuseaux différents, n'importe lequel fait un point de départ acceptable :
  -- la détection automatique le corrigera au prochain chargement de l'app.
  SELECT DISTINCT ON (user_id) user_id, timezone
  FROM   push_subscriptions
  WHERE  timezone IS NOT NULL
  ORDER  BY user_id
) s
WHERE p.user_id = s.user_id
  AND p.timezone IS NULL;

-- Les personnes sans abonnement push restent à NULL : le code repli sur
-- FUSEAU_PAR_DEFAUT (lib/temps.ts) tant que leur appareil n'a rien annoncé.
-- On ne devine rien ici — un mauvais fuseau écrit en base serait pris pour
-- une vérité et ne se corrigerait jamais tout seul.

CREATE INDEX IF NOT EXISTS idx_user_profiles_timezone ON user_profiles(timezone);
