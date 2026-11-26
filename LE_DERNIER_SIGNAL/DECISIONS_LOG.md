# DECISIONS LOG — LE DERNIER SIGNAL

Journal de toutes les décisions artistiques et techniques du film.

## Règles du journal
- On **ajoute**, on ne supprime jamais. Une décision modifiée reçoit une nouvelle entrée qui **remplace** l'ancienne (champ « Remplace »), et l'ancienne passe en `[REMPLACÉ PAR D-xxx]`.
- Chaque décision a un identifiant unique : `D-###` pour une décision validée, `P-###` pour une proposition en attente.
- Une proposition acceptée devient une décision `D-###` ; la proposition est alors marquée `[ACCEPTÉE → D-xxx]`.
- Source : qui a pris ou proposé la décision (Équipe, Claude).
- Les décisions D-001 à D-018 ont été validées par l'équipe **avant** l'ouverture de ce journal ; elles y sont consignées le 2026-11-25.

---

## A. Décisions validées

| ID | Consignée le | Catégorie | Décision | Source | Remplace |
|---|---|---|---|---|---|
| D-001 | 2026-11-25 | Identité | Titre : **LE DERNIER SIGNAL** | Équipe | — |
| D-002 | 2026-11-25 | Identité | Durée cible : environ 20 minutes | Équipe | — |
| D-003 | 2026-11-25 | Identité | Genre : science-fiction, thriller psychologique, drame | Équipe | — |
| D-004 | 2026-11-25 | Monde | Époque : 2049 | Équipe | — |
| D-005 | 2026-11-25 | Style | Photoréalisme cinématographique, SF réaliste, ambiance mystérieuse, émotion, tension, parfois oppressante | Équipe | — |
| D-006 | 2026-11-25 | Technique | Format cible 16:9 ; idéalement 4K si les outils le permettent ; 24 fps si disponible | Équipe | — |
| D-007 | 2026-11-25 | Direction artistique | Cinéma réaliste, mouvements de caméra réfléchis, éclairage crédible, décors cohérents, grain subtil, aucune esthétique futuriste exagérée | Équipe | — |
| D-008 | 2026-11-25 | Narration | Concept narratif (voir `MASTER_PROJECT.md` §4) : appels apparemment venus du futur d'Adrien ; environnement = reconstruction imparfaite de souvenirs et de données ; accident expérimental ayant provoqué la disparition de Léa ; usage clandestin du système par Adrien ; reconstruction devenue prison psychologique et temporelle ; communications visant à lui faire comprendre l'accident, son rôle et la nécessité d'y mettre fin. Mouvement : mystère, suspense, émotion, révélation, libération. Le récit reste cohérent même quand le spectateur ne comprend pas tout de suite. | Équipe | — |
| D-009 | 2026-11-25 | Narration / Chronologie | **02:17** = heure de l'accident original, élément central de la chronologie | Équipe | — |
| D-010 | 2026-11-25 | Personnage | Adrien : apparence, tenue principale et personnalité (voir `02_personnages/ADRIEN.md`) | Équipe | — |
| D-011 | 2026-11-25 | Personnage | Léa : apparence, tenue principale et personnalité (voir `02_personnages/LEA.md`) | Équipe | — |
| D-012 | 2026-11-25 | Décor | Appartement d'Adrien (voir `03_decors/APPARTEMENT_ADRIEN.md`) | Équipe | — |
| D-013 | 2026-11-25 | Décor | Laboratoire expérimental abandonné (voir `03_decors/LABORATOIRE.md`) | Équipe | — |
| D-014 | 2026-11-25 | Accessoire | Téléphone noir ancien, sans câble visible, posé sur une petite table de l'appartement | Équipe | — |
| D-015 | 2026-11-25 | Technique | Génération vidéo avec Fable 2. Claude Code organise et prépare, sans intégration automatique supposée avec Fable 2 | Équipe | — |
| D-016 | 2026-11-25 | Références | Référence visuelle d'Adrien créée ; planche de Léa créée et validée ; planche de l'appartement créée et validée ; planche du laboratoire créée et validée. À utiliser comme références d'identité pour les prompts. (Fichiers pas encore présents dans le dossier : Q-002) | Équipe | — |
| D-017 | 2026-11-25 | Méthode | Continuité = priorité absolue. Aucune décision validée modifiée sans signalement et accord. Toute incohérence signalée avant de poursuivre. Ne jamais prétendre que les références garantissent la cohérence. | Équipe | — |
| D-018 | 2026-11-25 | Méthode | Fichiers Markdown simples ; pas de dépendance à GitHub ; séparation validé / proposition / en cours ; pas de génération vidéo avant préproduction suffisante ; travail reprenable par une nouvelle session | Équipe | — |
| D-019 | 2026-11-25 | Organisation | Structure initiale du projet **globalement validée**, à ne pas reconstruire (accepte P-002). La validation des autres propositions P-001, P-003 à P-007 n'a pas été explicitée : Q-026. | Équipe | — |
| D-020 | 2026-11-25 | Narration | Structure en **six actes**, dans cet ordre : *The Noise*, *The Proofs*, *Absence*, *Laboratory*, *Truth*, *Liberation*. Base élaborée par l'équipe lors d'échanges antérieurs. **Seuls les titres sont présents dans le projet**, le contenu des actes n'est pas disponible (Q-004). | Équipe | — |
| D-021 | 2026-11-26 | Accessoire | **Q-027** — Canon du téléphone **maintenu** (D-014) : téléphone ancien, **aucun câble visible**. Le cordon visible sur la vignette 4 de la planche de l'appartement est une **erreur de génération** et ne modifie pas le canon. Le **modèle exact reste à définir**. Aucune caractéristique supplémentaire n'est ajoutée. | Équipe | — |
| D-022 | 2026-11-26 | Décor / Accessoire | **Q-028** — Le second téléphone visible sur la console de la planche du laboratoire est un **artefact de génération**. Il ne fait pas partie du canon et **ne doit pas être reproduit** dans les futurs plans. | Équipe | — |
| D-023 | 2026-11-26 | Décor | **Q-029** — La ressemblance entre le plan au sol du laboratoire et celui de l'appartement est une **erreur de génération**, **pas un indice narratif**. Elle n'est intégrée ni au scénario, ni à la continuité, ni à la bible. Les **vues photographiques** du laboratoire sont privilégiées pour les futures références visuelles. | Équipe | — |
| D-024 | 2026-11-26 | Décor | **Q-030** — Le plan au sol de la planche de l'appartement **n'est pas utilisé comme référence de spatialisation**. Les **vues photographiques** de la planche sont privilégiées. Aucune correction géométrique n'est inventée sans validation. | Équipe | — |
| D-025 | 2026-11-26 | Personnage | **Q-031** — Les vignettes 8 à 10 de la planche de Léa **ne sont pas des scènes canon** et ne constituent pas des événements du scénario. Seuls sont conservés de la planche les éléments visuels validés de Léa : visage, cheveux, apparence générale et tenue de référence. | Équipe | — |
| D-026 | 2026-11-26 | Personnage / Références | **Q-032 (et Q-022)** — Le **portrait maître** et la **planche** d'Adrien sont **validés comme références de son identité visuelle générale**. Cette validation ne rend pas canonique chaque texte ou détail de la planche : couleur exacte, type de sweat, cordons, fermeture et caractéristiques supplémentaires restent soumis au **canon écrit**. « Peau mate claire » et « voix grave » ne sont **pas** des caractéristiques officielles sans validation distincte. | Équipe | — |
| D-027 | 2026-11-26 | Technique / Références | **Q-034** — Les résolutions actuelles des références sont **acceptables pour la préproduction** et ne bloquent pas le projet. Les références pourront être améliorées plus tard. | Équipe | — |
| D-028 | 2026-11-26 | Chronologie | **P-008, option A retenue comme base officielle de chronologie.** Sont validés **uniquement** : (1) l'accident et la disparition de Léa se produisent **en 2049** ; (2) l'histoire principale se déroule **environ six mois** après cet événement ; (3) Adrien a **28 ans** ; (4) Léa a **25 ans au moment de sa disparition** ; (5) le laboratoire est **abandonné depuis quelques mois**. **Ne sont pas validés** par cette décision : les mécanismes de l'expérience, les dates exactes, la nature précise de l'accident, les circonstances détaillées de la disparition, ni les autres éléments de P-008 (fermeture « dans les jours qui suivent », enquête, scellés, saison, découpage en phases du §6, règle « toute représentation de Léa à 25 ans »). | Équipe | — |

