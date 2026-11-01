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
│   ├── calendar/   Calendrier : occurrences, conflits, moteur d'adaptation, différences,
│   │               export ICS, vacances, suivi du basket
│   ├── recovery/   Récupération : check-in, décision explicable, repères réglables,
│   │               zones douloureuses → exercices, historique
│   ├── nutrition/  Nutrition : catalogue d'aliments, idées de repas filtrées par les goûts,
│   │               conseils du jour, protéines, hydratation et rappels, habitudes,
│   │               interface d'analyse de photo (désactivée)
│   └── progress/   Transformation : séries mesurées, évolution, mensurations, chronologie
│                   et comparaison de photos, interface d'analyse visuelle (désactivée)
├── data/           IndexedDB (Dexie) : schéma versionné, migrations, repositories,
│                   erreurs de stockage, hooks réactifs, maintenance
├── security/       Empreinte du code de verrouillage (PBKDF2 via WebCrypto)
├── media/          Images : décodage, réduction et réencodage JPEG dans le navigateur
├── features/       Un dossier par module (écrans et composants propres)
│   ├── onboarding/ Bienvenue et configuration initiale en 5 étapes
│   ├── profile/    Profil, modification par section, pesées
│   ├── settings/   Confidentialité, verrouillage, stockage, effacement
│   ├── training/   Programme modifiable, séance en direct, historique, records
│   ├── calendar/   Vues semaine/mois, journée, activités, planning habituel, vacances,
│   │               export iPhone, suivi basket
│   ├── recovery/   Check-in, conseil du jour, historique, réglage des repères
│   ├── nutrition/  Journal, hydratation, idées, protéines, habitudes, réglages
│   ├── progress/   Graphiques, mensurations, photos (ajout, chronologie, zoom, comparaison)
│   └── today/ more/ coach/
├── ui/             Composants réutilisables (Screen, Card, Button, champs, dialogues…)
├── pwa/            Service worker : enregistrement et mises à jour
├── styles/         Thème global Tailwind
└── test/           Outils de test partagés (base de test, profil de test)
```

Sens des dépendances : `features → data → domain`, `features → domain`. Le domaine ne dépend de rien d'autre que lui-même.

## Données

### Tables (IndexedDB `vyro`, schéma v6)

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
| `checkIns` (v4) | `date` | Check-in de récupération (un par jour, le dernier remplace le précédent) |
| `meals` (v5) | id, index `date` | Journal alimentaire (texte, portion ressentie, réponses oui/non/inconnu) |
| `mealPhotos` (v5) | id, index `mealId` | Photos de repas réduites (JPEG ≤ 1280 px, `ArrayBuffer`), à part pour garder la liste légère |
| `drinks` (v5) | id, index `date` | Boissons notées (heure locale, ml) |
| `measurements` (v6) | `date` | Tours de bras, poitrine, épaules, taille (cm) ; un tour non mesuré reste `null` |
| `progressPhotos` (v6) | id, index `date`, `pose` | Métadonnées et miniature (360 px) des photos de progression |
| `progressPhotoFiles` (v6) | id | Image complète (1 600 px), lue seulement pour l'affichage ou la comparaison |

`src/data/backupTables.ts` inventorie chaque table et la nature de son contenu (`records`, `binary`, `transient`) pour la sauvegarde chiffrée de l'étape 9 ; un test vérifie qu'aucune table n'est oubliée, photos comprises.

Les repères de récupération (`recovery.thresholds`) et d'hydratation (`nutrition.hydration`) sont stockés dans `settings`, complétés par les valeurs par défaut et remis à zéro s'ils sont incohérents.

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

## Récupération (`src/domain/recovery`)

- **Check-in** (≈ 30 s) : sommeil, énergie et motivation (1–10), courbatures, douleur inhabituelle (zones, intensité), temps disponible, notes. Une question sans réponse reste `null` : rien n'est deviné.
- **Contexte réel** (`context.ts`) : match aujourd'hui / demain / hier (avec l'intensité notée), séances de basket des 3 derniers jours, dernière séance de musculation et sa difficulté, séance déjà faite aujourd'hui, séance envisagée (jambes ou non, durée estimée).
- **Décision** (`engine.ts`) : `normal`, `adapted` (version allégée), `light` (activité légère, pas de musculation), `rest`, ou `need-info` (questions listées). Chaque signal est affiché avec son effet. **Aucune note de forme** n'est calculée : elle donnerait une fausse précision et pourrait passer pour un diagnostic.
- **Douleur inhabituelle** : jamais de séance intense sur la zone. Les exercices qui la sollicitent (`zones.ts`, correspondance volontairement large) sont retirés de la séance du jour, sans remplacement. Douleur ≥ repère → repos ; jambes douloureuses avant un match ou zone non précisée → activité légère. Conseil de consulter si la douleur persiste.
- **Lien avec le calendrier** : un check-in « repos » ou « activité légère » retire la séance du jour du planning (avec la raison) ; « adaptée » la marque en version allégée. Sans effet si une séance a déjà été faite ce jour-là.

### Repères de récupération (réglables, non médicaux)

| Repère | Défaut | Effet |
|---|---|---|
| Nuit courte | < 6,5 h | séance allégée |
| Nuit très courte | < 5 h | activité légère |
| Énergie basse | ≤ 4/10 | séance allégée |
| Énergie très basse | ≤ 2/10 | activité légère |
| Motivation basse | ≤ 3/10 | simple remarque, ne réduit pas la séance |
| Douleur : repos | ≥ 6/10 | repos conseillé |
| Basket chargé | ≥ 3 séances en 3 jours | séance allégée |
| Match intense (veille) | ≥ 8/10 | séance allégée |
| Séance de la veille très dure | ≥ 9/10 | séance allégée |
| Temps minimal | < 30 min | activité légère |
| Signaux cumulés | ≥ 3 | activité légère |

Jour de match ou séance déjà faite : repos (pas de musculation), même sans check-in.

## Nutrition et hydratation (`src/domain/nutrition`)

Principes : suivi simple, **sans comptage de calories**, conseils généraux et prudents, jamais de régime restrictif ni de quantité imposée.

- **Journal** : moment, pris ou sauté, description libre (obligatoire si pris, même avec photo), portion ressentie (petite / normale / grande / inconnue), source de protéines et fruit/légume (oui / non / inconnu). Une réponse inconnue reste `null` : elle n'est jamais convertie en quantité ni comptée comme « non ».
- **Goûts** (`foods.ts`) : les listes du profil sont reconnues sans tenir compte des accents, articles et pluriels simples, et par famille (« poisson » → thon, sardines, maquereau). Un **refus l'emporte toujours**. Les saisies non reconnues sont affichées comme « non prises en compte ».
- **Idées de repas** (`meals.ts`) : 16 idées bon marché, chacune faite d'éléments interchangeables. Un élément refusé est remplacé par une alternative ; un élément facultatif refusé est retiré (et signalé) ; si un élément indispensable n'a que des refus, l'idée n'est pas proposée. Tri par aliments aimés. Aucun aliment refusé ne peut apparaître (testé pour tous les moments).
- **Conseils du jour** (`advice.ts`) : tirés du calendrier réel (match et son horaire, entraînements, séance de musculation prévue ou faite, veille de match). Les heures conseillées (« vers 12 h 00 ») ne sont calculées que si l'horaire de l'activité est connu.
- **Protéines** : repère général 1,2–2 g/kg/jour (prise de position ACSM / Academy of Nutrition and Dietetics / Dietitians of Canada, 2016), affiché à titre indicatif avec la dernière pesée ; sources économiques filtrées par les goûts.
- **Habitudes** (`habits.ts`) : calculées uniquement sur les saisies ; un jour sans boisson notée est « non renseigné », pas « 0 ml ».

### Hydratation

| Réglage | Défaut | Source / raison |
|---|---|---|
| Repère quotidien | 2 000 ml | EFSA (2010) : 2,5 L d'eau/jour pour un homme adulte, dont ~20 % par les aliments |
| Par séance de sport | + 500 ml (2 séances max.) | ordre de grandeur prudent ; varie avec la chaleur et l'intensité |
| Verre | 250 ml | ajout rapide |
| Rappels | désactivés ; 9 h–21 h, toutes les 2 h | |

Rappels : une PWA iOS ne peut pas programmer de notification locale sans serveur de push. VYRO affiche donc un rappel **dans l'application** (si rien n'a été noté depuis l'intervalle, dans la plage horaire, repère non atteint) et propose d'**exporter les rappels vers le Calendrier** (événements répétés chaque jour en heure locale flottante, avec alerte : ils sonnent app fermée et restent à la même heure après un changement d'heure).

### Photos

Réduites dans le navigateur (plus grand côté 1 280 px, JPEG qualité 0,82) avant stockage, enregistrées dans la même transaction que le repas (espace plein → rien n'est modifié), supprimées définitivement avec le repas. Elles ne sont jamais envoyées. Elles seront incluses dans la sauvegarde chiffrée (étape 9).

`imageAnalysis.ts` définit l'interface d'un futur service d'analyse : **désactivée** tant qu'aucun fournisseur réel n'est connecté ; l'analyse passera par un serveur (aucune clé dans l'app) et ne produira que des propositions à valider.

## Transformation physique (`src/domain/progress`)

- **Mesures** : poids (table `bodyWeights` existante) et tours de bras, poitrine, épaules, taille. Une seule valeur par jour et par mesure ; une valeur absente n'est **jamais interpolée**.
- **Graphique** (`ui/LineChart.tsx`, SVG sans dépendance) : une série à la fois, points réellement mesurés reliés par un trait, période 1 / 3 / 6 mois ou tout. Toucher le graphique ou utiliser les flèches du clavier affiche la valeur du point le plus proche. Un tableau « Voir les valeurs » reprend tous les points.
- **Évolution** : écart entre la première et la dernière mesure de la période, affiché seulement avec au moins deux mesures. **Aucune** estimation de masse grasse, de masse musculaire ni de « score de transformation ».
- **Photos** : pose (face, profil, dos), date choisie (import de photos anciennes possible), conseils de prise de vue, dernière photo de la même pose montrée comme repère de cadrage, rappel « photo du mois ». Chronologie par mois, visionneuse avec zoom (1× à 4×) et suppression définitive (une photo ou toutes, avec confirmation écrite).
- **Comparaison avant/après** : côte à côte, même pose, deux dates au choix. Les mesures affichées sont celles prises à 7 jours au plus de chaque photo ; sinon « — ».
- **Images** (`media/image.ts`) : décodées puis réencodées en JPEG dans le navigateur (1 600 px qualité 0,85 + miniature 360 px qualité 0,72). Le réencodage retire les métadonnées d'origine (position GPS…). Miniature et image complète sont enregistrées dans une seule transaction : si l'espace est plein, rien n'est enregistré.
- **Analyse visuelle** (`visualAnalysis.ts`) : interface prévue pour un futur fournisseur, **désactivée** tant qu'aucun n'est connecté. L'analyse passerait par un serveur VYRO (aucune clé dans l'app), avec un accord explicite pour chaque photo envoyée.

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

- **Unitaires** (`src/**/*.test.ts(x)`, Vitest + jsdom + fake-indexeddb ; `src/test/realm.ts` corrige un artefact de jsdom sur les données binaires) : validation, migrations, persistance après réouverture, quota dépassé, intégrité, verrouillage, parcours d'interface complets.
- **Interface** (`e2e/`, Playwright, build de production, émulation iPhone) : configuration, persistance après fermeture, reprise d'un brouillon, modification, verrouillage, effacement, hors ligne, absence de requêtes vers des serveurs tiers.
