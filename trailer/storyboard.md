# Trailer « FEEL IT FREE » : storyboard

Pendulaire ULM (trike + aile delta souple). Page Facebook entreprise. 16:9, 12,65 s.
Livrable IA : **plans vidéo bruts + images clés uniquement**. Montage, titres, logo La Mouette et musique se font dans Final Cut Pro X.
Prompts et budget détaillés : `prompts.json` (même dossier).

---

## 0. À lire avant de dépenser le moindre crédit

| # | Point | Action |
|---|---|---|
| 1 | **Nombre de pales.** Le brief dit « hélice bipale », mais les rendus `3_face.png` et `4_trois_quarts_arriere.png` montrent nettement **3 pales** (une en haut, deux en bas). Comme les rendus servent de référence, le modèle copiera ce qu'il voit. | Vérifie sur la vraie machine. En vol et au posé, l'hélice tourne : tous les prompts la décrivent comme un **disque flou** (« blur disc »), ce qui neutralise le problème. Le jeton `PROP_STATIC` de `prompts.json` est à ajuster une seule fois si une image montre l'hélice arrêtée. |
| 2 | **Carte de fin décalée de 0,70 s** (voir §2). | À valider. Sinon, le contact des roues tombe sur la toute dernière image avant la carte et on ne le voit pas. |
| 3 | **Prix.** Les prix ont été relevés à la main. | Avant chaque lancement vidéo, vérifie le coût affiché par Higgsfield. S'il dépasse le tableau du §5, arrête-toi et réévalue. |

---

## 1. Description de la machine (tirée des 6 rendus)

**Configuration générale.** Pendulaire biplace en tandem : un chariot ouvert à 3 roues suspendu sous une aile delta souple par un **point d'accroche unique** au sommet d'un mât incliné. L'avant de la machine se lit à droite sur le profil (`2_profil.png`) : nacelle bleu nuit et roue avant de ce côté, hélice de l'autre.

**Aile (aile delta souple, type aile de deltaplane).**
- Grande envergure (~10 m), allongement élevé, bord d'attaque en V flèché vers l'arrière, saumons légèrement arrondis.
- **Extrados blanc** (panneaux translucides très légèrement bleutés, visibles seulement de dessus et en contre-jour).
- **Fourreau de bord d'attaque gris clair**, sur tout le V avant.
- **Intrados** : la partie avant de la corde (zone de double surface, environ 60 %) est **bleu nuit / indigo**. Une **fine bande cuivre** court d'un saumon à l'autre, le long de la limite arrière de cette zone. Derrière, la voile simple surface apparaît **blanc/gris clair** avec les **lattes** visibles.
- **Bord de fuite festonné** entre les extrémités de lattes (petits embouts noirs).
- Sous l'aile : **trapèze de contrôle noir** (deux montants noirs plus une barre de base gris argent devant le pilote) et **haubans** en câble fin. Une **courte quille alu** part de la ferrure d'accroche **vers l'arrière** et finit par un embout noir.
- **Sous le nez de l'aile, rien du tout** : le V du bord d'attaque est nu, on voit le ciel dessous. **Pas de mât-poteau (king-post) au-dessus de l'aile**, l'extrados est lisse.

**Chariot.**
- **Châssis tubulaire cuivre** (poutre basse, triangulation, jambes de train). **Mât incliné cuivre** (profilé plat) qui monte vers l'accroche.
- **3 roues exactement** : 1 roue avant petite sur **fourche bleu nuit**, avec **repose-pieds/pédales bleu nuit** ; 2 roues principales **à l'arrière**, sur jambes cuivre, avec petits carénages/garde-boue noirs. Pneus noirs ballon, jantes noires.
- **Nacelle/tableau de bord bleu nuit** arrondie, tout à l'avant, montée sur le tube avant cuivre. Elle porte les instruments, tournés vers le pilote.
- **Deux sièges baquets en tandem**, coque sombre bleu nuit, garniture bleu nuit avec **bande cuivre**.
- **Réservoir gris** (boîte parallélépipédique) sous et derrière les sièges.
- **Moteur type Rotax, gris argent**, derrière le siège arrière, avec radiateur dessous. **Hélice noire propulsive tout à l'arrière**, derrière le moteur, sous l'arrière de l'aile.
- **Aucun logo, aucun texte, aucune immatriculation.**

**Pilote.** Un seul, en place avant, mains sur la barre de base. Combinaison sombre, casque sombre mat et lunettes. Toujours petit dans le cadre ou de dos, jamais de visage net. Siège arrière vide (un passager ajoute un risque de déformation sans rien apporter).

