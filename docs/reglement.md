# Règlement UAC 2026 (v1.0.0) — contraintes utilisées par le logiciel

| Article | Règle | Traitement dans le code |
|---|---|---|
| 3 | Départ LFJY 1er août 10h00, arrivée LFJY 8 août 12h00 locale ; non posé à l'heure = disqualifié | budget d'heures de vol ; retour à LFJY obligatoire |
| 3 | Vol continu max 4 h, pause au sol min 30 min | étapes ≤ 4 h (à faire dans le planificateur d'étapes) |
| 5 | Points = valeur × palier : ≤100 m 100 %, ≤250 m 95 %, ≤500 m 90 %, ≤1 km 80 %, ≤5 km 65 %, ≤25 km 40 % | `TH` / `PCT` dans `tools/optimize.py` |
| 5 | Score = somme des balises ; trace non vérifiable ⇒ balises de cette portion perdues | surveiller batterie du traceur |
| 5 | Classement séparé par catégorie (à confirmer : le scratch applique-t-il les multiplicateurs ?) | multiplicateur pendulaire ×2,5 déjà dans `max` |
| 6 | Traceur organisateur, 1 point/s, seules ces données comptent | ~28 m entre points à 100 km/h |
| 7 | Violation d'espace aérien, réglementation : pénalités / DQ ; protestation 48 h | couche espaces aériens |

Points ouverts à confirmer avec l'organisateur : règlement 2027 identique ? classement scratch ? interdiction de l'assistance au sol (texte exact) ?
