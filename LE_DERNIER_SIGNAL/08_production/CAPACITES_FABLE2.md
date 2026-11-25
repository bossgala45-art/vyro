# CAPACITÉS DE FABLE 2 — Liste de vérification

Statut : `[À VÉRIFIER]` — **aucune capacité n'est supposée.** Répond à Q-003.

Cette liste est à remplir **par l'équipe**, en consultant directement l'interface de Fable 2 (et sa documentation officielle si elle existe). Claude Code n'a pas accès à Fable 2 et ne remplit aucune case « Constaté ».

Le workflow de génération ne sera élaboré qu'une fois cette liste remplie.

## Comment remplir
- **Constaté** : ce que vous avez vu dans l'interface ou obtenu en test. Mettre « non trouvé » si l'option n'apparaît pas. Ne rien déduire.
- **Source** : `interface` (vu dans l'écran), `test` (essayé), `doc` (documentation officielle), `autre` (préciser).
- **Preuve** : capture d'écran dans `08_production/TESTS/interface/`, nommée `AAAA-MM-JJ_<sujet>.png`.
- Noter la **date** et la **version** de Fable 2 : les capacités d'un outil changent.

| Champ | Valeur |
|---|---|
| Date de vérification | |
| Vérifié par | |
| Version / offre de Fable 2 | |
| Type d'abonnement | |

---

## 1. Modèles

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 1.1 | Quels modèles ou modes de génération sont proposés (noms exacts) ? | | | |
| 1.2 | Différences annoncées entre eux (qualité, vitesse, coût, durée) | | | |
| 1.3 | Modes disponibles : texte → vidéo ; image → vidéo ; vidéo → vidéo ; autres | | | |
| 1.4 | Le modèle utilisé est-il affiché sur chaque génération (traçabilité) ? | | | |

## 2. Durée

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 2.1 | Durée maximale d'une génération, par modèle | | | |
| 2.2 | Durées proposées (choix fixes ou libres) | | | |
| 2.3 | Prolongation d'un clip existant possible ? Jusqu'à quelle durée totale ? | | | |

## 3. Images de référence

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 3.1 | Peut-on joindre une image de référence ? | | | |
| 3.2 | **Nombre maximal** de références par génération | | | |
| 3.3 | Rôles possibles d'une image : première image, dernière image, référence de style, de personnage, de décor, d'objet | | | |
| 3.4 | Formats et tailles d'image acceptés | | | |
| 3.5 | Les références peuvent-elles être enregistrées et réutilisées (bibliothèque) ? | | | |

## 4. Référence de personnages

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 4.1 | Existe-t-il une fonction dédiée « personnage » (création d'un personnage persistant) ? | | | |
| 4.2 | Combien de personnages distincts dans un même plan ? | | | |
| 4.3 | Faut-il un portrait, une planche, plusieurs vues ? | | | |
| 4.4 | Restrictions sur les visages photoréalistes (modération, conditions d'utilisation) | | | |

## 5. Référence de décors

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 5.1 | Fonction dédiée « décor / environnement » ? | | | |
| 5.2 | Peut-on combiner une référence de décor **et** une référence de personnage dans la même génération ? | | | |

## 6. Résolution et format

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 6.1 | Résolutions de sortie disponibles (720p, 1080p, 4K…) | | | |
| 6.2 | Ratio 16:9 disponible ? Autres ratios ? | | | |
| 6.3 | Agrandissement (upscale) intégré ? | | | |
| 6.4 | Format et codec d'export (MP4, MOV, débit) | | | |

## 7. Fréquence d'images

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 7.1 | Cadence de sortie (24, 25, 30 images/s…) | | | |
| 7.2 | La cadence est-elle réglable ? | | | |
| 7.3 | Mesure réelle sur un fichier exporté (propriétés du fichier) | | | |

## 8. Audio

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 8.1 | Génère-t-il du son ? (ambiance, bruitages, musique) | | | |
| 8.2 | Génère-t-il des dialogues ? En quelles langues ? | | | |
| 8.3 | Synchronisation labiale à partir d'un audio fourni ? | | | |
| 8.4 | Peut-on désactiver l'audio ? | | | |

## 9. Coût et crédits

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 9.1 | Coût d'une génération, selon le modèle, la durée et la résolution | | | |
| 9.2 | Crédits inclus dans l'abonnement, renouvellement | | | |
| 9.3 | Les générations ratées ou annulées sont-elles décomptées ? | | | |
| 9.4 | Nombre de variantes produites par génération | | | |

## 10. Contrôle caméra

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 10.1 | Commandes de caméra dédiées (travelling, panoramique, zoom, orbite, caméra fixe) ? | | | |
| 10.2 | Ou uniquement par le texte du prompt ? | | | |
| 10.3 | Contrôle de l'intensité ou de la vitesse du mouvement | | | |
| 10.4 | Réglages d'objectif (focale, profondeur de champ) | | | |

## 11. Montage et enchaînement

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 11.1 | Première image / dernière image imposées (pour raccorder deux plans) | | | |
| 11.2 | Continuer un clip à partir de sa dernière image | | | |
| 11.3 | Outil de montage ou de séquence intégré | | | |
| 11.4 | Modification d'une zone d'un clip (retouche locale) | | | |

## 12. Autres points utiles

| # | À vérifier | Constaté | Source | Preuve |
|---|---|---|---|---|
| 12.1 | Longueur maximale du prompt ; langue recommandée (français ou anglais) | | | |
| 12.2 | Consignes négatives (« à éviter ») acceptées ? | | | |
| 12.3 | Graine (seed) affichée ou réglable, pour reproduire une génération | | | |
| 12.4 | Historique des générations : prompt et réglages conservés ? | | | |
| 12.5 | Durée de conservation des fichiers sur la plateforme | | | |
| 12.6 | Droits d'usage des vidéos (usage commercial, diffusion, festival) ; mentions obligatoires | | | |
| 12.7 | Rendu des textes à l'écran (lisibilité) | | | |

---

## Après remplissage

Claude proposera, à partir de **vos constats uniquement** :
1. la durée type des plans et l'estimation du nombre de plans pour ≈ 20 min ;
2. le mode d'usage des références (qui joindre, combien, dans quel rôle) ;
3. le protocole des tests techniques (identité d'Adrien et de Léa, décor, pluie, mouvements de caméra) ;
4. le workflow de génération définitif.
