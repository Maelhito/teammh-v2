CREATE TABLE IF NOT EXISTS seances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  type_format TEXT DEFAULT 'classique',
  duree_estimee INT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seance_exercices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seance_id UUID REFERENCES seances(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  ordre INT DEFAULT 0,
  series INT,
  repetitions INT,
  duree_secondes INT,
  temps_repos INT DEFAULT 60,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seance_exercices_seance ON seance_exercices(seance_id);
CREATE INDEX IF NOT EXISTS idx_seance_exercices_ordre ON seance_exercices(seance_id, ordre);
