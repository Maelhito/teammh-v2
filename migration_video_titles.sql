-- Migration : ajout des colonnes video_title_1 à video_title_10 dans modules_content
-- À exécuter dans Supabase → SQL Editor

ALTER TABLE modules_content
  ADD COLUMN IF NOT EXISTS video_title_1  TEXT,
  ADD COLUMN IF NOT EXISTS video_title_2  TEXT,
  ADD COLUMN IF NOT EXISTS video_title_3  TEXT,
  ADD COLUMN IF NOT EXISTS video_title_4  TEXT,
  ADD COLUMN IF NOT EXISTS video_title_5  TEXT,
  ADD COLUMN IF NOT EXISTS video_title_6  TEXT,
  ADD COLUMN IF NOT EXISTS video_title_7  TEXT,
  ADD COLUMN IF NOT EXISTS video_title_8  TEXT,
  ADD COLUMN IF NOT EXISTS video_title_9  TEXT,
  ADD COLUMN IF NOT EXISTS video_title_10 TEXT;
