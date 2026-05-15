# TeamMJ v2 — Règles de déploiement

## Règle de déploiement automatique

### ✅ Partie COACH → déployer immédiatement en prod Vercel

Tout changement dans les chemins suivants doit être **commité ET déployé (`vercel --prod`)** dès qu'il est validé :

- `app/coach/**`
- `app/api/coach/**`
- `app/admin/**`
- `app/api/admin/**`
- `components/**` (composants partagés)
- `lib/**`
- `middleware.ts`

**Workflow :**
1. Modifier le code
2. `git add` + `git commit`
3. `vercel --prod --yes` → déploiement immédiat
4. Confirmer READY avant de continuer

---

### 🔒 Partie CLIENTE → rester sur localhost uniquement

Tout changement dans les chemins suivants **NE DOIT PAS être déployé en prod** tant que la partie cliente n'est pas finalisée et validée :

- `app/dashboard/**`
- `app/calendrier/**`
- `app/modules/**`
- `app/profil/**`
- `app/inscription/**`
- `app/api/calendrier/**`
- `app/api/modules/**`
- `app/api/profil/**`
- `components/` concernant les clientes

**Ces fichiers restent en localhost (dev) jusqu'à validation complète.**

---

### Rappel structure

```
app/
├── admin/        → COACH/ADMIN  ✅ deploy auto
├── coach/        → COACH        ✅ deploy auto
├── api/coach/    → COACH        ✅ deploy auto
├── api/admin/    → ADMIN        ✅ deploy auto
├── dashboard/    → CLIENTE      🔒 localhost seulement
├── calendrier/   → CLIENTE      🔒 localhost seulement
├── modules/      → CLIENTE      🔒 localhost seulement
├── profil/       → CLIENTE      🔒 localhost seulement
└── inscription/  → CLIENTE      🔒 localhost seulement
```
