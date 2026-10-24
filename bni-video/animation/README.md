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
