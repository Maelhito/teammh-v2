# Les notifications — comment c'est déclenché

## Un seul endpoint

```
GET /api/cron/notifications
Authorization: Bearer <CRON_SECRET>
```

Il fait **tout** : séance du jour, visio de groupe, rendez-vous du matin, rappel
du soir, rappel « 1h avant le rendez-vous », et les quatre relances TTL.

Pour chaque personne, il lit **l'heure qu'il est chez elle** et n'envoie que ce
qui correspond. Aucune heure UTC ni aucun pays codé en dur : une cliente qui
part en France est traitée comme les autres, sans rien à changer.

Deux anciennes adresses restent vivantes et font exactement la même chose, pour
ne pas casser les déclencheurs déjà en place :
`/api/cron/ttl-notifications` et `/api/cron/unlock-notifications`.

## À quelle fréquence

**Au moins toutes les heures.** Idéalement **tous les quarts d'heure**, parce
que le rappel « ton rendez-vous est dans 1h » se déclenche dans une fenêtre de
50 à 70 minutes avant : un passage horaire peut la manquer.

Relancer le cron dix fois dans l'heure n'envoie jamais deux fois la même
notification — la table `notif_log` porte une contrainte d'unicité sur
`(user_id, type, sent_date)`, et toute insertion en double échoue. C'est ce qui
permet d'avoir plusieurs déclencheurs en parallèle sans risque.

## Qui déclenche

| Déclencheur | Fréquence | Rôle |
| --- | --- | --- |
| **cron-job.org** | toutes les 15 min | Le vrai déclencheur |
| **Vercel** (`vercel.json`) | 1×/jour à 20h UTC | Filet de sécurité |

Le plan Vercel Hobby ne permet qu'un passage quotidien : il ne peut donc pas
être le déclencheur principal. 20h UTC = **7h à Nouméa** : si le déclencheur
externe tombe, les clientes calédoniennes reçoivent quand même leurs
notifications du matin. C'est un filet, pas une solution.

## Vérifier que ça tourne vraiment

Le piège déjà rencontré : un job **vert** sur cron-job.org qui n'envoie rien,
pendant que le vrai job échoue en rouge. Ne pas se fier à la couleur.

La preuve se lit en base — si plus rien n'est arrivé depuis 48h, le cron est
mort :

```sql
SELECT sent_date, type, count(*)
FROM   notif_log
GROUP  BY sent_date, type
ORDER  BY sent_date DESC
LIMIT  20;
```

Ou en appelant l'endpoint à la main : la réponse contient `envoyees`,
`personnes` et le détail dans `logs`.

## Si le déclencheur échoue en « Erreur HTTP »

C'est presque toujours **401** : l'en-tête `Authorization` manque ou ne
correspond plus à `CRON_SECRET`.

Deux façons de présenter le secret :

1. en-tête `Authorization: Bearer <CRON_SECRET>` ;
2. paramètre d'URL `?secret=<CRON_SECRET>`, pour les planificateurs qui ne
   savent pas envoyer d'en-tête personnalisé.

Pour tester depuis un terminal :

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://teammj-v2.vercel.app/api/cron/notifications"
```

`401` sans secret est le comportement **attendu** — ça prouve que l'endpoint
est vivant.
