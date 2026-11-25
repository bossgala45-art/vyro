# LE DERNIER SIGNAL — Dossier de production

Mini-film de science-fiction (≈ 20 min) produit de façon indépendante, avec génération vidéo par **Fable 2** et organisation de la production assistée par **Claude Code**.

Ce dossier est l'**unique source de vérité** du film : scénario, décisions artistiques, continuité, prompts, suivi des générations, montage et postproduction. Tout est en Markdown simple, lisible sans outil particulier, et fonctionne hors ligne (aucune dépendance à GitHub ni à un service en ligne).

> Ce dossier est volontairement isolé dans `LE_DERNIER_SIGNAL/`. Le reste du dépôt contient une autre application (VYRO), sans rapport avec le film. Ne pas mélanger les deux.

---

## 1. Reprendre le projet (nouvelle session, nouveau membre de l'équipe)

Lire **dans cet ordre** :

1. `README.md` — ce fichier : fonctionnement du projet.
2. `MASTER_PROJECT.md` — résumé de tout ce qui est **validé** sur le film.
3. `DECISIONS_LOG.md` — historique des décisions validées et des propositions en attente.
4. `CONTINUITY_RULES.md` — règles de continuité à respecter partout.
5. `PRODUCTION_STATUS.md` — où en est chaque phase.
6. `NEXT_STEPS.md` — ce qu'il faut faire maintenant.
7. `13_journal_decisions/QUESTIONS_OUVERTES.md` — ce qui n'est pas encore décidé.

Une session Claude Code qui reprend le projet doit lire ces fichiers avant toute action (voir aussi `CLAUDE.md`).

---

## 2. Arborescence

```
LE_DERNIER_SIGNAL/
├── README.md                    Fonctionnement du projet (ce fichier)
├── CLAUDE.md                    Règles de travail pour toute session Claude Code
├── MASTER_PROJECT.md            Synthèse des informations VALIDÉES du film
├── DECISIONS_LOG.md             Journal des décisions artistiques et techniques
├── PRODUCTION_STATUS.md         Tableau de bord d'avancement
├── CONTINUITY_RULES.md          Principes et procédure de continuité
├── NEXT_STEPS.md                Prochaines étapes de préproduction
│
├── 00_bible/                    Bible générale du film (monde, ton, thèmes, règles internes)
├── 01_scenario/                 Synopsis, séquencier, versions du scénario
├── 02_personnages/              Fiches personnages (identité, tenues, états)
├── 03_decors/                   Fiches décors (plans, lumière, éléments fixes)
├── 04_accessoires/              Registre des accessoires et de leur position
├── 05_continuite/               Chronologie, révélations au spectateur, anomalies voulues, registre par plan
├── 06_storyboard_decoupage/     Découpage technique et storyboard, scène par scène
├── 07_prompts_fable/            Prompts prêts à copier dans Fable 2, versionnés
├── 08_production/               Plan de génération, journal des générations
├── 09_clips_generes/            Clips exportés de Fable 2 (fichiers vidéo + fiches)
├── 10_montage/                  Projet de montage, versions, notes de montage
├── 11_postproduction/           Son, musique, effets, étalonnage, titres, export final
├── 12_references_visuelles/     Références d'identité validées (personnages, décors, accessoires)
├── 13_journal_decisions/        Questions ouvertes, annexes et options écartées
└── _modeles/                    Gabarits à copier (scène, plan, prompt, fiche de génération)
```

Les dossiers sont numérotés dans l'ordre logique de la chaîne de fabrication. Chaque dossier contient un `README.md` qui précise son contenu et ses conventions (sauf `00_bible/`, qui ne contient que `BIBLE_DU_FILM.md`).

---

## 3. Statuts utilisés partout

Chaque information importante porte un statut entre crochets :

