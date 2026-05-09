-- À exécuter dans l'éditeur SQL Supabase

CREATE TABLE IF NOT EXISTS programmes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  categorie TEXT DEFAULT 'full_body',
  niveau TEXT DEFAULT 'debutant',
  duree_semaines INT DEFAULT 4,
  description TEXT, -- stocke la grille JSON + note
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS programme_seances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID REFERENCES programmes(id) ON DELETE CASCADE,
  seance_id UUID REFERENCES seances(id) ON DELETE SET NULL,
  semaine INT NOT NULL,   -- numéro de semaine (1-based)
  jour INT NOT NULL,      -- 1=Lundi ... 7=Dimanche
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prog_seances_programme ON programme_seances(programme_id);
