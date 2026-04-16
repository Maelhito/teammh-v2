-- Table pour les replays des séances Visio de Groupe (module-8)
CREATE TABLE IF NOT EXISTS visio_replays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categorie TEXT NOT NULL,
  -- 'boost_mental', 'visio_sport', 'visio_stretching'
  video_url TEXT NOT NULL,
  titre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visio_replays_categorie ON visio_replays(categorie);

-- RLS : lecture publique pour les utilisateurs authentifiés, écriture admin uniquement (via service role)
ALTER TABLE visio_replays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select" ON visio_replays
  FOR SELECT USING (auth.role() = 'authenticated');
