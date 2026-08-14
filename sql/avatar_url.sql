-- Ajout de la photo de profil cliente
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
