# QUESTIONS OUVERTES — LE DERNIER SIGNAL

Informations manquantes, ambiguïtés et incohérences potentielles. Aucune ne doit être tranchée sans l'équipe.
Quand une question est résolue : noter la réponse, la date, et l'ID de la décision créée dans `DECISIONS_LOG.md`.

Priorité : **P1** bloque la suite immédiate · **P2** nécessaire avant le séquencier/scénario · **P3** nécessaire avant production/post.

Ouverte le 2026-11-25.

---

## A. Production et technique

| ID | Prio | Question | Pourquoi c'est important | Statut |
|---|---|---|---|---|
| Q-001 | P1 | Acceptez-vous que le film vive dans `LE_DERNIER_SIGNAL/` à l'intérieur du dépôt `vyro` (qui contient une application de coaching sportif) ? Ou préférez-vous un dossier local / dépôt dédié ? | Le dossier actuel n'est pas dédié au film. Le dossier est autonome et déplaçable tel quel. | `[EN COURS]` — structure globalement validée (D-019) ; emplacement à confirmer avec Q-026 |
| Q-002 | P1 | Où sont les références visuelles validées (Adrien, planche Léa, planche appartement, planche laboratoire) ? Pouvez-vous les déposer dans `12_references_visuelles/` ? Avec quel outil ont-elles été créées, et avec quels prompts ? | Elles doivent servir de références d'identité (D-016) ; aucun prompt fiable ne peut être préparé sans elles. Je ne les ai pas vues. | `[EN COURS]` — emplacements et modes d'emploi prêts (`12_references_visuelles/`) ; **aucune image déposée** au 2026-11-25. Attendus : portrait maître et planche d'Adrien, planche de Léa, planche de l'appartement, planche du laboratoire. |
| Q-003 | P1 | Quelles sont les capacités réelles de Fable 2 : durée maximale d'un clip ; résolution (4K ?) ; cadence (24 fps ?) ; ratio 16:9 ; image de référence / image vers vidéo ; image de début et de fin ; références multiples (personnage + décor) ; génération audio ou dialogues ; synchronisation labiale ; coût / quota de générations ? | Détermine la durée des plans, leur nombre (ordre de grandeur pour 20 min : plusieurs centaines de secondes à couvrir, donc probablement plus d'une centaine de plans — à recalculer), et la méthode de continuité. Je ne connais pas ces limites avec certitude. | `[EN COURS]` — liste de vérification à remplir par l'équipe : `08_production/CAPACITES_FABLE2.md` |
| Q-004 | P1 | Existe-t-il déjà un synopsis, un traitement, un séquencier ou un brouillon de scénario ? | Rien n'est présent dans le dossier. Je ne veux ni réécrire ni réinventer un texte existant. | `[EN COURS]` — une base en six actes existe (D-020), mais seuls les titres sont dans le projet. Déposer le texte dans `01_scenario/sources/`. Inventaire : `01_scenario/INVENTAIRE_SCENARISTIQUE.md` |
| Q-022 | P1 | Adrien a **deux** références annoncées (portrait maître et planche). D-016 mentionnait une référence « créée ». Les deux sont-elles **validées** ? Montrent-elles exactement le même visage et la même tenue ? | Une référence non validée ne peut pas servir de référence d'identité. | `[OUVERTE]` |
| Q-026 | P1 | La structure est « globalement validée » (D-019). Les propositions P-001 (emplacement dans `vyro`), P-003 (nomenclature), P-004 (vidéos hors git), P-005 (registre des anomalies), P-006 (statuts) et P-007 (blocs canoniques) sont-elles validées aussi ? | Je ne les applique en production qu'après accord explicite. | `[OUVERTE]` |
| Q-005 | P2 | Langue des dialogues ? Qui fait les voix (comédiens, voix de synthèse, voix générées par Fable 2) ? Voix d'Adrien et de Léa à fixer comment ? | Impacte l'écriture, le découpage (plans face caméra ou non), et la postproduction son. | `[OUVERTE]` |
| Q-017 | P3 | Musique : composition originale, musique générée par IA, bibliothèque sous licence ? | Droits et organisation de la post. | `[OUVERTE]` |
| Q-018 | P3 | Logiciel de montage et d'étalonnage utilisé ? | Structure du dossier `10_montage/`, formats d'export. | `[OUVERTE]` |
| Q-019 | P3 | Diffusion prévue (festival, plateforme vidéo, usage privé) ? Mentions d'usage de l'IA à prévoir ? | Droits, générique, conditions d'utilisation des outils. | `[OUVERTE]` |
| Q-020 | P3 | Langue et contenu des textes visibles à l'écran (interfaces, écrans du laboratoire, téléphone) ? Accord pour les incruster en postproduction plutôt que de les générer ? | Les générateurs vidéo rendent mal les textes lisibles. | `[OUVERTE]` |
| Q-021 | P3 | Si Fable 2 ne produit pas nativement en 4K et/ou en 24 fps : acceptez-vous un agrandissement (upscale) et/ou une conversion de cadence en post ? | D-006 pose 4K et 24 fps comme cibles conditionnelles. | `[OUVERTE]` |

