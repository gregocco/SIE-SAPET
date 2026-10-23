# 02 — Analyse du manuel (490 p., ~180 000 mots)

Source : `SIE Textbook 6th Edition.pdf`. Texte extractible proprement (16 pages quasi vides = pages de titre de chapitre). Chaque chapitre contient déjà cours + exercices + corrigés — on **ne les reprend pas** (droits), on produit des questions originales.

## Cartographie et effort (profil : VP DCM FIG)
Pages ≈ longueur du chapitre dans le livre. « Effort » = temps d'étude recommandé pour **elle**, pas la difficulté absolue.

| Ch. | Thème | Pages | Poids exam (section) | Effort | Pourquoi |
|---|---|---|---|---|---|
| 1 | Equity (common, preferred, ADR, short sales, dividendes) | ~30 | Products 44 % | Moyen | Mécanique connue, mais **dates de dividendes** (declaration/ex/record/payable), droits de vote, short sale = pièges classiques |
| 2 | Debt securities (yields, risques, accrued, accretion) | ~28 | Products | **Faible** | Cœur de métier. Ne garder que : conventions US (30/360 vs act/act), accrued, accretion/amortization, tax |
| 3 | Types de bonds (corporate, Treasuries, agencies, **munis**, money market) | ~30 | Products | Moyen | Treasuries/corporates OK ; **munis (GO/revenue, tax-equivalent yield, triple tax-free)**, agencies (GSE, MBS/CMO) = zone floue |
| 4 | Investment companies (mutual funds, CEF, UIT, ETF) | ~36 | Products | **Élevé** | Univers 40-Act inconnu : NAV/POP, sales charges, breakpoints, classes A/B/C, 12b-1, rachat |
| 5 | Autres produits (REITs, DPP, hedge funds, PE, structured, 529/muni fund) | ~24 | Products | Moyen | Vocabulaire + qui peut investir (accredited) |
| 6 | **Options** (calls, puts, index, premiums, OCC) | ~40 | Products | **Élevé** | Chapitre le plus « calcul + stratégies » ; gros rendement par heure de travail |
| 7 | Suitability, **Reg BI**, risques, objectifs, rendements | ~32 | Products | **Élevé** | Concepts réglementaires US + risques/returns (beta, Sharpe, TWR…) |
| 8 | Émission (registration, exemptions Reg D/Reg S/144A/Rule 144, underwriting, muni underwriting) | ~34 | Capital Markets 16 % | **Faible→Moyen** | Elle fait la syndication : survol. Mais **vocabulaire US** (Rule 415, 144, 145, 506) à vérifier |
| 9 | Marché secondaire (’34 Act, exchanges, order types, market protection) | ~30 | Capital Markets | Moyen | Market structure US (NMS, Reg SHO, circuit breakers, ordres stop/limit) |
| 10 | Économie & politique monétaire (Fed, indicateurs, taux, FX) | ~36 | Capital Markets | **Faible** | Culture macro acquise ; mémoriser vocabulaire Fed (discount rate, FOMC, OMO) |
| 11 | **Customer accounts** (ouverture, types, titling, marge, SIPC) | ~38 | Trading/Accounts 31 % | **Élevé** | 100 % US retail : joint WROS/TIC, UTMA, marge Reg T, SIPC |
| 12 | **Comptes fiscaux** (401k, IRA/Roth, annuités, 529, Coverdell, HSA) | ~38 | Trading/Accounts | **Élevé** | Entièrement nouveau, plein de chiffres (plafonds, pénalités) |
| 13 | **FINRA/registration** (SRO, BD, personnel, Blue Sky, IA) | ~26 | Regulatory 9 % | Moyen | Faible poids mais mémoire pure |
| 14 | **Business conduct** (insider trading, AML, communications, BCP, cadeaux…) | ~30 | Regulatory | Moyen | Beaucoup de seuils chiffrés (ex. gifts) ; questions « interdit / autorisé » |

**Lecture :** ≈ 45 % des pages (ch. 4, 6, 7, 11, 12 + partie de 13-14) concentrent l'essentiel du risque d'échec pour ce profil. Les ch. 2, 8, 10 (≈ 25 % des pages) peuvent être traités en diagnostic + fiche express.

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
