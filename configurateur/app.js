import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { toCreasedNormals, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { STICKERS, textSticker } from './stickers.js';

const MODEL_URL = './models/T2A_F3_deflecteurs.glb';
const STORE_KEY = 't2a-configurateur-v1';

// ---------------------------------------------------------------- groupes de pièces
// Premier motif qui correspond au nom du nœud gagne. `keep` : matériaux d'origine laissés tels quels.
const GROUPS = [
  { id: 'reservoir', label: 'Réservoir', re: /^CAR_025_F_RESERVOIR/ },
  { id: 'deflecteurs', label: 'Déflecteurs gravier', re: /^TRA_DEFLECTEUR/ },
  { id: 'parachute', label: 'Parachute & supports', re: /^B10_|^SUPPORT_B10/, hidden: true },
  { id: 'rivets_mat', label: 'Rivets du mât', re: /^MAT_V3_RIVETS/, def: 'laiton' },
  { id: 'mat', label: 'Mât central', re: /^B03_MAT_V3|^MAT_V3_|^ACCROCHE_AILE/, def: 'cuivre', decalTarget: true },
  { id: 'chassis', label: 'Châssis', re: /^B01_/, def: 'cuivre' },
  { id: 'train_ar', label: 'Train arrière (jambes)', re: /^B02_TRAIN/, def: 'cuivre' },
  { id: 'amort_ar', label: 'Amortisseurs arrière', re: /^B02_AMORTISSEUR/ },
  { id: 'pneus', label: 'Pneus', re: /^K02_ROUE_.*CAOUTCHOUC/ },
  { id: 'roues', label: 'Jantes', re: /^K02_ROUE_/ },
  { id: 'fourche', label: 'Train avant (fourche)', re: /^K0[2-8]_/ },
  { id: 'bati', label: 'Bâti moteur', re: /^B04_/ },
  { id: 'helice', label: 'Hélice', re: /^HELICE/ },
  { id: 'echappement', label: 'Échappement', re: /^B06_/ },
  { id: 'gaines', label: 'Protections thermiques (gaines)', re: /^B05_GAINE|^B05_GAINES_FEU_HUILE/ },
  { id: 'durites', label: 'Durites eau / huile / carburant', re: /DURITE|^B11_MANCHON|^B11_COUDE|^B05_MOTEUR_ROTAX_912_DURITES/ },
  { id: 'colliers', label: 'Colliers & raccords', re: /COLLIERS|^B05_MANCHONS_ALU|^B05_BRIDES_ADEL|^B05_GAINES_FEU_MANCHONS/ },
  { id: 'echangeur', label: 'Échangeur eau-huile', re: /^B05_ECHANGEUR|^B05_PLATINE_ECHANGEUR/ },
  { id: 'radiateur', label: 'Radiateur', re: /^B11_RADIATEUR|^B11_BOITIER/ },
  { id: 'moteur', label: 'Moteur Rotax 912', re: /^B05_MOTEUR_ROTAX_912_(?!DURITES)/ },
  { id: 'tdb_coque', label: 'Tableau de bord — coque', re: /^TDB_coque$/ },
  { id: 'tdb_plaque', label: 'Tableau de bord — plaque', re: /^TDB_plaque/ },
  { id: 'sieges', label: 'Sièges', re: /^B09_SIEGE/, tint: true },
];

// Variantes de composants : la version « native » est dans le GLB d'assemblage, les autres viennent des STEP convertis.
// `pose: 'exacte'` = calée au repère de l'assemblage (contrôle à 0,1 mm) ; `'estimee'` = calage automatique à valider.
const VARIANTS = {
  reservoir: [
    { id: 'native', label: 'Alu F3 (assemblage)' },
    { id: 'alu_step', label: 'Alu V2 indice F3 (STEP)', url: './models/reservoir_alu_step.glb', pose: 'exacte', look: 'alu_brosse' },
    { id: 'roto', label: 'Rotomoulé V17 indice A (col 75, r15)', url: './models/reservoir_roto.glb', pose: 'exacte', look: 'pehd' },
    { id: 'none', label: 'Aucun' },
  ],
  chassis: [
    { id: 'native', label: 'Châssis de l\'assemblage' },
    { id: 'chassis_D', label: 'Châssis indice D (STEP)', url: './models/chassis_D.glb', pose: 'estimee', look: 'cuivre' },
  ],
  echappement: [
    { id: 'native', label: 'Échappement de l\'assemblage' },
    { id: 'exh', label: 'Échappement 16-01a (STEP)', url: './models/echappement_16-01a.glb', pose: 'estimee', look: 'acier_graphite' },
  ],
};

// ---------------------------------------------------------------- bibliothèque de matériaux
const P = (color, metalness, roughness, extra = {}) => ({ color, metalness, roughness, ...extra });
const MATERIALS = {
  origine: { label: 'Origine (modèle)', orig: true },
  cuivre: { label: 'Cuivre satiné', ...P('#c8875a', 1, 0.32, { tex: 'brushed' }) },
  cuivre_patine: { label: 'Cuivre patiné', ...P('#8a5a3c', 1, 0.5, { tex: 'brushed' }) },
  cuivre_tresse: { label: 'Cuivre — gaine tressée', ...P('#a8683c', 0.9, 0.5, { tex: 'braid' }) },
  laiton: { label: 'Laiton vieilli', ...P('#a58a47', 1, 0.42, { tex: 'brushed' }) },
  alu_brosse: { label: 'Aluminium brossé', ...P('#c6c9cc', 1, 0.34, { tex: 'brushed' }) },
  acier_graphite: { label: 'Acier graphite', ...P('#383b40', 0.9, 0.42, { tex: 'brushed' }) },
  graphite: { label: 'Graphite sombre', ...P('#26282c', 0.7, 0.5) },
  caoutchouc: { label: 'Caoutchouc noir', ...P('#050505', 0, 0.88) },
  noir_mat: { label: 'Noir mat', ...P('#0b0b0c', 0, 0.78) },
  noir_satine: { label: 'Noir satiné', ...P('#0d0d0f', 0.05, 0.46) },
  bleu_nuit: { label: 'Bleu nuit laqué', ...P('#0c1c42', 0.2, 0.36, { clearcoat: 0.7, clearcoatRoughness: 0.2 }) },
  blanc: { label: 'Blanc cassé', ...P('#e8e6df', 0, 0.45) },
  pehd: { label: 'PEHD rotomoulé noir', ...P('#16171a', 0, 0.62) },
};

// Réglage de base : corrige le matériau « paillette » (métal 1 / rugosité 1 sans texture) des jambes de train, etc.
const BASE_LOOK = { mat: 'cuivre', chassis: 'cuivre', train_ar: 'cuivre', rivets_mat: 'laiton', pneus: 'caoutchouc', roues: 'noir_satine', reservoir: 'alu_brosse' };

const PRESETS = {
  base: { label: 'Base — cuivre & bleu (renders du 22/10)', groups: BASE_LOOK, reset: true },
  steampunk: {
    label: 'Steampunk industriel',
    reset: true,
    decals: ['mast', 'vent'],
    groups: {
      mat: 'cuivre', chassis: 'cuivre', train_ar: 'cuivre', rivets_mat: 'laiton', pneus: 'caoutchouc', roues: 'noir_satine', reservoir: 'alu_brosse',
      gaines: 'cuivre_tresse', durites: 'noir_mat', colliers: 'laiton',
      echangeur: 'cuivre', radiateur: 'acier_graphite', echappement: 'acier_graphite',
      tdb_coque: 'bleu_nuit', helice: 'noir_satine',
    },
  },
  origine: { label: 'Matériaux d\'origine du fichier', groups: {}, reset: true, raw: true },
};

// ---------------------------------------------------------------- rendu
const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;

const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const sun = new THREE.DirectionalLight(0xfff3e4, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x403830, 0.35));

