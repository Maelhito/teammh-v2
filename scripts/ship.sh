#!/usr/bin/env bash
#
# ship.sh — envoie le travail courant dans main, sans jamais rien écraser.
#
# Séquence : commit -> fetch -> rebase sur origin/main -> build -> push fast-forward
# S'arrête à la première erreur. Tant que le build ne passe pas, rien n'est poussé.
#
set -uo pipefail

BRANCHE_CIBLE="main"
REMOTE="origin"

rouge()  { printf '\033[31m%s\033[0m\n' "$*"; }
vert()   { printf '\033[32m%s\033[0m\n' "$*"; }
jaune()  { printf '\033[33m%s\033[0m\n' "$*"; }
gras()   { printf '\033[1m%s\033[0m\n' "$*"; }
etape()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }

fatal() {
  echo ""
  rouge "════════════════════════════════════════════════"
  rouge "  ARRÊTÉ — $1"
  rouge "════════════════════════════════════════════════"
  shift
  for ligne in "$@"; do echo "  $ligne"; done
  echo ""
  exit 1
}

cd "$(git rev-parse --show-toplevel)" 2>/dev/null || fatal "pas dans un dépôt git"

BRANCHE=$(git rev-parse --abbrev-ref HEAD)
[ "$BRANCHE" = "HEAD" ] && fatal "HEAD détachée" \
  "Tu n'es sur aucune branche. Crée-en une :" \
  "  git switch -c mon-chantier"

gras ""
gras "  ship — $BRANCHE → $BRANCHE_CIBLE"
gras ""

# ── Un rebase ou un merge en cours bloque tout ────────────────────────────────
GITDIR=$(git rev-parse --git-dir)
if [ -d "$GITDIR/rebase-merge" ] || [ -d "$GITDIR/rebase-apply" ]; then
  fatal "un rebase est déjà en cours" \
    "Termine-le d'abord :" \
    "  git status                 # voir les fichiers en conflit" \
    "  git add <fichiers>         # une fois résolus" \
    "  git rebase --continue" \
    "" \
    "Ou annule tout :  git rebase --abort"
fi
if [ -f "$GITDIR/MERGE_HEAD" ]; then
  fatal "une fusion est en cours" "Termine-la ou annule : git merge --abort"
fi

# ── 1. Commit de ce qui traîne ────────────────────────────────────────────────
etape "1/6  Travail non commité"

if [ -n "$(git status --porcelain)" ]; then
  git status --short
  echo ""

  MESSAGE="${1:-}"
  if [ -z "$MESSAGE" ]; then
    if [ ! -t 0 ]; then
      fatal "des modifications ne sont pas commitées" \
        "Relance avec un message :" \
        "  npm run ship -- \"ce que tu as changé\""
    fi
    printf "  Message de commit : "
    read -r MESSAGE
    [ -z "$MESSAGE" ] && fatal "message vide" "Un commit sans message n'est pas traçable."
  fi

  git add -A || fatal "git add a échoué"
  git commit -m "$MESSAGE" || fatal "git commit a échoué"
  vert "  ✓ commité — $MESSAGE"
else
  echo "  rien à commiter"
fi

# Y a-t-il quelque chose à envoyer ?
git fetch --quiet "$REMOTE" "$BRANCHE_CIBLE" 2>/dev/null || fatal "impossible de joindre $REMOTE" \
  "Vérifie ta connexion internet, puis relance."

if [ -z "$(git rev-list "$REMOTE/$BRANCHE_CIBLE..HEAD")" ]; then
  echo ""
  vert "  Rien à envoyer — $BRANCHE_CIBLE contient déjà tout ton travail."
  exit 0
fi

NB=$(git rev-list --count "$REMOTE/$BRANCHE_CIBLE..HEAD")
echo "  $NB commit(s) à envoyer :"
git log --oneline --reverse "$REMOTE/$BRANCHE_CIBLE..HEAD" | sed 's/^/    /'

# ── 2. Filet de sécurité : une sauvegarde avant de rebaser ────────────────────
etape "2/6  Sauvegarde de sécurité"

SAUVEGARDE="backup/${BRANCHE//\//-}-$(date +%Y%m%d-%H%M%S)"
git branch "$SAUVEGARDE" >/dev/null 2>&1 \
  && echo "  ✓ $SAUVEGARDE  (ton état exact avant rebase, au cas où)" \
  || jaune "  ! sauvegarde locale impossible (on continue)"

