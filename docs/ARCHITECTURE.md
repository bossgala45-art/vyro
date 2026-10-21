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
│   ├── settings/   Modèle des réglages, délais après essais ratés
│   ├── training/   Moteur de musculation : exercices, programme, rotation, progression,
│   │               échauffement, records, séances
│   └── calendar/   Calendrier : occurrences, conflits, moteur d'adaptation, différences,
│                   export ICS, vacances, suivi du basket
├── data/           IndexedDB (Dexie) : schéma versionné, migrations, repositories,
│                   erreurs de stockage, hooks réactifs, maintenance
├── security/       Empreinte du code de verrouillage (PBKDF2 via WebCrypto)
├── features/       Un dossier par module (écrans et composants propres)
│   ├── onboarding/ Bienvenue et configuration initiale en 5 étapes
│   ├── profile/    Profil, modification par section, pesées
│   ├── settings/   Confidentialité, verrouillage, stockage, effacement
│   ├── training/   Programme modifiable, séance en direct, historique, records
│   ├── calendar/   Vues semaine/mois, journée, activités, planning habituel, vacances,
│   │               export iPhone, suivi basket
│   └── today/ progress/ more/ recovery/ nutrition/ coach/
├── ui/             Composants réutilisables (Screen, Card, Button, champs, dialogues…)
├── pwa/            Service worker : enregistrement et mises à jour
├── styles/         Thème global Tailwind
└── test/           Outils de test partagés (base de test, profil de test)
```

Sens des dépendances : `features → data → domain`, `features → domain`. Le domaine ne dépend de rien d'autre que lui-même.

## Données

### Tables (IndexedDB `vyro`, schéma v3)

| Table | Clé | Contenu |
|---|---|---|
| `profile` | `'me'` | Profil unique : identité, objectif, préférences d'entraînement et d'aliments |
| `bodyWeights` | auto, index `date` | Historique des pesées (le poids n'est pas un champ du profil) |
| `settings` | `'app'` | Confidentialité et verrouillage (empreinte du code, jamais le code) |
| `drafts` | texte | Brouillons de formulaires (configuration interrompue) |
| ~~`routine`~~ (v2, supprimée en v3) | | Semaine type de l'étape 3, convertie en calendrier |
| `programs` (v2) | id, index `createdAt` | Programmes ; un seul actif, les anciens sont conservés |
| `workouts` (v2) | id, index `date`, `status`, `programId` | Séances (en cours, terminées, abandonnées) |
| `activities` (v3) | id, index `kind`, `date` | Activités ponctuelles ou hebdomadaires (entraînement, match, autre) |
| `exceptions` (v3) | id, index `activityId`, `date` | Occurrence annulée ou reportée |
| `vacations` (v3) | id, index `start` | Périodes de vacances confirmées |
| `dayOverrides` (v3) | `date` | Repos, salle indisponible, créneau du jour, fatigue |
| `planning` (v3) | `'me'` | Créneaux habituels de salle, 3e séance facultative |
| `activityLogs` (v3) | id d'occurrence, index `date`, `kind` | Suivi des matchs et entraînements (intensité, statistiques) |
| `planSnapshots` (v3) | `weekStart` | Dernier planning vu, pour expliquer ce qui a changé |

La migration v2 → v3 convertit la semaine type : jours de salle → créneaux sans horaire, jours de basket et de match → activités hebdomadaires **sans horaire** (aucun horaire inventé).

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

## Moteur de musculation (`src/domain/training`)

Fonctions pures et déterministes, toutes testées. Chaque décision est accompagnée d'une explication affichée.

- **Bibliothèque** (`exercises.ts`) : 37 exercices à identifiants stables, avec muscles, matériel, sollicitation des jambes, incrément de charge, consignes de technique et de sécurité.
- **Programme** (`program.ts`) : séances A et B « corps complet » + C facultative sans jambes. Choix des exercices selon le matériel, les exercices à éviter (texte libre) ou aimés, et l'exclusion du développé couché libre. Volume selon l'expérience ; exercices accessoires retirés pour tenir dans la durée maximale. Mouvement impossible à couvrir → avertissement, jamais d'exercice inventé. Aucune charge de départ inventée.
- **Planning** (`schedule.ts`) : jamais de séance un jour de match ni de séance jambes la veille ; 48 h entre deux séances si possible ; lendemain de match et jours de basket évités. Sans disponibilités, rien n'est planifié. Semaine trop chargée → moins de séances, jamais de séance plus lourde. Séance manquée → ni rattrapage ni surcharge, la rotation A/B reprend.
- **Progression** (`progression.ts`) : double progression (répétitions puis plus petit incrément de charge). Aucune hausse après une douleur (réduction de 10 %), une séance allégée, une série à l'échec, une séance notée 9/10 ou plus, une séance incomplète, ou sans répétitions en réserve renseignées. Deux séances sous la fourchette → −5 %. Reprise après 14 jours → −10 %, après 28 jours → −20 %. Aucune charge maximale testée ni estimée.
- **Conseil avant séance** : jour de match ou douleur → repos conseillé ; veille de match (séance jambes) ou fatigue → version allégée conseillée. L'utilisateur décide.
- **Échauffement** (`warmup.ts`) : cardio léger, mobilité ciblée, séries d'approche à ~50 % et ~75 % de la charge de travail.
- **Records** (`records.ts`) : charge la plus lourde, plus de répétitions, meilleur tonnage — uniquement à partir des séries enregistrées.

Chaque saisie d'une séance en cours est enregistrée immédiatement ; une seule séance peut être en cours à la fois.

## Calendrier et moteur d'adaptation (`src/domain/calendar`)

- **Heures locales « murales »** (HH:MM, sans fuseau) : 18:00 reste 18:00 après un changement d'heure. La conversion en instant UTC n'est faite qu'à l'export ICS, avec les règles de fuseau de l'appareil (testé : Europe/Paris aux deux changements d'heure, New York).
- **Occurrences** (`occurrences.ts`) : une activité hebdomadaire produit une occurrence par semaine dans sa période de validité. Une exception annule ou reporte une seule occurrence, qui garde son identifiant (le suivi y reste attaché). Les vacances **suspendent** le basket sans l'effacer.
- **Modification d'une habitude** (`edit.ts`) : changer le jour ou l'horaire d'une série déjà commencée arrête l'ancienne série hier et en démarre une nouvelle aujourd'hui : le passé n'est jamais réécrit.
- **Conflits** : chevauchements entre activités ayant un horaire ; sans horaire, VYRO le signale au lieu de supposer.
- **Moteur d'adaptation** (`planner.ts`, `weekly.ts`) : recalcule les séances à venir à partir du calendrier réel, sans toucher à l'historique.
  - Règles strictes : salle disponible (pas repos, pas vacances sans salle, pas indisponible), jamais un jour de match, jamais de jambes la veille d'un match (y compris d'une semaine sur l'autre), assez de temps libre hors basket (marge de 30 min).
  - Préférences : 48 h entre séances, éviter le lendemain de match (davantage s'il a été intense), les jours de basket et de fatigue.
  - Fatigue déclarée ou match intense la veille (≥ 8/10) → version allégée conseillée. Temps disponible inférieur à la durée estimée mais ≥ minimum → séance placée avec la consigne de passer les derniers accessoires.
  - Sans disponibilités : rien n'est planifié. Semaine trop chargée : moins de séances, jamais de surcharge.
  - Chaque jour exclu a sa raison affichée.
- **Changements visibles** (`diff.ts`) : le dernier planning vu est mémorisé par semaine ; toute différence pour les séances à venir (déplacée, retirée, ajoutée, horaire, allègement) est affichée avec sa raison jusqu'à « J'ai compris ».
- **Export ICS** (`ics.ts`, `export.ts`) : RFC 5545 (CRLF, échappement, lignes de 75 octets, UID stables, rappel VALARM optionnel). Fichier partagé via la feuille de partage iOS, ou téléchargé. Pas de synchronisation automatique avec le Calendrier Apple.

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