**Palette de référence.** Cuivre `#B8652E` / `#C97A3D` · bleu nuit `#1F2A4D` (sièges, nacelle, fourche) · intrados indigo `#3A3B5E` · blanc voile `#F3F3F1` · fourreau gris clair `#CFD2D5` · réservoir gris `#A9ACAF` · trapèze noir `#1A1A1A`.

---

## 2. Découpage calé sur la musique

Timecodes FCP au format **s:ii** (secondes:images, 30 i/s). Toutes les coupes tombent sur une attaque.

| Plan | Entrée FCP | Sortie FCP | Entrée (s) | Sortie (s) | Durée | Images |
|---|---|---|---|---|---|---|
| Pré-roll (noir) | 0:00 | 1:22 | 0,00 | 1,73 | 1,73 s | 52 |
| **S1a** Montagne, plan large | 1:22 | 2:15 | 1,73 | 2,50 | 0,77 s | 23 |
| **S1b** Montagne, insert survol | 2:15 | 3:06 | 2,50 | 3,20 | 0,70 s | 21 |
| **S2** Désert, rase-mottes | 3:06 | 5:10 | 3,20 | 5,33 | 2,13 s | 64 |
| **S3a** Eau, plan large | 5:10 | 6:01 | 5,33 | 6,03 | 0,70 s | 21 |
| **S3b** Eau, insert ras de l'eau | 6:01 | 6:22 | 6,03 | 6,73 | 0,70 s | 21 |
| **S4** Approche + **contact à 8:26** + roulage | 6:22 | 9:17 | 6,73 | 9,57 | 2,84 s | 85 |
| **Carte de fin** (titre dès 9:17) | 9:17 | 12:19/12:20 | 9,57 | 12,65 | 3,08 s | ~92 |
| ↳ logo La Mouette | 10:08 | fin | 10,27 | 12,65 | | |

### Ajustement proposé et justification
- **S4 se prolonge jusqu'à 9,57** au lieu de 8,87. Le **contact des roues reste exactement sur l'attaque la plus forte (8:26)**, et on garde **0,70 s de roulage et de nuage de poussière** derrière. Si la carte de fin démarrait à 8,87, le contact serait la dernière image : le moment le plus fort de la musique ne montrerait rien.
- **Le titre « FEEL IT FREE » arrive à 9:17 (9,57), comme prévu**, en même temps que l'entrée de la carte de fin. **Le logo à 10:08 (10,27) ne bouge pas.**
- Si tu préfères garder ton découpage d'origine (carte à 8,87), prends la variante B : couper S4 à 8:26 et poser le titre seul à 9,57 sur la carte. Le timing du clip ne change pas.

---

## 3. Plan par plan

Règle générale pour la fenêtre utile : **jeter les 0,5 premières secondes** de chaque clip (l'image de départ y est figée et le mouvement démarre mal) et **éviter la dernière demi-seconde** (dérive de forme plus probable). Les modèles ont tendance à ralentir l'action : accélérer de 110 à 130 % dans FCP (Vitesse > Personnalisée) est prévu et sans risque.

**Direction à l'écran (règle de l'axe).** La machine va **de gauche à droite** dans S1a, S2 et S3a. S1b et S3b sont des passages au-dessus de la caméra. En S4, elle vient vers la caméra. **Soleil bas, à gauche du cadre, dans tous les plans** : même heure dorée et même côté éclairé.

### Pré-roll : 0:00 → 1:22 (silence)
- Noir complet, avec éventuellement un souffle de vent ou un moteur lointain qui monte (son libre de droits). **Aucun coût de génération.**
- Coupe franche du noir vers S1a sur la 1re attaque (1:22). Le contraste noir/lumière dorée fait l'accroche.

### S1a : Montagne, plan large (1:22 → 2:15, 0,77 s)
- **Intention** : poser l'immensité et la liberté. Premier contact avec la silhouette de l'aile.
- **Cadrage** : plan très large, téléobjectif ~135 mm depuis un hélico, légère plongée. Machine petite (~20 % de la largeur), tiers gauche, vers la droite. Crête rocheuse sur le tiers bas, vallée dans l'ombre, sommets enneigés au loin.
- **Caméra** : travelling de poursuite latéral, léger push-in, fort parallaxe de la crête.
- **Lumière** : heure dorée, soleil bas à gauche, extrados blanc qui prend le chaud.
- **On voit** : la silhouette delta (le V et le bord de fuite festonné), le chariot cuivre, le disque d'hélice. Aucun détail fin.
- **Fenêtre** : 1,0 → 1,8 s du clip (0,77 s utiles). Accélérer à 120 % si ça paraît lent.
- **Transition** : coupe franche sur 2:15.

