-- Le formulaire d'inscription TTL devient un quiz : en plus de l'objectif déjà
-- capturé, on demande ce qui freine la cliente et si elle est prête à
-- démarrer dès cette semaine. Le poids de départ, lui, rejoint la table
-- mesures existante (une mesure du jour de l'inscription, comme n'importe
-- quelle autre prise de mesures).
-- À exécuter dans Supabase → SQL Editor.

ALTER TABLE ttl_objectifs
  ADD COLUMN IF NOT EXISTS frein TEXT,
  ADD COLUMN IF NOT EXISTS pret_a_demarrer BOOLEAN;
