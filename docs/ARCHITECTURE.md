# Architecture de VYRO

## Principes

1. **Trois couches séparées** : données, moteur sportif, interface.
2. **Le moteur sportif est pur** : des fonctions TypeScript déterministes, sans React ni accès au stockage. Elles reçoivent des données et renvoient des décisions *avec leur explication*. Cette règle est vérifiée par ESLint (`no-restricted-imports` sur `src/domain/**`).
3. **Hors ligne d'abord** : tout fonctionne sans réseau ; aucune donnée personnelle ne quitte l'appareil.
4. **Aucune donnée fictive** : un module non développé l'indique ; une valeur inconnue reste inconnue.
5. **IA future derrière une interface** : un fournisseur désactivé par défaut, qui ne pourra appeler qu'un backend sécurisé. Aucune clé API dans le frontend.

## Organisation de `src/`

```
src/
├── app/            Assemblage : routes, navigation, mise en page (AppShell, BottomNav)
├── features/       Un dossier par module (écrans et composants propres au module)
│   ├── today/  training/  calendar/  progress/  more/
│   ├── recovery/  nutrition/  coach/  profile/  settings/
│   └── not-found/
├── ui/             Composants visuels réutilisables (Screen, Card, Logo…)
├── pwa/            Service worker : enregistrement et mises à jour
├── styles/         Thème global Tailwind (couleurs, animations)
└── test/           Outils de test partagés
```

Dossiers prévus aux étapes suivantes :

```
src/
├── domain/         Moteurs purs : musculation, calendrier, récupération, nutrition, coach
├── data/           Dexie : schéma versionné, migrations, repositories, chiffrement
└── services/       Intégrations optionnelles (IA future, export ICS…), désactivées par défaut
```

Sens des dépendances : `features → domain` et `features → data` ; `domain` ne dépend de rien d'autre que lui-même.

## Navigation

Routage par hash (`#/calendrier`) avec React Router. Il fonctionne sur un hébergement statique (GitHub Pages) et hors ligne, y compris à la réouverture d'un écran précis. La liste des écrans est centralisée dans `src/app/navigation.ts` (onglets) et `src/app/routes.tsx` (routes).

## PWA

- `vite-plugin-pwa` génère le manifeste et un service worker Workbox qui met en cache tous les fichiers de l'application (précache).
- Mise à jour en mode **prompt** : la nouvelle version n'est activée qu'après accord (bannière « Mettre à jour »), pour ne jamais interrompre une saisie.
- Les chemins sont relatifs à `BASE_PATH` (`/vyro/` sur GitHub Pages, `/` en local).

## Tests

- **Unitaires** (`src/**/*.test.ts(x)`, Vitest + jsdom) : logique et composants.
- **Interface** (`e2e/`, Playwright) : parcours réels sur le build de production, émulation iPhone, hors ligne, manifeste, absence de requêtes vers des serveurs tiers.
