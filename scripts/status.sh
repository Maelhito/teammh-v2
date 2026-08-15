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
SAUVEGARDES=0

while read -r branche; do
  [ -z "$branche" ] && continue
  # Les branches de sauvegarde sont des points de restauration, pas du travail
  # à réintégrer : on les compte à part pour ne pas noyer la vraie liste.
  case "$branche" in
    backup/*) continue ;;
    sauvegarde/*) SAUVEGARDES=$((SAUVEGARDES + 1)); continue ;;
  esac

  # `git cherry` compare le CONTENU, pas les identifiants : un commit réintégré
  # par cherry-pick ou rebase reçoit un nouveau SHA mais reste reconnu comme
  # déjà présent dans main (préfixe "-"). Seuls les "+" restent vraiment à faire.
  # (grep -c sort en erreur quand il compte 0 : on neutralise pour ne pas
  #  confondre "rien à faire" avec "branche illisible".)
  cherry=$(git cherry -v "origin/main" "$branche" 2>/dev/null || true)
  restants=$(printf '%s\n' "$cherry" | grep '^+' || true)
  n=$(printf '%s' "$restants" | grep -c '^+' || true)
  [ "${n:-0}" = "0" ] && continue

  # Combien étaient déjà reconnus dans main ? Si une partie l'est, la branche a
  # très probablement déjà été réintégrée : le reliquat vient d'un conflit résolu
  # à la main, qui modifie le contenu et empêche git de le reconnaître.
  deja=$(printf '%s\n' "$cherry" | grep -c '^-' || true)

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
  if [ "${deja:-0}" -gt 0 ]; then
    printf '    \033[32m→ %s commit(s) déjà dans main : branche probablement déjà réintégrée\033[0m\n' "$deja"
    printf '      (reliquat dû à un conflit résolu à la main ; vérifier puis supprimer la branche)\n'
  fi
  # On n'affiche que les commits réellement restants (ceux comptés ci-dessus),
  # sinon la liste montrerait du travail déjà présent dans main.
  printf '%s\n' "$restants" \
    | sed -n 's/^+ \([0-9a-f]\{7\}\)[0-9a-f]* /      \1 /p' | head -4
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
  echo ""
  echo "  Détail et ordre conseillé : TRAVAIL-A-REINTEGRER.md"
fi

[ "$SAUVEGARDES" -gt 0 ] && \
  echo "" && echo "  ($SAUVEGARDES branche(s) 'sauvegarde/*' — points de restauration, rien à en faire)"

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
