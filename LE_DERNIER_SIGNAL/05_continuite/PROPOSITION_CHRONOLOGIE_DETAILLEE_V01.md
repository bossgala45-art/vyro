# PROPOSITION DE CHRONOLOGIE DÉTAILLÉE — V01

Statut : `[PROPOSITION]` — **document de travail, non validé**, à l'exception des éléments marqués `[ÉTABLI]`, qui reprennent des décisions validées (principalement D-028).
Date : 2026-11-26. Remplace, pour le détail, la partie non retenue de `PROPOSITION_CHRONOLOGIE.md` (P-008), qui reste conservée pour mémoire.

Rien de ce document n'entre dans `CHRONOLOGIE.md` (registre officiel) tant qu'il n'a pas été validé ligne par ligne.

---

## 0. Conventions

### Repères relatifs (aucune date exacte)
| Repère | Définition | Statut |
|---|---|---|
| **T0** | La nuit de l'accident et de la disparition de Léa, **en 2049, à 02:17** | `[ÉTABLI]` D-009, D-028 |
| **R** | Le début de l'histoire principale (acte I), **environ six mois après T0** | `[ÉTABLI]` D-028 |
| T0 − x / T0 + x | Avant / après l'accident, durée x | Notation |

### Statuts utilisés
| Statut | Sens |
|---|---|
| `[ÉTABLI]` | Décision validée (D-xxx) ou déduction arithmétique directe de décisions validées |
| `[SOURCE V01]` | Présent dans `01_scenario/sources/BASE_NARRATIVE_SIX_ACTES_V01.md` (numéro de ligne « l. »). C'est une **source de travail non définitive** : l'événement est attesté, mais pas validé. |
| `[POSITION INCONNUE]` | L'événement doit être placé dans le temps, mais rien ne permet encore de le faire |
| `[HYPOTHÈSE]` | Proposition ou lecture possible, **non validée** |
| `[CONTRADICTION]` | Deux éléments du projet ne peuvent pas être vrais ensemble sans arbitrage |

### Sources
Canon validé (`DECISIONS_LOG.md`) · base narrative V01 (S3) · `PROPOSITION_CHRONOLOGIE.md` (P-008, pour les éléments non retenus par D-028).

---

## 1. Éléments déjà établis

### 1.1 Décisions validées
| ID | Élément | Réf. |
|---|---|---|
| E-01 | L'accident expérimental et la disparition de Léa se produisent **en 2049** | D-028 |
| E-02 | Ils ont lieu à **02:17**, heure centrale de la chronologie | D-009 |
| E-03 | L'histoire principale se déroule **environ six mois** après cet événement | D-028 |
| E-04 | L'histoire principale se situe en **2049** | D-004 |
| E-05 | Adrien a **28 ans** dans l'histoire principale | D-010, D-028 |
| E-06 | Léa avait **25 ans au moment de sa disparition** | D-011, D-028 |
| E-07 | Le laboratoire est **abandonné depuis quelques mois** au moment de l'histoire principale | D-013, D-028 |
| E-08 | Adrien a utilisé **clandestinement** un système expérimental pour reconstruire un environnement où retrouver Léa, ce qui place cet usage **après T0** | D-008 |
| E-09 | Le récit est structuré en **six actes** | D-020 |

### 1.2 Contraintes déduites des décisions validées (arithmétique, sans nouvelle décision)
| ID | Déduction | Calcul |
|---|---|---|
| K-01 | T0 et R étant tous deux en 2049 avec environ six mois d'écart, **T0 se situe approximativement dans la première moitié de 2049** et **R dans la seconde moitié**. | E-01 + E-03 + E-04. « Environ » laisse une marge de quelques semaines. |
| K-02 | À T0, Adrien avait **27 ou 28 ans**, selon la date de son anniversaire (inconnue). | 28 ans à R, R ≈ T0 + 6 mois |
| K-03 | **Léa est nécessairement la cadette.** L'écart d'âge est compris entre environ **1 an et demi et 3 ans et demi**, selon les anniversaires. | Adrien : entre 27,5 et 28,5 ans à T0 ; Léa : entre 25 et 26 ans à T0 |
| K-04 | À R, Léa aurait eu 25 ou 26 ans. | 25 ans à T0, + 6 mois |
| K-05 | L'abandon du laboratoire a commencé **entre T0 et R**. Sa durée (« quelques mois ») ne peut pas dépasser l'écart T0–R, d'environ six mois. | E-03 + E-07 |
| K-06 | La reconstruction, et donc les sessions, ont commencé **après T0** et **avant R**. | E-08 + S3 l. 161 |

