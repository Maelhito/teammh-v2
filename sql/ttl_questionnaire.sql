-- Questionnaire de démarrage Time To Live (module 1 « Bienvenue et Objectif »)
-- À exécuter dans Supabase → SQL Editor
--
-- Les réponses sont en JSON (clé = champ de lib/ttl-questionnaire.ts) : on peut
-- revoir les questions sans nouvelle migration. La cliente les relit dans son profil.

CREATE TABLE IF NOT EXISTS ttl_questionnaire (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reponses JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- rempli quand toutes les questions ont une réponse : c'est ce qui valide le devoir
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accès uniquement via le serveur (clé service), comme les autres tables TTL
ALTER TABLE ttl_questionnaire ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
