# 02 — Analyse du manuel (490 p., ~180 000 mots)

Source : `SIE Textbook 6th Edition.pdf`. Texte extractible proprement (16 pages quasi vides = pages de titre de chapitre). Chaque chapitre contient déjà cours + exercices + corrigés — on **ne les reprend pas** (droits), on produit des questions originales.

## Cartographie et effort (profil : VP DCM FIG)
Sources : sommaire du manuel, pondération officielle par section, et **398 « Knopman Notes »** (points que l'éditeur signale comme très testés). « Q. estimées » = pondération de la section répartie entre ses chapitres (hypothèse d'égalité, sauf Options : le manuel dit lui-même « 3 à 4 questions au total »). Estimations, pas des chiffres FINRA.

| Ch. | Thème | Pages | Notes très testées (par page) | Q. estimées | Effort pour elle | Remarque |
|---|---|---|---|---|---|---|
| 1 | Equity (common, preferred, ADR, short, dividendes) | ~30 | ~24 | ~5 | Moyen | Dates de dividendes, droits, short sale |
| 2 | Debt (yields, risques, accrued, accretion) | 28 | 24 (0,86) | ~5 | **Faible** | Cœur de métier ; conventions US + calculs |
| 3 | Types de bonds (corp, Treasuries, agencies, **munis**, money market) | 30 | 22 (0,73) | ~5 | Moyen | Munis, agencies/MBS = zone floue |
| 4 | Investment companies (mutual funds, CEF, UIT, ETF) | 36 | 34 (0,94) | ~5 | **Élevé** | Univers 40-Act, NAV/POP, sales charges |
| 5 | REIT, DPP, hedge funds, PE, structurés | 24 | 23 (0,96) | ~5 | Moyen | Vocabulaire + qui peut investir |
| 6 | Options | 40 | 21 (**0,53**) | **3-4** | **Faible-moyen** | Beaucoup de pages, peu de questions : essentiels seulement |
| 7 | Suitability, Reg BI, risques, rendements | 32 | 26 (0,81) | ~5 | Élevé | Concepts réglementaires US |
| 8 | Émission (registration, exemptions, underwriting) | 34 | 29 (0,85) | ~4 | Faible | Son métier ; vocabulaire US (Rule 144/415, Reg D) |
| 9 | Marché secondaire (’34 Act, ordres, protections) | 30 | 27 (0,90) | ~4 | Moyen | Market structure US |
| 10 | Économie & Fed | 36 | 27 (0,75) | ~3 | **Faible** | Macro acquise ; vocabulaire Fed |
| 11 | **Customer accounts** (types, titling, marge, SIPC) | 38 | **48 (1,26)** | **~11-12** | **Élevé** | **Chapitre n°1 en valeur** |
| 12 | **Comptes fiscaux** (401k, IRA, annuités, 529) | 38 | 37 (0,97) | **~11-12** | **Élevé** | Entièrement nouveau, chiffres à mémoriser |
| 13 | FINRA / registration | 26 | 24 (0,92) | ~3 | Moyen | Mémoire pure |
| 14 | Business conduct (insider, AML, communications, gifts) | 45 | 32 (0,71) | ~4 | Moyen | Beaucoup de pages, peu de questions |

**Lecture corrigée :** les chapitres 11 et 12 pèsent à eux seuls **≈ 31 % de l'examen (23 questions) pour 76 pages** : ce sont les plus rentables. À l'inverse, les ch. 6 et 14 (85 pages) ne valent qu'environ 7-8 questions : à traiter en express. Les ch. 2, 8, 10 restent « diagnostic + fiche express » vu son métier.

> Correction de ma première version : j'avais classé les Options « effort élevé / gros rendement par heure ». Le manuel contredit cela (3-4 questions). Priorité = densité de questions par page, pas nombre de pages.

## Pour chaque chapitre, l'appli contiendra
1. **Fiche express** (1 écran défilant) : l'essentiel + schéma/tableau.
2. **« Pièges d'examen »** : confusions classiques (rédigées par nous, à partir du cours).
3. **Formules & mécaniques** avec un exemple chiffré.
4. **Flashcards** (définition ↔ terme, règle ↔ cas).
5. **QCM originaux** (4 choix, explication de chaque mauvais choix).
6. **Drills de calcul** générés à la volée (voir 03).

## Choix d'ingestion (économie de tokens)
- Pas de relecture du livre entier à chaque lot : **un chapitre = un lot** (~13 000 mots ≈ 18 k tokens en entrée), écrit dans `content/ch-XX.json`, puis plus jamais relu sauf vérification ciblée.
- Le texte extrait reste hors dépôt ; `tools/extract.sh` le régénère en 2 s.
