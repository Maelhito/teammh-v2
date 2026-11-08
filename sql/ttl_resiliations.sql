-- ============================================================
-- Questionnaire d'arrêt Time To Live : pourquoi elle part.
-- Affiché quand la cliente clique sur « Gérer mon abonnement » puis
-- « Arrêter Time To Live », avant l'ouverture du portail Stripe.
-- À coller dans Supabase > SQL Editor > Run. Sans danger si relancé.
-- ============================================================

CREATE TABLE IF NOT EXISTS ttl_resiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  motifs TEXT[] NOT NULL DEFAULT '{}',
  satisfaction INT CHECK (satisfaction BETWEEN 1 AND 5),
  commentaire TEXT,
  reviendrait TEXT CHECK (reviendrait IN ('oui', 'peut_etre', 'non')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ttl_resiliations_user ON ttl_resiliations(user_id, created_at DESC);

-- Lecture et écriture uniquement par le serveur (clé service) : aucune policy.
ALTER TABLE ttl_resiliations ENABLE ROW LEVEL SECURITY;
