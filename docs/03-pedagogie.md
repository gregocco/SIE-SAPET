# 03 — Pédagogie

Principe : **une VP qui connaît la finance n'a pas besoin qu'on lui explique ce qu'est une obligation ; elle a besoin d'être testée vite, de voir ses angles morts, et de revoir au bon moment.** L'appli est donc orientée *test d'abord, cours ensuite*.

## Parcours
1. **Test de positionnement** (~30 QCM, tous chapitres, 15 min) → carte de maîtrise par chapitre. Les chapitres déjà acquis passent en « maintenance » (revue espacée seule).
2. **Boucle par chapitre** : fiche express (5-8 min) → flashcards → QCM par thème → drills de calcul → bilan.
3. **Révision espacée quotidienne** (« Aujourd'hui », 10-15 min) : cartes + QCM ratés, algorithme type SM-2 simplifié (intervalles 1-3-7-14-30 j ; une erreur ramène à 1 j).
4. **Examens blancs** : 75 questions, 1 h 45, **pondération identique à FINRA** (12/33/23/7), pas de correction avant la fin, marquer pour relecture, calculatrice 4 opérations à l'écran. Rapport : score par section, temps par question, erreurs récurrentes.
5. **Mode « dernière semaine »** : uniquement les erreurs + les pièges + formules.

## Formats
| Format | Rôle | Volume cible |
|---|---|---|
| Fiche express | Compréhension rapide, lecture 5-8 min | 14 |
| Flashcards | Mémoire des définitions/seuils/règles | ~700 |
| QCM originaux (EN) | Entraînement au format et aux pièges | ~700 (réserve pour 8 examens blancs sans répétition) |
| **Drills de calcul générés** | Entraînement illimité aux chiffres | ~25 générateurs |
| Cas réels (API) | Ancrage : courbe des taux, Fed, dépôts SEC | ~6 modules |
| Glossaire / recherche | Retrouver un terme en 2 s | ~600 termes |

## Générateurs de calcul (zéro coût en tokens, infinis)
Accrued interest (30/360 corp & muni, act/act Treasury) · jour de règlement T+1 et dates de dividendes · current yield / YTM approx / yield to call · accretion & amortization · tax-equivalent yield · NAV / POP / sales charge / breakpoint · options : P&L, break-even, max gain/loss, spreads, straddles · marge Reg T (initial/maintenance, long/short) · 5 % markup · rendement de dividende · limites de contribution IRA/401(k)/529 (valeurs à vérifier contre le livre) · pénalités de retrait anticipé.
Chaque exercice affiche **la démarche pas à pas** et un conseil pour la petite calculatrice (arrondis).

## Règles de qualité du contenu
- Chaque QCM : bonne réponse + **pourquoi chaque distracteur est faux** + renvoi `chapitre/section` du manuel.
- Distracteurs = erreurs réellement commises (confusions classiques), pas du remplissage.
- Aucune phrase ni question recopiée du manuel.
- Un champ `confidence` (high/check) : tout ce qui est chiffré (plafonds, seuils, délais) est marqué `check` jusqu'à vérification contre le manuel par un script de recoupement.

## Planning (≈ 9 semaines, 2-4 h/jour ; à caler sur la date de créneau)
Ordre = rentabilité décroissante, pas l'ordre du livre.
| Sem. | Focus |
|---|---|
| 1 | Positionnement + **ch. 11** (comptes, marge) + **ch. 12** (retraite, annuités, 529) |
| 2 | Fin ch. 12 + **ch. 4** (fonds) + ch. 7 (suitability, Reg BI) |
| 3 | Ch. 1, 5, 3 (equity, produits alternatifs, munis/agencies) |
| 4 | Ch. 9 (marché secondaire), 13 (registration), 14 (conduct) |
| 5 | Ch. 2, 8, 10 en express + ch. 6 (options, essentiels) |
| 6 | Examen blanc 1-2 + remédiation par section |
| 7 | Examens blancs 3-4 + drills de calcul |
| 8 | Examen blanc 5 + mode « erreurs et pièges » |
| 9 | Marge de sécurité / reprise des points faibles |
Avec 2-4 h/jour, la couverture complète tient en ~5 semaines ; le reste = répétition et examens blancs. **Poser le créneau Prometric dès que possible** (la boîte l'exige, et les frais d'annulation partent à 10 jours ouvrés).