### S1b : Montagne, insert survol (2:15 → 3:06, 0,70 s)
- **Intention** : le « whoosh », la vitesse au ras d'un sommet. Révéler la signature couleur de l'intrados (bleu nuit et bande cuivre).
- **Cadrage** : contre-plongée depuis un sommet rocheux. La machine passe juste au-dessus et un peu à droite de la caméra puis s'éloigne vers la vallée. On voit l'intrados bleu nuit, la bande cuivre, le trapèze noir et les 3 roues en silhouette, avec un flare solaire au saumon.
- **Caméra** : panoramique rapide qui suit.
- **Fenêtre** : 0,8 → 1,5 s (le passage au plus près).
- **Repli gratuit** si le budget manque : **punch-in** (zoom 130-150 % dans FCP) sur une autre partie du clip S1a, monté comme un jump-cut.
- **Transition** : coupe franche sur 3:06.

### S2 : Désert, rase-mottes (3:06 → 5:10, 2,13 s)
- **Intention** : vitesse, sol qui défile, sensation physique. C'est le plan le plus long du film : il porte l'énergie.
- **Cadrage** : caméra à ~1 m du sol, 50 mm, vue de profil très légèrement en contre-plongée. Machine ~45 % de la largeur, centre-gauche, de gauche à droite, à **environ 4 m du sol** : un espace d'air net sous les roues et son **ombre portée nette** qui court sur le sable juste dessous. Fin voile de poussière soulevé par le souffle de l'hélice, derrière. Dunes basses et chaîne de montagnes à l'horizon, brume de chaleur.
- **Caméra** : véhicule de travelling à la même vitesse, premier plan de sol flou de vitesse. La machine prend un peu d'avance.
- **Fenêtre** : 0,5 → 2,63 s si clip de 3 s ; 1,0 → 3,13 s si clip de 5 s. En 3 s c'est serré : accélérer à 110 % libère de la marge.
- **Transition** : coupe franche sur 5:10.

### S3a : Eau, plan large (5:10 → 6:01, 0,70 s)
- **Intention** : respiration visuelle (couleur turquoise) sans baisser le rythme.
- **Cadrage** : drone à la hauteur de la machine, 35 mm. Lac turquoise calme dans un bassin rocheux ocre, falaises au fond. Machine ~30 % du cadre, de gauche à droite, **à ~8 m au-dessus de l'eau**, légère inclinaison vers la caméra. **Reflet** sur l'eau et **éventail de rides** derrière l'hélice.
- **Caméra** : drone qui recule latéralement en suivant.
- **Fenêtre** : 1,0 → 1,7 s.
- **Transition** : coupe franche sur 6:01.

### S3b : Eau, insert au ras de l'eau (6:01 → 6:22, 0,70 s)
- **Intention** : le plan « carte postale » mémorable, avec contre-jour doré et reflet.
- **Cadrage** : caméra juste au-dessus de la surface. La machine traverse le cadre en hauteur, de gauche à droite, en silhouette contre le ciel doré, avec son reflet. Scintillements au premier plan.
- **Fenêtre** : 1,0 → 1,7 s, au moment où la machine est au centre.
- **Repli gratuit** : punch-in sur S3a.
- **Transition** : coupe franche sur 6:22.

### S4 : Approche et posé sur piste sommaire (6:22 → 9:17, 2,84 s, contact à 8:26)
- **Intention** : le retour au sol, le « posé » comme ponctuation. Le contact des roues tombe sur le coup le plus fort de la musique.
- **Cadrage** : caméra au sol au bord d'une piste en terre très sommaire (deux traces de roues, cailloux, quelques pierres blanchies en balisage, buissons secs). 85 mm, contre-plongée légère. La machine arrive en courte finale vers la caméra, de trois quarts avant, nez légèrement cabré (arrondi), à ~2 m du sol. Montagnes au loin, soleil bas à gauche en lumière rasante.
- **Action** : descente, arrondi, **contact des 2 roues arrière d'abord** avec une gerbe de poussière dorée, puis la roue avant qui se pose. Roulage vers la caméra, la machine sort par la droite du cadre ou la frôle.
- **Caméra** : fixe au sol, léger panoramique de suivi.
- **Clip de 5 s.** Repère dans le clip l'image exacte du contact (`T`). **Fenêtre = T − 2,13 s → T + 0,70 s**, puis cale `T` sur 8:26 dans la timeline. Si `T` < 2,13 s, accélère l'approche (115-130 %) sur la portion avant `T` avec une rampe de vitesse.
- **Transitions** : sur 8:26, micro-secousse de 4 images et zoom 103 % → 100 % (effet « impact » FCP, facultatif). Sur 9:17, fondu enchaîné court (6 images) vers la carte de fin.

