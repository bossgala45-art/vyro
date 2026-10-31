# VYRO — BUILD YOUR BEST.

Application personnelle de coaching sportif (musculation, basket, récupération), sous forme de **PWA** installable depuis Safari sur iPhone. Toutes les données restent sur l'appareil.

> **État actuel : étape 7 / 10 — transformation physique.** Profil, stockage local, verrouillage, programme de musculation, séances en direct, progression prudente, historique et records, calendrier intelligent, suivi basket, export iPhone, check-in de récupération avec décision expliquée, journal alimentaire simple (sans calories), idées de repas économiques selon tes goûts, conseils protéines, conseils adaptés aux jours de basket, suivi et rappels d'hydratation, poids et mensurations avec graphiques interactifs, photos de progression (chronologie, zoom, comparaison avant/après) et records fonctionnent. Les autres modules sont marqués « Module en construction » ; aucune donnée fictive n'est affichée.

## Utiliser VYRO sur iPhone

Adresse (après activation de GitHub Pages, voir plus bas) : **https://bossgala45-art.github.io/vyro/**

1. Ouvre l'adresse dans **Safari** (pas dans une autre app : seul Safari permet l'installation).
2. Touche le bouton **Partager** (carré avec une flèche), puis **Ajouter à l'écran d'accueil**.
3. Ouvre VYRO depuis son icône : l'application s'affiche en plein écran et fonctionne hors ligne après le premier chargement.

L'installation sur l'écran d'accueil est recommandée : Safari peut effacer les données d'un site non installé après 7 jours sans visite.

### Activer GitHub Pages (une seule fois)

Depuis Safari sur iPhone : `github.com/bossgala45-art/vyro` → **Settings** → **Pages** → *Build and deployment* → **Source : GitHub Actions**. (Si le menu Settings n'apparaît pas, utilise « Voir la version ordinateur » dans le menu « Aa » de Safari.)

Ensuite, chaque fusion d'une Pull Request dans `main` publie automatiquement la nouvelle version (onglet **Actions** pour suivre). Une bannière « Nouvelle version disponible » apparaît alors dans l'app installée.

## Environnement de développement (sans Mac, depuis un iPhone)

| Rôle | Outil |
|---|---|
| Écrire le code, lancer les tests | Claude Code (session cloud, depuis l'app Claude) |
| Relire et fusionner chaque étape | App GitHub sur iPhone (Pull Requests) |
| Vérifications automatiques | GitHub Actions (types, lint, tests unitaires, tests d'interface) |
| Hébergement HTTPS gratuit | GitHub Pages |
| Tester l'app | Safari sur iPhone |

## Commandes (pour un ordinateur ou une session cloud)

```bash
npm ci              # installer les dépendances
npm run dev         # serveur de développement
npm run typecheck   # vérification TypeScript stricte
npm run lint        # ESLint
npm test            # tests unitaires (Vitest)
npm run test:e2e    # tests d'interface (Playwright, construit l'app)
npm run check       # tout ce qui précède + build
npm run icons       # régénérer les icônes depuis scripts/icon-source.svg
```

## Technologies

React 19 · TypeScript strict · Vite · Tailwind CSS 4 · vite-plugin-pwa (Workbox) · React Router (routage par hash) · Vitest + Testing Library · Playwright. Stockage local prévu avec IndexedDB / Dexie (étape 2).

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour l'organisation du code.

## Limitations connues

- Les tests d'interface tournent sur **Chromium avec émulation iPhone**, pas sur le moteur WebKit de Safari : la vérification finale se fait sur un vrai iPhone.
- Une PWA n'a pas accès à Face ID natif, à HealthKit ni aux widgets iOS.
- Le verrouillage par code est **visuel** : il masque l'application mais ne chiffre pas les données stockées. Le chiffrement arrive avec les sauvegardes (étape 9).
- Le minuteur de repos s'affiche dans l'app uniquement : aucune notification n'est envoyée quand VYRO n'est pas à l'écran.
- Les repères de récupération sont des repères prudents réglables, **pas des seuils médicaux validés** ; VYRO ne pose aucun diagnostic.
- Nutrition : conseils généraux et prudents, **pas un avis médical ni diététique**. VYRO ne calcule ni calories ni apports ; la photo d'un repas illustre la saisie et n'est **pas analysée** (aucun service de reconnaissance n'est connecté). Les photos restent sur l'iPhone.
- Transformation : VYRO affiche uniquement les évolutions **mesurées** ; il n'estime ni masse grasse ni masse musculaire et ne calcule aucun score. Aucune analyse visuelle des photos (aucun service connecté). Les photos restent sur l'iPhone et ne sont jamais envoyées.
- Les rappels d'hydratation s'affichent dans VYRO quand l'app est ouverte ; pour être prévenu app fermée, il faut exporter les rappels vers le Calendrier de l'iPhone.
- L'export vers le Calendrier iPhone est un fichier .ics ajouté manuellement : pas de synchronisation automatique ; après un changement, il faut exporter à nouveau.
- Il n'existe pas encore de sauvegarde : effacer les données de Safari ou désinstaller l'app efface tout, photos comprises (sauvegarde chiffrée à l'étape 9).
- Les notifications en arrière-plan nécessitent un serveur de push : elles ne sont pas prévues sans service dédié (alternatives proposées à l'étape 9).
