-- Migration : réponses au badge "avis Google" (J+60 sur le dashboard cliente)
-- À exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS avis_google_reponses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reponse text NOT NULL CHECK (reponse IN ('positif', 'mitige')),
  message text,
  lu_par_coach boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS avis_google_reponses_user_id_idx ON avis_google_reponses(user_id);
CREATE INDEX IF NOT EXISTS avis_google_reponses_non_lues_idx ON avis_google_reponses(lu_par_coach) WHERE lu_par_coach = false;
