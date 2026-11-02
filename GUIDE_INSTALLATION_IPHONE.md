# Installer VYRO sur iPhone

VYRO est une application web installable (PWA) : elle s'installe depuis Safari, sans App Store, et fonctionne ensuite comme une app, même sans réseau.

**Adresse : https://bossgala45-art.github.io/vyro/**

Recommandé : iOS 16 ou plus récent, avec Safari. Les parcours principaux sont testés automatiquement sur WebKit (le moteur de Safari) avec l'émulation d'un iPhone 15 Pro ; la vérification finale reste à faire sur ton iPhone.

## 1. Installer

1. Ouvre **Safari** (pas Chrome, pas l'aperçu intégré d'une autre app) et va sur l'adresse ci-dessus. N'utilise pas la navigation privée : les données y sont effacées à la fermeture.
2. Touche le bouton **Partager** (le carré avec une flèche vers le haut).
3. Fais défiler et touche **Sur l'écran d'accueil** (selon la version d'iOS : « Ajouter à l'écran d'accueil »), puis **Ajouter**.
4. Ouvre VYRO **depuis son icône** sur l'écran d'accueil : l'app s'affiche en plein écran.

**Pourquoi installer ?** Ouvert dans Safari sans être installé, un site peut voir ses données effacées par iOS après 7 jours sans visite. Installée, l'app garde ses données et fonctionne hors ligne.

## 2. Premier lancement (5 minutes)

1. **Configuration** en 5 étapes : identité, objectif, entraînement (matériel, durée de séance), alimentation, récapitulatif.
2. **Séances** → « Indiquer mes disponibilités » (jours et horaires possibles pour la salle), puis « Générer mon programme ».
3. **Calendrier** → ajoute tes entraînements et matchs de basket (récurrents chaque semaine si besoin).
4. **Plus → Réglages** :
   - **Stockage** : touche « Demander la conservation » si proposé (Safari peut refuser ; l'installation reste la meilleure protection) ;
   - **Verrouillage par code** (facultatif) : code d'au moins 6 caractères ;
   - **Sauvegardes** → « Sauvegarder ou restaurer » : fais une **première sauvegarde chiffrée** et range-la dans Fichiers (iCloud Drive).

## 3. Mises à jour

Quand une nouvelle version est publiée, une bannière **« Nouvelle version de VYRO disponible »** apparaît. Touche **Mettre à jour** au moment qui t'arrange (jamais en pleine séance) : tes données ne sont pas touchées. Si la bannière n'apparaît pas, ferme complètement VYRO (balayage vers le haut dans le sélecteur d'apps) puis rouvre-le.

## 4. Sauvegarder et changer d'iPhone

- **Sauvegarder** : Plus → Réglages → Sauvegarder ou restaurer → choisis une phrase secrète (au moins 12 caractères, par exemple 4 mots) → **Créer la sauvegarde** → « Enregistrer dans Fichiers ». **Note la phrase secrète** : sans elle, la sauvegarde est illisible, et personne ne peut la retrouver.
- **Restaurer** (nouvel iPhone, ou après un effacement) : installe VYRO, fais la configuration rapide, puis Réglages → Sauvegarder ou restaurer → **Choisir le fichier de sauvegarde** → phrase secrète → vérifie l'aperçu → **Remplacer par la sauvegarde** → tape « RESTAURER ».
- Le coach te rappelle de sauvegarder après une semaine d'utilisation, puis tous les 30 jours.

## 5. Hors ligne

Après le premier lancement, VYRO fonctionne sans réseau : un bandeau « Hors ligne : tout fonctionne » le signale. Seule la récupération d'une mise à jour demande une connexion.

## 6. Problèmes fréquents

| Problème | Solution |
|---|---|
| « Sur l'écran d'accueil » n'apparaît pas | Ouvre l'adresse dans Safari (pas dans une autre app), hors navigation privée |
| L'app demande de refaire la configuration | Les données ont été effacées (navigation privée, effacement de l'historique Safari, manque d'espace). Restaure ta dernière sauvegarde |
| « Mise à jour nécessaire » | Les données viennent d'une version plus récente : ferme et rouvre VYRO avec du réseau pour récupérer la mise à jour |
| « Espace de stockage insuffisant » | Libère de l'espace sur l'iPhone (Réglages iOS → Général → Stockage) ; rien n'a été enregistré à moitié |
| Code de verrouillage oublié | Le code ne peut pas être récupéré : « Code oublié ? » efface les données, puis restaure ta sauvegarde |
| Phrase secrète de sauvegarde oubliée | Impossible de lire cette sauvegarde. Crée-en une nouvelle depuis l'app |

## 7. Publier VYRO (déploiement HTTPS)

La version de production est déjà publiée automatiquement :

1. Chaque fusion d'une Pull Request dans `main` lance GitHub Actions (onglet **Actions** du dépôt) :
   - **Vérifier** : types, lint, tests unitaires, build, tests de bout en bout (Chromium) ;
   - **Compatibilité Safari (WebKit)** : parcours principaux sur WebKit ;
   - **Publier sur GitHub Pages** : construit l'app pour `/vyro/` et la publie, seulement si les deux vérifications réussissent.
2. GitHub Pages sert l'app en **HTTPS** (obligatoire pour l'installation, le service worker et le chiffrement).

Si GitHub Pages devait être réactivé : `github.com/bossgala45-art/vyro` → **Settings** → **Pages** → *Build and deployment* → **Source : GitHub Actions** (dans Safari, « Aa » → « Voir la version ordinateur » si le menu Settings n'apparaît pas).

**Autre hébergeur HTTPS** (Netlify, Cloudflare Pages, Vercel…) : commande de build `npm ci && npm run build`, dossier publié `dist`. Si l'app est servie à la racine d'un domaine, rien à changer ; dans un sous-dossier, définir `BASE_PATH=/sous-dossier/` au moment du build. Aucune variable secrète n'est nécessaire. Attention : changer d'adresse revient à installer une nouvelle app (les données sont liées à l'adresse) — passe par une sauvegarde puis une restauration.
