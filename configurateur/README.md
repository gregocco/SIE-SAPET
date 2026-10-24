# Configurateur T2A

Visionneuse 3D web (three.js, aucune dépendance réseau : tout est dans `vendor/`) pour configurer le pendulaire :
couleur / matériau par pièce, stickers UV (décalcomanies), variantes de composants, capture PNG, export JSON.

## Lancer
```
cd configurateur && python3 -m http.server 8000   # puis http://localhost:8000
```
(un serveur est nécessaire : les modules ES et le GLB ne se chargent pas en `file://`)

## Contenu
- `models/T2A_F3_deflecteurs.glb` : assemblage de référence (GLB « réservoir F3 + déflecteurs »), en mètres.
- `models/reservoir_roto.glb`, `reservoir_alu_step.glb`, `chassis_D.glb`, `echappement_16-01a.glb` : STEP convertis (`outils/`).
- `stickers.js` : stickers procéduraux (mât, grille de ventilation, cornière rivetée, plaque texte).
- `app.js` : groupes de pièces (`GROUPS`), bibliothèque de matériaux (`MATERIALS`), looks (`PRESETS`), variantes (`VARIANTS`).

## Points techniques à connaître
- **Normales manquantes** : réservoir, échappement, train, tableau de bord n'ont pas de normales dans le GLB ; elles sont recalculées au chargement
  (lissage complet pour les maillages > 40 k sommets, angle de pli 35° sinon).
- **Pas d'UV** sur ces maillages : les stickers sont donc projetés (DecalGeometry), pas mappés ; les microtextures utilisent une projection boîte.
- **Poses des STEP** : le réservoir (alu et rotomoulé) tombe exactement dans le repère de l'assemblage (contrôle : STEP alu = GLB à 0,1 mm).
  Châssis D et échappement 16-01a sont calés par estimation (`outils/align.py`) et **doivent être validés** ; curseurs de recalage dans l'interface.
- Le GLB contient des nœuds parachute (`B10_*`, `SUPPORT_B10_*`) : masqués par défaut (groupe « Parachute & supports »).
- `outils/` : scripts de conversion STEP -> GLB (pythonocc/OCP + trimesh). Les chemins y sont ceux de la session de travail, à adapter.
