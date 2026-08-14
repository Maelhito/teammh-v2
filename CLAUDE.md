# TeamMJ v2 — Règles de travail et de déploiement

## Règle unique : tout part dans `main`

Il n'y a **plus** de distinction coach / cliente. Il n'y a **plus** de code qui reste en local.
Tout changement validé va dans `main`, et `main` déploie automatiquement en prod sur Vercel.

**Une seule commande fait tout, correctement :**

```bash
npm run ship
```

Elle enchaîne, dans cet ordre, et **s'arrête à la première erreur** :

1. Commit de ce qui traîne (message demandé si non fourni)
2. `git fetch origin` — récupère le vrai `main` à jour
3. **Rebase sur `origin/main`** — le travail est replacé *au-dessus* du dernier état de prod, jamais en dessous
4. **`npm run build`** — si le build casse, rien n'est poussé
5. `git push origin HEAD:main` — en fast-forward strict, sans `--force`
6. Vercel déploie tout seul (le dépôt GitHub est connecté), `ship` suit le build et te dit si ça passe

### 🚫 Ne jamais lancer `vercel --prod`

Le dépôt GitHub **est** connecté à Vercel : pousser dans `main` déclenche le déploiement de
production. Lancer `vercel --prod` en plus crée un **second** déploiement de prod, construit à
partir des **fichiers de ton disque** et non du commit poussé. Les deux courent après la même
adresse `teammj-v2.vercel.app`, et **le dernier arrivé gagne**.

C'est une des causes des régressions : un `vercel --prod` lancé depuis un dossier local — souvent
une vieille branche — écrasait la prod construite depuis `main`. Constaté le 14 août 2026, deux
déploiements à 2 secondes d'intervalle.

**Donc : on pousse, et on laisse Vercel faire.** `npm run ship` s'en charge et attend le résultat.

Si un déploiement échoue, on **ne rattrape pas** avec `vercel --prod` : on corrige le code et on
refait `npm run ship`.

---

## Pourquoi ces garde-fous existent

Ce projet a perdu du travail plusieurs fois. Les trois causes, et ce qui les bloque désormais :

| Cause | Garde-fou |
| --- | --- |
| Le travail restait sur des branches locales jamais poussées | `npm run ship` pousse dans `main` à chaque fois |
| Une branche ancienne fusionnée en dernier écrasait du travail plus récent | Le **rebase sur `origin/main`** avant chaque push ; le push est en fast-forward strict, donc **impossible** d'écraser un commit existant |
| Du code cassé arrivait en prod | Le **build** bloque le push (hook `pre-push` + CI GitHub Actions) |
| `vercel --prod` depuis un dossier local écrasait la prod construite depuis `main` | On ne déploie plus à la main : le push suffit, `ship` suit le build |
| Les erreurs TypeScript étaient ignorées au build | `ignoreBuildErrors: false` dans `next.config.ts` |

### Interdits absolus

- ❌ `vercel --prod` (double le déploiement git et peut écraser la prod avec un état local)
- ❌ `git push --force` / `--force-with-lease` sur `main`
- ❌ `git reset --hard` sur `main`
- ❌ Contourner le hook avec `--no-verify`
- ❌ Laisser du travail sur une branche locale à la fin d'une session

---

## Travailler en parallèle : une règle

**Un seul chantier à la fois par fichier.** Deux worktrees qui modifient le même fichier = écrasement garanti au moment de fusionner.

Avant de commencer un nouveau chantier :

```bash
npm run ship        # on termine et on envoie le chantier en cours
git worktree list   # on vérifie qu'aucun autre worktree ne touche les mêmes fichiers
```

Si un worktree n'est plus utilisé, il faut le supprimer — un worktree oublié est une bombe à retardement :

```bash
npm run worktrees:clean   # supprime uniquement ceux déjà fusionnés dans main
```

---

## En cas de blocage

| Message | Signification | Solution |
| --- | --- | --- |
| `CONFLIT pendant le rebase` | `main` a bougé et touche les mêmes lignes | Résoudre les fichiers listés, `git add`, `git rebase --continue`, puis relancer `npm run ship` |
| `BUILD ÉCHOUÉ` | Le code ne compile pas | Corriger l'erreur affichée. Rien n'a été poussé, la prod est intacte |
| `push rejeté (non-fast-forward)` | `main` a avancé pendant le build | Relancer `npm run ship` — il refait le rebase |

---

## Structure du projet

```
app/
├── admin/        → COACH / ADMIN
├── coach/        → COACH
├── api/coach/    → COACH
├── api/admin/    → ADMIN
├── dashboard/    → CLIENTE
├── calendrier/   → CLIENTE
├── modules/      → CLIENTE
├── profil/       → CLIENTE
└── inscription/  → CLIENTE
```

Tous ces chemins suivent la même règle : `npm run ship` → `main` → prod.

---

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm run ship` | Envoyer le travail en prod (la commande principale) |
| `npm run ship -- "message de commit"` | Idem, en fournissant le message directement |
| `npm run check` | Vérifier que le build passe, sans rien pousser |
| `npm run status` | Voir tout travail non poussé, sur toutes les branches |
| `npm run rescue` | Sauvegarder sur GitHub tout le travail non commité, partout |
| `npm run worktrees:clean` | Supprimer les worktrees déjà fusionnés |

`rescue` ne modifie aucun fichier : il crée seulement des points de restauration
`sauvegarde/*` sur GitHub. À lancer sans hésiter dès qu'un doute apparaît.
