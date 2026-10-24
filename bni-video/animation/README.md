# Moteur d'animation « Le tournoi des partenaires »

Rendu vectoriel (SVG/HTML) piloté par une timeline déterministe `renderAt(t)`, capturé image par image
avec Playwright/Chromium puis assemblé par ffmpeg. Aucun accès réseau, aucun crédit consommé.

```
python3 -I animation/render.py --preview      # 480x270, 12 fps -> out/bni_anim_preview.mp4 (~40 s)
python3 -I animation/render.py                # 1920x1080, 25 fps -> out/bni_anim.mp4 (~3 min capture + ~1 min encodage)
python3 -I animation/render.py --keyframes    # images clés PNG (2 à 5 par séquence) -> out/anim_keyframes/
python3 -I animation/render.py --stills 12.5,40  # images à des instants précis
```

Options : `--workers N` (4 par défaut), `--range a:b` (rendu partiel en secondes), `--width`, `--fps`, `--out`.

- `render.py` : timeline (durée = voix + 2,5 s, final ≥ 9,5 s), enveloppes de voix (lip-sync), logos recadrés,
  mixage numpy (voix + fanfare à -18 dB, remontée en ouverture/final), SRT, capture, encodage.
- `capture.js` : Playwright, N pages en parallèle, JPEG par image (PNG pour les images clés).
- `web/avatars.js` : les 8 judokas (traits relevés sur les portraits), rig bras/jambes, bouche, yeux, ceinture.
- `web/engine.js` : dojo en perspective, caméra (plans large/moyen/gros plan, travellings), mise en scène,
  passage de ceinture, podium, incrustations.

Lit `data/members.json` et `assets/` ; écrit seulement dans `out/` (`out/anim_build/` = intermédiaires).

## Version 2 (dojo 3D WebGL2 + personnages semi-réalistes)

La v1 (`render.py`, `web/`, sortie `out/bni_anim.mp4`) reste intacte comme repli. La v2 est indépendante :

```
python3 -I animation/render_v2.py --check        # contrôles de mise en forme sur les 2 843 images, sans WebGL (~2,5 min)
python3 -I animation/render_v2.py --keyframes    # 66 images clés 1080p + planches contact -> out/v2_keyframes/
python3 -I animation/render_v2.py --preview      # 640x360, 12 fps -> out/bni_anim_v2_preview.mp4 (~6 min)
python3 -I animation/render_v2.py                # 1920x1080, 25 fps -> out/bni_anim_v2.mp4 + .srt (~40 min)
python3 -I animation/render_v2.py --stills 12.5,40   # images isolées -> out/v2_stills/
```
Options : `--workers N` (4 navigateurs par défaut), `--range a:b`, `--kf-width`, `--no-strict` (ne pas échouer sur un contrôle).

- `render_v2.py` : durées recalculées depuis les fichiers audio (voix + marges : 1,6 s avant la voix, +1,8 s pour la chute
  de Haja, 1,4 s après, 2,6 s après Matthias ; ouverture voix + 2,5 s ; final ≥ 9,5 s), enveloppe + forme de bouche
  (centroïde spectral) à 100 Hz, alignement des mots et des sous-titres sur les silences de la voix, mixage (fanfare à
  -18 dB), SRT, capture, encodage x264, recherche d'images noires et extraction de 14 images du MP4.
- `capture_v2.js` : un Chromium par travailleur (WebGL logiciel SwiftShader), contrôles `qc()` après chaque image ;
  le rendu échoue (code 3) si un contrôle est violé.
- `web_v2/dojo.js` : dojo en vraie 3D écrit en WebGL2 (sans bibliothèque) : tatamis, poteaux, shoji à croisillons,
  ranma ajouré, poutres, lanternes émissives, bannières et kakémonos texturés, podium ; soleil par les shoji ouverts
  (taches au sol + ombres des personnages), rayons volumétriques, poussière, profondeur de champ, bloom, tone mapping,
  vignettage, grain ; résolution interne adaptée au plan (0,72 x 1080p, réduite en gros plan où le fond est flou).
- `web_v2/looks.js` : traits des 8 membres relevés sur les portraits.
- `web_v2/avatar_head.js`, `avatar_hair.js`, `avatar_body.js` : tête 3D simplifiée (lacet/tangage), yeux, sourcils,
  bouche articulée, barbe texturée, cheveux en mèches, lunettes ; judogi, ceinture à double tour, mains à doigts,
  bras en cinématique inverse 3D ; niveau de détail réduit pour les personnages lointains ou flous.
- `web_v2/scene.js` : chorégraphie (entrée, réception, nœud, rei, gestes calés sur les mots, don et vol de la
  ceinture simulé par une chaîne verlet déterministe, chute amortie de Haja, regroupement, podium), caméra 3D, HUD.
- `web_v2/qc.js` : contrôles automatiques (zone sûre, sous-titres ≤ 2 lignes, chevauchements d'incrustations, visages
  sous un texte, logo du bandeau et écusson, avatars hors cadre, NaN, couleur de ceinture, ordre des bandeaux,
  titres sur la bannière du dojo, sauts de caméra non prévus).