---

## 2. Chronologie préliminaire

### 2.1 Avant T0
| Ordre | Événement | Position | Statut | Source |
|---|---|---|---|---|
| A-1 | Adrien est lié au laboratoire (il possède un « ancien badge de laboratoire ») | Avant T0, durée inconnue | `[SOURCE V01]` · `[POSITION INCONNUE]` | l. 99 |
| A-2 | Léa et Adrien travaillent sur « leur expérience » | Avant T0, début et durée inconnus | `[SOURCE V01]` · `[POSITION INCONNUE]` | l. 201 |
| A-3 | Enregistrement de la vidéo de Léa vue à l'acte III | Avant T0 (Léa disparaît à T0), moment inconnu | `[SOURCE V01]` · `[POSITION INCONNUE]` | l. 101–105 |
| A-4 | Enregistrements de la voix de Léa, conservés | Avant T0, moment inconnu | `[SOURCE V01]` · `[POSITION INCONNUE]` | l. 195 |
| A-5 | Photographie(s) de Léa | Avant T0, moment inconnu | `[SOURCE V01]` · `[POSITION INCONNUE]` | l. 89, 99 |
| A-6 | Échange entre Léa et Adrien sur le contrôle de l'expérience (flashback) | Avant T0 ou nuit de T0 : inconnu | `[SOURCE V01]` · `[POSITION INCONNUE]` | l. 203–213 |

### 2.2 T0 — 2049, 02:17
| Ordre | Événement | Statut | Source |
|---|---|---|---|
| T-1 | Accident expérimental | `[ÉTABLI]` | D-008, D-009, D-028 |
| T-2 | Disparition de Léa, âgée de 25 ans | `[ÉTABLI]` | D-011, D-028 |
| T-3 | L'expérience se déstabilise, une alarme retentit, Léa « est prise dans l'événement et disparaît » | `[SOURCE V01]` (nature précise non validée) | l. 215–221 |
| T-4 | Adrien était présent et aurait « appuyé sur le bouton » (selon la voix) | `[SOURCE V01]` (rôle exact non validé, Q-008) | l. 125–127 |

### 2.3 Entre T0 et R (≈ six mois)
| Ordre | Événement | Position | Statut | Source |
|---|---|---|---|---|
| B-1 | Début de l'abandon du laboratoire | Entre T0 et R (K-05) ; moment exact inconnu | `[ÉTABLI]` pour l'état à R · `[POSITION INCONNUE]` pour le début | D-028 |
| B-2 | Adrien reconstruit un environnement, ainsi que Léa, à partir de données et de souvenirs | Après T0 (K-06) ; moment inconnu | `[ÉTABLI]` (principe, D-008) · `[SOURCE V01]` (détail) | l. 161 |
| B-3 | Première session de la reconstruction | Après B-2, avant R | `[POSITION INCONNUE]` | — |
| B-4 | Sessions successives ; Adrien « recommence toujours » ; au moins une session numérotée « 07 » | Entre B-3 et R ; nombre et rythme inconnus | `[SOURCE V01]` · `[POSITION INCONNUE]` | l. 31, 147, 171, 235 |
| B-5 | Adrien « a refusé de quitter cette session » | Après B-3, avant B-6 | `[SOURCE V01]` · `[POSITION INCONNUE]` | l. 167 |
| B-6 | Enregistrement de la vidéo d'Adrien « à l'extérieur de la reconstruction », « épuisée et blessée » | Après B-5 (la vidéo y fait référence), avant l'acte IV ; moment inconnu | `[SOURCE V01]` · `[POSITION INCONNUE]` | l. 149–171 |
| B-7 | Cause et moment des blessures de l'Adrien de la vidéo | Inconnus | `[POSITION INCONNUE]` | l. 151 |

### 2.4 Histoire principale — à partir de R (≈ T0 + 6 mois, 2049)

Seules les heures écrites dans la source sont reportées. Les durées sont les minutages indicatifs de S3.

