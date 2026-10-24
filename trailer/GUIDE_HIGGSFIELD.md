# Guide : faire tourner Higgsfield soi-même (sans Claude)

Ce guide reprend, plan par plan, les prompts de `prompts.json`. Il est généré à partir de ce fichier : rien n'a été réécrit.
Prompts en anglais (les modèles les comprennent mieux), explications en français.

## Avant de commencer
1. Connectez-vous sur **higgsfield.ai** avec le compte qui a les crédits. Vérifiez le solde (en haut de l'écran).
2. **Avant chaque génération, regardez le coût que le site affiche.** S'il dépasse le tableau ci-dessous, arrêtez-vous.
3. Les 6 images de référence sont dans `trailer/refs/` (à télécharger depuis GitHub, branche `claude/peaceful-planck-z76n66`). Vous les glissez dans la zone « références » / « image » du site.
4. Le nom exact des menus du site peut changer : cherchez le modèle par son nom (« GPT Image 2.5 », « Kling 3.0 », « Grok Imagine Video 1.5 Lite ») et le format **16:9**.
5. Gardez toujours **au moins 5 crédits de marge**. Notez ce que vous dépensez au fur et à mesure.

## Prix relevés (16:9)
| Modèle | Crédits |
|---|---|
| Image GPT Image 2.5 | 0,25 par image |
| Kling 3.0, 3 s | 6 |
| Kling 3.0, 5 s | 10 |
| Grok Video 1.5 Lite, 5 s, 720p | 5 |
| MiniMax H3 Max, 5 s | 12,5 |
| Seedance 2.5 | **ne pas utiliser** (35 à 80 crédits par clip) |

## Méthode (à suivre dans l'ordre)
1. **Image maîtresse** (plan `A0_MASTER`) : générez 4 variantes, choisissez la meilleure, téléchargez-la. Elle servira de référence supplémentaire à toutes les images suivantes.
2. **Images de départ** de chaque plan : 4 variantes par plan, avec les rendus de référence **et** l'image maîtresse en références. Commencez par les plans les plus risqués (S2, S4) : si la machine n'y tient pas, vous le savez tôt.
3. **Planche contact** : mettez les images retenues côte à côte. Même aile, mêmes couleurs, même lumière ? Sinon refaites des images (pas des vidéos : une image coûte 0,25).
4. **Vidéos** : n'animez que les images retenues. Utilisez l'image comme *start image / première image*.
5. Téléchargez tous les clips en qualité maximale. Montage dans Final Cut (voir `storyboard.md`).

## Règle d'or du budget
Une image coûte 0,25 crédit, une vidéo 5 à 10. **Dépensez en images, pas en vidéos** : refaire une image ratée coûte 40 fois moins que refaire un clip.

---

## Plan `A0_MASTER`
**Rôle :** Image maîtresse en vol : sert de référence supplémentaire à TOUTES les images clés suivantes pour figer lumière, couleurs et pose en vol (les rendus sont au sol sur fond gris). Jamais animée.

### Image de départ
- Modèle : `gpt_image_2_5` · format 16:9 · **4 variantes**
- Références à glisser : `1_trois_quarts_avant.png`, `2_profil.png`, `4_trois_quarts_arriere.png`, `5_dessous.png`

**Prompt à coller :**

```
Cinematic film still, 16:9. The aircraft flies straight and level in a clear golden evening sky, seen in a three-quarter front view from slightly below and to the left, filling about 60% of the frame width, the white wing and its navy-blue underside with the copper stripe both readable, soft warm gradient sky with distant haze as the only background. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 85 mm air-to-air view, aircraft sharp and centered. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Pour choisir l'image :**
- Conformité maximale aux rendus (c'est la vérité terrain pour la suite)
- Couleurs nettes : blanc / bleu nuit / cuivre
- Pilote propre
- Hélice en disque flou à l'arrière

### Si le résultat ne convient pas (prompts de repli, un seul changement à la fois)

**Repli 1 :**

```
Cinematic film still, 16:9. Pure side profile view of the aircraft in level flight, nose pointing to the right, against a plain warm golden sky, filling 70% of the frame width. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 100 mm air-to-air view, perfectly level camera. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Repli 2 :**

```
Cinematic film still, 16:9. Three-quarter rear view of the aircraft in level flight seen from slightly above and behind on the left, plain warm golden sky with distant haze, filling 60% of the frame width. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 85 mm air-to-air view. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

### À vérifier sur le résultat
- Aile delta souple balayée en V, bord de fuite festonné (bloquant)
- Exactement 3 roues : 1 avant, 2 arrière (bloquant si visibles)
- Hélice derrière le moteur, à l'arrière (bloquant)
- Extrados blanc ; intrados bleu nuit + bande cuivre si visible (bloquant)
- Rien sous le nez de l'aile, pas de poteau au-dessus (bloquant si visible)
- Aucun texte/logo (bloquant, sauf si effaçable par recadrage)
- Soleil bas à gauche du cadre, lumière dorée (fort)
- Pilote petit, casque + lunettes, pas de visage net (fort)

*Coût estimé : 1.0 crédits.*

---

## Plan `S1a_MONTAGNE_LARGE`
**Fenêtre du film :** 1:22 → 2:15 (de 1.73 s à 2.50 s, soit 0.77 s à l'écran)
**Rôle :** Ouverture : immensité, liberté, première lecture de la silhouette delta.

### Image de départ
- Modèle : `gpt_image_2_5` · format 16:9 · **4 variantes**
- Références à glisser : **l'image maîtresse A0 que vous avez retenue à l'étape 1** (à téléverser comme référence), `1_trois_quarts_avant.png`, `2_profil.png`, `6_dessus.png`

**Prompt à coller :**

```
Cinematic film still, 16:9. Very wide aerial shot of a rugged ochre and slate mountain range: a sharp rocky ridge crosses the lower third of the frame, a deep shaded valley below, snow-dusted far peaks in warm haze. The aircraft is small in frame, about 20% of the frame width, on the left third, flying toward the right just above the ridge in a three-quarter front-side view seen slightly from above, the white upper surface of the wing catching the warm sun. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 135 mm aerial chase from a helicopter, slight high angle, strong depth and atmospheric perspective. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Pour choisir l'image :**
- Silhouette delta lisible même petite
- Machine sur le tiers gauche, orientée vers la droite
- Crête nette en tiers bas pour le parallaxe
- Ciel dégagé au-dessus (respiration)

### Vidéo
- **model** : grok_video_1_5_lite (test de calibrage) ; repli kling_3_0
- **duree_s** : 5
- **duree_s_si_kling** : 3
- **mouvement_camera** : Travelling latéral de poursuite + léger push-in / descente
- **fenetre_clip_a_utiliser_s** : {"grok_5s": [1.0, 1.77], "kling_3s": [1.0, 1.77]}
- **notes** : Test de calibrage du modèle pas cher (voir ordre_des_operations). Vitesse FCP 110-120 % si l'action est lente. negative_prompt si le champ existe : rigid wing, paraglider, parachute lines, fixed-wing airplane, tail, fuselage, king-post above wing, tube under the wing nose, four wheels, tractor propeller at the front, text, letters, logo, registration, watermark, extra people, visible face, distorted hands

**Prompt à coller :**

```
Fast aerial tracking shot over a mountain ridge. The aircraft flies swiftly from left to right just above the ridge and begins a gentle bank to the right; the ridge slides underneath at speed with strong parallax. The aircraft is the weight-shift microlight trike from the start frame: white flexible delta wing with navy-blue underside and thin copper stripe, copper tubular three-wheeled carriage, navy-blue seats and front pod, black pusher propeller at the rear. The aircraft keeps exactly the same shape, proportions and colors as in the start frame for the whole shot; the wing stays a taut swept delta attached to the mast at one point; three wheels throughout. The pusher propeller spins fast as a translucent dark blur disc behind the engine. The helicopter camera tracks alongside and drifts slightly forward and down. Constant golden-hour light from the low sun on the left. Real-time speed, smooth stabilized cinematic motion, photorealistic.
```

### Si le résultat ne convient pas (prompts de repli, un seul changement à la fois)

**Repli 1 :**

```
Cinematic film still, 16:9. Very wide aerial shot: the aircraft is a small crisp silhouette flying left to right across a deep mountain valley, high above a shaded canyon floor, sunlit ochre cliffs on the right, snow-dusted far peaks, the swept delta wing shape clearly readable against the darker mountainside. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 200 mm, level camera from a distant helicopter. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Repli 2 :**

```
Cinematic film still, 16:9. Wide aerial shot from behind and above: the aircraft flies away from camera toward the right, over a sharp sunlit ridge, the white top of the delta wing clearly visible against the shaded valley far below, snow-dusted peaks on the horizon. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 85 mm high chase angle. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

### À vérifier sur le résultat
- Aile delta souple balayée en V, bord de fuite festonné (bloquant)
- Exactement 3 roues : 1 avant, 2 arrière (bloquant si visibles)
- Hélice derrière le moteur, à l'arrière (bloquant)
- Extrados blanc ; intrados bleu nuit + bande cuivre si visible (bloquant)
- Rien sous le nez de l'aile, pas de poteau au-dessus (bloquant si visible)
- Aucun texte/logo (bloquant, sauf si effaçable par recadrage)
- Soleil bas à gauche du cadre, lumière dorée (fort)
- Pilote petit, casque + lunettes, pas de visage net (fort)
- Vidéo : aile ne se déforme pas pendant le virage
- Vidéo : >= 0,8 s de mouvement fluide exploitable

*Coût estimé : 1.0 crédit(s) d'images + 5 crédits de vidéo.*

---

## Plan `S1b_MONTAGNE_INSERT_SURVOL`
**Fenêtre du film :** 2:15 → 3:06 (de 2.50 s à 3.20 s, soit 0.7 s à l'écran)
**Rôle :** Insert 'whoosh' : vitesse au ras du sommet + signature couleur de l'intrados (bleu nuit / cuivre).

### Image de départ
- Modèle : `gpt_image_2_5` · format 16:9 · **4 variantes**
- Références à glisser : **l'image maîtresse A0 que vous avez retenue à l'étape 1** (à téléverser comme référence), `5_dessous.png`, `4_trois_quarts_arriere.png`

**Prompt à coller :**

```
Cinematic film still, 16:9. Low-angle shot from a rocky mountain summit looking up: the aircraft sweeps just above and slightly to the right of the camera, seen from below and behind, its navy-blue wing underside with the thin copper stripe, the black triangular control frame and the three wheels silhouetted against the bright golden sky, a soft sun flare at the left wingtip, sharp rocks in the out-of-focus foreground at the bottom edge. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Wide 24 mm lens, dramatic upward angle, aircraft filling about 50% of the frame width. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Pour choisir l'image :**
- Intrados bleu nuit + bande cuivre bien lisibles
- Trapèze noir + 3 roues cohérents vus de dessous
- Rien sous le nez de l'aile
- Flare discret, pas d'artefact

### Vidéo
- **model** : grok_video_1_5_lite si le calibrage S1a est validé, sinon kling_3_0
- **duree_s** : 5
- **duree_s_si_kling** : 3
- **mouvement_camera** : Panoramique rapide de suivi depuis un point fixe
- **fenetre_clip_a_utiliser_s** : {"grok_5s": [0.8, 1.5], "kling_3s": [0.8, 1.5]}
- **notes** : REPLI GRATUIT si budget serré : punch-in 130-150 % sur une autre portion du clip S1a. negative_prompt : rigid wing, paraglider, parachute lines, fixed-wing airplane, tail, fuselage, king-post above wing, tube under the wing nose, four wheels, tractor propeller at the front, text, letters, logo, registration, watermark, extra people, visible face, distorted hands

**Prompt à coller :**

```
The aircraft roars past low over a rocky summit, from just above the camera toward the distant valley on the right, flying away and slightly descending. The aircraft is the weight-shift microlight trike from the start frame: white flexible delta wing with navy-blue underside and thin copper stripe, copper tubular three-wheeled carriage, navy-blue seats and front pod, black pusher propeller at the rear. The aircraft keeps exactly the same shape, proportions and colors as in the start frame for the whole shot; the wing stays a taut swept delta attached to the mast at one point; three wheels throughout. The pusher propeller spins fast as a translucent dark blur disc behind the engine. The camera on the summit pans quickly to the right to follow it; light motion blur on the rocks. Constant golden-hour light from the low sun on the left. Real-time speed, smooth stabilized cinematic motion, photorealistic.
```

### Si le résultat ne convient pas (prompts de repli, un seul changement à la fois)

**Repli 1 :**

```
Cinematic film still, 16:9. Close chase view from behind and slightly above: the white upper surface of the delta wing fills the top half of the frame, the spinning pusher propeller disc and copper frame visible beneath the trailing edge, the pilot's helmet small; far below a sunlit valley with long mountain shadows; the aircraft banks gently to the right. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 70 mm air-to-air chase. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Repli 2 :**

```
Cinematic film still, 16:9. Side view from a mountain ledge: the aircraft passes close in front of the camera from left to right at the same height, in profile, a sheer shaded cliff and a deep valley behind it, the navy-blue underside and copper stripe visible as it banks slightly. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. 35 mm lens, fast pan feeling, slight motion blur on background. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

### À vérifier sur le résultat
- Aile delta souple balayée en V, bord de fuite festonné (bloquant)
- Exactement 3 roues : 1 avant, 2 arrière (bloquant si visibles)
- Hélice derrière le moteur, à l'arrière (bloquant)
- Extrados blanc ; intrados bleu nuit + bande cuivre si visible (bloquant)
- Rien sous le nez de l'aile, pas de poteau au-dessus (bloquant si visible)
- Aucun texte/logo (bloquant, sauf si effaçable par recadrage)
- Soleil bas à gauche du cadre, lumière dorée (fort)
- Pilote petit, casque + lunettes, pas de visage net (fort)
- Vidéo : la machine reste entière en sortant du cadre (pas de morphing)

*Coût estimé : 1.0 crédit(s) d'images + 0 crédits de vidéo.*

---

## Plan `S2_DESERT_RASE_MOTTES`
**Fenêtre du film :** 3:06 → 5:10 (de 3.20 s à 5.33 s, soit 2.13 s à l'écran)
**Rôle :** Plan d'énergie : vitesse, sol qui défile, sensation physique. Le plus long du film.

### Image de départ
- Modèle : `gpt_image_2_5` · format 16:9 · **4 variantes**
- Références à glisser : **l'image maîtresse A0 que vous avez retenue à l'étape 1** (à téléverser comme référence), `2_profil.png`, `5_dessous.png`

**Prompt à coller :**

```
Cinematic film still, 16:9. Low tracking shot across a flat desert hardpan with low dunes: the aircraft speeds from left to right flying about 4 meters above the ground, with a clear gap of open air between its three wheels and the sand and its crisp shadow on the ground just below and slightly behind it; a faint thin veil of fine dust lifted by the propeller wash trails behind; a distant mountain range on the horizon with light heat shimmer. Side profile view seen slightly from below, aircraft about 45% of the frame width, center-left, nose pointing right. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Camera 1 m above the ground on a tracking vehicle, 50 mm lens, ground in the foreground streaked with motion blur. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Pour choisir l'image :**
- Espace d'air net sous les roues + ombre détachée (bloquant)
- Profil fidèle à 2_profil.png (mât, trapèze, hélice arrière)
- Poussière légère, pas de tempête
- Horizon bas, ciel chaud

### Vidéo
- **model** : kling_3_0 (physique sol/ombre/poussière : ne pas confier au modèle Lite)
- **duree_s** : 3
- **mouvement_camera** : Travelling latéral à vitesse égale, la machine prend de l'avance
- **fenetre_clip_a_utiliser_s** : {"kling_3s": [0.5, 2.63], "si_5s": [1.0, 3.13]}
- **notes** : Fenêtre serrée en 3 s : vitesse FCP 110 % pour gagner de la marge (0,5 -> 2,84 s). Si la machine 'atterrit' ou touche le sol : rejet direct. negative_prompt : rigid wing, paraglider, parachute lines, fixed-wing airplane, tail, fuselage, king-post above wing, tube under the wing nose, four wheels, tractor propeller at the front, text, letters, logo, registration, watermark, extra people, visible face, distorted hands, wheels touching the ground, sandstorm

**Prompt à coller :**

```
Fast low pass over the desert. The aircraft holds a steady height about 4 meters above the ground and flies quickly from left to right, gradually overtaking the camera; its shadow slides along the sand right below it; a faint trail of fine dust rises behind the propeller and drifts away. The aircraft is the weight-shift microlight trike from the start frame: white flexible delta wing with navy-blue underside and thin copper stripe, copper tubular three-wheeled carriage, navy-blue seats and front pod, black pusher propeller at the rear. The aircraft keeps exactly the same shape, proportions and colors as in the start frame for the whole shot; the wing stays a taut swept delta attached to the mast at one point; three wheels throughout. The pusher propeller spins fast as a translucent dark blur disc behind the engine. The camera tracks alongside at high speed from a vehicle 1 m above the ground, the foreground ground streaking past with motion blur. Constant golden-hour light from the low sun on the left. Real-time speed, smooth stabilized cinematic motion, photorealistic.
```

### Si le résultat ne convient pas (prompts de repli, un seul changement à la fois)

**Repli 1 :**

```
Cinematic film still, 16:9. Low front three-quarter view across a flat desert hardpan: the aircraft flies toward the camera-right about 4 meters above the ground, clear air under its wheels, its sharp shadow on the sand below, a faint dust veil behind, low dunes and far mountains, aircraft about 40% of frame width. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Camera 1.5 m above the ground, 85 mm lens, compressed perspective. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Repli 2 :**

```
Cinematic film still, 16:9. High aerial view looking down at 45 degrees: the aircraft skims low across rippled sand dunes from left to right, its crisp shadow just below it on the dune crest, the white top of the delta wing bright in the sun, long dune shadows. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Drone 30 m above, 35 mm lens, chasing alongside. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

### À vérifier sur le résultat
- Aile delta souple balayée en V, bord de fuite festonné (bloquant)
- Exactement 3 roues : 1 avant, 2 arrière (bloquant si visibles)
- Hélice derrière le moteur, à l'arrière (bloquant)
- Extrados blanc ; intrados bleu nuit + bande cuivre si visible (bloquant)
- Rien sous le nez de l'aile, pas de poteau au-dessus (bloquant si visible)
- Aucun texte/logo (bloquant, sauf si effaçable par recadrage)
- Soleil bas à gauche du cadre, lumière dorée (fort)
- Pilote petit, casque + lunettes, pas de visage net (fort)
- Vidéo : hauteur constante, jamais de contact sol
- Vidéo : ombre cohérente avec la machine
- >= 2,1 s exploitables (après retiming éventuel)

*Coût estimé : 1.0 crédit(s) d'images + 6 crédits de vidéo.*

---

## Plan `S3a_EAU_LARGE`
**Fenêtre du film :** 5:10 → 6:01 (de 5.33 s à 6.03 s, soit 0.7 s à l'écran)
**Rôle :** Respiration couleur (turquoise) sans baisser le rythme.

### Image de départ
- Modèle : `gpt_image_2_5` · format 16:9 · **4 variantes**
- Références à glisser : **l'image maîtresse A0 que vous avez retenue à l'étape 1** (à téléverser comme référence), `1_trois_quarts_avant.png`, `5_dessous.png`

**Prompt à coller :**

```
Cinematic film still, 16:9. Aerial shot over a calm turquoise lake in a rocky ochre desert basin: the aircraft flies from left to right about 8 meters above the glassy water in a three-quarter front view, banking slightly toward the camera, its clear reflection on the water below, a soft fan of ripples spreading on the surface behind the propeller; warm red-ochre cliffs in the background. Aircraft about 30% of the frame width. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Drone at the same height as the aircraft, 35 mm lens. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Pour choisir l'image :**
- Machine nettement au-dessus de l'eau, reflet cohérent
- Turquoise / ocre / doré : palette chaude cohérente avec S1-S2
- Rides discrètes (pas de gerbe d'eau)

### Vidéo
- **model** : grok_video_1_5_lite si calibrage validé, sinon kling_3_0
- **duree_s** : 5
- **duree_s_si_kling** : 3
- **mouvement_camera** : Drone en recul latéral, même altitude
- **fenetre_clip_a_utiliser_s** : {"grok_5s": [1.0, 1.7], "kling_3s": [1.0, 1.7]}
- **notes** : Rejeter si la machine touche ou amerrit, ou si le reflet se décale. negative_prompt : rigid wing, paraglider, parachute lines, fixed-wing airplane, tail, fuselage, king-post above wing, tube under the wing nose, four wheels, tractor propeller at the front, text, letters, logo, registration, watermark, extra people, visible face, distorted hands, splashing, landing on water, floats

**Prompt à coller :**

```
The aircraft sweeps across the calm lake from left to right about 8 meters above the water, banking gently toward the camera; its reflection follows on the glassy surface; the propeller wash draws a soft fan of ripples on the water behind it. The aircraft is the weight-shift microlight trike from the start frame: white flexible delta wing with navy-blue underside and thin copper stripe, copper tubular three-wheeled carriage, navy-blue seats and front pod, black pusher propeller at the rear. The aircraft keeps exactly the same shape, proportions and colors as in the start frame for the whole shot; the wing stays a taut swept delta attached to the mast at one point; three wheels throughout. The pusher propeller spins fast as a translucent dark blur disc behind the engine. The drone flies sideways and slightly backward at the same height to follow it. Constant golden-hour light from the low sun on the left. Real-time speed, smooth stabilized cinematic motion, photorealistic.
```

### Si le résultat ne convient pas (prompts de repli, un seul changement à la fois)

**Repli 1 :**

```
Cinematic film still, 16:9. Wide aerial shot from above: the aircraft flies low along a winding turquoise river in a narrow ochre canyon, left to right, its shadow and reflection on the water, the white delta wing bright against the dark water. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Drone 40 m above, 24 mm lens, looking down at 50 degrees. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Repli 2 :**

```
Cinematic film still, 16:9. Side profile shot over a calm turquoise lake: the aircraft flies left to right 8 meters above the water, a perfect mirror reflection beneath it, golden backlit haze and ochre cliffs behind. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 100 mm from a boat, level with the water. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

### À vérifier sur le résultat
- Aile delta souple balayée en V, bord de fuite festonné (bloquant)
- Exactement 3 roues : 1 avant, 2 arrière (bloquant si visibles)
- Hélice derrière le moteur, à l'arrière (bloquant)
- Extrados blanc ; intrados bleu nuit + bande cuivre si visible (bloquant)
- Rien sous le nez de l'aile, pas de poteau au-dessus (bloquant si visible)
- Aucun texte/logo (bloquant, sauf si effaçable par recadrage)
- Soleil bas à gauche du cadre, lumière dorée (fort)
- Pilote petit, casque + lunettes, pas de visage net (fort)
- Vidéo : reflet synchrone, machine jamais au contact de l'eau

*Coût estimé : 1.0 crédit(s) d'images + 0 crédits de vidéo.*

---

## Plan `S3b_EAU_INSERT_RAS`
**Fenêtre du film :** 6:01 → 6:22 (de 6.03 s à 6.73 s, soit 0.7 s à l'écran)
**Rôle :** Plan 'carte postale' mémorable : contre-jour doré + reflet.

### Image de départ
- Modèle : `gpt_image_2_5` · format 16:9 · **4 variantes**
- Références à glisser : **l'image maîtresse A0 que vous avez retenue à l'étape 1** (à téléverser comme référence), `5_dessous.png`, `2_profil.png`

**Prompt à coller :**

```
Cinematic film still, 16:9. Shot from just above the surface of a calm lake: the aircraft crosses the frame from left to right about 6 meters above the water, seen from below in near silhouette against the bright golden sky, its navy-blue underside with the thin copper stripe and the three wheels readable, its reflection on the water, glittering sun sparkles on the water in the foreground. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Wide 28 mm lens a few centimeters above the water, slight upward angle, aircraft about 40% of the frame width. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Pour choisir l'image :**
- Silhouette delta parfaitement lisible
- Scintillements sans artefacts
- Reflet cohérent

### Vidéo
- **model** : grok_video_1_5_lite si calibrage validé, sinon kling_3_0
- **duree_s** : 5
- **duree_s_si_kling** : 3
- **mouvement_camera** : Glissé avant au ras de l'eau + léger tilt up
- **fenetre_clip_a_utiliser_s** : {"grok_5s": [1.0, 1.7], "kling_3s": [1.0, 1.7]}
- **notes** : REPLI GRATUIT : punch-in sur S3a. negative_prompt : rigid wing, paraglider, parachute lines, fixed-wing airplane, tail, fuselage, king-post above wing, tube under the wing nose, four wheels, tractor propeller at the front, text, letters, logo, registration, watermark, extra people, visible face, distorted hands, splashing

**Prompt à coller :**

```
The aircraft crosses the frame from left to right about 6 meters above the calm lake, in near silhouette against the golden sky, its reflection gliding on the water; sun sparkles shimmer in the foreground. The aircraft is the weight-shift microlight trike from the start frame: white flexible delta wing with navy-blue underside and thin copper stripe, copper tubular three-wheeled carriage, navy-blue seats and front pod, black pusher propeller at the rear. The aircraft keeps exactly the same shape, proportions and colors as in the start frame for the whole shot; the wing stays a taut swept delta attached to the mast at one point; three wheels throughout. The pusher propeller spins fast as a translucent dark blur disc behind the engine. The camera skims forward just above the water surface and tilts up slightly to follow. Constant golden-hour light from the low sun on the left. Real-time speed, smooth stabilized cinematic motion, photorealistic.
```

### Si le résultat ne convient pas (prompts de repli, un seul changement à la fois)

**Repli 1 :**

```
Cinematic film still, 16:9. Close low side view skimming over a calm lake: the rear of the aircraft, the two rear wheels and the spinning pusher propeller disc pass 5 meters above the water from left to right, a fan of ripples behind, golden backlight, the white wing edge at the top of the frame. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 85 mm from a boat, level with the aircraft. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Repli 2 :**

```
Cinematic film still, 16:9. Silhouette shot against the low sun over a calm lake: the aircraft flies left to right, a dark crisp delta wing silhouette with a golden rim light, a long glittering sun path on the water below. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 200 mm from the shore, low angle. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

### À vérifier sur le résultat
- Aile delta souple balayée en V, bord de fuite festonné (bloquant)
- Exactement 3 roues : 1 avant, 2 arrière (bloquant si visibles)
- Hélice derrière le moteur, à l'arrière (bloquant)
- Extrados blanc ; intrados bleu nuit + bande cuivre si visible (bloquant)
- Rien sous le nez de l'aile, pas de poteau au-dessus (bloquant si visible)
- Aucun texte/logo (bloquant, sauf si effaçable par recadrage)
- Soleil bas à gauche du cadre, lumière dorée (fort)
- Pilote petit, casque + lunettes, pas de visage net (fort)

*Coût estimé : 1.0 crédit(s) d'images + 0 crédits de vidéo.*

---

## Plan `S4_APPROCHE_POSE`
**Fenêtre du film :** 6:22 → 9:17 (de 6.73 s à 9.57 s, soit 2.84 s à l'écran)
**Rôle :** Retour au sol, ponctuation : le contact des roues arrière tombe sur l'attaque la plus forte (8:26), puis 0,70 s de roulage/poussière.

### Image de départ
- Modèle : `gpt_image_2_5` · format 16:9 · **4 variantes**
- Références à glisser : **l'image maîtresse A0 que vous avez retenue à l'étape 1** (à téléverser comme référence), `3_face.png`, `1_trois_quarts_avant.png`

**Prompt à coller :**

```
Cinematic film still, 16:9. Ground-level view along a rough desert dirt airstrip, just two faint wheel tracks across hard sand with scattered stones, a few whitewashed rocks marking its edge and dry shrubs: the aircraft is on short final about 2 meters above the strip, flying toward the camera in a three-quarter front view, nose slightly raised for the flare, wing level, its two rear main wheels lowest and about to touch, its shadow on the strip just ahead; distant mountains in warm haze. Aircraft about 35% of the frame width, centered. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Camera on the ground at the edge of the strip, 85 mm lens, slight low angle. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Pour choisir l'image :**
- Hauteur ~2 m crédible, roues arrière plus basses
- Piste vraiment sommaire (pas de bitume, pas de marquage)
- Vue de face fidèle à 3_face.png : trapèze, roue avant sur fourche bleu nuit

### Vidéo
- **model** : kling_3_0
- **duree_s** : 5
- **mouvement_camera** : Caméra fixe au sol + léger panoramique de suivi
- **fenetre_clip_a_utiliser_s** : Repérer T = image du contact des roues arrière. Utiliser [T-2,13 ; T+0,70] et caler T sur 8:26. Si T < 2,13 s : rampe de vitesse 115-130 % sur l'approche.
- **notes** : Plan le plus risqué (physique du contact). Une reprise réservée d'office. Escalade MiniMax H3 Max (12,5) seulement après 2 échecs Kling et s'il reste >= 18 crédits. negative_prompt : rigid wing, paraglider, parachute lines, fixed-wing airplane, tail, fuselage, king-post above wing, tube under the wing nose, four wheels, tractor propeller at the front, text, letters, logo, registration, watermark, extra people, visible face, distorted hands, bouncing, crash, wheels sinking, asphalt runway, runway markings

**Prompt à coller :**

```
The aircraft descends gently along the dirt strip toward the camera and flares with its nose slightly up; about three seconds into the shot its two rear main wheels touch the dirt first, raising a burst of fine golden dust, then the front wheel settles onto the ground; it keeps rolling toward the camera and passes close to the right edge of the frame as the dust cloud drifts. The aircraft is the weight-shift microlight trike from the start frame: white flexible delta wing with navy-blue underside and thin copper stripe, copper tubular three-wheeled carriage, navy-blue seats and front pod, black pusher propeller at the rear. The aircraft keeps exactly the same shape, proportions and colors as in the start frame for the whole shot; the wing stays a taut swept delta attached to the mast at one point; three wheels throughout. The pusher propeller spins fast as a translucent dark blur disc behind the engine. The camera stays low on the ground at the edge of the strip and pans slightly to follow. Constant golden-hour light from the low sun on the left. Real-time speed, smooth stabilized cinematic motion, photorealistic.
```

### Si le résultat ne convient pas (prompts de repli, un seul changement à la fois)

**Repli 1 :**

```
Cinematic film still, 16:9. Side profile view along a rough desert dirt strip: the aircraft flares about 1 meter above the ground moving from left to right, rear main wheels lowest, its shadow converging under the wheels, fine dust starting to lift, distant mountains, aircraft about 45% of the frame width. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Camera 50 cm above the ground beside the strip, 100 mm lens, tracking pan. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Repli 2 :**

```
Cinematic film still, 16:9. Close low shot of the touchdown on a rough desert dirt strip: the two rear wheels on their copper legs meeting the dirt, a burst of golden dust, the navy-blue seats and the blur disc of the pusher propeller just above, the white wing edge cropping the top of the frame. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Camera on the ground, 135 mm lens, shallow depth of field. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

### À vérifier sur le résultat
- Aile delta souple balayée en V, bord de fuite festonné (bloquant)
- Exactement 3 roues : 1 avant, 2 arrière (bloquant si visibles)
- Hélice derrière le moteur, à l'arrière (bloquant)
- Extrados blanc ; intrados bleu nuit + bande cuivre si visible (bloquant)
- Rien sous le nez de l'aile, pas de poteau au-dessus (bloquant si visible)
- Aucun texte/logo (bloquant, sauf si effaçable par recadrage)
- Soleil bas à gauche du cadre, lumière dorée (fort)
- Pilote petit, casque + lunettes, pas de visage net (fort)
- Vidéo : roues ARRIÈRE d'abord, puis roue avant
- Vidéo : pas de rebond ni d'enfoncement
- Vidéo : >= 2,13 s avant T et >= 0,70 s après (avec retiming)
- Poussière proportionnée

*Coût estimé : 1.5 crédit(s) d'images + 10 crédits de vidéo.*

---

## Plan `FIN_CARTE_FOND`
**Fenêtre du film :** 9:17 → 12:20 (de 9.57 s à 12.65 s, soit ? s à l'écran)
**Rôle :** Fond fixe de la carte de fin. Titre FEEL IT FREE et logo La Mouette posés dans FCP, JAMAIS générés.

### Image de départ
- Modèle : `gpt_image_2_5` · format 16:9 · **2 variantes**
- Références à glisser : **l'image maîtresse A0 que vous avez retenue à l'étape 1** (à téléverser comme référence), `2_profil.png`

**Prompt à coller :**

```
Cinematic film still, 16:9. Wide calm shot of a rough desert dirt airstrip at golden dusk just after landing: a soft veil of golden dust hangs in the air, the aircraft is parked small on the right third of the frame in near silhouette with its delta wing backlit by the low sun, a large empty warm sky and soft hazy plain over the left two thirds of the frame, minimal and clean. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 85 mm, level camera, deep negative space on the left. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Pour choisir l'image :**
- Deux tiers gauches vides (titre)
- Silhouette delta reconnaissable
- Aucun texte dans l'image

### Si le résultat ne convient pas (prompts de repli, un seul changement à la fois)

**Repli 1 :**

```
Cinematic film still, 16:9. Minimal wide shot of a desert horizon at golden dusk: a drifting veil of fine golden dust, the aircraft a tiny dark silhouette landed far away on the right third, the low sun glowing on the horizon, empty warm sky over the left two thirds. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 135 mm, level camera. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

**Repli 2 :**

```
Cinematic film still, 16:9. Wide shot of an empty golden desert sky at dusk with the delta wing silhouette of the aircraft small and high in the right third, flying away, soft haze, large clean negative space on the left. The aircraft is a two-seat weight-shift microlight trike: a flexible fabric delta wing, like a large hang-glider wing, above a small open three-wheeled carriage. The wing: swept-back flexible delta of about 10 m span with a high aspect ratio and slightly rounded tips; pure white upper surface; light-grey leading-edge sleeve along the swept V of the front edge; on the underside, the front part of the wing is navy-blue, edged along its rear boundary by a thin copper stripe running from tip to tip, and the rear part of the sail is white with visible battens ending at a softly scalloped trailing edge. The wing hangs from a single hang point on top of an inclined copper-colored mast; beneath the sail sits a black triangular control frame with a silver base bar in front of the pilot, braced by thin steel wires; one short aluminum keel tube extends rearward from the hang point toward the trailing edge, and the nose of the wing is a clean bare V with open sky beneath it; the top of the wing is smooth and clean. The carriage: copper-colored tubular frame with exactly three wheels, one small front wheel on a navy-blue fork with navy-blue foot pedals and two main wheels at the rear on copper legs with small black fairings; a rounded navy-blue instrument pod at the very front; two navy-blue tandem bucket seats with a copper stripe; a grey box-shaped fuel tank behind the seats; a silver Rotax-style engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine and under the rear of the wing. Plain unmarked surfaces in copper, navy-blue, white and grey. One pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied. The pusher propeller spins fast as a translucent dark blur disc behind the engine. Telephoto 85 mm, slight upward angle. Golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows, clear sky with light warm haze near the horizon. Photorealistic cinematic aerial photography, shot on a digital cinema camera, fine natural film grain, gentle contrast, warm golden highlights and deep cool-blue shadows, crisp focus on the aircraft, 16:9 widescreen. The attached reference images show the exact aircraft design; reproduce that machine faithfully in shape, parts and colors, and replace their plain grey studio background and ground shadow entirely with the scene described.
```

### À vérifier sur le résultat
- Espace négatif suffisant pour titre + logo
- Palette cohérente avec S4

*Coût estimé : 0.5 crédit(s) d'images + 0 crédits de vidéo.*

---

## Liste de contrôle qualité
```json
[
 {
  "id": "Q1",
  "piege": "Dérive de la forme de l'aile (aile rigide, aile d'avion, parapente avec suspentes)",
  "gravite": "bloquant",
  "formulation_positive": "flexible fabric delta wing, like a large hang-glider wing; swept-back V leading edge; softly scalloped trailing edge between batten tips; hangs from a single hang point on top of an inclined copper mast",
  "detection": "Saumons carrés, profil épais rigide, fuselage, empennage, ailerons, suspentes, voile en arc de parapente. Vérifier au début, au milieu et à la fin du clip."
 },
 {
  "id": "Q2",
  "piege": "Nombre de roues",
  "gravite": "bloquant si les roues sont visibles",
  "formulation_positive": "exactly three wheels, one small front wheel on a navy-blue fork and two main wheels at the rear on copper legs; three wheels throughout",
  "detection": "Compter sur l'image clé et sur 3 images du clip (début / milieu / fin). Une 4e roue qui apparaît en rotation = rejet."
 },
 {
  "id": "Q3",
  "piege": "Sens / position de l'hélice (tractive à l'avant, pales mal placées)",
  "gravite": "bloquant",
  "formulation_positive": "a silver engine behind the rear seat driving a black pusher propeller at the very back of the trike, behind the engine; the pusher propeller spins as a translucent dark blur disc",
  "detection": "Hélice devant la nacelle bleu nuit ou au-dessus de l'aile = rejet. Nombre de pales : non contrôlé (disque flou). Voir PROP_STATIC si hélice arrêtée."
 },
 {
  "id": "Q4",
  "piege": "Couleurs de l'aile qui changent entre les plans",
  "gravite": "bloquant",
  "formulation_positive": "pure white upper surface; light-grey leading-edge sleeve; navy-blue front underside edged by a thin copper stripe from tip to tip; white rear sail with battens (texte identique partout + image A0 en référence)",
  "detection": "Planche contact des 7 images retenues côte à côte avant toute animation. Extrados coloré, intrados uni, bande cuivre absente sur une vue de dessous = rejet."
 },
 {
  "id": "Q5",
  "piege": "Tube visible sous le nez de l'aile / poteau au-dessus de l'aile",
  "gravite": "bloquant si visible",
  "formulation_positive": "the nose of the wing is a clean bare V with open sky beneath it; one short aluminum keel tube extends rearward from the hang point; the top of the wing is smooth and clean",
  "detection": "Regarder sous la pointe avant du V et au-dessus de l'extrados. Ciel visible sous le nez = OK."
 },
 {
  "id": "Q6",
  "piege": "Objets, texte, logos, immatriculation inventés",
  "gravite": "bloquant (sauf si recadrable dans FCP)",
  "formulation_positive": "plain unmarked surfaces in copper, navy-blue, white and grey",
  "detection": "Zoom 200 % sur l'aile, la nacelle, le réservoir, le décor (panneaux, manche à air avec texte)."
 },
 {
  "id": "Q7",
  "piege": "Pilote déformé (membres en trop, visage, position hors siège, passager fantôme)",
  "gravite": "fort",
  "formulation_positive": "one pilot in the front seat, small in frame, dark flight suit, matte dark helmet and goggles covering the face, gloved hands on the silver base bar; the rear seat is unoccupied",
  "detection": "Le pilote doit rester petit. Si déformation visible seulement 2-3 images : tolérable à cette vitesse de montage."
 },
 {
  "id": "Q8",
  "piege": "Physique : rase-mottes trop bas",
  "gravite": "bloquant",
  "formulation_positive": "flying about 4 meters above the ground, with a clear gap of open air between its three wheels and the sand, its crisp shadow on the ground just below and slightly behind it",
  "detection": "Ombre collée aux roues ou roues dans le sable = rejet. La hauteur doit rester constante dans le clip."
 },
 {
  "id": "Q9",
  "piege": "Physique : eau (amerrissage, gerbes, reflet faux)",
  "gravite": "bloquant",
  "formulation_positive": "about 8 meters above the glassy water, its clear reflection below, a soft fan of ripples behind the propeller",
  "detection": "Contact avec l'eau, gerbe, reflet décalé ou absent = rejet."
 },
 {
  "id": "Q10",
  "piege": "Physique : poussière exagérée / posé irréaliste",
  "gravite": "fort",
  "formulation_positive": "a faint thin veil of fine dust (S2) ; rear main wheels touch first raising a burst of fine golden dust, then the front wheel settles (S4)",
  "detection": "Tempête de sable, rebond, enfoncement, roue avant qui touche en premier, machine qui s'arrête net."
 },
 {
  "id": "Q11",
  "piege": "Lumière incohérente entre les plans",
  "gravite": "fort",
  "formulation_positive": "golden hour, sun about 10 degrees above the horizon on the left side of the frame, warm low side-light, long soft shadows (phrase identique partout)",
  "detection": "Ombres qui partent dans des directions différentes d'un plan à l'autre, ciel bleu de midi, coucher rouge trop saturé. Corrigeable partiellement à l'étalonnage FCP."
 },
 {
  "id": "Q12",
  "piege": "Couleurs machine (cuivre devenu orange vif ou doré, bleu nuit devenu noir ou bleu roi)",
  "gravite": "fort",
  "formulation_positive": "copper-colored tubular frame; navy-blue seats, fork and instrument pod",
  "detection": "Comparer à la palette (#B8652E cuivre, #1F2A4D bleu nuit). Écart léger = étalonnage FCP, écart fort = rejet."
 },
 {
  "id": "Q13",
  "piege": "Morphing en vidéo (la machine se transforme en cours de clip)",
  "gravite": "bloquant dans la fenêtre utilisée",
  "formulation_positive": "The aircraft keeps exactly the same shape, proportions and colors as in the start frame for the whole shot",
  "detection": "Lire le clip image par image UNIQUEMENT dans la fenêtre utile : un défaut hors fenêtre ne compte pas."
 },
 {
  "id": "Q14",
  "piege": "Ralenti involontaire (le modèle anime trop lentement)",
  "gravite": "tolérable",
  "formulation_positive": "Real-time speed, fast, swiftly",
  "detection": "Corrigé au montage par une vitesse de 110 à 130 %."
 }
]
```