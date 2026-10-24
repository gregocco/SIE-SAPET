# bni-video

Base de production de la vidéo BNI (judo / tournoi des partenaires).

- data/members.json : données (TODO = à fournir)
- assets/{portraits,logos,audio} : fichiers (portraits et audio non versionnés)
- scripts/build.py : `python3 -I scripts/build.py [--scale 0.1]` -> out/bni.mp4 + .srt
- workflow/bni.workflow.js : script Sonnet + Opus (à lancer avec les données complètes)

Aucune génération Higgsfield n'est lancée par ces scripts.