const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.28 }));
shadowFloor.rotation.x = -Math.PI / 2;
shadowFloor.receiveShadow = true;
scene.add(shadowFloor);

function setBackground(hex) {
  scene.background = new THREE.Color(hex);
  document.getElementById('view').style.background = hex;
}
setBackground('#f4f3f0');

function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------------------------------------------------------------- état
const state = {
  groupMat: {},      // groupId -> { preset, color?, roughness?, metalness? }
  visible: {},       // groupId -> bool
  decals: [],        // { id, node, point, normal, w, h, rot, opacity, sticker, dataUrl?, text? }
  variants: {},      // groupId -> id de variante active (défaut : native)
  pose: {},          // groupId -> { dx, dy, dz (mm), ry (deg) } réglage fin de la variante
  bg: '#f4f3f0',
};
const model = new THREE.Group();
scene.add(model);
const groupMeshes = {};        // groupId -> Mesh[]
const origMats = new WeakMap();
const groupMatObjs = {};       // groupId -> MeshPhysicalMaterial
let unit = 1, modelSize = 3, modelBox = new THREE.Box3();
let selectedGroup = null;
let modelLoaded;

// ---------------------------------------------------------------- textures procédurales
const texCache = {};
function proceduralTexture(kind) {
  if (texCache[kind]) return texCache[kind];
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d');
  if (kind === 'brushed') {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      const y = Math.random() * 512, l = 40 + Math.random() * 300, x = Math.random() * 512, v = 100 + Math.random() * 56;
      ctx.strokeStyle = `rgba(${v},${v},${v},${0.12 + Math.random() * 0.25})`;
      ctx.lineWidth = 0.6 + Math.random() * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + (Math.random() - 0.5) * 2); ctx.stroke();
      if (x + l > 512) { ctx.beginPath(); ctx.moveTo(x - 512, y); ctx.lineTo(x - 512 + l, y); ctx.stroke(); }
    }
  } else if (kind === 'braid') {
    ctx.fillStyle = '#404040'; ctx.fillRect(0, 0, 512, 512);
    const s = 32;
    for (let d = -2; d < 20; d++) {
      for (const dir of [1, -1]) {
        ctx.save(); ctx.translate(0, 0);
        const g = ctx.createLinearGradient(0, 0, s, 0);
        g.addColorStop(0, '#303030'); g.addColorStop(0.5, '#d0d0d0'); g.addColorStop(1, '#303030');
        ctx.fillStyle = g;
        for (let i = 0; i < 18; i++) {
          const x = i * s, y = d * s;
          ctx.save(); ctx.translate(x + s / 2, y + s / 2 + (dir > 0 ? 0 : 0)); ctx.rotate(dir * Math.PI / 4);
          if ((i + d + (dir > 0 ? 0 : 1)) % 2 === 0) ctx.fillRect(-s * 0.2, -s * 0.9, s * 0.4, s * 1.8);
          ctx.restore();
        }
        ctx.restore();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return (texCache[kind] = t);
}

// UV par projection « boîte » pour les maillages sans UV (nécessaire aux microtextures)
function ensureUV(geo) {
  if (geo.attributes.uv) return;
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const k = 1 / (0.05 * unit);
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let u, v;
    if (nx >= ny && nx >= nz) { u = z; v = y; } else if (ny >= nz) { u = x; v = z; } else { u = x; v = y; }
    uv[i * 2] = u * k; uv[i * 2 + 1] = v * k;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function buildMaterial(groupId, cfg) {
  const def = MATERIALS[cfg.preset];
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(cfg.color || def.color),
    metalness: cfg.metalness ?? def.metalness,
    roughness: cfg.roughness ?? def.roughness,
    clearcoat: def.clearcoat || 0,
    clearcoatRoughness: def.clearcoatRoughness ?? 0,
    side: THREE.DoubleSide,
  });
  if (def.tex) {
    const t = proceduralTexture(def.tex);
    m.bumpMap = t;
    m.bumpScale = def.tex === 'braid' ? 1.6 : 0.12;
    if (def.tex === 'braid') { m.roughnessMap = t; }
  }
  m.userData.tex = def.tex;
  return m;
}

// ---------------------------------------------------------------- application des matériaux
function applyGroupMaterial(gid) {
  const g = GROUPS.find(x => x.id === gid);
  const cfg = state.groupMat[gid];
  const meshes = groupMeshes[gid] || [];
  if (!cfg || cfg.preset === 'origine' || !MATERIALS[cfg.preset]) {
    // retour à l'origine
    for (const mesh of meshes) mesh.material = origMats.get(mesh) || mesh.material;
    delete groupMatObjs[gid];
    return;
  }
  const mat = buildMaterial(gid, cfg);
  if (g.tint) {
    // sièges : on garde le tissu texturé et on ne fait que teinter
    for (const mesh of meshes) {
      const o = origMats.get(mesh);
      const c = o.clone();
      if (cfg.color) c.color = new THREE.Color(cfg.color);
      mesh.material = c;
    }
    return;
  }
  groupMatObjs[gid] = mat;
  for (const mesh of meshes) {
    const o = origMats.get(mesh);
    if (g.keep && g.keep.test(o.name)) { mesh.material = o; continue; }
    if (mat.userData.tex) ensureUV(mesh.geometry);
    mesh.material = mat;
  }
}

function applyAll() {
  for (const g of GROUPS) applyGroupMaterial(g.id);
  for (const g of GROUPS) refreshVisibility(g.id);
}

function groupVisible(g) { return state.visible[g.id] === undefined ? !g.hidden : state.visible[g.id]; }
function refreshVisibility(gid) {
  const g = GROUPS.find(x => x.id === gid);
  const active = state.variants[gid] || 'native';
  const on = g ? groupVisible(g) : true;
  for (const m of groupMeshes[gid] || []) m.visible = on && (m.userData.variant || 'native') === active;
}
function setGroupVisible(gid, v) { state.visible[gid] = v; refreshVisibility(gid); }

// Normales pour un maillage qui n'en a pas. Les maillages très denses (tubes « martelés » du train, > 40 k sommets)
// portent un bruit géométrique : on les lisse complètement pour que le shading reste propre.
function withNormals(geo) {
  const n = geo.attributes.position.count;
  if (n > 40000) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
    const m = mergeVertices(g, 1e-5 * (modelSize || 1));
    m.computeVertexNormals();
    return m;
  }
  return toCreasedNormals(geo, THREE.MathUtils.degToRad(35));
}