# ── 3. Rebase sur le vrai main ────────────────────────────────────────────────
etape "3/6  Rebase sur $REMOTE/$BRANCHE_CIBLE"
echo "  → ton travail est replacé AU-DESSUS du dernier état de la prod,"
echo "    donc il ne peut pas écraser ce qui existe déjà."
echo ""

if ! git rebase "$REMOTE/$BRANCHE_CIBLE"; then
  echo ""
  rouge "════════════════════════════════════════════════"
  rouge "  CONFLIT pendant le rebase"
  rouge "════════════════════════════════════════════════"
  echo ""
  echo "  $BRANCHE_CIBLE a changé aux mêmes endroits que toi."
  echo "  RIEN n'est poussé, la prod est intacte."
  echo ""
  echo "  Fichiers en conflit :"
  git diff --name-only --diff-filter=U 2>/dev/null | sed 's/^/    /'
  echo ""
  echo "  Marche à suivre :"
  echo "    1. Ouvre chaque fichier et garde la bonne version"
  echo "    2. git add <fichiers>"
  echo "    3. git rebase --continue"
  echo "    4. npm run ship"
  echo ""
  echo "  Pour tout annuler et revenir en arrière :"
  echo "    git rebase --abort"
  echo ""
  echo "  Ton état d'avant est sauvegardé sur : $SAUVEGARDE"
  echo ""
  exit 1
fi
vert "  ✓ rebase propre"

# ── 4. Le build décide ────────────────────────────────────────────────────────
etape "4/6  Build (le garde-fou)"

# Le build a besoin des variables d'env : on les emprunte au dépôt principal.
if [ ! -f .env.local ]; then
  PRINCIPAL=$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')
  if [ -n "$PRINCIPAL" ] && [ -f "$PRINCIPAL/.env.local" ] && [ "$PRINCIPAL/.env.local" != "$PWD/.env.local" ]; then
    cp "$PRINCIPAL/.env.local" .env.local
    echo "  .env.local emprunté au dépôt principal"
  fi
fi

if [ ! -d node_modules ]; then
  echo "  installation des dépendances..."
  npm ci --silent || fatal "npm ci a échoué"
fi

echo "  compilation en cours (patiente)..."
echo ""
if ! npm run build; then
  echo ""
  rouge "════════════════════════════════════════════════"
  rouge "  BUILD ÉCHOUÉ — rien n'a été poussé"
  rouge "════════════════════════════════════════════════"
  echo ""
  echo "  La prod est intacte. Corrige l'erreur ci-dessus, puis :"
  echo "    npm run ship"
  echo ""
  exit 1
fi
vert "  ✓ build OK"

# On atteste que CE commit précis a passé le build, pour que le hook pre-push
# ne recompile pas inutilement. Le SHA rend l'attestation infalsifiable.
echo "$(git rev-parse HEAD)" > "$GITDIR/ship-build-ok"

# ── 5. Push fast-forward strict ───────────────────────────────────────────────
etape "5/6  Envoi vers $BRANCHE_CIBLE"

# Pas de --force : si main a bougé pendant le build, git refuse et on recommence.
SORTIE_PUSH=$(git push "$REMOTE" "HEAD:$BRANCHE_CIBLE" 2>&1)
CODE_PUSH=$?
echo "$SORTIE_PUSH"

if [ $CODE_PUSH -ne 0 ]; then
  echo ""
  rouge "  ✖ Push refusé — rien n'a été envoyé, aucune perte."
  echo ""
  # Le motif exact compte : chaque cause a une solution différente.
  case "$SORTIE_PUSH" in
    *"non-fast-forward"*|*"fetch first"*|*"behind its remote"*)
      echo "  Cause : $BRANCHE_CIBLE a avancé pendant le build."
      echo "  Solution : relance  npm run ship  (il refera le rebase)"
      ;;
    *workflow*scope*)
      echo "  Cause : ton token GitHub n'a pas le droit 'workflow',"
      echo "          il ne peut donc pas modifier .github/workflows/."
      echo "  Solution : régénère le token avec la case 'workflow' cochée,"
      echo "             ou ajoute le fichier directement sur github.com."
      ;;
    *"Authentication"*|*"could not read Username"*|*403*|*denied*)
      echo "  Cause : problème d'authentification GitHub."
      echo "  Solution : vérifie tes identifiants / ton token."
      ;;
    *"protected branch"*|*"pre-receive"*)
      echo "  Cause : une règle de protection GitHub bloque ce push."
      echo "  Solution : voir les règles du dépôt sur github.com."
      ;;
    *)
      echo "  Lis le message de git ci-dessus : il donne la cause exacte."
      ;;
  esac
  echo ""
  exit 1
