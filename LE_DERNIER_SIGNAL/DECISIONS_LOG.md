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

---

## B. Propositions en attente de validation

À valider, modifier ou refuser par l'équipe. **Ne pas appliquer en production tant qu'elles ne sont pas acceptées.**

| ID | Date | Catégorie | Proposition | Justification | Source | Statut |
|---|---|---|---|---|---|---|
| P-001 | 2026-11-25 | Organisation | Héberger le film dans le dossier `LE_DERNIER_SIGNAL/`, isolé du reste du dépôt (qui contient l'application VYRO) | Le dépôt actuel contient un autre projet ; l'isolement évite tout mélange. Le dossier est autonome et peut être déplacé tel quel vers un dossier local ou un dépôt dédié. | Claude | `[PROPOSITION]` |
| P-002 | 2026-11-25 | Organisation | Arborescence numérotée `00_` à `13_` + `_modeles/` (voir `README.md` §2) | Suit l'ordre de la chaîne de fabrication ; ajoute une bible séparée, un dossier de gabarits et un registre de continuité dédié. | Claude | `[PROPOSITION]` |
| P-003 | 2026-11-25 | Organisation | Nomenclature des scènes, plans, prompts, clips, références et versions de montage (voir `README.md` §6) | Traçabilité complète d'un clip jusqu'à son prompt et sa fiche de plan ; numérotation des plans par pas de 10 pour insérer sans renuméroter. | Claude | `[PROPOSITION]` |
| P-004 | 2026-11-25 | Technique | Ne pas suivre les fichiers vidéo dans git (`.gitignore` du dossier) ; les sauvegarder sur un stockage dédié | Les vidéos sont trop lourdes pour un suivi texte ; les fiches Markdown restent la trace. | Claude | `[PROPOSITION]` |
| P-005 | 2026-11-25 | Continuité | Tenir un registre des **anomalies intentionnelles** (`05_continuite/ANOMALIES_INTENTIONNELLES.md`) | La reconstruction est « imparfaite » par concept : il faut distinguer un indice voulu d'une erreur de génération IA, sinon la continuité devient incontrôlable. | Claude | `[PROPOSITION]` |
| P-006 | 2026-11-25 | Méthode | Système de statuts `[VALIDÉ]`, `[PROPOSITION]`, `[EN COURS]`, `[À DÉFINIR]`, `[À VÉRIFIER]`, `[BLOQUÉ]`, `[ABANDONNÉ]` | Applique la règle de séparation validé / proposition / en cours (D-018). | Claude | `[PROPOSITION]` |
| P-007 | 2026-11-25 | Prompts | Créer pour chaque personnage et décor un **bloc descriptif canonique**, copié mot pour mot dans chaque prompt | Des formulations stables réduisent la dérive d'identité entre générations (sans la supprimer). | Claude | `[PROPOSITION]` |

---

## C. Décisions remplacées ou abandonnées

Aucune à ce jour.