### Carte de fin (9:17 → fin 12:19/12:20)
- **Fond** : image fixe générée (0,25 crédit l'image). Piste désertique au crépuscule doré, voile de poussière en suspension, machine posée en petite silhouette au tiers droit avec l'aile en contre-jour, ciel chaud et vide sur les deux tiers gauches. Lent zoom avant 100 → 106 % dans FCP. Alternative gratuite : figer la dernière image de S4, flou gaussien 20 et assombrir de 30 %.
- **Titre « FEEL IT FREE »** (posé dans FCP, jamais généré) : il apparaît à **9:17**, centré ou dans le tiers gauche, sur l'espace vide du ciel. Apparition sèche sur l'attaque ou révélation par masque en 4-6 images. Grande capitale sans-serif, blanc cassé `#F3F3F1`, éventuellement un soulignement cuivre `#C97A3D`.
- **Logo La Mouette** : il apparaît à **10:08** (10,27 s), sous le titre ou en bas à droite, fondu en 8 images.
- **Zone de sécurité Facebook** : garder titre et logo dans les 80 % centraux. Rien dans les 15 % du bas (l'interface et les sous-titres du fil les recouvrent).
- **Sortie** : fondu au noir sur les 10 dernières images (12:10 → 12:20).

---

## 4. Pièges IA : résumé (détail dans `prompts.json` → `checklist_qualite`)

| Piège | Parade dans le prompt (formulation positive) | Comment le repérer |
|---|---|---|
| Forme de l'aile (rigide, parapente) | « flexible fabric delta wing, swept-back V leading edge, scalloped trailing edge between battens, hangs from a single point on the mast » | Saumons carrés, profil épais, suspentes (= parapente), ailerons, empennage |
| Nombre de roues | « exactly three wheels: one small front wheel, two main wheels at the rear » | Compter les roues sur l'image clé ET sur 3 images du clip |
| Hélice | « pusher propeller at the very back of the trike, behind the engine, spinning as a blur disc » | Hélice devant la nacelle = rejet |
| Couleur de l'aile | Même phrase d'aile mot pour mot partout, plus l'image maîtresse A0 en référence | Comparer les 6 images clés côte à côte avant d'animer |
| Tube sous le nez | « the nose of the wing is a clean bare V with open sky beneath it; the only tube under the sail is a short aluminum keel pointing rearward » | Regarder sous la pointe avant de l'aile |
| Texte, logos inventés | « plain unmarked surfaces » | Zoomer sur l'aile, la nacelle, le réservoir |
| Pilote déformé | Pilote petit, casque et lunettes, mains sur la barre | Membres en trop, visage visible, pilote hors du siège |
| Physique | Hauteurs chiffrées, espace d'air sous les roues, ombre portée, poussière « faint thin veil » | Roues qui touchent le sol en S2, sillage dans l'eau en S3, poussière exagérée |
| Lumière | Phrase LIGHT identique : soleil 10°, à gauche du cadre | Planche contact des images clés : même côté éclairé |

---

## 5. Budget (résumé)

| Poste | Crédits |
|---|---|
| Images clés (32 images à 0,25) | 8,00 |
| Réserve de reprises d'images (12 à 0,25) | 3,00 |
| Vidéos de base (S1a Grok Lite 5 s ; S1b, S2, S3a, S3b en 3 s ; S4 Kling 5 s) | 39,00 |
| **Total nominal** | **50,00** |
| Conditionnel : S1a refait en Kling si le test Grok échoue | +6,00 |
| Réserve de reprises vidéo (1 × S4 en 5 s + 2 × plans de 3 s) | +22,00 |
| Escalade éventuelle MiniMax H3 Max sur S4 uniquement | +12,50 |
| **Plafond absolu si tout part en reprise** | **90,50** |
| Marge intouchable | 5 (jamais sous 5 crédits restants) |

Seedance est exclu : un seul clip coûterait entre 35 et 80 crédits, et le brouillon 480p n'est pas diffusable.
L'ordre exact des opérations et les règles de décision sont dans `prompts.json` → `ordre_des_operations` et `budget.regles_de_decision`.
