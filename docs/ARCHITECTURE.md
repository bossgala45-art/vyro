# Architecture de VYRO

## Principes

1. **Trois couches séparées** : données, moteur sportif, interface.
2. **Le domaine est pur** : des fonctions TypeScript déterministes, sans React ni accès au stockage. La date du jour leur est passée en paramètre. Elles reçoivent des données et renvoient des décisions *avec leur explication*. Cette règle est vérifiée par ESLint (`no-restricted-imports` sur `src/domain/**`).
3. **Hors ligne d'abord** : tout fonctionne sans réseau ; aucune donnée personnelle ne quitte l'appareil.
4. **Aucune donnée fictive** : un module non développé l'indique ; une valeur inconnue reste inconnue (champ vide, jamais de valeur par défaut inventée).
5. **Aucune perte silencieuse** : une erreur de stockage est toujours affichée, la saisie est conservée, et un enregistrement abîmé n'est jamais confondu avec une absence de données.
6. **IA future derrière une interface** : un fournisseur désactivé par défaut, qui ne pourra appeler qu'un backend sécurisé. Aucune clé API dans le frontend.

## Organisation de `src/`

```
src/
├── app/            Assemblage : routes, navigation, garde de premier lancement,
│   │               écrans d'état (chargement, erreur), horloge
│   └── lock/       Verrouillage local (contexte, écran de code)
├── domain/         Logique pure
│   ├── common/     Dates calendaires locales
│   ├── profile/    Modèle du profil, brouillon de formulaire, validation, intégrité
│   └── settings/   Modèle des réglages, délais après essais ratés
├── data/           IndexedDB (Dexie) : schéma versionné, migrations, repositories,
│                   erreurs de stockage, hooks réactifs, maintenance
├── security/       Empreinte du code de verrouillage (PBKDF2 via WebCrypto)
├── features/       Un dossier par module (écrans et composants propres)
│   ├── onboarding/ Bienvenue et configuration initiale en 5 étapes
│   ├── profile/    Profil, modification par section, pesées
│   ├── settings/   Confidentialité, verrouillage, stockage, effacement
│   └── today/ training/ calendar/ progress/ more/ recovery/ nutrition/ coach/
├── ui/             Composants réutilisables (Screen, Card, Button, champs, dialogues…)
├── pwa/            Service worker : enregistrement et mises à jour
├── styles/         Thème global Tailwind
└── test/           Outils de test partagés (base de test, profil de test)
```

Sens des dépendances : `features → data → domain`, `features → domain`. Le domaine ne dépend de rien d'autre que lui-même.

## Données

### Tables (IndexedDB `vyro`, schéma v1)

| Table | Clé | Contenu |
|---|---|---|
| `profile` | `'me'` | Profil unique : identité, objectif, préférences d'entraînement et d'aliments |
| `bodyWeights` | auto, index `date` | Historique des pesées (le poids n'est pas un champ du profil) |
| `settings` | `'app'` | Confidentialité et verrouillage (empreinte du code, jamais le code) |
| `drafts` | texte | Brouillons de formulaires (configuration interrompue) |

### Repositories

L'interface n'accède jamais directement à Dexie : elle passe par `src/data/repositories/*`. Chaque opération :

- convertit toute erreur en `StorageError` (`quota`, `unavailable`, `version`, `integrity`, `conflict`, `unknown`) avec un message en français ;
- s'exécute en transaction quand plusieurs tables sont touchées (profil + première pesée : tout ou rien) ;
- vérifie la structure des enregistrements relus (`domain/profile/integrity.ts`).

La création du profil utilise `add` (et non `put`) : une nouvelle configuration ne peut jamais écraser un profil existant.

### Migrations

`src/data/schema.ts` contient l'historique des versions. Règles :

1. ne jamais modifier une version publiée : en ajouter une nouvelle ;
2. une migration (`upgrade`) s'exécute en transaction : si elle échoue, tout est annulé et les données restent intactes (testé) ;
3. chaque migration a un test qui part de données de la version précédente.

Dexie 4 ouvre sans erreur une base créée par une version **plus récente** de l'application. `openDatabase()` le détecte (version IndexedDB réelle / 10) et affiche « Mise à jour nécessaire » au lieu de laisser une ancienne version en cache écrire dans un format inconnu.

### Conservation

Après la configuration, l'application demande `navigator.storage.persist()`. Les Réglages affichent l'état réel (conservation garantie, espace utilisé, installation sur l'écran d'accueil).

## Verrouillage local

- Code de 6 à 128 caractères ; seule une empreinte **PBKDF2-SHA256, 600 000 itérations, sel aléatoire de 16 octets** est stockée. Comparaison en temps constant.
- 4 essais libres, puis délai de 30 s doublé à chaque erreur (15 min max), mémorisé dans la base.
- Verrouillé au démarrage et après un passage en arrière-plan (délai réglable).
- **C'est un verrouillage visuel, pas un chiffrement** : il masque l'interface, les données restent en clair dans IndexedDB. Le chiffrement arrive avec les sauvegardes (étape 9).
- Code oublié : il n'est récupérable par personne ; seule option, effacer toutes les données.

## Navigation

Routage par hash (`#/calendrier`) avec React Router. Il fonctionne sur un hébergement statique (GitHub Pages) et hors ligne. `RootGate` redirige vers `#/bienvenue` tant qu'aucun profil n'existe. La modification du profil prévient avant de quitter un formulaire modifié (`useBlocker`).

## PWA

- `vite-plugin-pwa` génère le manifeste et un service worker Workbox qui met en cache tous les fichiers de l'application.
- Mise à jour en mode **prompt** : la nouvelle version n'est activée qu'après accord (bannière « Mettre à jour »).
- Les chemins sont relatifs à `BASE_PATH` (`/vyro/` sur GitHub Pages, `/` en local).

## Tests

- **Unitaires** (`src/**/*.test.ts(x)`, Vitest + jsdom + fake-indexeddb) : validation, migrations, persistance après réouverture, quota dépassé, intégrité, verrouillage, parcours d'interface complets.
- **Interface** (`e2e/`, Playwright, build de production, émulation iPhone) : configuration, persistance après fermeture, reprise d'un brouillon, modification, verrouillage, effacement, hors ligne, absence de requêtes vers des serveurs tiers.
