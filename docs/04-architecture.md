# 04 — Architecture

## Principes
Mobile d'abord · hors-ligne · zéro serveur à maintenir · zéro coût d'exploitation · contenu séparé du code · qualité visuelle élevée.

## Stack
- **Site statique** HTML/CSS/JS (ES modules), **sans framework lourd ni étape de build** : déploiement trivial, rien à casser. Petit système de composants maison (~300 lignes) + CSS variables, thème clair/sombre automatique.
- **PWA** : manifest + service worker → installable sur l'écran d'accueil iPhone/Android, fonctionne en avion.
- **Progression** : IndexedDB (cartes, intervalles, historique d'examens). Export/import JSON (sauvegarde manuelle ; pas de compte).
- **Graphiques** : SVG maison (courbe des taux, radar de maîtrise, courbes P&L d'options). Pas de grosse lib.
- **Typo/UX** : une seule police système + une police de chiffres tabulaires ; gros tap-targets ; navigation basse à 4 onglets : *Aujourd'hui · Cours · S'entraîner · Examens* (+ Glossaire en recherche globale).

## Arborescence cible
```
/index.html, /sw.js, /manifest.webmanifest
/src/        app, router, store (IndexedDB), srs (répétition espacée), exam, ui/*
/src/drills/ un fichier par générateur de calcul
/content/    ch-01.json … ch-14.json, glossary.json, exam-blueprint.json
/data/       snapshots de marché (JSON, rafraîchis par GitHub Action)
/tools/      extract.sh, validate-content.mjs (schéma + liens), build-index.mjs
/docs/       ce dossier
```

## Modèle de contenu (extrait)
```jsonc
// content/ch-06.json
{ "id": 6, "title": "Options", "section": "products", "estMinutes": 90,
  "summary": [ { "h": "...", "md": "..." } ],
  "traps":   [ { "id": "t1", "md": "..." } ],
  "formulas":[ { "id": "f1", "name": "...", "tex": "...", "example": "..." } ],
  "cards":   [ { "id": "c1", "type": "term|rule|case", "front": "...", "back": "...", "ref": "6.2" } ],
  "questions":[ { "id": "q1", "topic": "6.2", "kind": "concept|calc|scenario", "diff": 1,
                  "stem": "...", "options": ["A","B","C","D"], "answer": 2,
                  "why": ["A: ...","B: ...","C: ...","D: ..."], "ref": "6.2", "confidence": "high|check" } ] }
```
`tools/validate-content.mjs` refuse un build si : réponse hors bornes, option dupliquée, `why` incomplet, `ref` inconnu, `confidence:check` non résolu avant l'examen blanc final.

## Cas réels / API — ce qui est réaliste
Objectif : relier le cours à des données vivantes, **sans dépendre de clés ni de CORS côté navigateur**.

| Module | Chapitre | Source candidate | Remarque |
|---|---|---|---|
| Courbe des taux Treasury + pentes | 2, 3, 10 | US Treasury (Daily Par Yield Curve) / FiscalData | public, sans clé |
| Prix/yield d'un Treasury, accrued du jour | 2, 3 | FiscalData + calcul local | exercices avec vrais coupons |
| Fed funds, CPI, chômage, PIB | 10 | FRED | **clé gratuite requise ; CORS probablement bloqué en direct** |
| Adjudications Treasury (auctions) | 3, 8 | FiscalData | bid-to-cover, tail |
| Dépôts SEC réels (S-1, 424B, Form D, 8-K, Form 144) | 8, 9, 14 | SEC EDGAR | public, User-Agent obligatoire ; sert à « reconnaître le document » |
| Cotations / ex-dates dividendes | 1, 9 | à choisir (gratuits fragiles) | **à éviter si instable** |

**Stratégie retenue : snapshots.** Une GitHub Action quotidienne (clé FRED en secret) télécharge ces sources et commit des JSON dans `/data/`. L'appli lit des fichiers statiques → pas de CORS, pas de clé exposée, fonctionne hors-ligne avec la dernière donnée. **Avant de s'engager, test réseau de chaque source** (certaines peuvent être bloquées depuis cet environnement : à vérifier en phase 2, pas supposé).
Honnêteté : l'optionnel « options chain en temps réel » n'a pas de source gratuite fiable ; les exercices options resteront générés.

## Hébergement (décision à prendre — voir 06)
| Option | Privé ? | Coût | Verdict |
|---|---|---|---|
| GitHub Pages | Pages d'un repo privé = plan payant ; sinon **public** | 0 / payant | public = incompatible avec le droit d'auteur du manuel |
| Cloudflare Pages / Netlify depuis repo privé | Oui (URL secrète + mot de passe possible) | 0 | **recommandé** |
| Artifact claude.ai (page privée partageable) | Oui | 0 | pratique pour un prototype, limites sur le réseau/stockage |