fi

# Remettre le main local à jour s'il est propre (confort, pas critique)
PRINCIPAL=$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')
if [ -n "$PRINCIPAL" ] && [ -z "$(git -C "$PRINCIPAL" status --porcelain 2>/dev/null)" ] \
   && [ "$(git -C "$PRINCIPAL" rev-parse --abbrev-ref HEAD 2>/dev/null)" = "$BRANCHE_CIBLE" ]; then
  git -C "$PRINCIPAL" pull --ff-only --quiet "$REMOTE" "$BRANCHE_CIBLE" 2>/dev/null \
    && echo "  ✓ dépôt principal mis à jour"
fi

# La sauvegarde n'a plus lieu d'être : le travail est en sécurité sur GitHub.
git branch -D "$SAUVEGARDE" >/dev/null 2>&1

vert "  ✓ $NB commit(s) dans $BRANCHE_CIBLE"

# ── 6. Déploiement ────────────────────────────────────────────────────────────
# Le projet Vercel n'est pas connecté à GitHub : pousser dans main ne déploie PAS.
# On déploie donc explicitement, depuis le code exact qui vient d'être poussé.
# C'est ce qui garantit que la prod == main, et jamais un vieil état local.
etape "6/6  Déploiement en production"

DEPLOYE=0
if [ "${SHIP_NO_DEPLOY:-}" = "1" ]; then
  jaune "  ignoré (SHIP_NO_DEPLOY=1)"
elif ! command -v vercel >/dev/null 2>&1; then
  jaune "  Vercel CLI introuvable — déploiement à faire à la main :"
  echo "    npx vercel --prod --yes"
else
  # `.vercel/` est gitignoré, donc absent des worktrees. Sans lui, `vercel --prod --yes`
  # CRÉE un nouveau projet nommé d'après le dossier et déploie à côté de la vraie prod.
  # On emprunte donc le lien du dépôt principal avant tout déploiement.
  if [ ! -f .vercel/project.json ]; then
    PRINCIPAL=$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')
    if [ -n "$PRINCIPAL" ] && [ -f "$PRINCIPAL/.vercel/project.json" ]; then
      mkdir -p .vercel
      cp "$PRINCIPAL/.vercel/project.json" .vercel/project.json
      echo "  lien Vercel emprunté au dépôt principal"
    fi
  fi

  # Jamais de déploiement à l'aveugle : sans lien connu, on s'arrête.
  if [ ! -f .vercel/project.json ]; then
    rouge "  ✖ Aucun projet Vercel lié — déploiement annulé."
    echo ""
    echo "  Déployer maintenant créerait un projet parasite au lieu de mettre"
    echo "  à jour la vraie prod. Lie le projet d'abord :"
    echo "    vercel link"
    echo ""
    echo "  Ton code est en sécurité dans $BRANCHE_CIBLE."
    echo ""
    exit 1
  fi

  PROJET=$(node -e "try{console.log(require('./.vercel/project.json').projectName||'')}catch(e){}" 2>/dev/null)
  echo "  projet ciblé : ${PROJET:-inconnu}"
  echo "  déploiement du code qui vient d'être poussé..."
  echo ""
  if vercel --prod --yes; then
    vert "  ✓ déployé sur ${PROJET:-le projet lié}"
    DEPLOYE=1
  else
    echo ""
    rouge "  ✖ Le déploiement a échoué."
    echo "  Ton code est en sécurité dans $BRANCHE_CIBLE — seule la mise en ligne a échoué."
    echo "  Relancer :  npx vercel --prod --yes"
    echo ""
    exit 1
  fi
fi

echo ""
if [ "$DEPLOYE" = "1" ]; then
  vert "════════════════════════════════════════════════"
  vert "  TERMINÉ — $BRANCHE_CIBLE et la prod sont identiques"
  vert "════════════════════════════════════════════════"
else
  jaune "════════════════════════════════════════════════"
  jaune "  POUSSÉ dans $BRANCHE_CIBLE — mais PAS déployé"
  jaune "════════════════════════════════════════════════"
  echo ""
  echo "  La prod tourne encore sur une version antérieure."
  echo "  Pour la mettre à jour :  npx vercel --prod --yes"
fi
echo ""
