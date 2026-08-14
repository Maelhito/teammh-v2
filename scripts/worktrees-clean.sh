#!/usr/bin/env bash
#
# worktrees-clean.sh — supprime les worktrees dont le travail est DÉJÀ dans main.
#
# Ne supprime jamais un worktree qui contient du travail non fusionné ou non commité.
# Un worktree oublié est la cause n°1 d'écrasement : deux dossiers qui modifient
# le même fichier finissent par se marcher dessus au moment de fusionner.
#
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" 2>/dev/null || { echo "pas dans un dépôt git"; exit 1; }

vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
jaune() { printf '\033[33m%s\033[0m\n' "$*"; }
gras()  { printf '\033[1m%s\033[0m\n' "$*"; }

git fetch --quiet origin main 2>/dev/null || { echo "impossible de joindre origin"; exit 1; }

PRINCIPAL=$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')
COURANT=$(git rev-parse --show-toplevel)

A_SUPPRIMER=()
GARDES=()

while read -r wt; do
  [ -z "$wt" ] && continue
  [ "$wt" = "$PRINCIPAL" ] && continue
  [ "$wt" = "$COURANT" ] && { GARDES+=("$wt — dossier courant"); continue; }

  br=$(git -C "$wt" rev-parse --abbrev-ref HEAD 2>/dev/null) || continue

  if [ -n "$(git -C "$wt" status --porcelain 2>/dev/null)" ]; then
    GARDES+=("$wt [$br] — modifications non commitées")
    continue
  fi

  n=$(git rev-list --count "origin/main..$br" 2>/dev/null || echo "?")
  if [ "$n" = "0" ]; then
    A_SUPPRIMER+=("$wt|$br")
  else
    GARDES+=("$wt [$br] — $n commit(s) pas encore dans main")
  fi
done < <(git worktree list --porcelain | awk '/^worktree /{print $2}')

gras ""
gras "  Nettoyage des worktrees"
gras ""

if [ ${#GARDES[@]} -gt 0 ]; then
  jaune "  Conservés (${#GARDES[@]}) :"
  for g in "${GARDES[@]}"; do echo "    $g"; done
  echo ""
fi

if [ ${#A_SUPPRIMER[@]} -eq 0 ]; then
  vert "  Rien à supprimer — aucun worktree entièrement fusionné."
  echo ""
  exit 0
fi

echo "  À supprimer (${#A_SUPPRIMER[@]}) — leur travail est déjà dans main :"
for e in "${A_SUPPRIMER[@]}"; do echo "    ${e%%|*}"; done
echo ""

if [ -t 0 ] && [ "${1:-}" != "--yes" ]; then
  printf "  Confirmer la suppression ? [o/N] "
  read -r rep
  case "$rep" in [oO]|[oO][uU][iI]|[yY]) ;; *) echo "  Annulé."; exit 0 ;; esac
fi

for e in "${A_SUPPRIMER[@]}"; do
  wt="${e%%|*}"; br="${e##*|}"
  if git worktree remove "$wt" 2>/dev/null; then
    echo "  ✓ $wt"
    git branch -d "$br" >/dev/null 2>&1 && echo "    branche $br supprimée (fusionnée)"
  else
    jaune "  ! échec sur $wt"
  fi
done

git worktree prune
echo ""
vert "  Terminé."
echo ""
