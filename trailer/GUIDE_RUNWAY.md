# Trailer « FEEL IT FREE » : guide complet pour Runway (V3)

Remplace `PROMPTS_V2.md`, `GUIDE_HIGGSFIELD.md` et `prompts.json`. Prompts en anglais, explications en français.

**Contexte** : 500 crédits Runway. Montage final dans Final Cut Pro X. Musique : piste témoin seulement (voir §10). Nom de la machine : **FILL** (jeu de mots « feel it » / « fill it », le réservoir). Signature : **FILL by La Mouette**. Un seul logo : La Mouette.

> ⚠️ Je ne peux pas piloter Runway : c'est vous qui lancez les générations. Les noms de menus et les prix par seconde cités ici viennent de sources non officielles et peuvent avoir changé : **lisez toujours le coût affiché par Runway avant de lancer**.

---

## 1. Jeu d'images de référence (dans `trailer/refs/`)
| Fichier | Contenu | Sert à |
|---|---|---|
| `1_trois_quarts_avant.png` | machine entière, 3/4 avant | tous les plans larges |
| `2_profil.png` | profil pur | plans larges de côté (D1, L1) |
| `3_face.png` | vue de face | plans de face |
| `4_trois_quarts_arriere.png` | 3/4 arrière | hélice derrière, E1 |
| `5_dessous.png` | dessous de l'aile | plans vus d'en bas |
| `6_dessus.png` | dessus de l'aile | plans vus d'en haut |
| `7_roue_arriere_jambe.png` | roue arrière + jambe cuivre + réservoir | C2, C3 |
| `8_roue_avant_fourche.png` | roue avant + fourche + bulle | plans de l'avant |
| `9_sieges_tableau_bord.png` | sièges bleu nuit à bande cuivre + tableau de bord | plans de la nacelle |
| `10_moteur_helice_arriere.png` | moteur + hélice **3 pales**, vue arrière | C1, plans arrière |
| `11_helice_gros_plan.png` | hélice et moyeu en gros plan | C1 |
| `12_nez_aile_trapeze.png` | nez de l'aile, trapèze, haubans | plans sous l'aile |
| `0_hero_fond_transparent.png` | rendu 3D exact, **fond transparent** | carte de fin (jamais l'IA) |

**Les rendus sont une vérité de forme, pas de lumière** : fond gris, ombre au sol. Le prompt remplace le décor.

### Quelles références joindre (3 maximum par génération dans Runway « References »)
| Plan | Références |
|---|---|
| M1, E1 (large, machine petite) | `1_trois_quarts_avant` + `2_profil` + `4_trois_quarts_arriere` |
| D1, L1 (large, machine moyenne) | `2_profil` + `1_trois_quarts_avant` + `7_roue_arriere_jambe` |
| C1 (hélice) | `11_helice_gros_plan` + `10_moteur_helice_arriere` |
| C2, C3 (roues) | `7_roue_arriere_jambe` + `8_roue_avant_fourche` |
| Plans vus d'en bas | `5_dessous` + `12_nez_aile_trapeze` + `1_trois_quarts_avant` |

Dans Runway References, chaque image reçoit un nom (tag) que l'on cite dans le prompt avec `@`. **Nommez-les `@machine`** (les 3 images de la machine) et remplacez dans les prompts « the attached reference images » par « @machine ».

---

## 2. Règles de rédaction (apprises de vos tests)
1. **Mots bannis** : *mast, king post, pole, fairing, pod, fuselage, cockpit, tail, wheel pants*. Ils ont provoqué le poteau au-dessus de l'aile et les carénages blancs.
2. **Employer** : « a white hang-glider wing with a dark navy underside » · « an open carriage of copper-colored tubes » · « black rubber wheels on thin copper legs » · « a spinning propeller blur disc behind the carriage ».
3. **Images** : décrire peu, et finir par `Faithfully reproduce @machine; add no part that is not in it.`
4. **Vidéos** : le prompt ne décrit **que le mouvement** (l'image de départ porte la machine). Terminer par `The aircraft keeps exactly the same shape.`
5. **Plans de coupe d'abord** : la machine entière uniquement en plan large (petite, souvent en contre-jour). Les détails (roue, hélice) et les paysages sans machine sont fiables.
6. **Une seule modification à la fois** quand on retente.

---

## 3. Réglages Runway (à vérifier dans l'interface)
- Format : **16:9**.
- **Images de départ** : outil « References » (Gen-4 Image) : jusqu'à 3 images de référence, citées par @tag dans le prompt.
- **Vidéos** : modèle **image-vers-vidéo** le moins cher qui accepte une première image (Gen-4 Turbo d'après mes sources ; Gen-4 si la forme dérive). Durée minimale 5 s : générez 5 s, coupez dans FCP.
- Gardez toujours une **marge d'au moins 50 crédits**.

---

## 4. Budget (500 crédits : hypothèses à vérifier)
Sources non officielles : Gen-4 Turbo ≈ 5 crédits/s (**5 s ≈ 25 crédits**), Gen-4 ≈ 12 crédits/s (**5 s ≈ 60**), image Gen-4 1080p ≈ 8 crédits.

| Scénario | Images | Vidéos | Total | Réserve |
|---|---|---|---|---|
| **A : images avec Higgsfield** (0,25 crédit chez eux, si vous gardez des crédits là-bas) | 0 crédit Runway | 13 clips Turbo × 25 = 325 | 325 | **175** (≈ 7 clips) |
| **B : tout Runway** | 18 images × 8 = 144 | 11 clips Turbo × 25 = 275 | 419 | **81** (≈ 3 clips) |

Les 13 clips : M1 ×2, D1 ×2, E1 ×2, **L1 ×3** (le plus fragile), C1, C2, C3, P1. La carte de fin n'utilise que P1.
**Si l'un de ces prix est faux, arrêtez-vous au premier clip et recalculez.**

---

## 5. Grille de montage (calée sur vos attaques FCP, 30 i/s)
| # | FCP | Secondes | Plan | Type | Machine |
|---|---|---|---|---|---|
| 1 | 1:22 → 2:15 | 1,73 → 2,50 | **M1** montagne, contre-jour | large | silhouette |
| 2 | 2:15 → 3:06 | 2,50 → 3,20 | **C1** hélice à contre-jour | coupe | disque flou |
| 3 | 3:06 → 5:10 | 3,20 → 5,33 | **D1** désert rase-mottes | large | oui |
| 4 | 5:10 → 6:01 | 5,33 → 6,03 | **E1** eau | large | silhouette |
| 5 | 6:01 → 6:22 | 6,03 → 6,73 | **C2** roue au ras de l'eau | coupe | roue |
| 6 | 6:22 → 8:26 | 6,73 → 8,87 | **L1** approche et posé | large | oui |
| 7 | 8:26 → 9:17 | 8,87 → 9,57 | **C3** roue qui touche, poussière | coupe | roue |
| 8 | 9:17 → 10:08 | 9,57 → 10,27 | **P1** désert vide au crépuscule : titre **FEEL IT FREE** | paysage | non |
| 9 | 10:08 → fin | 10,27 → 12,65 | **FIN** : le titre devient **FILL**, rendu 3D + « by » + logo La Mouette | carte | rendu exact |

Contact des roues sur l'attaque la plus forte (8:26). Titre « FEEL IT FREE » à 9:17 ; à 10:08 il se transforme en **FILL**, avec « by » et le logo La Mouette.

---

## 6. Fiches plan

### M1 : montagne, large, contre-jour
**Références** : `@machine` (1, 2, 4). **Image :**
```
Cinematic film still, 16:9. Distant aerial view at golden hour: a small weight-shift microlight, a white hang-glider wing with a dark navy underside above an open carriage of copper-colored tubes, flies left to right along a ridge of snow-dusted mountains. Backlit, near silhouette, the aircraft about 20% of the frame width, warm haze, long shadows, soft clouds. Faithfully reproduce @machine; add no part that is not in it. Photorealistic, 85 mm, fine film grain.
```
**Vidéo (5 s) :**
```
Slow smooth glide from left to right along the ridge, the camera tracks the aircraft, the wing banks gently, clouds drift. The aircraft keeps exactly the same shape.
```

### D1 : désert, rase-mottes
**Références** : `@machine` (2, 1, 7). **Image :**
```
Cinematic film still, 16:9. Low tracking shot over a flat desert plain with low dunes: a small weight-shift microlight, a white hang-glider wing with a dark navy underside above an open carriage of copper-colored tubes with three black rubber wheels, flies left to right about 4 meters above the sand, clear air under the wheels, a crisp shadow on the sand, a faint thin trail of dust. The aircraft is about 35% of the frame width. Low golden sun on the left, distant mountains. Faithfully reproduce @machine; add no part that is not in it. Photorealistic, 50 mm, film grain.
```
**Vidéo (5 s) :**
```
Fast low side-tracking shot, the aircraft holds a constant low height, its shadow slides over the sand, a thin trail of dust drifts behind. The aircraft keeps exactly the same shape.
```

### E1 : eau, large
**Références** : `@machine` (1, 2, 4). **Image :**
```
Cinematic film still, 16:9. A small weight-shift microlight, a white hang-glider wing with a dark navy underside above an open carriage of copper-colored tubes, flies low over a calm sea at golden hour, left to right, its reflection on the water, the aircraft about 25% of the frame width, a low sun on the left, warm haze on the horizon. Faithfully reproduce @machine; add no part that is not in it. Photorealistic, 85 mm, film grain.
```
**Vidéo (5 s) :**
```
Slow tracking shot at water level, the aircraft glides left to right, small ripples spread on the water, the reflection follows. The aircraft keeps exactly the same shape.
```

### L1 : approche et posé (le plus fragile : prévoir 3 essais)
**Références** : `@machine` (2, 1, 7). **Image :**
```
Cinematic film still, 16:9. A weight-shift microlight, a white hang-glider wing with a dark navy underside above an open carriage of copper-colored tubes with three black rubber wheels, makes a gentle final approach to a rough dirt strip in the desert, about 1 meter above the ground, rocks and bushes along the strip, low golden sun. The aircraft is about 35% of the frame width, seen from the side. Faithfully reproduce @machine; add no part that is not in it. Photorealistic, 50 mm, film grain.
```
**Vidéo (5 s) :**
```
The aircraft descends slowly, flares, and its rear wheels touch the dirt at the end; a small puff of dust rises. The camera tracks alongside at the same speed. The aircraft keeps exactly the same shape.
```
Si le contact est raté : coupez juste avant et laissez **C3** faire le contact.

### C1 : hélice à contre-jour
**Références** : `@machine` (11, 10). **Image :**
```
Extreme close-up, 16:9: a black three-blade propeller spinning as a translucent blur disc in strong golden backlight, sun flare through the disc, out-of-focus snow-dusted mountains behind, a hint of silver metal at the edge of the frame. Faithfully reproduce the propeller of @machine. Photorealistic, 85 mm, film grain.
```
**Vidéo (5 s, garder 1 s) :** `The propeller keeps spinning fast as a blur disc, the sun flare pulses, a slight handheld camera shake.`

### C2 : roue qui frôle l'eau
**Références** : `@machine` (7, 8). **Image :**
```
Close-up, 16:9: a black rubber wheel on a thin copper-colored leg skims just above a calm sea surface at golden hour, a fine line of ripples behind it, warm low light, shallow depth of field. Faithfully reproduce the wheel of @machine. Photorealistic, 85 mm, film grain.
```
**Vidéo :** `The wheel skims just above the water, ripples trail behind it, the camera tracks at the same speed.`

### C3 : roue qui touche, poussière
**Références** : `@machine` (7, 8). **Image :**
```
Close-up, 16:9: a black rubber wheel on a thin copper-colored leg just touching the sand of a rough desert strip, a small burst of fine dust, low golden sun from the side, shallow depth of field. Faithfully reproduce the wheel of @machine. Photorealistic, 85 mm, film grain.
```
**Vidéo :** `The wheel touches the sand, a soft cloud of dust bursts outward and drifts away, the camera holds close.`

### P1 : désert vide au crépuscule (fond de la carte de fin)
**Aucune référence.** **Image :**
```
Wide cinematic shot, 16:9: an empty rough dirt airstrip in the desert at sunset, flat sand, distant mountains, warm orange sky fading to blue, a clear empty space in the middle of the frame, no aircraft, no people, no text. Photorealistic, 35 mm, film grain.
```
**Vidéo :** `Very slow push-in along the strip, fine dust drifting in the low light.`

### Plans de coupe de réserve (si un plan principal rate)
- **Bout d'aile** : `Close-up, 16:9: the tip of a white fabric hang-glider wing seen against a low golden sun, the fabric glowing, thin black battens visible, soft haze. Photorealistic, 85 mm.`
- **Main sur la barre** : `Close-up, 16:9: a gloved hand gripping a silver metal bar, blurry golden mountains far behind, shallow depth of field. No face. Photorealistic, 85 mm.`
- **Tube cuivre** : `Close-up, 16:9: a copper-colored metal tube catching a sun flare, bokeh of golden mountains behind, slight vibration. Photorealistic, 85 mm.`

---

## 7. Carte de fin (10:08 → fin) : aucune machine générée par l'IA
1. Vidéo **P1** (paysage vide), 5 s : gardez les 2,4 s utiles.
2. Posez dessus `0_hero_fond_transparent.png` (détouré, **sans ombre au sol** : ajoutez-en une dans FCP).
3. **Titre en deux temps** (le jeu de mots doit se *voir*, car Facebook se regarde souvent sans le son) :
   - **9:17** : « FEEL IT FREE » apparaît sur le paysage vide.
   - **10:08** : sur l'attaque, les lettres de « FEEL » se transforment en **« FILL »** (E → I, E → L : deux lettres changent) pendant que « IT FREE » s'efface. La machine (rendu 3D) arrive en même temps.
   - **À 10:40 environ** : sous « FILL », petit « **by** » puis le logo La Mouette (`trailer/assets/lamouette_logo_hd.png`). Tenir jusqu'à la fin (12,65 s).
4. Le rendu 3D est « propre » et le paysage « photo » : raccordez par un **étalonnage commun**, une légère ombre sous la machine, du grain, un flou de profondeur sur le paysage.

---

## 8. Contrôle avant d'animer une image
- [ ] Aile : delta souple, **rien au-dessus**, extrados blanc, intrados bleu nuit.
- [ ] **Rien** sous le nez de l'aile.
- [ ] Trois roues, aucun carénage blanc.
- [ ] Hélice derrière la machine, **3 pales** (disque flou).
- [ ] Aucun texte, logo, visage net.
- [ ] Soleil bas, doré, du même côté d'un plan à l'autre.

Défaut dans l'**image** → refaire l'image. Ne pas l'animer « pour voir » : un clip coûte bien plus qu'une image.

## 9. Ordre des opérations
1. Vérifier le solde Runway et le prix d'un clip de 5 s (affiché avant lancement).
2. Images de **L1 d'abord** (le plus risqué), puis D1, M1, E1, plans de coupe, P1. 2 à 3 variantes par plan.
3. Choisir une image par plan (contrôle §8).
4. Animer **L1** : 1 clip. Si la machine dérive, essayez Gen-4 (plus cher) sur ce plan seulement, ou raccourcissez-le au montage.
5. Animer D1, M1, E1, puis les plans de coupe. Noter les crédits restants à chaque clip.
6. Arrêt si la réserve passe sous 50 crédits.
7. Télécharger tous les clips en qualité maximale.

## 10. Final Cut et conformité
- **Montage** : vitesse 110 à 130 % ; stabilisation légère ; **étalonnage commun** (même courbe et même teinte chaude sur tous les plans) ; grain unifié ; ajouter bruit de vent et d'hélice si vous remplacez la musique.
- **Musique** : « You Know My Name » est une œuvre protégée. Gardez-la comme piste témoin, **à remplacer avant publication** (bibliothèque sonore de Meta, titre libre de droits, ou licence).
- **Facebook** : signalez les contenus réalistes générés par IA selon la règle actuelle de Meta ; vérifiez-la.
- **Runway** : le plan gratuit met un filigrane. Vérifiez que votre plan retire le filigrane et autorise l'usage commercial avant publication.
- **Nom FILL** : vérifiez la disponibilité de la marque (INPI / EUIPO, classe 12 véhicules et aéronefs) avant une diffusion publique : « fill » est un mot courant. « FILL **by La Mouette** » associe le nom de La Mouette à votre produit : leur accord écrit est nécessaire.
- **La Mouette** : demandez l'autorisation d'afficher leur logo et, si possible, le fichier vectoriel officiel (celui du dépôt est reconstitué à partir d'une image de 156 px).