| Acte | Minutage | Heure diégétique connue | Lumière / météo | Lieu | Repères temporels de l'acte | Statut | Questions |
|---|---|---|---|---|---|---|---|
| I — The Noise | 0:00–3:00 | **02:17** : premier appel (l. 33) ; accident voiture / lampadaire juste après (l. 43) | Nuit pluvieuse (l. 23) | Appartement ; vue sur la rue | Début de R. Texte « SESSION 07 — SYNCHRONISATION INCOMPLÈTE » (l. 31) | `[SOURCE V01]` | Q-041 |
| II — The Proofs | 3:00–6:30 | **Inconnue** pour chaque appel | Non précisée | Appartement | « Les appels se poursuivent » (l. 63) ; trois prédictions réalisées (l. 67–71) | `[SOURCE V01]` · `[POSITION INCONNUE]` | Q-036 |
| III — Absence | 6:30–10:00 | **02:17** : la voix revient (l. 109) | Non précisée | Appartement | Même nuit qu'à l'acte I, ou nuit suivante ? | `[SOURCE V01]` · `[POSITION INCONNUE]` | Q-036, Q-038 |
| IV — Laboratory | 10:00–14:30 | **Inconnue** | Non précisée | Laboratoire abandonné (« plusieurs mois », l. 141, compatible avec E-07) | Trajet vers le laboratoire ; texte « PROTOCOLE DE RESTAURATION — SESSION 07 » (l. 147) ; le téléphone sonne (l. 175) | `[SOURCE V01]` · `[POSITION INCONNUE]` | Q-037 |
| V — Truth | 14:30–18:30 | **Inconnue** | Non précisée | Non précisé ; flashback vers T0 ou avant (l. 199–221) | Retour au passé (A-6, T-3) | `[SOURCE V01]` · `[POSITION INCONNUE]` | Q-037 |
| VI — Liberation | 18:30–20:00 | **Lumière du matin** (l. 281), **puis 02:17** (l. 283) | Matin | Non précisé, puis appartement | Fin de la reconstruction (l. 245, 275) ; dernier appel ; écran noir | `[SOURCE V01]` · `[CONTRADICTION]` | Q-035 |

**Durée totale de l'histoire principale en temps diégétique** (une nuit, plusieurs nuits, une boucle) : `[POSITION INCONNUE]`, Q-036.

---

## 3. Événements dont la position temporelle est nécessaire, mais encore inconnue

| ID | Élément à placer | Pourquoi c'est nécessaire | Contrainte connue | Question |
|---|---|---|---|---|
| N-01 | Jour et mois de T0 | Calendriers ou dates visibles, saison du flashback | Première moitié de 2049 environ (K-01) | Q-009 (résolue en partie) → à fixer |
| N-02 | Jour, mois et saison de R | Lumière, météo, costumes, dates visibles | ≈ T0 + 6 mois, seconde moitié de 2049 (K-01) | — |
| N-03 | Dates d'anniversaire, donc écart d'âge exact entre Adrien et Léa | Âge d'Adrien dans le flashback (27 ou 28 ans), dialogues éventuels sur l'âge | Écart entre 1,5 et 3,5 ans environ (K-03) | Q-023 |
| N-04 | Début et durée du travail commun sur l'expérience (A-2) | Arc du flashback ; ancienneté du badge (A-1) | Avant T0 | — |
| N-05 | Début de l'abandon du laboratoire (B-1) | Niveau de dégradation visible | Entre T0 et R (K-05) | — |
| N-06 | Construction de la reconstruction et première session (B-2, B-3) | Logique des sessions | Entre T0 et R (K-06) | Q-024 |
| N-07 | Nombre et rythme des sessions ; sens de « SESSION 07 » (B-4) | Sens de « tu recommences toujours » et de « chaque nuit » | Entre B-3 et R | Q-024, Q-036 |
| N-08 | Enregistrement de la vidéo extérieure d'Adrien et origine de ses blessures (B-6, B-7) | État physique d'Adrien hors de la reconstruction ; décor extérieur | Après B-5, avant l'acte IV | Q-011, Q-040 |
| N-09 | Enregistrement de la vidéo de Léa et des photographies (A-3, A-5) | Apparence de Léa sur ces supports (25 ans ?) | Avant T0 | — |
| N-10 | Période représentée **à l'intérieur** de la reconstruction (date « affichée » dans le monde reconstruit) | Calendriers, écrans, état du laboratoire, présence ou absence de Léa | Voir X-03 | **Q-042** |
| N-11 | Heures des appels des actes II, IV et V | Continuité de l'heure ; règle des appels à 02:17 | « Les appels ont lieu à 02:17 » (l. 299) | Q-036 |
| N-12 | Durée diégétique totale de l'histoire principale | Météo, lumière, tenue d'Adrien d'un acte à l'autre | Commence à R | Q-036 |
| N-13 | Moment du trajet vers le laboratoire (acte IV) et du retour éventuel | Transition des actes III à V | — | Q-037 |
| N-14 | Heure du matin de l'acte VI et du dernier appel | Scène finale | Voir X-01 | Q-035 |