// ---------------------------------------------------------------- chargement du modèle
const variantRoots = {};   // `${gid}:${variantId}` -> Group
function groupOf(name) {
  return GROUPS.find(g => g.re.test(name));
}

function prepareModel(gltf) {
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse(o => { if (o.isMesh) meshes.push(o); });
  for (const mesh of meshes) {
    const geo = mesh.geometry;
    if (!geo.attributes.normal) {
      // maillages sans normales (réservoir, échappement, train…) : normales avec angle de pli
      mesh.geometry = withNormals(geo);
      mesh.userData.fixedNormals = true;
    }
    origMats.set(mesh, mesh.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const g = groupOf(mesh.name);
    const gid = g ? g.id : 'autres';
    mesh.userData.group = gid;
    (groupMeshes[gid] ||= []).push(mesh);
  }
  model.add(root);
  modelBox.setFromObject(root);
  const size = modelBox.getSize(new THREE.Vector3());
  modelSize = Math.max(size.x, size.y, size.z);
  unit = modelSize > 50 ? 1000 : 1;   // mm ou m
  return meshes;
}

function frameModel() {
  const c = modelBox.getCenter(new THREE.Vector3());
  const d = modelSize * 1.7;
  camera.near = modelSize / 200; camera.far = modelSize * 40; camera.updateProjectionMatrix();
  setView('3q');
  controls.target.copy(c);
  controls.update();
  shadowFloor.scale.setScalar(modelSize * 4);
  shadowFloor.position.set(c.x, modelBox.min.y - modelSize * 0.002, c.z);
  sun.position.set(c.x + modelSize * 1.2, c.y + modelSize * 2, c.z + modelSize * 1.0);
  sun.target.position.copy(c);
  const s = modelSize * 1.4;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.1, far: modelSize * 8 });
  sun.shadow.camera.updateProjectionMatrix();
}

