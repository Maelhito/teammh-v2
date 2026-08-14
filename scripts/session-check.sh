#!/usr/bin/env bash
#
# session-check.sh — rappel affiché au démarrage d'une session Claude Code.
# Rapide et sans réseau : lit uniquement les références locales déjà connues.
#
set -uo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || exit 0
git show-ref --verify --quiet refs/remotes/origin/main || exit 0

BRANCHE=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
ALERTES=()

# Du travail commité mais pas encore dans main ?
n=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
[ "${n:-0}" -gt 0 ] && ALERTES+=("$n commit(s) sur '$BRANCHE' pas encore dans main")

# Des fichiers modifiés non commités ?
sale=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
[ "${sale:-0}" -gt 0 ] && ALERTES+=("$sale fichier(s) modifié(s) non commité(s)")

# D'autres worktrees ouverts sur les mêmes fichiers = risque d'écrasement
autres=$(git worktree list --porcelain | grep -c '^worktree ' || echo 1)
[ "${autres:-1}" -gt 3 ] && ALERTES+=("$autres worktrees ouverts — risque d'écrasement (npm run worktrees:clean)")

[ ${#ALERTES[@]} -eq 0 ] && exit 0

echo "RAPPEL TeamMJ — du travail n'est pas encore en sécurité dans main :"
for a in "${ALERTES[@]}"; do echo "  - $a"; done
echo "  → 'npm run ship' pour tout envoyer en prod, 'npm run status' pour l'inventaire complet."
exit 0
