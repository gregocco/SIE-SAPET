> **REMPLACÉ par `GUIDE_RUNWAY.md`** (V3 : 12 références, plans de coupe, budget Runway).

# Prompts V2 : trailer « FEEL IT FREE » (remplace GUIDE_HIGGSFIELD.md et prompts.json)

Valable pour n'importe quel générateur (Higgsfield, Runway, Kling, Pika…). Anglais pour les prompts, français pour le reste.

## Ce qui a changé et pourquoi
Vos tests ont montré que l'IA ajoute un poteau au-dessus de l'aile et des carénages blancs sur les roues. Causes :
1. Les anciens prompts contenaient les mots **mast** et **fairings**. Le modèle les a pris au pied de la lettre.
2. Ils décrivaient la machine pièce par pièce (4 000 caractères). Plus on décrit, plus le modèle invente.
3. On lui demandait de dessiner la machine entière sur des plans rapprochés, là où les erreurs se voient le plus.

**Nouvelle règle** : la machine entière n'apparaît qu'en plan large (petite dans l'image, souvent en contre-jour), et le reste du film est fait de **plans de coupe** (détails faciles) et de **paysages sans machine**. La carte de fin utilise votre rendu 3D exact, jamais l'IA.

## Mots
| À bannir (ils ont provoqué les défauts) | À employer |
|---|---|
| mast, king post, pole, strut above the wing | « a white hang-glider wing with a dark navy underside » |
| fairing, pod, fuselage, cockpit, tail | « an open carriage made of copper-colored tubes » |
| wheel pants, spats | « black rubber wheels on thin copper legs » |
| propeller « at the front » | « a spinning propeller blur disc behind the carriage » |
| orange stripe on the wing | (la bande cuivre est sous l'aile, ne la mentionnez pas du dessus) |
| précisions sur chaque pièce | ne décrire que ce qui est visible dans le plan |

Phrase d'ancrage (à ajouter à la fin de **chaque** prompt d'image qui montre la machine) :
`Faithfully reproduce the aircraft of the attached reference images; add no part that is not in them.`

Pour les **vidéos** : on part d'une image validée (première image du clip) et le prompt ne décrit **que le mouvement**, pas la machine. Fin du prompt vidéo : `The aircraft keeps exactly the same shape.`

## Grille de montage (calée sur vos attaques FCP, 30 i/s)
| # | Fenêtre FCP | Secondes | Plan | Type | Machine visible ? |
|---|---|---|---|---|---|
| 1 | 1:22 → 2:15 | 1,73 → 2,50 | **M1** montagne, large, contre-jour | machine petite | oui, silhouette |
| 2 | 2:15 → 3:06 | 2,50 → 3,20 | **C1** hélice à contre-jour | coupe | non (disque flou) |
| 3 | 3:06 → 5:10 | 3,20 → 5,33 | **D1** désert, rase-mottes, large | machine moyenne | oui |
| 4 | 5:10 → 6:01 | 5,33 → 6,03 | **E1** eau, large | machine petite | oui, silhouette |
| 5 | 6:01 → 6:22 | 6,03 → 6,73 | **C2** roue qui frôle l'eau | coupe | roue seulement |
| 6 | 6:22 → 8:26 | 6,73 → 8,87 | **L1** approche et posé | machine moyenne | oui |
| 7 | 8:26 → 9:17 | 8,87 → 9,57 | **C3** roue qui touche, poussière | coupe | roue seulement |
| 8 | 9:17 → 10:08 | 9,57 → 10,27 | **P1** désert au crépuscule, vide | paysage | non |
| 9 | 10:08 → fin | 10,27 → 12,65 | **FIN** rendu 3D exact + logo + « FEEL IT FREE » | carte | rendu 3D |

Le contact des roues (plan 6 → 7) tombe sur l'attaque la plus forte (8:26). Titre « FEEL IT FREE » à 9:17, logo La Mouette à 10:08.

**Plans de coupe de réserve** (à générer si un plan principal rate) : bout d'aile en silhouette sur le soleil · main gantée sur une barre argent · tube cuivre avec reflet solaire.

Chaque clip est généré plus long que ce qu'on garde (2 à 5 s), puis coupé dans Final Cut : vous gardez la fenêtre qui est bonne.

---

## Plans avec machine entière (4 plans : M1, D1, E1, L1 ; le plus risqué est L1)

### M1 : montagne, large, contre-jour
**Image** (joindre `1_trois_quarts_avant.png`, `2_profil.png`) :
```
Cinematic film still, 16:9. Distant aerial view at golden hour: a small weight-shift microlight, a white hang-glider wing with a dark navy underside above an open carriage of copper-colored tubes, flies left to right along a ridge of snow-dusted mountains. Backlit, near silhouette, the aircraft about 20% of the frame width, warm haze, long shadows, soft clouds. Faithfully reproduce the aircraft of the attached reference images; add no part that is not in them. Photorealistic, 85 mm, fine film grain.
```
**Vidéo** (4 à 5 s) :
```
Slow smooth glide from left to right along the ridge, the camera tracks the aircraft, the wing banks gently, clouds drift. The aircraft keeps exactly the same shape.
```

### D1 : désert, rase-mottes, large
**Image** (mêmes références) :
```
Cinematic film still, 16:9. Low tracking shot over a flat desert plain with low dunes: a small weight-shift microlight, a white hang-glider wing with a dark navy underside above an open carriage of copper-colored tubes with three black rubber wheels, flies left to right about 4 meters above the sand, clear air under the wheels, a crisp shadow on the sand, a faint thin trail of dust. The aircraft is about 35% of the frame width. Low golden sun on the left, distant mountains. Faithfully reproduce the aircraft of the attached reference images; add no part that is not in them. Photorealistic, 50 mm, film grain.
```
**Vidéo** :
```
Fast low side-tracking shot, the aircraft holds a constant low height, its shadow slides over the sand, a thin trail of dust drifts behind. The aircraft keeps exactly the same shape.
```

### E1 : eau, large
**Image** :
```
Cinematic film still, 16:9. A small weight-shift microlight, a white hang-glider wing with a dark navy underside above an open carriage of copper-colored tubes, flies low over a calm sea at golden hour, left to right, its reflection on the water, the aircraft about 25% of the frame width, a low sun on the left, warm haze on the horizon. Faithfully reproduce the aircraft of the attached reference images; add no part that is not in them. Photorealistic, 85 mm, film grain.
```
**Vidéo** :
```
Slow tracking shot at water level, the aircraft glides left to right, small ripples spread on the water, the reflection follows. The aircraft keeps exactly the same shape.
```

### L1 : approche et posé sur une piste sommaire (le plan le plus fragile)
**Image** :
```
Cinematic film still, 16:9. A weight-shift microlight, a white hang-glider wing with a dark navy underside above an open carriage of copper-colored tubes with three black rubber wheels, makes a gentle final approach to a rough dirt strip in the desert, about 1 meter above the ground, rocks and bushes along the strip, low golden sun. The aircraft is about 35% of the frame width, seen from the side. Faithfully reproduce the aircraft of the attached reference images; add no part that is not in them. Photorealistic, 50 mm, film grain.
```
**Vidéo** (5 s) :
```
The aircraft descends slowly, flares, and its rear wheels touch the dirt at the end; a small puff of dust rises. The camera tracks alongside at the same speed. The aircraft keeps exactly the same shape.
```
Si le posé est raté (poussière exagérée, roues qui s'enfoncent) : couper juste avant le contact et laisser le plan **C3** faire le contact.

---

## Plans de coupe (sans machine entière : faciles à réussir)

### C1 : hélice à contre-jour
**Image** (pas de référence nécessaire) :
```
Extreme close-up, 16:9: a black three-blade propeller spinning as a translucent blur disc in strong golden backlight, sun flare through the disc, out-of-focus snow-dusted mountains behind, a hint of silver metal at the edge of the frame. Photorealistic, 85 mm, film grain.
```
**Vidéo** (3 s) : `The propeller keeps spinning fast as a blur disc, the sun flare pulses, a slight handheld camera shake.`

### C2 : roue qui frôle l'eau
**Image** :
```
Close-up, 16:9: a black rubber wheel on a thin copper-colored leg skims just above a calm sea surface at golden hour, a fine line of ripples behind it, warm low light, shallow depth of field. Photorealistic, 85 mm, film grain.
```
**Vidéo** (3 s) : `The wheel skims just above the water, ripples trail behind it, the camera tracks at the same speed.`

### C3 : roue qui touche, poussière
**Image** :
```
Close-up, 16:9: a black rubber wheel on a thin copper-colored leg just touching the sand of a rough desert strip, a small burst of fine dust, low golden sun from the side, shallow depth of field. Photorealistic, 85 mm, film grain.
```
**Vidéo** (3 s) : `The wheel touches the sand, a soft cloud of dust bursts outward and drifts away, the camera holds close.`

### P1 : désert au crépuscule, vide (fond pour le titre)
**Image** :
```
Wide cinematic shot, 16:9: an empty rough dirt airstrip in the desert at sunset, flat sand, distant mountains, warm orange sky fading to blue, a clear empty space in the middle of the frame, no aircraft, no people, no text. Photorealistic, 35 mm, film grain.
```
**Vidéo** (3 s) : `Very slow push-in along the strip, fine dust drifting in the low light.`

### Plans de coupe de réserve
- **Bout d'aile sur le soleil** : `Close-up, 16:9: the tip of a white fabric hang-glider wing seen against a low golden sun, the fabric glowing, thin black battens visible, soft haze. Photorealistic, 85 mm.`
- **Main sur la barre** : `Close-up, 16:9: a gloved hand gripping a silver metal bar, blurry golden mountains far behind, shallow depth of field. No face. Photorealistic, 85 mm.`
- **Tube cuivre** : `Close-up, 16:9: a copper-colored metal tube catching a sun flare, bokeh of golden mountains behind, slight vibration. Photorealistic, 85 mm.`

---

## Carte de fin (9:17 → fin) : **aucune machine générée par l'IA**
1. Générez **P1** (paysage vide) en vidéo, 3 à 5 s.
2. Posez dessus le rendu 3D exact (`trailer/refs/1_trois_quarts_avant.png`, détouré : demandez-moi une version à fond transparent si besoin).
3. Texte « FEEL IT FREE » à 9:17 et logo La Mouette (`trailer/assets/lamouette_logo_hd.png`) à 10:08, dans Final Cut.

## Contrôle de chaque image (avant de l'animer)
- [ ] Aile : delta souple, **rien au-dessus**, extrados blanc, intrados bleu nuit.
- [ ] **Rien** sous le nez de l'aile.
- [ ] Trois roues, aucun carénage blanc.
- [ ] Hélice derrière la machine (disque flou).
- [ ] Aucun texte, aucun logo, aucun visage net.
- [ ] Lumière : soleil bas, doré, même côté d'un plan à l'autre.

Un défaut **dans l'image** se corrige en refaisant l'image (0,25 crédit chez Higgsfield). Ne l'animez pas pour « voir ».

## Budget indicatif (Higgsfield, prix relevés)
| Poste | Crédits |
|---|---|
| Images : environ 9 plans × 4 variantes × 0,25 | 9 |
| Vidéos Grok Lite 2 s ×9 | 18 |
| ou Wan 2.7 2 s ×9 | 27 |
| ou Kling Turbo 3 s ×9 | 40,5 |
| Réserve de reprises | 10 à 15 |

Sur Runway (plan gratuit, 125 crédits, filigrane) : environ 5 clips de 5 s : réservez-les aux plans L1 et D1, les plus importants.