function setView(name) {
  const c = modelBox.getCenter(new THREE.Vector3());
  const d = modelSize * 1.8;
  const dirs = {
    '3q': [0.9, 0.45, 1.0], face: [0, 0.1, 1], arriere: [0, 0.15, -1], gauche: [-1, 0.08, 0], droite: [1, 0.08, 0], dessus: [0, 1, 0.001],
  };
  const v = new THREE.Vector3(...dirs[name]).normalize().multiplyScalar(d);
  camera.position.copy(c).add(v);
  camera.lookAt(c);
  controls.target.copy(c);
  controls.update();
}

// ---------------------------------------------------------------- décalcomanies
const decalMeshes = new Map();
const stickerTexCache = {};
function stickerTexture(d) {
  const key = d.sticker + (d.text || '') + (d.dataUrl ? d.dataUrl.length : '');
  if (stickerTexCache[key]) return stickerTexCache[key];
  let cnv, img;
  if (d.sticker === 'text') cnv = textSticker(d.text || 'T2A');
  else if (d.sticker === 'image') {
    img = new Image(); img.src = d.dataUrl;
  } else cnv = STICKERS.find(s => s.id === d.sticker).make();
  const t = cnv ? new THREE.CanvasTexture(cnv) : new THREE.Texture(img);
  if (img) img.onload = () => { t.needsUpdate = true; };
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return (stickerTexCache[key] = t);
}

function stickerAspect(d) {
  if (d.sticker === 'text') return 4;
  if (d.sticker === 'image') return d.aspect || 1;
  return STICKERS.find(s => s.id === d.sticker).aspect;
}

function buildDecal(d) {
  const old = decalMeshes.get(d.id);
  if (old) { scene.remove(old); old.geometry.dispose(); old.material.dispose(); }
  const target = model.getObjectByProperty('name', d.node);
  if (!target) return;
  const normal = new THREE.Vector3(...d.normal);
  const point = new THREE.Vector3(...d.point);
  const orient = new THREE.Euler();
  const m = new THREE.Matrix4().lookAt(point.clone().add(normal), point, new THREE.Vector3(0, 1, 0));
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  // Pour une normale quasi verticale, lookAt devient instable : on prend un up différent
  if (Math.abs(normal.y) > 0.98) q.setFromRotationMatrix(new THREE.Matrix4().lookAt(point.clone().add(normal), point, new THREE.Vector3(0, 0, 1)));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(d.rot || 0)));
  orient.setFromQuaternion(q);
  const aspect = stickerAspect(d);
  // d.h = hauteur du sticker en mètres ; largeur = h * aspect
  const h = d.h * unit, w = h * aspect;  // d.h en mètres ; `unit` convertit vers l'unité du modèle
  const size = new THREE.Vector3(w, h, Math.max(w, h) * 0.5);
  target.updateWorldMatrix(true, false);
  const geo = new DecalGeometry(target, point, orient, size);
  const mat = new THREE.MeshStandardMaterial({
    map: stickerTexture(d), transparent: true, opacity: d.opacity ?? 1,
    metalness: 0.35, roughness: 0.45, depthTest: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  mesh.userData.decal = d.id;
  scene.add(mesh);
  decalMeshes.set(d.id, mesh);
}

function addDecal(partial, quiet) {
  const d = { id: 'd' + Date.now() + Math.floor(Math.random() * 1e5), rot: 0, opacity: 1, ...partial };
  state.decals.push(d);
  buildDecal(d);
  if (!quiet) { renderDecalList(); save(); }
  return d;
}
function removeDecal(id, quiet) {
  const m = decalMeshes.get(id);
  if (m) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); decalMeshes.delete(id); }
  state.decals = state.decals.filter(d => d.id !== id);
  if (!quiet) { renderDecalList(); save(); }
}

// Aide (tests/scripts) : pose un sticker sur un maillage visible en tirant un rayon depuis `from` vers `to`.
function castDecal(sticker, from, to, h) {
  const meshes = [];
  model.traverse(o => { if (o.isMesh && isVisibleChain(o)) meshes.push(o); });
  const o = new THREE.Vector3(...from), t = new THREE.Vector3(...to);
  const r = new THREE.Raycaster(o, t.clone().sub(o).normalize());
  const hit = r.intersectObjects(meshes, false)[0];
  if (!hit) return null;
  const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
  if (n.dot(r.ray.direction) > 0) n.negate();
  const st = STICKERS.find(x => x.id === sticker);
  return addDecal({ node: hit.object.name, point: hit.point.toArray(), normal: n.toArray(), h: h ?? st.size, sticker }).node;
}

