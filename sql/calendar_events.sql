-- ============================================================
-- TABLE calendar_events — création initiale
-- À exécuter dans l'éditeur SQL de Supabase (première fois)
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- null = toutes les clientes (événement admin broadcast)
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  date DATE NOT NULL,
  heure TIME,                          -- optionnel : heure de l'événement
  recurrence TEXT DEFAULT 'none',      -- none, daily, weekly, monthly
  message TEXT,
  lien TEXT,
  rappel BOOLEAN DEFAULT false,        -- true = notification push la veille
  created_by TEXT DEFAULT 'cliente',   -- 'admin' ou 'cliente'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_target_user ON calendar_events(target_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_rappel ON calendar_events(rappel) WHERE rappel = true;

-- RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select" ON calendar_events
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = target_user_id
    OR target_user_id IS NULL
  );

CREATE POLICY "clientes_insert" ON calendar_events
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND created_by = 'cliente'
  );

CREATE POLICY "clientes_delete" ON calendar_events
  FOR DELETE USING (
    auth.uid() = user_id
    AND created_by = 'cliente'
  );


-- ============================================================
-- MIGRATIONS — à exécuter si la table existe déjà
-- ============================================================

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS heure TIME;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS rappel BOOLEAN DEFAULT false;
