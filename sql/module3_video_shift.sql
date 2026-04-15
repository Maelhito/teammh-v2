-- Migration : décalage des URLs vidéo du module-3 après ajout de la vidéo 1
-- "Comment télécharger mon plan alimentaire sur mon téléphone"
--
-- Avant : les 6 premières vidéos étaient aux slots 1-6
-- Après : la nouvelle vidéo prend le slot 1, les anciennes passent aux slots 2-7
--
-- À exécuter dans l'éditeur SQL de Supabase

UPDATE modules_content
SET
  video_url_7 = video_url_6,
  video_url_6 = video_url_5,
  video_url_5 = video_url_4,
  video_url_4 = video_url_3,
  video_url_3 = video_url_2,
  video_url_2 = video_url_1,
  video_url_1 = NULL          -- nouvelle vidéo "Comment télécharger..." : URL à saisir dans l'admin
WHERE slug = 'module-3';
