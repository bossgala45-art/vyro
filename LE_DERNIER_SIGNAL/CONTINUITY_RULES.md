# CONTINUITY RULES — LE DERNIER SIGNAL

La continuité est une **priorité absolue** (D-017). Ce document fixe ce qui est suivi, où, et comment le vérifier.

---

## 1. Principes fondamentaux

1. **Rien de validé ne change sans accord.** Toute modification d'un élément `[VALIDÉ]` est signalée, discutée, puis consignée dans `DECISIONS_LOG.md`.
2. **Signaler avant de poursuivre.** Dès qu'une incohérence est repérée (dans un texte, une fiche, un prompt ou une prise décrite par l'équipe), le travail sur l'élément concerné s'arrête jusqu'à décision.
3. **Ne rien inventer.** Une information de continuité manquante est marquée `[À DÉFINIR]` et posée dans `13_journal_decisions/QUESTIONS_OUVERTES.md`.
4. **Une seule source par information.** Chaque fait de continuité a un emplacement de référence (tableau §2). Les autres fichiers y renvoient au lieu de le recopier.
5. **L'IA ne garantit rien.** Références et descriptions canoniques réduisent les écarts ; chaque prise est contrôlée par un humain avant validation.
6. **Anomalie voulue ≠ erreur.** Le monde d'Adrien est une reconstruction imparfaite : certaines anomalies sont des indices narratifs. Seules celles inscrites dans `05_continuite/ANOMALIES_INTENTIONNELLES.md` sont permises. Toute autre anomalie est une **erreur de continuité**, même si elle « pourrait passer » pour un indice.

---

## 2. Ce qui est suivi, et où

| Dimension | Ce qu'on suit | Emplacement de référence |
|---|---|---|
| Apparence des personnages | Visage, cheveux, barbe, morphologie, âge apparent | `02_personnages/<NOM>.md` + `12_references_visuelles/personnages/` |
| Vêtements | Tenue portée par scène, état (mouillé, froissé, taché…) | `02_personnages/<NOM>.md` § Tenues + registre par plan |
| Blessures / marques | Apparition, emplacement exact, évolution | `02_personnages/<NOM>.md` § États physiques |
| État émotionnel | État en début et fin de scène, évolution | Fiche de scène + registre par plan |
| Accessoires | Présence, état, qui le tient, main utilisée | `04_accessoires/REGISTRE_ACCESSOIRES.md` |
| Position des objets | Emplacement dans le décor, déplacements | `04_accessoires/REGISTRE_ACCESSOIRES.md` + fiche décor |
| Téléphone | Position, état (sonne / décroché / raccroché), heure affichée éventuelle | `04_accessoires/REGISTRE_ACCESSOIRES.md` |
| Disposition des décors | Géographie des pièces, orientation de la fenêtre, axes | `03_decors/<DECOR>.md` (plan schématique) |
| Heure dans l'histoire | Heure diégétique par scène, horloges visibles | `05_continuite/CHRONOLOGIE.md` |
| Météo | Pluie, intensité, traces d'eau sur la vitre | Fiche décor + `05_continuite/CHRONOLOGIE.md` |
| Lumière | Sources, couleur, direction, intensité | Fiche décor + fiche de plan |
| Informations révélées | Ce que le spectateur sait à chaque scène | `05_continuite/REVELATIONS_SPECTATEUR.md` |
| Événements / chronologie | Ordre réel des faits vs ordre du récit | `05_continuite/CHRONOLOGIE.md` |
| Caméra | Axe, côté de la règle des 180°, hauteur, focale indicative | Fiche de plan (`06_storyboard_decoupage/`) |
| Anomalies voulues | Indices de la reconstruction | `05_continuite/ANOMALIES_INTENTIONNELLES.md` |

Le **registre de continuité par plan** (`05_continuite/REGISTRE_PAR_PLAN.md`, créé au moment du découpage) récapitule, plan par plan, l'état de toutes ces dimensions.

---

## 3. Règles spécifiques au film

