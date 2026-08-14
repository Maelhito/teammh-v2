#!/usr/bin/env bash
#
# status.sh — inventaire de tout le travail qui n'est PAS encore dans main.
# Lecture seule : ne modifie rien.
#
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" 2>/dev/null || { echo "pas dans un dépôt git"; exit 1; }

vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
jaune() { printf '\033[33m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*"; }
gras()  { printf '\033[1m%s\033[0m\n' "$*"; }

git fetch --quiet origin 2>/dev/null || jaune "(hors ligne — état potentiellement périmé)"

gras ""
gras "  Travail non fusionné dans main"
gras ""

TOTAL=0
TROUVE=0

while read -r branche; do
  [ -z "$branche" ] && continue
  case "$branche" in backup/*) continue ;; esac

  n=$(git rev-list --count "origin/main..$branche" 2>/dev/null) || continue
  [ "${n:-0}" = "0" ] && continue

  TOTAL=$((TOTAL + n))
  TROUVE=$((TROUVE + 1))

  # Cette branche existe-t-elle sur GitHub ?
  if git show-ref --verify --quiet "refs/remotes/origin/$branche"; then
    sauve="sur GitHub"
  else
    sauve="LOCAL UNIQUEMENT"
  fi

  date=$(git log -1 --format='%ad' --date=short "$branche")
  printf '  \033[1m%s\033[0m\n' "$branche"
  printf '    %s commit(s) · dernier le %s · %s\n' "$n" "$date" "$sauve"
  git log --oneline "origin/main..$branche" 2>/dev/null | head -4 | sed 's/^/      /'
  [ "$n" -gt 4 ] && echo "      … et $((n - 4)) de plus"
  echo ""
done < <(git for-each-ref --format='%(refname:short)' --sort=-committerdate refs/heads/)

if [ "$TROUVE" = "0" ]; then
  vert "  ✓ Tout est dans main. Rien ne traîne."
else
  jaune "  $TROUVE branche(s), $TOTAL commit(s) hors de main."
  echo ""
  echo "  Pour envoyer une branche :"
  echo "    git switch <branche> && npm run ship"
fi

# ── Modifications non commitées dans chaque worktree ──────────────────────────
echo ""
gras "  Modifications non commitées"
echo ""
SALE=0
while read -r wt; do
  [ -z "$wt" ] && continue
  if [ -n "$(git -C "$wt" status --porcelain 2>/dev/null)" ]; then
    SALE=1
    nb=$(git -C "$wt" status --porcelain | wc -l | tr -d ' ')
    printf '  \033[33m%s fichier(s)\033[0m — %s\n' "$nb" "$wt"
  fi
done < <(git worktree list --porcelain | awk '/^worktree /{print $2}')
[ "$SALE" = "0" ] && vert "  ✓ Aucune. Tous les dossiers sont propres."

echo ""