// ---------------------------------------------------------------- poses automatiques
function visibleMeshes(gid, filter) {
  return (groupMeshes[gid] || []).filter(m => m.visible && (!filter || filter.test(m.name)));
}
function rayHit(meshes, from, dir) {
  const r = new THREE.Raycaster(from, dir);
  const h = r.intersectObjects(meshes, false)[0];
  if (!h) return null;
  const n = h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize();
  if (n.dot(dir) > 0) n.negate();
  return { hit: h, n };
}

// Graphisme du mât : la sangle est coudée, donc on suit son axe réel par tronçons (les ornements d'extrémité tombent aux jonctions).
function autoMast(chunk = 0.45) {
  const meshes = visibleMeshes('mat', /^B03_MAT_V3/);
  if (!meshes.length) return;
  for (const d of state.decals.filter(d => d.auto === 'mast')) removeDecal(d.id, true);
  const box = new THREE.Box3(); meshes.forEach(m => box.expandByObject(m));
  const dirs = [[1, new THREE.Vector3(0, 0, -1)], [-1, new THREE.Vector3(0, 0, 1)]];
  for (const [side, dir] of dirs) {
    // axe de la sangle : milieu de la zone touchée à chaque hauteur
    const cl = [];
    for (let y = box.min.y + 0.02; y < Math.min(box.max.y - 0.12, 2.0); y += 0.02) {
      let lo = Infinity, hi = -Infinity;
      for (let x = box.min.x - 0.05; x < box.max.x + 0.05; x += 0.005) {
        if (rayHit(meshes, new THREE.Vector3(x, y, 3 * side), dir)) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
      }
      if (hi > lo) cl.push({ x: (lo + hi) / 2, y, w: hi - lo });
    }
    for (let i = 0; i + 1 < cl.length;) {
      let j = i, len = 0;
      while (j + 1 < cl.length && len < chunk) { len += Math.hypot(cl[j + 1].x - cl[j].x, cl[j + 1].y - cl[j].y); j++; }
      if (len < chunk * 0.6) break;
      const a = cl[i], b = cl[j];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const found = rayHit(meshes, new THREE.Vector3(mid.x, mid.y, 3 * side), dir);
      if (found) {
        const ang = Math.atan2(b.x - a.x, b.y - a.y) * 180 / Math.PI;
        addDecal({ node: found.hit.object.name, point: found.hit.point.toArray(), normal: found.n.toArray(), h: +len.toFixed(3), sticker: 'mast', rot: +(-side * ang).toFixed(1), auto: 'mast' }, true);
      }
      i = j;
    }
  }
  renderDecalList(); save();
}

// Grille de ventilation : une sur chaque flanc du réservoir actif.
function autoTankVent() {
  const meshes = visibleMeshes('reservoir');
  if (!meshes.length) return;
  for (const d of state.decals.filter(d => d.auto === 'vent')) removeDecal(d.id, true);
  const box = new THREE.Box3(); meshes.forEach(m => box.expandByObject(m));
  const c = box.getCenter(new THREE.Vector3());
  for (const side of [1, -1]) {
    const found = rayHit(meshes, new THREE.Vector3(c.x, c.y - 0.02, 3 * side), new THREE.Vector3(0, 0, -side));
    if (found) addDecal({ node: found.hit.object.name, point: found.hit.point.toArray(), normal: found.n.toArray(), h: 0.15, sticker: 'vent', auto: 'vent' }, true);
  }
  renderDecalList(); save();
}

// ---------------------------------------------------------------- interactions 3D
const ray = new THREE.Raycaster();
let armed = null;   // sticker armé { sticker, ... }
let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
  const r = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const targets = [];
  model.traverse(o => { if (o.isMesh && o.visible && o.parent && isVisibleChain(o)) targets.push(o); });
  const hit = ray.intersectObjects(targets, false)[0];
  if (!hit) return;
  if (armed) {
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    // face vers l'observateur
    if (n.dot(ray.ray.direction) > 0) n.negate();
    const base = armed;
        addDecal({ node: hit.object.name, point: hit.point.toArray(), normal: n.toArray(), h: base.size, sticker: base.sticker, text: base.text, dataUrl: base.dataUrl, aspect: base.aspect });
  } else {
    selectGroup(hit.object.userData.group);
  }
});
function isVisibleChain(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }

