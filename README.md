# supabase-keepalive

Un seul repo qui ping toutes mes bases Supabase (plan gratuit) une fois par jour,
pour éviter la mise en pause après 7 jours d'inactivité.

Pas de serveur, pas de dépendance : un GitHub Action + le `fetch` natif de Node.

## Comment ça marche

- `.github/workflows/keep-alive.yml` — cron quotidien à 06:00 UTC (+ lancement manuel)
- `ping.mjs` — pour chaque base : `GET {url}/rest/v1/keep_alive?select=id&limit=1`
- `sql/setup.sql` — la table minuscule que le ping va lire
- `last-run.txt` — horodatage du dernier run, commit automatiquement (voir plus bas)

## Mise en place

### 1. Réveiller les projets en pause

Dashboard Supabase → chaque projet en pause → bouton **Restore**. Attendre que le
projet soit `Active` (quelques minutes).

### 2. Créer la table dans chaque projet

Dans **SQL Editor** de chaque projet : coller le contenu de `sql/setup.sql` → **Run**.

### 3. Récupérer URL + clé anon

Pour chaque projet : **Settings → API**
- **Project URL** → `https://xxxx.supabase.co`
- **Project API keys → `anon` / `public`**

> ⚠️ **Ne jamais utiliser la clé `service_role`.** Elle contourne le RLS et donne
> un accès complet à la base. La clé `anon` suffit ici, et la policy de
> `setup.sql` ne lui ouvre que la table `keep_alive`.

### 4. Créer les secrets GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Valeur |
|---|---|
| `SUPABASE_URLS` | `https://aaa.supabase.co,https://bbb.supabase.co` |
| `SUPABASE_KEYS` | `clé_anon_aaa,clé_anon_bbb` |

**Même ordre dans les deux listes**, séparées par des virgules. Le script refuse
de tourner si les deux listes n'ont pas la même taille.

### 5. Tester

Onglet **Actions** → workflow `keep-alive` → **Run workflow**. Les logs affichent
une ligne par base :

```
✅ https://aaa.supabase.co — OK
⚠️  https://bbb.supabase.co — OK mais table keep_alive vide
❌ https://ccc.supabase.co — HTTP 401 ...
```

Le job échoue (exit 1) si au moins une base ne répond pas.

## Ajouter une base plus tard

1. Lancer `sql/setup.sql` dans le nouveau projet
2. Ajouter son URL à la fin de `SUPABASE_URLS` et sa clé anon à la fin de `SUPABASE_KEYS`

Rien à modifier dans le code.

## Bases suivies

- disposeance
- resept

## Le cron s'auto-entretient

GitHub désactive les workflows planifiés après **60 jours sans commit** sur le repo.
Le workflow s'en occupe seul : après le ping, il écrit l'horodatage du run dans
`last-run.txt` et le commit avec le `GITHUB_TOKEN` par défaut (identité
`github-actions[bot]`, permission `contents: write`). Le repo reçoit donc un
commit par jour et n'atteint jamais le seuil des 60 jours.

- Le commit n'a lieu que si le fichier a réellement changé (pas de commit vide).
- Message : `chore: keep-alive ping <date ISO> [skip ci]` — le `[skip ci]` évite
  que ce commit redéclenche le workflow (pas de boucle).
- L'étape tourne avec `if: always()`, donc même un ping en échec garde le cron vivant.

Rien à faire manuellement, aucun PAT à créer.