---

## B. Propositions en attente de validation

À valider, modifier ou refuser par l'équipe. **Ne pas appliquer en production tant qu'elles ne sont pas acceptées.**

| ID | Date | Catégorie | Proposition | Justification | Source | Statut |
|---|---|---|---|---|---|---|
| P-001 | 2026-11-25 | Organisation | Héberger le film dans le dossier `LE_DERNIER_SIGNAL/`, isolé du reste du dépôt (qui contient l'application VYRO) | Le dépôt actuel contient un autre projet ; l'isolement évite tout mélange. Le dossier est autonome et peut être déplacé tel quel vers un dossier local ou un dépôt dédié. | Claude | `[PROPOSITION]` |
| P-002 | 2026-11-25 | Organisation | Arborescence numérotée `00_` à `13_` + `_modeles/` (voir `README.md` §2) | Suit l'ordre de la chaîne de fabrication ; ajoute une bible séparée, un dossier de gabarits et un registre de continuité dédié. | Claude | `[ACCEPTÉE → D-019]` |
| P-003 | 2026-11-25 | Organisation | Nomenclature des scènes, plans, prompts, clips, références et versions de montage (voir `README.md` §6). *Précisée le 2026-11-25 pour les références : `REF_<TYPE>_<NOM>_<NATURE>_v##`, un sous-dossier par élément.* | Traçabilité complète d'un clip jusqu'à son prompt et sa fiche de plan ; numérotation des plans par pas de 10 pour insérer sans renuméroter. | Claude | `[PROPOSITION]` |
| P-004 | 2026-11-25 | Technique | Ne pas suivre les fichiers vidéo dans git (`.gitignore` du dossier) ; les sauvegarder sur un stockage dédié | Les vidéos sont trop lourdes pour un suivi texte ; les fiches Markdown restent la trace. | Claude | `[PROPOSITION]` |
| P-005 | 2026-11-25 | Continuité | Tenir un registre des **anomalies intentionnelles** (`05_continuite/ANOMALIES_INTENTIONNELLES.md`) | La reconstruction est « imparfaite » par concept : il faut distinguer un indice voulu d'une erreur de génération IA, sinon la continuité devient incontrôlable. | Claude | `[PROPOSITION]` |
| P-006 | 2026-11-25 | Méthode | Système de statuts `[VALIDÉ]`, `[PROPOSITION]`, `[EN COURS]`, `[À DÉFINIR]`, `[À VÉRIFIER]`, `[BLOQUÉ]`, `[ABANDONNÉ]` | Applique la règle de séparation validé / proposition / en cours (D-018). | Claude | `[PROPOSITION]` |
| P-007 | 2026-11-25 | Prompts | Créer pour chaque personnage et décor un **bloc descriptif canonique**, copié mot pour mot dans chaque prompt | Des formulations stables réduisent la dérive d'identité entre générations (sans la supprimer). | Claude | `[PROPOSITION]` |
| P-008 | 2026-11-25 | Chronologie | **Option A recommandée** : accident en 2049 à 02:17, environ 6 mois avant le récit principal ; Adrien 28 ans et Léa 25 ans au moment de l'accident ; laboratoire désaffecté et sous scellés depuis l'accident. Alternative : option B (accident en 2048, récit autour de l'anniversaire). Reformulation de l'âge de Léa : « 25 ans au moment de sa disparition ». Détail : `05_continuite/PROPOSITION_CHRONOLOGIE.md` | Seule option qui respecte tous les canons sans les réinterpréter, place toutes les couches du récit en 2049 et explique l'abandon comme l'accès clandestin. | Claude, sur demande de l'équipe | `[ACCEPTÉE PARTIELLEMENT → D-028]` — seuls les 5 éléments listés dans D-028 sont validés ; le reste de P-008 demeure à l'état de proposition (`05_continuite/PROPOSITION_CHRONOLOGIE_DETAILLEE_V01.md` §4) |
| P-009 | 2026-11-25 | Costume | Tenue canonique unique d'Adrien : sweat à capuche gris anthracite, t-shirt noir, pantalon cargo noir, baskets blanches discrètes. Remplacerait T-ADR-01 (D-010). Détail : `02_personnages/ADRIEN.md` | Supprime l'alternative « sweat ou hoodie » (Q-016) ; précise les couleurs. | Équipe (formulée) / Claude (détails) | `[PROPOSITION]` |
| P-010 | 2026-11-25 | Accessoire | Fiche technique et visuelle du téléphone, avec l'option **T2 recommandée** (base ancienne, combiné sans fil, ligne cachée). Détail : `04_accessoires/FICHE_TELEPHONE.md` | Rend « fixe ancien + combiné + aucun câble visible » réaliste ; garde ouverte la question narrative du branchement. | Équipe (formulée) / Claude (détails) | `[PROPOSITION]` |
| P-011 | 2026-11-25 | Références | Règles d'usage des références visuelles : une référence principale par élément, hiérarchie canon écrit / principale / secondaire (le visage fait exception), contradictions jamais tranchées en génération, versions archivées. Détail : `12_references_visuelles/README.md` §3 | Évite les contradictions entre plusieurs références d'un même élément. | Claude | `[PROPOSITION]` |

---

## C. Décisions remplacées ou abandonnées

Aucune à ce jour.