// ---------------------------------------------------------------- variantes de composants
const loader = new GLTFLoader();
const variantLoading = {};
async function ensureVariant(gid, opt) {
  const key = `${gid}:${opt.id}`;
  if (variantRoots[key]) return variantRoots[key];
  if (variantLoading[key]) return variantLoading[key];
  variantLoading[key] = (async () => {
    const gltf = opt.file ? await loader.loadAsync(URL.createObjectURL(opt.file)) : await loader.loadAsync(opt.url);
    const root = new THREE.Group(); root.name = 'VARIANT_' + key;
    root.add(gltf.scene);
    if (opt.file) {  // GLB perso : centré sur la pièce d'origine
      const ob = new THREE.Box3(); for (const m of groupMeshes[gid]) if ((m.userData.variant || 'native') === 'native') ob.expandByObject(m);
      const nb = new THREE.Box3().setFromObject(gltf.scene);
      gltf.scene.position.add(ob.getCenter(new THREE.Vector3()).sub(nb.getCenter(new THREE.Vector3())));
    }
    const look = new THREE.MeshStandardMaterial({ color: 0xb0b3b8, metalness: 1, roughness: 0.4, side: THREE.DoubleSide, name: 'variante' });
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      if (!o.geometry.attributes.normal) o.geometry = withNormals(o.geometry);
      origMats.set(o, look); o.material = look;
      o.castShadow = o.receiveShadow = true;
      o.userData.group = gid; o.userData.variant = opt.id;
      (groupMeshes[gid] ||= []).push(o);
    });
    model.add(root);
    variantRoots[key] = root;
    return root;
  })();
  return variantLoading[key];
}
function applyPose(gid) {
  const v = state.variants[gid]; if (!v || v === 'native') return;
  const root = variantRoots[`${gid}:${v}`]; if (!root) return;
  const p = state.pose[gid] || {};
  root.position.set((p.dx || 0) / 1000, (p.dy || 0) / 1000, (p.dz || 0) / 1000);
  root.rotation.y = THREE.MathUtils.degToRad(p.ry || 0);
  root.updateMatrixWorld(true);
  rebuildDecalsOn(gid);
}
async function setVariant(gid, id, opts = {}) {
  const opt = (VARIANTS[gid] || []).find(o => o.id === id) || opts.opt;
  state.variants[gid] = id;
  if (opt?.url || opt?.file) {
    await ensureVariant(gid, opt);
    if (opt.look && !opts.keepLook && !(state.groupMat[gid] && state.groupMat[gid].preset !== 'origine')) state.groupMat[gid] = { preset: opt.look };
  }
  applyGroupMaterial(gid);
  refreshVisibility(gid);
  applyPose(gid);
  save(); renderParts();
}
function rebuildDecalsOn(gid) {
  for (const d of state.decals) {
    const n = model.getObjectByProperty('name', d.node);
    if (n?.userData.group === gid) buildDecal(d);
  }
}

// ---------------------------------------------------------------- persistance
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ groupMat: state.groupMat, visible: state.visible, variants: state.variants, pose: state.pose, decals: state.decals.filter(d => d.sticker !== 'image'), bg: state.bg })); } catch {}
}
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; }
}
async function applyConfig(cfg) {
  for (const id of [...decalMeshes.keys()]) { const m = decalMeshes.get(id); scene.remove(m); decalMeshes.delete(id); }
  state.groupMat = cfg.groupMat || {};
  state.visible = cfg.visible || {};
  state.variants = cfg.variants || {};
  state.pose = cfg.pose || {};
  state.decals = cfg.decals || [];
  state.bg = cfg.bg || state.bg;
  setBackground(state.bg);
  document.getElementById('bg').value = state.bg;
  for (const [gid, id] of Object.entries(state.variants)) {
    const opt = (VARIANTS[gid] || []).find(o => o.id === id);
    if (opt?.url) await ensureVariant(gid, opt); else if (id !== 'native' && id !== 'none') state.variants[gid] = 'native';
  }
  applyAll();
  for (const gid of Object.keys(state.variants)) applyPose(gid);
  state.decals.forEach(buildDecal);
  renderParts(); renderDecalList();
}
function applyPreset(id) {
  const p = PRESETS[id];
  const groupMat = {};
  for (const [g, preset] of Object.entries(p.groups)) groupMat[g] = { preset };
  const decals = id === 'origine' ? [] : state.decals;
  applyConfig({ groupMat, visible: state.visible, variants: state.variants, pose: state.pose, decals, bg: state.bg }).then(() => {
    if (p.decals) { if (p.decals.includes('mast')) autoMast(); if (p.decals.includes('vent')) autoTankVent(); }
    save();
  });
  save();
}

// ---------------------------------------------------------------- UI
const $ = s => document.querySelector(s);
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) e.append(k?.nodeType ? k : document.createTextNode(k ?? ''));
  return e;
}

function selectGroup(gid) {
  selectedGroup = gid;
  // surbrillance légère
  for (const [id, ms] of Object.entries(groupMeshes)) for (const m of ms) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mt of mats) if (mt.emissive) { mt.emissive.setHex(id === gid ? 0x2a1a00 : 0x000000); }
  }
  renderParts();
  document.querySelector(`[data-gid="${gid}"]`)?.scrollIntoView({ block: 'nearest' });
}

