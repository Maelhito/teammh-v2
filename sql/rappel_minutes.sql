-- Migration : ajout de la colonne rappel_minutes dans calendar_events
-- 0 = pas de rappel, 30 = 30 min avant, 60 = 1h avant, etc.

ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS rappel_minutes INT DEFAULT 0;
