CREATE TABLE IF NOT EXISTS exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  groupe_musculaire TEXT NOT NULL,
  materiel TEXT DEFAULT 'aucun',
  type_format TEXT DEFAULT 'classique',
  description TEXT,
  video_url TEXT,
  miniature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les filtres
CREATE INDEX IF NOT EXISTS idx_exercises_groupe ON exercises(groupe_musculaire);
CREATE INDEX IF NOT EXISTS idx_exercises_materiel ON exercises(materiel);
CREATE INDEX IF NOT EXISTS idx_exercises_format ON exercises(type_format);
