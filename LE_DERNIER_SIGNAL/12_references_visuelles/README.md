# 12 — Références visuelles

Références d'identité utilisées pour préparer les générations. Ce dossier ne contient que des références **validées**. Les essais vont dans `08_production/TESTS/`.

> **État au 2026-11-25 : aucune image n'a été déposée.** Tous les fichiers listés ci-dessous sont **attendus** et non présents. Tant qu'une image n'est pas réellement dans le dossier, elle ne peut être ni décrite ni utilisée.

---

## 1. Organisation

```
12_references_visuelles/
├── README.md                      Ce fichier : inventaire et règles communes
├── personnages/
│   ├── ADRIEN/
│   │   ├── README.md
│   │   ├── REF_PERS_ADRIEN_PORTRAIT_MAITRE_v01.<ext>   ← référence principale (identité du visage)
│   │   ├── REF_PERS_ADRIEN_PLANCHE_v01.<ext>           ← référence secondaire (corps, tenue, angles)
│   │   └── archives/                                   Anciennes versions, jamais utilisées en génération
│   └── LEA/
│       ├── README.md
│       ├── REF_PERS_LEA_PLANCHE_v01.<ext>              ← référence principale
│       └── archives/
├── decors/
│   ├── APPARTEMENT/
│   │   ├── README.md
│   │   ├── REF_DECOR_APPART_PLANCHE_v01.<ext>          ← référence principale
│   │   └── archives/
│   └── LABORATOIRE/
│       ├── README.md
│       ├── REF_DECOR_LABO_PLANCHE_v01.<ext>            ← référence principale
│       └── archives/
├── accessoires/
│   └── TELEPHONE/README.md        Aucune référence existante : à créer après validation de P-010
└── ambiances/                     (lumière, palette, grain : à venir)
```

Si une planche contient plusieurs vues sur une seule image, on peut **en plus** déposer des recadrages de cette planche, nommés `…_PLANCHE_v01_CROP_<vue>.<ext>` (ex. `_CROP_PROFIL`). Un recadrage hérite du statut de la planche dont il est issu. Il ne devient jamais une référence indépendante.

---

## 2. Inventaire

| # | Référence | Fichier attendu | Rôle | Présent | Validation |
|---|---|---|---|---|---|
| 1 | Adrien — portrait maître | `personnages/ADRIEN/REF_PERS_ADRIEN_PORTRAIT_MAITRE_v01.<ext>` | Principale (visage) | ✗ non déposé | `[À CONFIRMER]` (Q-022) |
| 2 | Adrien — planche de référence | `personnages/ADRIEN/REF_PERS_ADRIEN_PLANCHE_v01.<ext>` | Secondaire | ✗ non déposé | `[À CONFIRMER]` (Q-022) |
| 3 | Léa — planche de référence | `personnages/LEA/REF_PERS_LEA_PLANCHE_v01.<ext>` | Principale | ✗ non déposé | Validée selon D-016 |
| 4 | Appartement — planche de référence | `decors/APPARTEMENT/REF_DECOR_APPART_PLANCHE_v01.<ext>` | Principale | ✗ non déposé | Validée selon D-016 |
| 5 | Laboratoire — planche de référence | `decors/LABORATOIRE/REF_DECOR_LABO_PLANCHE_v01.<ext>` | Principale | ✗ non déposé | Validée selon D-016 |

Mettre la colonne « Présent » à jour **au moment du dépôt**, pas avant.

---

## 3. Règles communes `[PROPOSITION]` (P-011)

### 3.1 Une seule référence principale par élément
Chaque personnage, décor ou accessoire a **une** référence principale. Les autres images sont secondaires : elles ne servent que pour les aspects listés dans le README de l'élément.

### 3.2 Hiérarchie en cas de doute
1. **Canon écrit validé** (fiches `02_personnages/`, `03_decors/`, `04_accessoires/`) : il dit ce qui doit être vrai.
2. **Référence principale** : elle montre à quoi cela ressemble.
3. **Références secondaires** : uniquement pour ce que la référence principale ne montre pas.

Exception : pour l'**identité d'un visage**, l'image principale prime sur toute description écrite. Un texte ne peut pas mieux décrire un visage qu'une image validée.

### 3.3 Contradictions
- Une contradiction entre deux références, ou entre une référence et le canon écrit (ex. : la planche montre un sweat sans capuche alors que le canon dit « sweat à capuche »), **n'est jamais tranchée en génération**.
- Ne jamais joindre dans une même génération deux images qui se contredisent.
- La contradiction est consignée dans `13_journal_decisions/QUESTIONS_OUVERTES.md`. L'équipe décide ensuite : refaire la référence, adapter le canon, ou limiter l'usage de la référence secondaire.

### 3.4 Versions
- Une nouvelle version de référence principale (`v02`) exige une décision dans `DECISIONS_LOG.md`.
- L'ancienne version passe dans `archives/`. Elle n'est plus jamais jointe à une génération.
- Toutes les prises d'une même scène utilisent la **même version** des références.

### 3.5 Fiche de dépôt (à remplir dans le README de l'élément)
Date de dépôt · date de validation · validée par · outil ayant servi à la créer · prompt d'origine (si disponible) · dimensions en pixels · format · remarques.

### 3.6 Contrôle au dépôt
Après chaque dépôt, Claude peut ouvrir l'image et la comparer au canon écrit. Il rapporte ce qu'il a réellement observé et signale tout écart. Cette lecture est une aide : la validation reste celle de l'équipe.

### 3.7 Utilisation dans Fable 2
La manière de joindre une référence (nombre d'images, type de référence, rôle de chaque image) dépend de capacités **non vérifiées** (voir `08_production/CAPACITES_FABLE2.md`). Les README des éléments donnent une priorité d'usage applicable quel que soit le nombre de références acceptées. Le mode opératoire définitif sera fixé après vérification.

Une référence **réduit** la dérive d'identité. Elle ne la supprime pas : chaque prise est contrôlée.
