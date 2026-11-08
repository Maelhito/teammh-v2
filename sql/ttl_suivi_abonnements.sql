-- ============================================================
-- Suivi Time To Live : depuis quand, jusqu'à quand.
-- À coller dans Supabase > SQL Editor > Run. Sans danger si relancé.
--
--   started_at          : début réel de l'abonnement (date Stripe)
--   ended_at            : jour où l'abonnement s'est vraiment arrêté
--   cancel_at_period_end: elle a résilié, mais a payé jusqu'à la fin de période
-- ============================================================

ALTER TABLE ttl_subscriptions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