---

## 4. Hypothèses (non validées)

| ID | Hypothèse | Origine | Conséquence si retenue |
|---|---|---|---|
| H-01 | Le laboratoire est fermé dans les jours qui suivent T0 (arrêt du programme, enquête, scellés) | P-008, partie non retenue par D-028 | B-1 ≈ T0 + quelques jours ; dommages de l'accident intacts |
| H-02 | L'abandon du laboratoire a rendu possible l'usage clandestin du système | P-008, conséquence narrative | Relie E-07 et E-08 |
| H-03 | L'histoire principale se déroule en automne | P-008, partie non retenue | Pluie nocturne cohérente ; T0 vers le printemps |
| H-04 | Le flashback de l'acte V montre la nuit même de T0, de l'échange (A-6) jusqu'à la disparition | Lecture de S3 l. 199–221, où les événements s'enchaînent sans rupture indiquée | A-6 placé à T0 |
| H-05 | « SESSION 07 » désigne la septième session | Lecture du libellé | Sept sessions en six mois, à concilier avec « chaque nuit » (X-04) |
| H-06 | Les appels des actes I à III ont lieu au cours d'une même nuit, ou d'une boucle de cette nuit | Lecture possible de S3 | Une seule nuit diégétique, à concilier avec « Les appels ont lieu à 02:17 » (X-02) |
| H-07 | Les appels des actes I à III ont lieu sur des nuits successives | Lecture concurrente de H-06 | Plusieurs nuits : continuité de la météo et des costumes à gérer |

Aucune de ces hypothèses ne crée de circonstance nouvelle concernant l'accident, la disparition, l'expérience ou le fonctionnement de la reconstruction. Elles organisent seulement des éléments déjà présents dans le projet.

---

## 5. Contradictions à résoudre

| ID | Contradiction | Éléments en tension | Question |
|---|---|---|---|
| X-01 | La lumière du matin apparaît, puis le téléphone sonne « à 02:17 » | S3 l. 281 / l. 283 ; D-009 | Q-035 |
| X-02 | « Les appels ont lieu à 02:17 », mais plusieurs appels s'enchaînent à l'acte II, et d'autres ont lieu aux actes IV et V | S3 l. 299 / l. 63, 175, 181 | Q-036 |
| X-03 | **Période représentée par la reconstruction.** S3 dit que la reconstruction enferme Adrien « dans son propre passé » (l. 17), et D-008 qu'elle doit lui permettre de « retrouver Léa ». Or le monde reconstruit des actes I à IV montre un état **postérieur** à T0 : Léa y est absente (seulement en photo et en vidéo), et le laboratoire y est abandonné « depuis plusieurs mois » (l. 141). | S3 l. 17, 89–105, 141 / D-008 | **Q-042** (nouvelle) |
| X-04 | « SESSION 07 » (sept sessions ?) contre « tu recommences toujours » et « chaque nuit » sur environ six mois (≈ 180 nuits) | S3 l. 31, 147, 171, 235 ; D-028 | Q-024, Q-036 |
| X-05 | Le téléphone sonne au laboratoire à la fin de l'acte IV, alors que le seul téléphone canonique est dans l'appartement, et que celui de la console du laboratoire est un artefact à ne pas reproduire | S3 l. 175 / D-014, D-022 | Q-037 |
| X-06 | Adrien répond « Qui ? » après avoir vu une photo puis une vidéo de Léa | S3 l. 89, 101, 117 | Q-038 |
| X-07 | P-008 (option A) affirmait qu'Adrien avait 28 ans **au moment de l'accident**, et que l'écart d'âge de 3 ans était conservé « littéralement ». D-028 ne valide que « Adrien a 28 ans ». Avec environ six mois d'écart, Adrien avait peut-être 27 ans à T0, et l'écart réel peut aller de 1,5 à 3,5 ans. | P-008 §4 / D-028, K-02, K-03 | Q-023 |

---

## 6. Prochaines décisions utiles (pour faire avancer ce document)

1. Q-042 (période représentée par la reconstruction) et Q-036 (une nuit ou plusieurs). Ce sont les deux arbitrages qui structurent toute la chronologie du récit.
2. Q-035 (02:17 au matin) et Q-037 (téléphone au laboratoire).
3. Q-023 (écart d'âge exact), seulement si un dialogue ou un plan l'exige.
4. N-01 et N-02 (dates et saisons), seulement si des dates ou des saisons doivent être visibles à l'écran.