- **02:17** (D-009) : toute apparition de l'heure 02:17 (horloge, écran, téléphone, dialogue) est consignée dans `CHRONOLOGIE.md`. Aucune autre heure affichée à l'écran ne doit apparaître par hasard : toute horloge visible doit avoir une heure décidée.
- **Textes à l'écran** (écrans du laboratoire, ordinateur, téléphone) : les outils de génération vidéo produisent souvent des textes illisibles ou faux. Par défaut, tout texte devant être lu par le spectateur est prévu en **incrustation en postproduction** `[PROPOSITION]`, et noté dans la fiche de plan.
- **Pluie nocturne** dans l'appartement (D-012) : son intensité et la présence de gouttes sur la vitre doivent être constantes à l'intérieur d'une même scène.
- **Téléphone sans câble visible** (D-014) : aucun câble ne doit apparaître dans un plan. Un câble visible est une erreur, sauf décision contraire consignée. Le cordon visible sur la vignette 4 de la planche de l'appartement est une erreur de génération : cette vignette ne fait pas référence pour le téléphone (D-021).
- **Un seul téléphone canonique** : le téléphone visible sur la console de la planche du laboratoire est un artefact. Il ne doit pas être reproduit (D-022).
- **Spatialisation des décors** : les plans au sol des planches de l'appartement et du laboratoire ne font pas référence (D-023, D-024). La géographie des décors s'appuie sur les vues photographiques, et toute correction géométrique est soumise à validation.
- **Léa** : seuls son visage, ses cheveux, son apparence générale et sa tenue de référence sont repris de sa planche. Les vignettes 8 à 10 ne sont pas des scènes du film (D-025).
- **Palettes** : appartement bleu-gris avec faibles lumières chaudes (D-012) ; laboratoire gris acier, bleu froid, noir et blanc (D-013). Une couleur hors palette doit être justifiée et consignée.
- **Pas de futurisme exagéré** (D-007) : tout élément technologique visible doit rester crédible pour 2049 réaliste.

---

## 4. Procédure de contrôle

### Avant d'écrire une fiche de plan ou un prompt
1. Relire la fiche de scène, la fiche du plan précédent et celle du plan suivant.
2. Vérifier dans le registre : tenue, accessoires, position du téléphone, heure, météo, lumière, état émotionnel, informations déjà révélées.
3. Vérifier que le plan ne révèle pas une information prévue plus tard (`REVELATIONS_SPECTATEUR.md`).
4. Lister les références visuelles à joindre.

### Après chaque génération (rempli par l'équipe, vérifié par Claude)
1. L'équipe décrit la prise dans la fiche de génération (et dépose si possible une ou deux captures fixes).
2. Contrôle point par point avec la grille ci-dessous.
3. Verdict : `VALIDÉE`, `À REFAIRE` (motif), `RÉCUPÉRABLE EN POST` (correction prévue).

### Grille de contrôle d'une prise
- [ ] Visage et cheveux conformes à la référence
- [ ] Tenue conforme à la scène (couleur, pièces, état)
- [ ] Blessures / marques conformes
- [ ] Accessoires présents, à la bonne place, dans la bonne main
- [ ] Décor conforme (géographie, fenêtre, lampadaire, mobilier)
- [ ] Lumière et palette conformes
- [ ] Météo conforme
- [ ] Heure / horloges conformes ou absentes
- [ ] Axe caméra cohérent avec les plans voisins (180°)
- [ ] Émotion et jeu conformes à l'intention
- [ ] Aucune anomalie non consignée (déformations, objets apparus/disparus, textes parasites)
- [ ] Aucune information révélée trop tôt

---

## 5. Gestion d'une incohérence

1. La décrire précisément (fichier, scène, plan, nature).
2. L'inscrire dans `13_journal_decisions/QUESTIONS_OUVERTES.md` avec le statut `[BLOQUÉ]` pour les éléments concernés.
3. Proposer une ou plusieurs solutions, sans en appliquer aucune.
4. Après décision de l'équipe : consigner dans `DECISIONS_LOG.md` et corriger tous les fichiers concernés.
