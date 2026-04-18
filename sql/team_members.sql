-- Membres de l'équipe (coach, nutritionniste, etc.)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  titre TEXT NOT NULL,
  lien_zoom TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Références au coach et nutritionniste dans le profil cliente
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES team_members(id),
ADD COLUMN IF NOT EXISTS nutrition_id UUID REFERENCES team_members(id);

-- Référence au membre de l'équipe dans les événements calendrier
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES team_members(id);