function renderParts() {
  const host = $('#parts');
  host.replaceChildren();
  for (const g of GROUPS) {
    if (!(groupMeshes[g.id] || []).length) continue;
    const cfg = state.groupMat[g.id] || { preset: 'origine' };
    const open = selectedGroup === g.id;
    const vis = state.visible[g.id] === undefined ? !g.hidden : state.visible[g.id];
    const row = el('div', { class: 'part' + (open ? ' sel' : ''), 'data-gid': g.id });
    row.append(
      el('div', { class: 'part-h', onclick: () => selectGroup(open ? null : g.id) },
        el('input', { type: 'checkbox', checked: vis, title: 'Afficher / masquer', onclick: e => e.stopPropagation(), onchange: e => { setGroupVisible(g.id, e.target.checked); save(); } }),
        el('span', { class: 'part-n' }, g.label),
        el('span', { class: 'chip', style: `background:${chipColor(g.id)}` })),
    );
    if (open) {
      const body = el('div', { class: 'part-b' });
      const sel = el('select', { onchange: e => { state.groupMat[g.id] = { preset: e.target.value }; applyGroupMaterial(g.id); save(); renderParts(); } },
        Object.entries(MATERIALS).map(([k, v]) => el('option', { value: k, selected: cfg.preset === k }, v.label)));
      body.append(el('label', {}, 'Matériau', sel));
      if (cfg.preset !== 'origine' || g.tint) {
        const def = MATERIALS[cfg.preset] || {};
        body.append(
          el('label', {}, 'Couleur',
            el('input', { type: 'color', value: cfg.color || def.color || '#888888', oninput: e => { (state.groupMat[g.id] ||= { preset: cfg.preset }).color = e.target.value; applyGroupMaterial(g.id); } , onchange: save })),
        );
        if (!g.tint) body.append(
          slider('Rugosité', cfg.roughness ?? def.roughness, v => { state.groupMat[g.id].roughness = v; if (groupMatObjs[g.id]) groupMatObjs[g.id].roughness = v; }),
          slider('Métal', cfg.metalness ?? def.metalness, v => { state.groupMat[g.id].metalness = v; if (groupMatObjs[g.id]) groupMatObjs[g.id].metalness = v; }),
        );
      }
      if (VARIANTS[g.id]) {
        const act = state.variants[g.id] || 'native';
        const opts = VARIANTS[g.id];
        const cur = opts.find(o => o.id === act) || (act === 'custom' ? { label: 'GLB perso', pose: 'estimee' } : opts[0]);
        const vsel = el('select', { onchange: e => setVariant(g.id, e.target.value) },
          opts.map(o => el('option', { value: o.id, selected: act === o.id }, o.label)),
          act === 'custom' ? el('option', { value: 'custom', selected: true }, 'GLB perso') : null);
        body.append(el('div', { class: 'sub' }, 'Variante de composant'), vsel);
        if (cur.url || act === 'custom') {
          const p = state.pose[g.id] ||= {};
          body.append(el('div', { class: 'note' }, cur.pose === 'exacte' ? 'Pose exacte (repère de l\'assemblage).' : 'Pose estimée automatiquement — à valider ; ajuster ci-dessous.'));
          for (const [k, lab, mn, mx] of [['dx', 'X (mm)', -300, 300], ['dy', 'Y (mm)', -300, 300], ['dz', 'Z (mm)', -300, 300], ['ry', 'Rot. Y (°)', -180, 180]])
            body.append(dslider(lab, p[k] || 0, mn, mx, v => { p[k] = v; applyPose(g.id); }, 1));
        }
      }
      if (g.id === 'reservoir') {
        body.append(el('label', { class: 'file inl' }, 'Charger un autre GLB…', el('input', { type: 'file', accept: '.glb', onchange: e => { const f = e.target.files[0]; if (f) setVariant('reservoir', 'custom', { opt: { id: 'custom', file: f, pose: 'estimee' } }); } })));
      }
      row.append(body);
    }
    host.append(row);
  }
}
function chipColor(gid) {
  const cfg = state.groupMat[gid];
  if (cfg?.color) return cfg.color;
  if (cfg && MATERIALS[cfg.preset]?.color) return MATERIALS[cfg.preset].color;
  const m = (groupMeshes[gid] || [])[0]?.material;
  return m?.color ? '#' + m.color.getHexString() : '#888';
}
function slider(label, value, onInput) {
  const out = el('span', { class: 'val' }, (+value).toFixed(2));
  return el('label', {}, label, el('input', { type: 'range', min: 0, max: 1, step: 0.01, value, oninput: e => { onInput(+e.target.value); out.textContent = (+e.target.value).toFixed(2); }, onchange: save }), out);
}

function renderStickers() {
  const host = $('#stickers');
  host.replaceChildren();
  for (const s of STICKERS) {
    const cv = s.make();
    cv.className = 'thumb';
    host.append(el('button', { class: 'stk', 'data-id': s.id, onclick: () => arm({ sticker: s.id, size: s.size, aspect: s.aspect }, s.label) }, cv, el('span', {}, s.label), el('small', {}, s.hint)));
  }
}
function arm(b, label) {
  armed = b;
  $('#armed').textContent = armed ? `Cliquer sur le modèle pour poser : ${label}` : '';
  $('#armed').classList.toggle('on', !!armed);
  renderer.domElement.style.cursor = armed ? 'crosshair' : '';
}
function disarm() { armed = null; $('#armed').textContent = ''; $('#armed').classList.remove('on'); renderer.domElement.style.cursor = ''; }

