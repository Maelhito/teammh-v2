# Travail non fusionné — inventaire

Généré le 14 août 2026.

12 branches contenaient du travail jamais arrivé dans `main` — **29 commits, ~4 000 lignes**.
**Toutes sont désormais sauvegardées sur GitHub** : elles ne peuvent plus disparaître.

Rien n'a été fusionné automatiquement : du code vieux de trois mois réintégré à l'aveugle
écraserait du travail plus récent. À reprendre **une par une**, en commençant par le plus récent.

## Comment réintégrer une branche

```bash
git switch <nom-de-la-branche>
npm run ship
```

`ship` rebase sur `main`, lance le build, et refuse de pousser si quoi que ce soit casse.
En cas de conflit, il liste les fichiers concernés et s'arrête sans rien casser.

---

## À réintégrer, du plus récent au plus ancien

### ~~1. `claude/ttm-coach-clientes-review-8402d3` — 10 août~~ ✅ RÉINTÉGRÉE le 15/08/2026
**Suivi des mesures : poids, mensurations, photos de progression**
3 commits · 15 fichiers · +1472 lignes

Comparateur avant/après, galerie complète, courbes côté coach, historique repliable des deux côtés.
Nouvelles routes API `mesures` + composants `MesuresCliente` / `PhotosCliente`.

Fusionnée dans `main` via `reintegration/mesures-photos`. Un seul conflit
(`app/coach/clientes/[id]/page.tsx`, deux imports) — les deux versions conservées, rien de perdu.
Bucket Supabase **privé** `photos-progression` créé à cette occasion ; les tables `mesures` et
`photos_progression` existaient déjà.

> **Reste à faire dessus :** la colonne `note` est en base et dans les types, mais n'est ni
> saisissable ni affichée. À brancher si le besoin se confirme.

---

### 2. `claude/ttm-tts-password-visibility-85305e` — 4 août
**Renommage TTS → TTL (Time To Last) + afficher/masquer mot de passe + date de démarrage éditable**
3 commits · 70 fichiers · +699 / −581

> ⚠️ Touche 70 fichiers à cause du renommage global. À réintégrer **seule**, et de préférence
> avant les autres branches TTS/TTL, sinon les conflits seront pénibles.

---

### 3. `claude/pwa-manifests-ttm-tts-3f8a10` — 4 août
**Installation PWA : bouton Android + iPhone, manifest TTS dédié**
5 commits · 5 fichiers · +230

Bannière d'installation centrée, fallback Android sans `beforeinstallprompt`, install iOS clarifiée.

---

### 4. `claude/tts-discussion-bf5ae9` — 2 août
**Bouton « Installer l'app » sur TTM et TTS**
1 commit · 4 fichiers · +293

> ⚠️ **Doublon probable avec la n°3** (`InstallAppPrompt.tsx` vs `InstallPrompt.tsx`).
> Réintégrer la n°3 d'abord, puis vérifier si celle-ci a encore un intérêt. Sinon, l'abandonner.

---

### 5. `claude/ttm-admin-mods-3382cb` — 17 juillet
**Landing page de vente Time To Start + Capsule Boost + Replay Mobilité**
6 commits · 29 fichiers · +1213

Vrais visuels et témoignages, menu mobile admin à gauche, réinitialisation de mot de passe par email.

> ⚠️ Recoupe partiellement les n°2 (mot de passe, date de démarrage) et n°7 (menu mobile).
> À réintégrer **après** elles ; une partie sera peut-être déjà là.

---

### 6. `claude/intelligent-euclid-8a0cb7` — 1er juillet
**Première template de l'app cliente TTS/TTL**
1 commit · 14 fichiers · +777

Répertoire `app/tts-app/` : navigation basse, bibliothèque, layout, route `api/tts/watch`.

> ⚠️ `main` contient aujourd'hui `app/tts/` (parcours, profil, paiement, bibliothèque).
> **Vérifier si ce travail n'est pas déjà obsolète** avant d'y passer du temps.

---

### 7. `claude/dazzling-villani-775a74` — 1er juillet
**Skeletons de chargement partout + middleware plus rapide**
3 commits · 47 fichiers · +270

`loading.tsx` sur dashboard, calendrier, modules, profil, entraînement, admin.
Le middleware lit le rôle depuis `user_metadata` au lieu d'un appel base à chaque navigation.

> Gain de performance réel et peu risqué (surtout des fichiers nouveaux). **Bon deuxième candidat.**

---

### 8. `claude/admiring-swanson-b6b46f` — 10 juin
**Journal des séances + mode aperçu cliente**
1 commit · 4 fichiers · +145

> ⚠️ La n°10 (`deploy-coach-sprint3`) contient une autre version du journal des séances.
> Comparer les deux et n'en garder qu'une.

---

### 9. `deploy-prod-safe` — 9 juin
**Cron notifications avec mode test `?test=true`**
2 commits · 15 fichiers · +1099

---

### 10. `deploy-coach-sprint3` — 8 juin
**Journal des séances (autre version) + panneau bibliothèque d'exercices en sticky**
2 commits · 3 fichiers · +111

> 📌 Contient le commit `30c9876 "rétablir le panneau bibliothèque d'exercices en sticky
> (perdu lors d'un commit précédent)"` — la trace écrite d'un écrasement passé.
> **Vérifier si ce panneau sticky est encore en place dans `main` aujourd'hui.**

---

### 11. `deploy-coach` — 24 juin
**Cartes clientes (date démarrage + statut) et restriction de suppression**
1 commit · 10 fichiers · +90 / −40

> ⚠️ Recoupe la n°2 et la n°5 sur la date de démarrage.

---

### 12. `claude/elegant-wu-eb0cfa` — 13 mai
**Bouton retour admin dans les portails coach et client**
1 commit · 2 fichiers · +48

Le plus ancien et le plus petit. Probablement le plus simple à reprendre — ou à abandonner.

---

## Ordre conseillé

1. ~~**n°1** (mesures)~~ ✅ fait
2. **n°7** (skeletons) — peu risqué, gain immédiat — **prochaine**
3. **n°2** (renommage TTL) — seule, avant les autres branches TTS
4. **n°3** puis vérifier **n°4** (doublon PWA)
5. **n°5** (landing TTS) — après la n°2
6. Comparer **n°8** et **n°10**, garder une seule version du journal
7. Trancher sur **n°6** (probablement obsolète), **n°9**, **n°11**, **n°12**

Une fois une branche réintégrée ou abandonnée, la supprimer pour ne pas la reprendre deux fois :

```bash
git branch -D <branche> && git push origin --delete <branche>
```
