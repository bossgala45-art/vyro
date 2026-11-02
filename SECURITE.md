# Sécurité de VYRO

VYRO est une application web installable (PWA). Ce document décrit ce qu'elle protège réellement, comment, et les limites propres aux applications web sur iPhone. Rien ici n'est exagéré : quand une protection n'existe pas, c'est écrit.

## Principes

- **Aucun serveur VYRO, aucun compte.** Les données ne quittent l'iPhone que si l'utilisateur exporte lui-même une sauvegarde (fichier chiffré) ou un fichier calendrier (.ics).
- **Aucune requête vers un autre site.** La politique de sécurité du contenu (CSP) de la version publiée interdit toute connexion hors de l'origine de l'app (`connect-src 'self'`), y compris pour un éventuel code injecté. Un test de bout en bout vérifie qu'une requête externe est bloquée, et un autre qu'aucune requête externe n'est faite pendant l'utilisation.
- **Aucun secret dans l'application.** Pas de clé d'API, pas d'IA distante. Les interfaces prévues pour une IA future (coach, analyse de photos) passeraient par un serveur dédié qui garderait la clé ; elles sont désactivées.
- **Aucun mot de passe en clair.** Ni le code de verrouillage ni la phrase secrète des sauvegardes ne sont enregistrés.

## Données sur l'iPhone

Les données sont stockées dans IndexedDB, dans l'espace réservé au site par Safari.

- **Elles ne sont pas chiffrées par VYRO.** iOS chiffre le stockage de l'appareil (Protection des données) : quand l'iPhone est verrouillé par son code, les données sont protégées par ce chiffrement système. Une fois l'iPhone déverrouillé, une app web n'a aucun moyen de garder ses propres données chiffrées sans redemander un secret à chaque ouverture.
- **Pourquoi pas de chiffrement « maison » au repos** : la clé devrait venir d'un secret saisi par l'utilisateur. Un code court (6 chiffres) se casse en quelques minutes hors ligne, même avec PBKDF2. Une phrase longue demandée à chaque ouverture rendrait l'app pénible à utiliser au quotidien, et l'oubli de cette phrase ferait perdre toutes les données. Pour une app de sport personnelle, VYRO s'appuie donc sur le chiffrement d'iOS et sur le code de l'iPhone, et chiffre ce qui sort de l'appareil (les sauvegardes).
- **Effacement** : « Effacer toutes mes données » supprime la base entière (photos comprises). Les sauvegardes exportées ne sont pas touchées : c'est à l'utilisateur de les supprimer de là où il les a rangées.

## Verrouillage par code

- C'est un **verrouillage visuel** : il masque l'interface tant que le code n'est pas saisi, à l'ouverture et après une absence. Les données restent lisibles par quelqu'un qui aurait accès au stockage du navigateur (par exemple via un ordinateur et les outils de développement de Safari sur un iPhone déverrouillé).
- Le code n'est jamais enregistré : seule une empreinte PBKDF2-HMAC-SHA256 (600 000 itérations, sel aléatoire de 16 octets) l'est, comparée en temps constant.
- Après 4 erreurs, un délai croissant est imposé (30 s, puis doublé, jusqu'à 15 min).
- **Face ID n'est pas accessible** à une application web.
- Le masquage en arrière-plan peut ne pas couvrir l'aperçu capturé par iOS dans le sélecteur d'apps.

## Sauvegardes chiffrées

Format `.vyro` (version 1), voir `src/security/backupCrypto.ts` et `src/backup/container.ts`.

| Élément | Choix |
|---|---|
| Dérivation de clé | PBKDF2-HMAC-SHA256, 600 000 itérations (recommandation OWASP 2023), sel aléatoire de 16 octets |
| Chiffrement | AES-256-GCM, IV aléatoire de 12 octets, en-tête authentifié (données associées) |
| Phrase secrète | 12 caractères au minimum, variée ; jamais enregistrée |
| Clé | objet WebCrypto non exportable, jamais enregistré |
| Mauvaise phrase / fichier abîmé | distingués grâce à un témoin dérivé (empreinte SHA-256 de 256 bits dérivés en plus de la clé) |
| Intégrité | toute modification (contenu ou en-tête) est détectée par GCM ; le contenu déchiffré est ensuite vérifié par les mêmes contrôles d'intégrité que l'app |
| Contenu | toutes les tables, images comprises (`src/data/backupTables.ts`, testé) ; pas les brouillons de formulaire |
| Versions | version du format dans l'en-tête ; version du schéma des données dans le contenu. Une sauvegarde plus ancienne est migrée par les vraies migrations de l'app ; une plus récente est refusée |

**Restauration contrôlée.** La sauvegarde est déchiffrée et chargée dans une base temporaire, migrée et vérifiée, puis son contenu est affiché (nombre d'éléments par catégorie, comparé à l'iPhone). Rien n'est remplacé avant la confirmation (taper « RESTAURER »). Le remplacement se fait en une seule transaction : en cas d'erreur (espace plein…), les données actuelles restent intactes. Le code de verrouillage de l'appareil est conservé (celui de la sauvegarde n'est pas repris).