| Statut | Sens |
|---|---|
| `[VALIDÉ]` | Décidé par l'équipe. Ne se modifie qu'avec accord explicite, consigné dans `DECISIONS_LOG.md`. |
| `[PROPOSITION]` | Suggéré (souvent par Claude), **pas encore accepté**. Ne doit pas être utilisé en production. |
| `[EN COURS]` | En cours d'élaboration ou de discussion. |
| `[À DÉFINIR]` | Information manquante. Ne pas l'inventer : la poser dans `QUESTIONS_OUVERTES.md`. |
| `[À VÉRIFIER]` | Hypothèse ou capacité technique non confirmée (ex. : limites de Fable 2). |
| `[BLOQUÉ]` | Ne peut pas avancer tant qu'un autre élément n'est pas réglé. |
| `[ABANDONNÉ]` | Écarté. Conservé pour mémoire, jamais supprimé. |

Règle : **une information sans statut est considérée comme non validée.**

---

## 4. Hiérarchie des sources

1. `DECISIONS_LOG.md` fait foi pour savoir **si** et **quand** une décision a été validée.
2. Les fiches détaillées (`02_personnages/`, `03_decors/`, `04_accessoires/`) font foi pour le **détail** d'un élément.
3. `MASTER_PROJECT.md` est un **résumé** : il pointe vers les fiches.

Si deux fichiers se contredisent : ne pas trancher seul. Signaler l'incohérence, la noter dans `13_journal_decisions/QUESTIONS_OUVERTES.md`, et attendre la décision de l'équipe.

---

## 5. Flux de travail avec Fable 2

Fable 2 et Claude Code **ne sont pas reliés automatiquement**. Le flux est manuel :

1. **Claude prépare** : découpage du plan, fiche de plan, prompt dans `07_prompts_fable/`, liste des références à joindre.
2. **L'équipe génère** dans Fable 2 en copiant le prompt et en joignant les références indiquées.
3. **L'équipe exporte** le clip dans `09_clips_generes/` selon la nomenclature, et remplit la fiche de génération (réglages réellement utilisés, observations).
4. **Claude met à jour** le journal des générations et vérifie la continuité **à partir des observations écrites par l'équipe** et, si l'équipe en dépose, de **captures d'images fixes**.
5. **L'équipe valide ou rejette** la prise ; la décision est consignée.

Ce que Claude Code **ne fait pas et ne prétend jamais faire** : générer une vidéo dans Fable 2, visionner un clip vidéo, modifier un clip. Si Claude examine une capture d'image, il le dit explicitement ; sinon, toute observation visuelle vient de l'équipe.

Les outils d'IA ne garantissent pas la cohérence d'un personnage ou d'un décor d'un plan à l'autre. Les références, les descriptions canoniques et les fiches servent à **réduire** les écarts, pas à les supprimer : chaque prise doit être contrôlée par un humain.

---

## 6. Nomenclature des fichiers `[PROPOSITION]`

Voir proposition P-003 dans `DECISIONS_LOG.md`. En résumé :

| Élément | Format | Exemple |
|---|---|---|
| Scène | `S##` | `S03` |
| Plan | `S##_P###` (par pas de 10 pour pouvoir insérer) | `S03_P020` |
| Prompt | `PR_S##_P###_v##.md` | `PR_S03_P020_v02.md` |
| Clip généré | `LDS_S##_P###_v##_t##.ext` (v = version du prompt, t = tentative) | `LDS_S03_P020_v02_t04.mp4` |
| Référence visuelle | `REF_<TYPE>_<NOM>_##.ext` | `REF_PERS_ADRIEN_01.png` |
| Version de montage | `LDS_MONTAGE_v###` | `LDS_MONTAGE_v003` |

Dates : format `AAAA-MM-JJ`. Noms de fichiers sans accents ni espaces.

---

## 7. Fichiers volumineux

Les vidéos (clips, exports de montage) ne sont pas suivies par git (voir `.gitignore` de ce dossier) : elles doivent être sauvegardées ailleurs (disque externe, stockage cloud de l'équipe). Les fiches Markdown qui les décrivent, elles, sont conservées ici. Les images de référence validées **doivent** être conservées dans `12_references_visuelles/`.
