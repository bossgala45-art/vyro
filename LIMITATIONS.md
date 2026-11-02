# Limitations de VYRO 1.0

Classement honnête de ce que fait VYRO. Rien de ce qui est listé comme « futur » ou « impossible » n'est simulé dans l'application : l'interface l'indique quand une fonction n'est pas disponible.

## 1. Fonctionnalités opérationnelles

| Domaine | Ce qui fonctionne |
|---|---|
| Profil | Configuration en 5 étapes avec reprise d'un brouillon, modification par section, historique des pesées |
| Musculation | Programme généré selon le matériel et la durée, sans développé couché libre non assisté ; mouvement impossible signalé plutôt qu'inventé ; programme modifiable ; séance en direct (séries, RIR, minuteur de repos, douleur) ; reprise après fermeture ; double progression prudente ; historique ; records réels |
| Calendrier | Activités ponctuelles et hebdomadaires, annulation/report d'une occurrence, vacances, planning adaptatif expliqué (matchs, veille de match, fatigue, disponibilités), pas de rattrapage, changements signalés, suivi des matchs, export .ics |
| Récupération | Check-in, décision explicable à 5 niveaux, exercices retirés selon la zone douloureuse, repères réglables, historique 14 jours, effet sur le planning |
| Nutrition | Journal sans calories, goûts (aimés, tolérés, refusés), idées de repas filtrées, conseils des jours de sport, repère de protéines indicatif, hydratation et habitudes |
| Transformation | Poids et 4 mensurations, graphique interactif et tableau, photos locales réduites, chronologie, zoom, suppression, comparaison avant/après |
| Coach | Messages fondés sur des événements réels, 10 questions guidées, objectifs hebdomadaires, bilans de 14 jours, journal de motivation |
| Sécurité | Verrouillage visuel par code (empreinte PBKDF2), masquage en arrière-plan, sauvegarde chiffrée et restauration contrôlée, effacement complet, aucune connexion vers un autre site (CSP) |
| PWA | Installation sur l'écran d'accueil, fonctionnement hors ligne, mises à jour proposées, demande de stockage persistant |

## 2. Fonctionnalités partiellement opérationnelles

| Fonctionnalité | Limite |
|---|---|
| Rappels d'hydratation | Affichés dans VYRO **quand l'app est ouverte**. Pour être prévenu app fermée : export vers le Calendrier de l'iPhone (événements répétés avec alerte) |
| Minuteur de repos | Juste au retour dans l'app (il se base sur l'heure de fin), mais **aucune alerte** n'est envoyée si l'app est en arrière-plan |
| Export vers le Calendrier | Fichier .ics ajouté à la main : **pas de synchronisation** ; réexporter après un changement (iOS peut dupliquer ou mettre à jour les événements selon la version) |
| Questions libres au coach | Reconnues par **mots-clés** seulement ; les autres questions reçoivent « Je ne sais pas répondre à cette question » |
| Verrouillage par code | **Visuel** : masque l'interface, ne chiffre pas les données stockées (le chiffrement d'iOS les protège quand l'iPhone est verrouillé) |
| Masquage en arrière-plan | iOS peut capturer l'aperçu du sélecteur d'apps avant le masquage |
| Visionneuse de photos | Zoom par boutons ou double toucher, puis glisser ; pas de zoom à deux doigts |
| Conservation des données | Dépend de Safari : installer l'app sur l'écran d'accueil et faire des sauvegardes. VYRO demande un stockage persistant, Safari peut refuser |
| Programme | Limité par le matériel déclaré : un mouvement sans exercice possible est signalé, pas remplacé par un exercice inventé |
| Compatibilité Safari | Testée sur WebKit (moteur de Safari) avec l'émulation d'un iPhone, pas sur un iPhone réel : la validation finale se fait sur l'appareil |

## 3. Fonctionnalités futures nécessitant un service externe

Les interfaces sont préparées et **désactivées** ; aucun résultat n'est simulé.

| Fonctionnalité | Service nécessaire | État dans VYRO |
|---|---|---|
| Coach par IA générative | Backend VYRO appelant un fournisseur d'IA (clé côté serveur) | `CoachProvider` prêt, « Aucune IA connectée » affiché |
| Reconnaissance des aliments sur photo | Service d'analyse d'image via un backend | Interface `imageAnalysis` désactivée ; la photo illustre la saisie |
| Analyse visuelle des photos de progression | Fournisseur réel, avec accord par photo | Interface `visualAnalysis` désactivée |
| Notifications iPhone app fermée | Serveur Web Push (iOS 16.4+, app installée) | Non utilisé ; alternatives : Calendrier et rappels dans l'app |
| Synchronisation multi-appareils | Serveur de synchronisation chiffrée | Remplacée par l'export/restauration chiffrés manuels |
| Synchronisation automatique du calendrier | Abonnement CalDAV/ICS hébergé | Export .ics manuel |

## 4. Fonctionnalités impossibles dans cette version PWA

- **Face ID / Touch ID** pour déverrouiller l'app (non accessibles à une app web).
- **Apple Santé (HealthKit)**, **Apple Watch**, capteurs de fréquence cardiaque.
- **Widgets** iOS, **raccourcis Siri**, **Live Activities**.
- **Notifications locales programmées** sans serveur, et tâches en arrière-plan.
- **Écriture directe dans le Calendrier** de l'iPhone (seul l'import d'un fichier .ics est possible).
- **Chiffrement matériel** des données via la Secure Enclave.
- **Distribution sur l'App Store** (ce serait une app native, hors du périmètre).

## Avertissements

- Les repères de récupération, d'hydratation et de protéines sont **généraux et prudents**, pas des avis médicaux ou diététiques.
- VYRO ne pose aucun diagnostic. En cas de douleur persistante, consulte un professionnel de santé.
