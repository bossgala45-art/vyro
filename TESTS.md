# Tests de VYRO

Tous les résultats ci-dessous viennent de tests **réellement exécutés** (localement dans la session de développement, puis par GitHub Actions sur chaque Pull Request). Aucun test n'est désactivé ou ignoré pour obtenir un résultat vert.

## Résultats de l'audit final (version 1.0.0)

| Vérification | Commande | Résultat |
|---|---|---|
| Types (TypeScript strict) | `npm run typecheck` | ✅ aucune erreur |
| Lint (ESLint, domaine pur vérifié) | `npm run lint` | ✅ aucune erreur |
| Tests unitaires et d'interface | `npm test` | ✅ **{{UNIT}}** réussis (27 fichiers) |
| Build de production | `npm run build` | ✅ |
| Tests de bout en bout, Chromium + émulation iPhone 15 Pro | `npm run test:e2e` | ✅ **{{E2E}}** réussis |
| Parcours principaux sur WebKit (moteur de Safari), iPhone 15 Pro | CI « Compatibilité Safari (WebKit) » | ✅ 8 réussis (exécutés par GitHub Actions ; WebKit n'est pas installé dans l'environnement de développement) |
| Accessibilité (axe-core, WCAG 2.1 A/AA, contraste compris) sur 43 écrans | `e2e/audit.spec.ts` | ✅ 0 violation après correction de 4 problèmes |
| Dépendances livrées | `npm audit --omit=dev` | ✅ 0 vulnérabilité |

## Organisation

| Type | Où | Outils |
|---|---|---|
| Moteurs (règles pures) | `src/domain/**/*.test.ts` | Vitest |
| Stockage, migrations, sauvegardes | `src/data/*.test.ts` | Vitest + fake-indexeddb |
| Chiffrement | `src/security/*.test.ts` | Vitest + WebCrypto de Node |
| Écrans et parcours | `src/features/**/*.test.tsx`, `src/app/*.test.tsx` | Vitest + Testing Library + jsdom |
| Bout en bout (app construite, service worker, vrai navigateur) | `e2e/*.spec.ts` | Playwright |

`src/test/realm.ts` corrige un artefact de l'environnement jsdom (des `ArrayBuffer` d'un autre « realm » que Dexie copiait mal) ; il ne concerne que les tests, les tests de bout en bout le confirment.

## Ce qui est couvert

**Données** : persistance après fermeture et réouverture ; migrations v1 → v7, chacune testée à partir de données réelles de la version précédente, migration annulée en cas d'erreur ; base créée par une version plus récente détectée ; espace plein (quota) sans écriture partielle ; enregistrements abîmés signalés, jamais pris pour une absence ; suppression complète.

**Sauvegardes** : export puis restauration à l'identique (photos à l'octet près) ; mauvaise phrase secrète ; sauvegarde corrompue (contenu, en-tête modifié, fichier tronqué, autre fichier, format inconnu, paramètres piégés) ; données volumineuses (12 photos de 1 Mo) ; ancienne sauvegarde migrée ; sauvegarde plus récente refusée ; contenu incohérent ; restauration tout ou rien ; aperçu sans modification ; verrouillage conservé. De bout en bout : vrai fichier téléchargé, illisible en clair, effacement complet puis restauration avec photo.

**Moteur sportif** : programme selon le matériel (développé couché libre exclu, mouvement impossible signalé), durée maximale respectée, aucune charge de départ inventée, double progression, jamais de hausse de charge après une douleur, une séance très dure, une série à l'échec, une séance allégée ou incomplète, baisse prudente après deux séances sous la fourchette, reprise après interruption, séance manquée jamais rattrapée.

**Calendrier** : occurrences, exceptions, vacances, fuseau et changement d'heure, export ICS (RFC 5545), planning : jamais un jour de match, pas de jambes la veille, allègement après un match intense, contraintes et explications, rotation sans rattrapage.

**Récupération** : nuits courtes, douleurs (zone, intensité, jambes avant un match), matchs rapprochés, données insuffisantes, repères réglables, lien avec le planning.

**Nutrition** : portions inconnues jamais converties, aliments refusés jamais proposés (par famille comprise), jours de basket (conseils et hydratation), rappels, photo illustrative, quota.

**Transformation** : importation (réduction, fichier invalide), comparaison, suppression, stockage, erreurs de quota, séries sans interpolation.

**Coach** : messages fondés sur les données, ton sans reproche, données absentes, recommandations contradictoires (la récupération l'emporte), questions reconnues et non prises en charge.

**Sécurité et PWA** : empreinte du code, délais après erreurs, aucune requête vers un autre site (CSP vérifiée par une violation provoquée), manifeste et icônes, fonctionnement hors ligne après installation, bandeau hors ligne, mise à jour proposée puis appliquée à la demande.

**Interface** : audit de chaque écran (43) avec des données réelles : accessibilité WCAG 2.1 AA, un titre principal, aucune erreur JavaScript ou de console, aucun débordement horizontal sur un écran d'iPhone.

## Ce qui n'est pas testé automatiquement

- **Un iPhone réel** : installation depuis Safari, feuille de partage iOS, comportement d'iOS sur le stockage (effacement après 7 jours sans installation), rendu exact de Safari. → À vérifier sur l'appareil (voir GUIDE_INSTALLATION_IPHONE.md).
- La **feuille de partage** (`navigator.share`) : dans les navigateurs de test, VYRO télécharge le fichier à la place, et ce chemin est testé.

## Lancer les tests

```bash
npm ci
npm run check                                   # types, lint, tests unitaires, build, bout en bout (Chromium)
npx playwright test e2e/audit.spec.ts           # audit d'accessibilité seul
VYRO_WEBKIT=1 npx playwright test --project=iphone-webkit   # WebKit (nécessite « npx playwright install webkit »)
```

Sur GitHub, chaque Pull Request lance « Vérifier (types, lint, tests, build) » et « Compatibilité Safari (WebKit) » ; la publication sur GitHub Pages n'a lieu qu'après la réussite des deux, sur `main`.