function renderDecalList() {
  const host = $('#decals');
  host.replaceChildren();
  if (!state.decals.length) host.append(el('div', { class: 'note' }, 'Aucun sticker posé.'));
  state.decals.forEach((d, i) => {
    const lab = d.sticker === 'text' ? `Texte « ${d.text} »` : d.sticker === 'image' ? 'Image' : STICKERS.find(s => s.id === d.sticker)?.label;
    host.append(el('div', { class: 'decal' },
      el('div', { class: 'decal-h' }, el('b', {}, `${i + 1}. ${lab}`), el('button', { class: 'x', title: 'Supprimer', onclick: () => removeDecal(d.id) }, '✕')),
      el('div', { class: 'note' }, d.node),
      dslider('Hauteur (m)', d.h, 0.01, 1.6, v => { d.h = v; buildDecal(d); }),
      dslider('Rotation', d.rot, -180, 180, v => { d.rot = v; buildDecal(d); }, 1),
      dslider('Opacité', d.opacity, 0.1, 1, v => { d.opacity = v; const m = decalMeshes.get(d.id); if (m) m.material.opacity = v; }, 0.01)));
  });
}
function dslider(label, value, min, max, onInput, step) {
  step ||= (max - min) / 200;
  const out = el('span', { class: 'val' }, (+value).toFixed(2));
  return el('label', {}, label, el('input', { type: 'range', min, max, step, value, oninput: e => { onInput(+e.target.value); out.textContent = (+e.target.value).toFixed(2); }, onchange: save }), out);
}

function buildUI() {
  const pre = $('#presets');
  for (const [id, p] of Object.entries(PRESETS)) pre.append(el('button', { onclick: () => applyPreset(id) }, p.label));
  $('#views').append(...['3q', 'face', 'arriere', 'gauche', 'droite', 'dessus'].map(v => el('button', { onclick: () => setView(v) }, { '3q': '3/4', face: 'Avant', arriere: 'Arrière', gauche: 'Gauche', droite: 'Droite', dessus: 'Dessus' }[v])));
  $('#bg').addEventListener('input', e => { state.bg = e.target.value; setBackground(state.bg); save(); });
  $('#expo').addEventListener('input', e => { renderer.toneMappingExposure = +e.target.value; });
  $('#env').addEventListener('input', e => { scene.environmentIntensity = +e.target.value; });
  $('#shadow').addEventListener('change', e => { shadowFloor.visible = e.target.checked; });
  $('#shot').addEventListener('click', () => {
    renderer.render(scene, camera);
    const a = el('a', { href: renderer.domElement.toDataURL('image/png'), download: 't2a-rendu.png' }); a.click();
  });
  $('#export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ groupMat: state.groupMat, visible: state.visible, variants: state.variants, pose: state.pose, decals: state.decals, bg: state.bg }, null, 1)], { type: 'application/json' });
    el('a', { href: URL.createObjectURL(blob), download: 't2a-config.json' }).click();
  });
  $('#import').addEventListener('change', async e => { const f = e.target.files[0]; if (f) { applyConfig(JSON.parse(await f.text())); save(); } });
  $('#reset').addEventListener('click', () => applyPreset('base'));
  $('#automast').addEventListener('click', () => autoMast());
  $('#autovent').addEventListener('click', () => autoTankVent());
  $('#txtadd').addEventListener('click', () => { const t = $('#txt').value.trim(); if (t) arm({ sticker: 'text', text: t, size: 0.03, aspect: 4 }, `texte « ${t} »`); });
  $('#imgadd').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => arm({ sticker: 'image', dataUrl: r.result, size: 0.08, aspect: im.width / im.height }, f.name); im.src = r.result; };
    r.readAsDataURL(f);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') disarm(); });
  renderStickers();
}

// ---------------------------------------------------------------- démarrage
async function main() {
  buildUI();
  resize();
  const status = $('#status');
  loader.manager.onProgress = () => {};
  const gltf = await loader.loadAsync(MODEL_URL, e => { if (e.total) status.textContent = `Chargement du modèle… ${Math.round(e.loaded / e.total * 100)} %`; });
  status.textContent = 'Préparation…';
  prepareModel(gltf);
  frameModel();
  const saved = loadSaved();
  applyConfig(saved || { groupMat: Object.fromEntries(Object.entries(BASE_LOOK).map(([g, p]) => [g, { preset: p }])), visible: {}, decals: [] });
  status.textContent = '';
  window.__t2a = { autoMast, autoTankVent, setVariant, castDecal, scene, camera, controls, state, applyPreset, setView, addDecal, groupMeshes, THREE, model, get unit() { return unit; }, get modelSize() { return modelSize; }, selectGroup, modelBox };
  const testMode = new URLSearchParams(location.search).has('test');
  window.__t2a.render = () => { controls.update(); renderer.render(scene, camera); };
  if (!testMode) renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
  document.body.dataset.ready = '1';
}
main().catch(err => { $('#status').textContent = 'Erreur : ' + err.message; console.error(err); });