## B. Narration (à traiter dans la bible — ne rien fixer sans validation)

| ID | Prio | Question | Pourquoi c'est important | Statut |
|---|---|---|---|---|
| Q-006 | P2 | Qui émet réellement les appels « apparemment » venus du futur d'Adrien ? (Le concept dit « apparemment » : la réponse est volontairement ouverte.) | Moteur du récit ; détermine ce que la voix sait et peut dire. | `[OUVERTE]` |
| Q-007 | P2 | Le film établit-il ce qu'est devenue Léa (décès, perte, état indéterminé) ou reste-t-il sur le mot « disparition » ? | Conditionne la révélation finale et le ton du deuil. Pour l'instant, tous les documents disent « disparition ». | `[OUVERTE]` |
| Q-008 | P2 | Quel est exactement le rôle d'Adrien dans l'accident ? | C'est une révélation du film (D-008) ; elle doit être préparée par des indices cohérents. | `[OUVERTE]` |
| Q-009 | P2 | Chronologie absolue : 2049 est-elle l'année du présent du film, de l'accident, ou des deux ? Combien de temps s'est écoulé depuis l'accident ? Léa a-t-elle 25 ans au moment de l'accident ? | **Incohérence potentielle** : le laboratoire est décrit « abandonné » en 2049 avec des dommages liés à l'accident, ce qui suggère du temps écoulé ; or Adrien a 28 ans et Léa 25. Il faut fixer à quel moment ces âges s'appliquent. **Analyse du 2026-11-25** : l'écart d'âge Adrien/Léa vaut environ 3 − Δ ans (Δ = temps entre l'accident et le récit). Un abandon de plusieurs années est incompatible avec les âges validés. | `[EN COURS]` — proposition P-008 (option A recommandée) : `05_continuite/PROPOSITION_CHRONOLOGIE.md` |
| Q-010 | P2 | Le laboratoire que l'on voit est-il le lieu réel, une partie de la reconstruction, ou les deux selon les scènes ? | Impacte la grammaire visuelle (réel vs reconstruit) et la continuité des dommages. | `[OUVERTE]` |
| Q-011 | P2 | Où se trouve physiquement Adrien pendant la reconstruction ? | Peut nécessiter un décor ou un état physique supplémentaire. | `[OUVERTE]` |
| Q-012 | P2 | Le téléphone « ancien sans câble visible » est-il un indice voulu (un appareil qui ne devrait pas pouvoir sonner) ? Quel type précis (cadran rotatif, clavier à touches, combiné posé sur base) ? | S'il s'agit d'un indice, il doit entrer dans le registre des anomalies intentionnelles ; sinon, fixer le modèle pour la continuité. Pas de référence dédiée connue. | `[EN COURS]` — fiche objet proposée (P-010, option T2 recommandée) : `04_accessoires/FICHE_TELEPHONE.md`. La question de l'indice narratif reste ouverte (bible). |
| Q-013 | P2 | La pluie nocturne est-elle constante dans toutes les scènes d'appartement (motif de boucle), ou seulement dans certaines ? Y a-t-il des scènes de jour ? | Continuité météo et lumière. | `[OUVERTE]` |
| Q-014 | P2 | Forme de la fin (« libération ») : Adrien met-il lui-même fin à la reconstruction ? Que voit-on après ? | Toute la structure dramatique en dépend. | `[OUVERTE]` |
| Q-015 | P2 | Y a-t-il d'autres personnages (à l'écran ou en voix) : chercheurs, proches, voix du téléphone ? | Nouvelles fiches et nouvelles références à créer. | `[OUVERTE]` |
| Q-016 | P2 | La tenue validée d'Adrien dit « sweat **ou** hoodie » : lequel fixe-t-on (à aligner sur sa référence) ? Adrien porte-t-il la même tenue tout le film (possible motif de boucle) ? Léa porte-t-elle toujours le pull beige ? Dans quels lieux et sous quelle forme apparaît-elle (présence physique, souvenir, image, voix) ? | Continuité costumes et nombre de références à préparer. | `[EN COURS]` — 1re partie couverte par P-009 (sweat à capuche), en attente de validation. Le reste est ouvert. |
| Q-023 | P2 | Léa est-elle explicitement la **cadette** d'Adrien, avec un écart de **3 ans** ? | Si oui, seule l'option A de P-008 tient sans modifier de canon. | `[OUVERTE]` |
| Q-024 | P2 | Une seule reconstruction ou plusieurs tentatives ? Le temps vécu dans la reconstruction diffère-t-il du temps réel (boucle, nuits répétées) ? Que recrée-t-elle : le présent, ou la période d'avant l'accident ? | Le concept dit « une reconstruction », le message du 2026-11-25 dit « les reconstructions ». Cela détermine la chronologie interne. | `[OUVERTE]` |
| Q-025 | P2 | Les titres d'acte en anglais (*The Noise*… *Liberation*) sont-ils des titres de travail ou des cartons affichés à l'écran ? En quelle langue ? | Film et documents en français ; si les titres sont affichés, ils sont à incruster en post. | `[OUVERTE]` |

---

## Questions résolues

Aucune à ce jour.
