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

## Planning — examen le **30 novembre 2026** (38 jours, 2-4 h/jour)
Budget temps : ≈ 75-150 h. Large pour 14 chapitres ; la marge sert aux examens blancs. Ordre = rentabilité décroissante.
| Période | Focus |
|---|---|
| 23-30 oct | Positionnement, **ch. 11, 12** (comptes ≈ 31 % de l'examen), ch. 4 (fonds) |
| 31 oct-6 nov | Ch. 7 (suitability/Reg BI), 1, 5, 3 |
| 7-13 nov | Ch. 9, 13, 14 + express ch. 2, 8, 10, 6 |
| 14-20 nov | **2 examens blancs complets**, remédiation par section |
| 21-27 nov | 3 examens blancs, points faibles, onglets Traps, drills de calcul |
| 28-30 nov | Révision légère (pièges, formules, erreurs), repos |
**Actions immédiates :** réserver le créneau Prometric (Thanksgiving le 26 nov ; annuler/déplacer à moins de 10 jours ouvrés coûte des frais → date limite sans frais ≈ 13-16 nov). Vérifier la pièce d'identité exigée.
