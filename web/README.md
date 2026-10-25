# UAC Planner (web)

Application statique : carte, inventaire des espaces aériens, moteur de calcul (Web Workers) et planning d'étapes.

    python3 -m http.server -d web 8765   # puis http://localhost:8765

Données : `web/data/*.json` générées par `tools/export_web.py` (balises 2026, espaces aériens OpenAIP, vent NASA POWER) ;
`land.json` : côtes Natural Earth 50 m simplifiées.
