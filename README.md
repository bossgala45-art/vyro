# VYRO — BUILD YOUR BEST.

Application personnelle de coaching sportif (musculation, basket, récupération, nutrition, transformation physique), sous forme de **PWA** installable depuis Safari sur iPhone. Pas de compte, pas de serveur : toutes les données restent sur l'appareil.

**Adresse : https://bossgala45-art.github.io/vyro/**

> **Version 1.0.0** — les 10 étapes du plan sont livrées. Les fonctionnalités opérationnelles, partielles et impossibles en PWA sont listées dans [LIMITATIONS.md](LIMITATIONS.md). Aucune donnée fictive n'est affichée.

## Documentation

| Document | Contenu |
|---|---|
| [GUIDE_INSTALLATION_IPHONE.md](GUIDE_INSTALLATION_IPHONE.md) | Installer VYRO sur l'iPhone, mettre à jour, sauvegarder, déployer |
| [GUIDE_UTILISATION.md](GUIDE_UTILISATION.md) | Utiliser chaque module au quotidien |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Organisation du code, données, moteurs (musculation, calendrier, récupération, nutrition, coach) |
| [SECURITE.md](SECURITE.md) | Ce qui est protégé, chiffrement des sauvegardes, limites des applications web |
| [TESTS.md](TESTS.md) | Tests automatisés, ce qu'ils couvrent, résultats et comment les lancer |
| [LIMITATIONS.md](LIMITATIONS.md) | Opérationnel, partiel, futur (service externe), impossible en PWA |

## Fonctionnalités

- **Profil** : configuration en 5 étapes, pesées, objectif daté, matériel, goûts alimentaires.
- **Musculation** : programme généré selon le matériel et la durée (sans développé couché libre non assisté), séance en direct avec minuteur de repos, double progression prudente (jamais de hausse de charge après une douleur, aucune charge de départ inventée), historique et records réels.
- **Calendrier** : entraînements et matchs de basket, exceptions, vacances, planning adaptatif expliqué (jamais un jour de match, pas de jambes la veille, aucun rattrapage), suivi des matchs, export vers le Calendrier de l'iPhone.
- **Récupération** : check-in de 30 s, décision expliquée (normale, allégée, activité légère, repos), repères réglables non médicaux, historique.
- **Nutrition** : journal simple sans calories, idées de repas économiques selon les goûts (aliments refusés jamais proposés), conseils des jours de basket, hydratation avec rappels.
- **Transformation** : poids et mensurations avec graphiques interactifs, photos de progression locales (chronologie, zoom, comparaison avant/après).
- **Coach** : moteur de règles locales (pas d'IA) — messages fondés sur des événements réels, questions guidées, objectifs de la semaine, bilans de 14 jours, journal de motivation.
- **Sécurité et sauvegardes** : verrouillage par code, sauvegarde chiffrée (AES-256-GCM, phrase secrète) avec restauration contrôlée, aucune connexion vers un autre site (CSP), fonctionnement hors ligne.

## Développement

Sans Mac : le code est écrit et testé dans une session Claude Code (cloud), chaque étape est relue et fusionnée depuis l'app GitHub sur iPhone, GitHub Actions vérifie et publie sur GitHub Pages.

```bash
npm ci              # installer les dépendances
npm run dev         # serveur de développement (http://localhost:5173)
npm run typecheck   # TypeScript strict
npm run lint        # ESLint
npm test            # tests unitaires et d'interface (Vitest)
npm run test:e2e    # tests de bout en bout (Playwright, construit l'app)
npm run check       # tout ce qui précède + build
npm run build       # version de production dans dist/
npm run icons       # régénérer les icônes depuis scripts/icon-source.svg
```

React 19 · TypeScript strict · Vite · Tailwind CSS 4 · Dexie (IndexedDB) · vite-plugin-pwa (Workbox) · React Router (routage par hash) · Vitest + Testing Library · Playwright (+ axe-core pour l'accessibilité).
