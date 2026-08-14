# Activer la CI GitHub — optionnel

> **Ce n'est pas urgent.** Vercel est connecté à GitHub et construit déjà le projet à chaque
> push sur `main` : un build cassé se voit immédiatement (déploiement en échec dans le tableau
> de bord Vercel). Ajouté au build local bloquant de `npm run ship`, tu es déjà couvert.
>
> La CI GitHub n'apporte qu'un plus : une coche verte/rouge visible directement sur GitHub,
> et une vérification sur les pull requests avant fusion. À faire si tu en as envie, pas avant.

La CI relance le build sur les serveurs de GitHub à chaque push sur `main`.
Elle protège même si le hook local a été contourné, ou si le push vient d'une autre machine.

Le fichier est prêt : [`docs/github-actions-ci.yml`](./github-actions-ci.yml).
Il n'a pas pu être poussé automatiquement car le token GitHub utilisé ici n'a pas
le droit `workflow` — une restriction de sécurité normale de GitHub.

## Méthode la plus simple (via le site, aucun droit particulier requis)

1. Ouvrir https://github.com/Maelhito/teammh-v2
2. Cliquer sur l'onglet **Actions**
3. Cliquer sur **set up a workflow yourself** (ou **New workflow**)
4. Effacer le contenu proposé
5. Coller l'intégralité de [`docs/github-actions-ci.yml`](./github-actions-ci.yml)
6. Renommer le fichier en haut : `ci.yml`
7. **Commit changes** → **Commit directly to the main branch**

C'est tout. Au prochain push, l'onglet Actions affichera une coche verte ✅ si le
build passe, une croix rouge ❌ sinon.

## Méthode alternative (en ligne de commande)

Régénérer le token GitHub avec la case **`workflow`** cochée, puis :

```bash
mkdir -p .github/workflows && cp docs/github-actions-ci.yml .github/workflows/ci.yml && npm run ship -- "ci: active la verification automatique du build"
```

## Ce qui protège déjà, sans la CI

La CI est un renfort, pas la protection principale. Sont **déjà actifs** :

- `npm run ship` — rebase avant push, build obligatoire, push fast-forward strict
- le hook `pre-push` — refuse les force-push sur `main` et le code qui ne compile pas
- `next.config.ts` — les erreurs TypeScript font échouer le build

La CI ajoute la couverture des cas où quelqu'un contourne le hook local
(`git push --no-verify`) ou pousse depuis un autre ordinateur.