**Limites.**

- Une sauvegarde peut être attaquée hors ligne : sa sécurité dépend de la phrase secrète. 4 mots choisis au hasard donnent une bonne marge ; un mot du dictionnaire non.
- La date de création et la version de VYRO sont lisibles sans la phrase secrète (en-tête). Le nom du fichier contient la date.
- Si la phrase secrète est oubliée, la sauvegarde est perdue : il n'existe aucune porte dérobée.

## Limites propres aux applications web sur iPhone

- **Effacement automatique par Safari.** Pour un site ouvert dans Safari, iOS peut effacer les données après 7 jours sans visite, ou en cas de manque d'espace. **Installer VYRO sur l'écran d'accueil** évite la règle des 7 jours ; VYRO demande aussi un stockage persistant (Réglages → Stockage affiche la réponse réelle). Les sauvegardes restent la seule protection contre une perte de données.
- **Code exécuté dans le navigateur.** L'app est servie par GitHub Pages en HTTPS. Une compromission du dépôt ou de l'hébergement pourrait livrer un code modifié : c'est inhérent à toute app web. Le service worker garde la version installée, et une mise à jour n'est activée qu'avec l'accord de l'utilisateur.
- **Dépendances.** Le code utilise des bibliothèques open source (React, Dexie…) figées par `package-lock.json` ; elles sont regroupées dans l'app au moment du build, sans chargement depuis un CDN. Audit `npm audit` (audit final) : **0 vulnérabilité dans les dépendances livrées** (`npm audit --omit=dev`). Les alertes restantes (gravité faible ou modérée, principalement `minimatch`) concernent uniquement les outils de développement (lint, génération du service worker), qui ne sont pas livrés dans l'app et ne traitent que les fichiers du projet ; les corriger demanderait des changements de version majeurs de ces outils.
- **Secrets.** Le build de production a été inspecté : aucune clé ni jeton, et les seules adresses présentes sont des liens de documentation internes aux bibliothèques (jamais appelés).
- **Notifications.** Sans serveur d'envoi (Web Push), une app web ne peut pas notifier quand elle est fermée. VYRO n'en a pas, pour que rien ne sorte de l'iPhone. Les rappels fonctionnent dans l'app et via les alertes du Calendrier (fichiers .ics exportés).
- **Partage de fichiers.** Les sauvegardes et fichiers calendrier passent par la feuille de partage d'iOS : VYRO ne sait pas où l'utilisateur les envoie (iCloud Drive, AirDrop, messagerie…). Une sauvegarde reste chiffrée où qu'elle aille ; un fichier .ics, lui, est en clair (séances et horaires).
- **Photos.** Elles sont réduites et réencodées dans le navigateur, ce qui retire leurs métadonnées (position GPS…). Elles ne sont jamais envoyées.

## Signaler un problème

Le projet est public : un problème de sécurité peut être signalé dans les issues du dépôt GitHub, sans y joindre de données personnelles ni de sauvegarde.
