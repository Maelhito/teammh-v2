#!/usr/bin/env bash
#
# rescue.sh — met à l'abri TOUT le travail non commité, dans tous les worktrees.
#
# Pour chaque dossier contenant des modifications non commitées, crée un point de
# restauration sur GitHub (branche `sauvegarde/<dossier>-<date>`).
#
# GARANTIE : ne touche NI tes fichiers, NI ton index, NI ta branche courante.
# La photo est prise dans un index temporaire, à côté. Tu peux continuer à
# travailler exactement comme avant — on ajoute juste un filet.
#
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" 2>/dev/null || { echo "pas dans un dépôt git"; exit 1; }

vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
jaune() { printf '\033[33m%s\033[0m\n' "$*"; }
gras()  { printf '\033[1m%s\033[0m\n' "$*"; }

HORODATAGE=$(date +%Y%m%d-%H%M%S)

gras ""
gras "  Sauvetage du travail non commité"
gras ""
echo "  (tes fichiers ne seront pas modifiés)"
echo ""

TROUVE=0
SAUVES=0
LOCAL=0

while read -r wt; do
  [ -z "$wt" ] && continue
  [ -z "$(git -C "$wt" status --porcelain 2>/dev/null)" ] && continue

  TROUVE=$((TROUVE + 1))
  nom=$(basename "$wt")
  br=$(git -C "$wt" rev-parse --abbrev-ref HEAD 2>/dev/null) || continue
  nb=$(git -C "$wt" status --porcelain | wc -l | tr -d ' ')

  echo "  $nom [$br] — $nb fichier(s)"

  SAUVEGARDE="sauvegarde/${nom}-${HORODATAGE}"
  INDEX_TMP=$(mktemp -t rescue-index.XXXXXX) || { jaune "    ! mktemp a échoué"; continue; }
  rm -f "$INDEX_TMP"   # git veut créer le fichier lui-même

  # Photo de l'arbre de travail dans un index SÉPARÉ : l'index réel n'est pas touché.
  if ! GIT_INDEX_FILE="$INDEX_TMP" git -C "$wt" read-tree HEAD 2>/dev/null; then
    jaune "    ! lecture de HEAD impossible"; rm -f "$INDEX_TMP"; continue
  fi
  GIT_INDEX_FILE="$INDEX_TMP" git -C "$wt" add -A 2>/dev/null

  ARBRE=$(GIT_INDEX_FILE="$INDEX_TMP" git -C "$wt" write-tree 2>/dev/null)
  rm -f "$INDEX_TMP"

  if [ -z "$ARBRE" ]; then
    jaune "    ! impossible de capturer l'état"; continue
  fi

  # Un commit hors-branche, rattaché à HEAD : rien ne bouge côté branche de travail.
  COMMIT=$(git -C "$wt" commit-tree "$ARBRE" -p HEAD \
    -m "sauvegarde auto de $nom ($br) — $nb fichier(s) non commité(s) le $(date '+%d/%m/%Y %H:%M')" 2>/dev/null)

  if [ -z "$COMMIT" ]; then
    jaune "    ! création du point de restauration impossible"; continue
  fi

  git branch --force "$SAUVEGARDE" "$COMMIT" >/dev/null 2>&1

  if git push origin "$SAUVEGARDE:$SAUVEGARDE" >/dev/null 2>&1; then
    vert "    ✓ sur GitHub → $SAUVEGARDE"
    SAUVES=$((SAUVES + 1))
  else
    jaune "    ~ en local seulement → $SAUVEGARDE"
    LOCAL=$((LOCAL + 1))
  fi
done < <(git worktree list --porcelain | awk '/^worktree /{print $2}')

echo ""
if [ "$TROUVE" = "0" ]; then
  vert "  ✓ Rien à sauver — tous les dossiers sont propres."
else
  vert "  $SAUVES sauvegardé(s) sur GitHub, $LOCAL en local, sur $TROUVE dossier(s)."
  echo ""
  echo "  Tes fichiers n'ont pas bougé d'un pouce."
  echo "  Pour consulter une sauvegarde :  git switch sauvegarde/<nom>"
fi
echo ""
