# 05 — Plan de production et budget

**Contrainte posée : on dépense le reste des crédits cloud, pas 1 USD de plus.** Je ne vois pas le solde ; plafond de travail retenu : **≈ 15 USD** pour L1-L5 (estimation, voir ci-dessous), L6-L7 seulement s'il en reste. Le coût dominant n'est pas la rédaction mais le nombre d'appels d'outils (le contexte est relu à chaque appel) : donc peu d'appels, gros fichiers écrits d'un coup.  le plan est conçu pour que **chaque lot soit utilisable seul** : on peut s'arrêter après n'importe quel lot avec un produit qui marche.

## Où partent les coûts (ordre de grandeur, à recaler)
- **Lire le manuel** : ~180 k mots ≈ 250 k tokens en entrée, **une seule fois**, chapitre par chapitre.
- **Rédiger le contenu** (fiches, ~50 cartes + ~50 QCM par chapitre) : poste le plus cher (sortie ≈ 12-15 k tokens/chapitre).
- **Coder l'appli** : modéré si on évite les réécritures (pas de framework, pas de build).
- **Gaspillage à éviter** : relire le PDF, régénérer du contenu pour corriger un détail, lancer des sous-agents en parallèle « pour voir », itérer à l'aveugle sur le visuel.

## Lots (chacun livrable)
| Lot | Contenu | Valeur si on s'arrête là |
|---|---|---|
| **L0** | Dossier de cadrage (ce dossier) | Décisions prises |
| **L1** | Socle appli : navigation, thème, PWA, stockage, moteur de QCM, répétition espacée, simulateur d'examen — avec **1 chapitre pilote complet (ch. 11 Customer Accounts, le plus rentable)** | Produit utilisable + validation de la qualité/visuel avant de multiplier |
| **L2** | Chapitres à **effort élevé** : 12, 4, 7 | Couvre l'essentiel du risque d'échec |
| **L3** | Générateurs de calcul (~25) | Entraînement illimité aux chiffres |
| **L4** | Chapitres restants : 1, 5, 3, 9, 13, 14, 6 | Couverture complète |
| **L5** | Chapitres express : 2, 8, 10 + test de positionnement + examens blancs finalisés | Parcours complet |
| **L6** | Cas réels / snapshots API (modules bornés, si le réseau le permet) | Bonus d'ancrage |
| **L7** | Passe de vérification (script de recoupement chiffres/seuils vs manuel) + polish visuel | Fiabilité |

Ordre volontairement **qualité avant volume** : L1 sur un seul chapitre pour que vous validiez le rendu avant que je produise les 13 autres.

## Garde-fous de budget
1. Point de contrôle chiffré à la fin de chaque lot (dépense estimée vs plafond).
2. Pas de sous-agents sauf besoin clair de parallélisme ; contenu produit chapitre par chapitre dans ma session.
3. Contenu en fichiers JSON validés par script (échec détecté sans re-lire à la main).
4. Si le plafond approche : on finit le lot en cours, on fige, on documente ce qui manque.

## Risques et parades
| Risque | Parade |
|---|---|
| Erreur factuelle dans un QCM | Champ `confidence`, script de recoupement des chiffres, relecture ciblée des `check` ; la candidate peut signaler « question douteuse » dans l'appli |
| PDF : pages dégradées | 16 pages quasi vides identifiées (titres de chapitre) ; vérifier à la lecture de chaque chapitre que rien ne manque |
| Examen avant que tout soit prêt | Ordre L1→L2 couvre les chapitres les plus risqués en premier ; examen blanc dispo dès L2 |
| Livre mis à jour / règles changées (plafonds IRA, etc.) | Valeurs datées dans le contenu ; vérifier les plafonds de l'année d'examen |
