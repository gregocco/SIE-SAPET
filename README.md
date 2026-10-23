# SIE-SAPET — Préparation à l'examen SIE (FINRA)

Application web de révision (mobile + PC, hors-ligne) construite à partir du manuel
*SIE Textbook 6th Edition* (490 p., 14 chapitres), pour une VP DCM FIG (4 ans d'expérience)
qui doit passer le SIE avant fin 2026 en vue d'une mission de 6 mois à New York.

**Statut : contenu complet (14 chapitres, ~920 QCM, ~1 100 cartes, 14 générateurs de calcul) + outils d'étude. Examen visé : 30/11/2026.**
Outils : mocks de 75 questions (poids officiels, sans répétition), calculatrice d'examen, audio, chiffres à connaître, traps sprint, checklist jour J, renvois aux pages du manuel.

## Utiliser l'appli
Ouvrir **`dist/sie-prep.html`** (fichier unique, hors-ligne, aucun serveur). Sur GitHub : ouvrir le fichier → *Download raw file*, puis l'ouvrir dans le navigateur (Chrome/Safari/Edge). La progression est enregistrée dans le navigateur de l'appareil (export/import JSON dans ⚙).
Reconstruire après modification du contenu : `node tools/build.mjs`.

## Documentation
Lire dans l'ordre :

| Doc | Contenu |
|---|---|
| [docs/01-cadrage.md](docs/01-cadrage.md) | Objectif, utilisatrice, contraintes, ce qu'on sait / ne sait pas de l'examen |
| [docs/02-analyse-du-manuel.md](docs/02-analyse-du-manuel.md) | Cartographie des 14 chapitres, poids d'examen, effort par chapitre pour ce profil |
| [docs/03-pedagogie.md](docs/03-pedagogie.md) | Formats d'apprentissage (fiches, QCM, drills de calcul, simulateur), répétition espacée, planning 10 semaines |
| [docs/04-architecture.md](docs/04-architecture.md) | Choix techniques, modèle de données, hébergement, données de marché réelles (API) |
| [docs/05-plan-et-budget.md](docs/05-plan-et-budget.md) | Lots de production, ordre, budget et points d'arrêt |
| [docs/06-questions-ouvertes.md](docs/06-questions-ouvertes.md) | Décisions prises et points ouverts |
| [docs/07-points-a-confirmer.md](docs/07-points-a-confirmer.md) | Ambiguïtés / incohérences du manuel |

`tools/extract.sh` extrait le texte du PDF (le texte extrait n'est volontairement pas versionné).

## Structure
```
content/   index.json (14 chapitres), ch-XX.json (cours, pièges, formules, cartes, QCM), glossary.json
src/       index.html, styles.css, app.js (SRS, quiz, drills, simulateur d'examen)
tools/     build.mjs (assemble dist/sie-prep.html + vérifie le contenu), extract.sh (texte du PDF)
dist/      sie-prep.html (livrable)
```
