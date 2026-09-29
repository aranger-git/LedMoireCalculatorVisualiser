import { analyseOffAxis, cameraPixelMm, maxApertureAt, sweep, riskRanges, renderPreview, LEVELS } from "./moire.js";
import { createScene, buildHeatmap } from "./scene3d.js";
import { loadPlanFile } from "./plan.js";

// ---------- i18n ----------
const T = {
  fr: {
    title: "Calculateur de moiré LED", subtitle: "Écran LED & caméra", share: "Copier le lien", copied: "Lien copié ✓",
    setup: "Montage", wall: "Écran LED", camera: "Caméra", lens: "Objectif", extender: "Extender 2× engagé",
    shot: "Plan", focal: "Focale", distance: "Distance caméra → écran", aperture: "Diaphragme",
    gap: "Sujet devant l'écran", gapHint: "0 = mise au point sur l'écran (pire cas). Sinon, la caméra fait le point sur le sujet et l'écran devient flou.",
    advanced: "Avancé", angle: "Angle de l'écran (aperçu)", fill: "Taille des LED (remplissage)",
    risk: "Risque de moiré", low: "Faible", moderate: "Possible", high: "Élevé",
    ledPx: "1 pixel LED sur le capteur", ledPxHint: "Pire zone : ~1 à 3 pixels caméra",
    blur: "Flou de l'écran", blurHint: "> 3 px de flou efface le moiré",
    contrast: "Contraste du moiré", contrastHint: "Seuils provisoires : 6 % / 25 %",
    preview: "Aperçu caméra", previewHint: "Recadrage 240 × 135 pixels du capteur, agrandi. Mire blanche plein écran.",
    byDistance: "Selon la distance", byFocal: "Selon la focale",
    chartDistance: (f) => `Risque selon la distance · focale ${f}`,
    chartFocal: (d) => `Risque selon la focale · à ${d}`,
    how: "Comment c'est calculé",
    howBody: `<p>On projette la grille LED sur le capteur (taille d'un pixel LED = pas × focale ÷ distance) et on la compare à la grille des pixels caméra.</p>
<p>La grille passe à travers l'objectif, le flou de mise au point, la diffraction, le filtre anti-aliasing et les photosites. Tout ce qui dépasse la limite de Nyquist du capteur se replie en motifs parasites : c'est le moiré. Le « contraste du moiré » est la force de ces motifs repliés.</p>
<p>La position de la caméra compte : vu en biais, le pas de l'écran se raccourcit (× cos de l'angle), ce qui déplace la zone de risque. La vue 3D colore chaque point du sol selon le risque si la caméra y était placée.</p>
<p>Les seuils (6 % / 25 %) et le modèle d'objectif sont des estimations. À valider sur un vrai mur avec vos caméras avant d'en faire une promesse client.</p>`,
    open: "ouvert", openAt: (n) => `Ouverture max à cette focale : f/${n}`,
    manualLens: "Objectif manuel (toutes focales)", tbc: "à confirmer",
    mountWarn: (c, l) => `Monture caméra ${c} ≠ objectif ${l}.`,
    verdict: {
      low: "Rien à signaler pour ce plan : la grille LED est soit trop fine, soit assez floue pour que la caméra ne la replie pas.",
      moderate: "Moiré possible, surtout en mouvement ou sur un fond uni. Faire un test caméra au montage.",
      high: "Moiré très probable sur ce plan. Changer de focale ou de distance, ou faire le point devant l'écran.",
    },
    fixGap: (g) => `Faire le point sur un sujet à ${g} devant l'écran suffit à passer au vert.`,
    noFixGap: "Même en faisant le point devant l'écran, le risque reste : changer de focale ou de distance.",
    rangesNone: "Aucune zone à risque sur cette plage.",
    rangesLead: "Zones à risque : ",
    between: (a, b) => `${a} à ${b}`,
    px: "px caméra",
    view3d: "Vue 3D", free: "Vue libre", camView: "Vue caméra", heatLabel: "Zones de risque au sol",
    view3dHint: "Glisser pour tourner, molette pour zoomer. Cliquer au sol pour placer la caméra. Le sol est coloré selon le risque pour la focale et le diaphragme choisis.",
    wallSize: "Écran", wallW: "Largeur (m)", wallH: "Hauteur (m)", wallBottom: "Bas de l'écran (m)",
    camPos: "Caméra", camX: "Décalage latéral (m)", camH: "Hauteur objectif (m)",
    panels: (c, r, w, h) => `${c} × ${r} panneaux = ${w} × ${h} m`, frameW: "cadre",
    planTitle: "Plan de salle", planImport: "Importer un plan (PDF, PNG, JPG)", noPlan: "Aucun plan",
    planHint: "Le fichier reste sur cet appareil, rien n'est envoyé. Le haut du plan = côté écran.",
    planWidth: "Largeur réelle du plan (m)", planRot: "Rotation (°)", planX: "Décalage X (m)", planZ: "Décalage Z (m)", planOpacity: "Opacité",
    planClear: "Retirer", loading: "Chargement…", planError: "Impossible de lire ce fichier.",
    no3d: "La 3D n'est pas disponible sur ce navigateur (WebGL).",
  },
  en: {
    title: "LED Moiré Calculator", subtitle: "LED wall & camera", share: "Copy link", copied: "Link copied ✓",
    setup: "Setup", wall: "LED wall", camera: "Camera", lens: "Lens", extender: "2× extender engaged",
    shot: "Shot", focal: "Focal length", distance: "Camera → wall distance", aperture: "Aperture",
    gap: "Subject in front of wall", gapHint: "0 = focused on the wall (worst case). Otherwise the camera focuses on the subject and the wall goes soft.",
    advanced: "Advanced", angle: "Wall angle (preview)", fill: "LED size (fill)",
    risk: "Moiré risk", low: "Low", moderate: "Possible", high: "High",
    ledPx: "1 LED pixel on the sensor", ledPxHint: "Worst zone: ~1 to 3 camera pixels",
    blur: "Wall blur", blurHint: "> 3 px of blur wipes out moiré",
    contrast: "Moiré contrast", contrastHint: "Provisional thresholds: 6 % / 25 %",
    preview: "Camera preview", previewHint: "240 × 135 sensor-pixel crop, enlarged. Full-white test pattern.",
    byDistance: "By distance", byFocal: "By focal length",
    chartDistance: (f) => `Risk vs distance · ${f} focal length`,
    chartFocal: (d) => `Risk vs focal length · at ${d}`,
    how: "How it's calculated",
    howBody: `<p>The LED grid is projected onto the sensor (one LED pixel = pitch × focal length ÷ distance) and compared with the camera's pixel grid.</p>
<p>The grid passes through the lens, focus blur, diffraction, the anti-aliasing filter and the photosites. Anything above the sensor's Nyquist limit folds back as false patterns: that's moiré. "Moiré contrast" is how strong those folded patterns are.</p>
<p>Camera position matters: seen at an angle, the wall's pitch shortens (× cos of the angle), which shifts the risk zone. The 3D view colours each point on the floor by the risk if the camera stood there.</p>
<p>The thresholds (6 % / 25 %) and the lens model are estimates. Validate on a real wall with your cameras before promising a client anything.</p>`,
    open: "wide open", openAt: (n) => `Max aperture at this focal length: f/${n}`,
    manualLens: "Manual lens (any focal length)", tbc: "to confirm",
    mountWarn: (c, l) => `Camera mount ${c} ≠ lens ${l}.`,
    verdict: {
      low: "Nothing to flag on this shot: the LED grid is either too fine or soft enough that the camera doesn't fold it.",
      moderate: "Moiré possible, especially on moves or flat backgrounds. Do a camera test at load-in.",
      high: "Moiré very likely on this shot. Change focal length or distance, or focus in front of the wall.",
    },
    fixGap: (g) => `Focusing on a subject ${g} in front of the wall is enough to get to green.`,
    noFixGap: "Even focusing in front of the wall, the risk stays: change focal length or distance.",
    rangesNone: "No risk zones in this range.",
    rangesLead: "Risk zones: ",
    between: (a, b) => `${a} to ${b}`,
    px: "camera px",
    view3d: "3D view", free: "Free view", camView: "Camera view", heatLabel: "Risk zones on the floor",
    view3dHint: "Drag to orbit, scroll to zoom. Click the floor to place the camera. The floor is coloured by risk for the chosen focal length and aperture.",
    wallSize: "Wall", wallW: "Width (m)", wallH: "Height (m)", wallBottom: "Wall bottom (m)",
    camPos: "Camera", camX: "Side offset (m)", camH: "Lens height (m)",
    panels: (c, r, w, h) => `${c} × ${r} panels = ${w} × ${h} m`, frameW: "frame",
    planTitle: "Floor plan", planImport: "Import a plan (PDF, PNG, JPG)", noPlan: "No plan",
    planHint: "The file stays on this device, nothing is uploaded. Top of the plan = wall side.",
    planWidth: "Real plan width (m)", planRot: "Rotation (°)", planX: "Offset X (m)", planZ: "Offset Z (m)", planOpacity: "Opacity",
    planClear: "Remove", loading: "Loading…", planError: "Couldn't read this file.",
    no3d: "3D isn't available in this browser (WebGL).",
  },
};
let lang = "fr";
const t = (k) => T[lang][k];

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const fmt = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA");
const fmtM = (m) => (m < 10 ? `${fmt(m, 1)} m` : `${fmt(m, 0)} m`);
const fmtMm = (mm) => (mm < 20 ? `${fmt(mm, 1)} mm` : `${fmt(mm, 0)} mm`);
const pct = (x) => `${fmt(x * 100, 0)} %`;
const STOPS = [1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16];
const DIST_MIN = 1, DIST_MAX = 200; // m
const logMap = (v, min, max) => Math.exp(Math.log(min) + (Math.log(max) - Math.log(min)) * (v / 1000));
const logUnmap = (x, min, max) => (1000 * (Math.log(x) - Math.log(min))) / (Math.log(max) - Math.log(min));
const MANUAL_LENS = { id: "manual", mount: "any", focal_min_mm: 4, focal_max_mm: 1000, max_aperture: 1.4 };

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

// ---------- state ----------
let DATA;
const state = {
  tile: null, camera: null, lens: null, ext: false, focal: 50, distance: 20, aperture: "open", gap: 0, angle: 3, fill: null, sweep: "distance",
  wallW: 6, wallH: 3.5, wallBottom: 1, camX: 0, camH: 2.5, heat: true,
};
const NUM_KEYS = ["focal", "distance", "gap", "angle", "fill", "wallW", "wallH", "wallBottom", "camX", "camH"];
// Plan underlay lives only in this browser tab (never in the URL, never uploaded).
const plan = { source: null, name: "", widthM: 40, rotDeg: 0, offX: 0, offZ: 15, opacity: 0.85 };

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  for (const k of ["tile", "camera", "lens", "aperture", "sweep"]) if (p.has(k)) state[k] = p.get(k);
  for (const k of NUM_KEYS) if (p.has(k)) state[k] = parseFloat(p.get(k));
  if (p.has("ext")) state.ext = p.get("ext") === "1";
  if (p.has("lang")) lang = p.get("lang") === "en" ? "en" : "fr";
}
function writeHash() {
  const p = new URLSearchParams({
    tile: state.tile, camera: state.camera, lens: state.lens, ext: state.ext ? "1" : "0",
    focal: fmtRaw(state.focal), distance: fmtRaw(state.distance), aperture: state.aperture,
    gap: state.gap, angle: state.angle, fill: state.fill, sweep: state.sweep, lang,
    wallW: fmtRaw(state.wallW), wallH: fmtRaw(state.wallH), wallBottom: fmtRaw(state.wallBottom),
    camX: fmtRaw(state.camX), camH: fmtRaw(state.camH),
  });
  history.replaceState(null, "", `#${p}`);
}
const fmtRaw = (x) => String(Math.round(x * 10) / 10);

const tile = () => DATA.tiles.find((x) => x.id === state.tile);
const camera = () => DATA.cameras.find((x) => x.id === state.camera);
const lens = () => (state.lens === "manual" ? MANUAL_LENS : DATA.lenses.find((x) => x.id === state.lens));
const extOn = () => state.ext && !!lens().extender;
const focalRange = () => {
  const l = lens();
  const k = extOn() ? l.extender : 1;
  return [l.focal_min_mm * k, l.focal_max_mm * k];
};
const openAperture = () => fmtStop(maxApertureAt(lens(), state.focal, extOn()));
const fmtStop = (n) => Math.round(n * 10) / 10;
const apertureN = () => (state.aperture === "open" ? openAperture() : Math.max(parseFloat(state.aperture), openAperture()));

// Wall snapped to whole panels.
function wallGeom() {
  const tl = tile();
  const cols = Math.max(1, Math.round((state.wallW * 1000) / tl.panel_w_mm));
  const rows = Math.max(1, Math.round((state.wallH * 1000) / tl.panel_h_mm));
  return { cols, rows, w: (cols * tl.panel_w_mm) / 1000, h: (rows * tl.panel_h_mm) / 1000, bottom: state.wallBottom };
}

// Camera at (camX, camH, distance) aimed at the wall centre. Returns the true distance to the aim
// point and the foreshortening of the wall grid along each axis.
function geomFor(distance = state.distance, camX = state.camX) {
  const wg = wallGeom();
  const dy = state.camH - (wg.bottom + wg.h / 2);
  const d = Math.hypot(distance, camX, dy);
  return { d, cosH: distance / Math.hypot(distance, camX), cosV: distance / Math.hypot(distance, dy) };
}

function evaluate(opts = {}) {
  const g = geomFor(opts.distance ?? state.distance, opts.camX ?? state.camX);
  return analyseOffAxis(inputsFor({ ...opts, d: g.d }), g.cosH, g.cosV);
}

function inputsFor({ focal = state.focal, d } = {}) {
  const tl = tile();
  const cam = camera();
  const l = lens();
  d = (d ?? geomFor().d) * 1000;
  const N = state.aperture === "open"
    ? maxApertureAt(l, focal, extOn())
    : Math.max(parseFloat(state.aperture), maxApertureAt(l, focal, extOn()));
  const s = state.gap > 0 ? Math.max(d - state.gap * 1000, focal * 2, 500) : d;
  return { pitch: tl.pitch_mm, fill: state.fill, pc: cameraPixelMm(cam), f: focal, N, d, s, lensMtf50: l.mtf50_lpmm };
}

// ---------- UI setup ----------
function fillSelect(sel, items, label) {
  sel.innerHTML = "";
  for (const it of items) {
    const o = document.createElement("option");
    o.value = it.id;
    o.textContent = label(it);
    if (it.disabled) o.disabled = true;
    sel.append(o);
  }
}

function buildSelects() {
  fillSelect($("tile"), DATA.tiles, (x) => `${x.name} · ${x.pitch_mm} mm`);
  const owned = (x) => (x.owned ? " ★" : "");
  fillSelect($("camera"), DATA.cameras, (x) => `${x.name}${owned(x)}`);
  const lenses = DATA.lenses.map((l) => ({ ...l, disabled: !l.focal_min_mm }));
  fillSelect($("lens"), [...lenses, { id: "manual" }], (x) =>
    x.id === "manual" ? t("manualLens") : `${x.name}${owned(x)}${x.disabled ? ` (${t("tbc")})` : ""}`);
  $("tile").value = state.tile;
  $("camera").value = state.camera;
  $("lens").value = state.lens;
}

function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  $("lang").textContent = lang === "fr" ? "EN" : "FR";
  document.title = `${t("title")} — Ranger Son Éclairage`;
  buildSelects();
  syncPlan();
}

function syncLensControls() {
  const l = lens();
  $("ext-row").hidden = !l.extender;
  $("extender").checked = extOn();
  const [fmin, fmax] = focalRange();
  state.focal = Math.min(Math.max(state.focal, fmin), fmax);
  $("focal").min = 0;
  $("focal").max = 1000;
  $("focal").value = logUnmap(state.focal, fmin, fmax);

  const open = openAperture();
  const sel = $("aperture");
  sel.innerHTML = "";
  const o = document.createElement("option");
  o.value = "open";
  o.textContent = `f/${open} (${t("open")})`;
  sel.append(o);
  for (const n of STOPS.filter((n) => n > open)) {
    const e = document.createElement("option");
    e.value = n;
    e.textContent = `f/${n}`;
    sel.append(e);
  }
  if (state.aperture !== "open" && parseFloat(state.aperture) <= open) state.aperture = "open";
  sel.value = state.aperture;
  $("aperture-hint").textContent = t("openAt")(open);

  const cam = camera();
  const warn = l.mount !== "any" && cam.mount && !cam.mount.split("/").includes(l.mount);
  $("mount-warn").hidden = !warn;
  if (warn) $("mount-warn").textContent = t("mountWarn")(cam.mount, l.mount);
}

// ---------- render ----------
function render() {
  syncLensControls();
  $("focal-out").textContent = fmtMm(state.focal);
  $("distance").value = logUnmap(state.distance, DIST_MIN, DIST_MAX);
  $("distance-out").textContent = fmtM(state.distance);
  $("aperture-out").textContent = `f/${fmt(apertureN(), 1)}`;
  $("gap").value = state.gap;
  $("gap-out").textContent = state.gap === 0 ? "0" : fmtM(state.gap);
  $("angle").value = state.angle;
  $("angle-out").textContent = `${state.angle}°`;
  $("fill").value = state.fill;
  $("fill-out").textContent = pct(state.fill);

  const a = evaluate();
  const v = $("verdict");
  v.dataset.level = a.level;
  $("verdict-icon").textContent = { low: "✓", moderate: "!", high: "✕" }[a.level];
  $("verdict-label").textContent = t(a.level);
  let text = t("verdict")[a.level];
  if (a.level !== "low" && state.gap === 0) {
    const g = gapToFix();
    text += " " + (g ? t("fixGap")(fmtM(g)) : t("noFixGap"));
  }
  $("verdict-text").textContent = text;

  $("s-ledpx").textContent = `${fmt(a.ledPx, a.ledPx < 10 ? 2 : 0)} ${t("px")}`;
  $("s-blur").textContent = `${fmt(a.blurPx, 1)} ${t("px")}`;
  $("s-contrast").textContent = pct(a.risk);

  drawPreview(a);
  drawChart();
  schedule3d();
  writeHash();
}

// Smallest subject gap (0.5 m steps) that brings this shot to "low".
function gapToFix() {
  const saved = state.gap;
  let found = null;
  for (let g = 0.5; g <= 15; g += 0.5) {
    state.gap = g;
    if (evaluate().level === "low") { found = g; break; }
  }
  state.gap = saved;
  return found;
}

const previewBuf = new Float32Array(240 * 135);
function drawPreview(a) {
  const cv = $("preview");
  const ctx = cv.getContext("2d");
  renderPreview(previewBuf, 240, 135, a, (state.angle * Math.PI) / 180);
  const img = ctx.createImageData(240, 135);
  for (let i = 0; i < previewBuf.length; i++) {
    const g = previewBuf[i];
    img.data[i * 4] = g;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// ---------- chart ----------
const W = 720, H = 260, M = { l: 44, r: 16, t: 12, b: 34 };
const svgNS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(svgNS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.append(n);
  return n;
};

function drawChart() {
  const byDist = state.sweep === "distance";
  const [fmin, fmax] = focalRange();
  const [xmin, xmax] = byDist ? [DIST_MIN, DIST_MAX] : [fmin, fmax];
  const pts = sweep(xmin, xmax, 240, (x) => evaluate(byDist ? { distance: x } : { focal: x }));
  const cur = byDist ? state.distance : state.focal;
  const unit = byDist ? fmtM : fmtMm;

  document.querySelectorAll("[data-sweep]").forEach((b) => b.classList.toggle("on", b.dataset.sweep === state.sweep));
  $("chart-title").textContent = byDist ? t("chartDistance")(fmtMm(state.focal)) : t("chartFocal")(fmtM(state.distance));

  const ymax = Math.max(0.5, ...pts.map((p) => p.risk)) * 1.05;
  const x = (v) => M.l + ((Math.log(v) - Math.log(xmin)) / (Math.log(xmax) - Math.log(xmin))) * (W - M.l - M.r);
  const y = (v) => H - M.b - (v / ymax) * (H - M.t - M.b);

  const box = $("chart");
  box.innerHTML = "";
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": $("chart-title").textContent }, box);

  // Risk bands (status colours, always paired with a text label)
  const bands = [["low", 0, LEVELS.low], ["moderate", LEVELS.low, LEVELS.high], ["high", LEVELS.high, ymax]];
  for (const [lvl, lo, hi] of bands) {
    el("rect", { class: `band-${lvl}`, x: M.l, y: y(hi), width: W - M.l - M.r, height: y(lo) - y(hi) }, svg);
    const lbl = el("text", { class: "band-label", x: W - M.r - 6, y: y(Math.min(hi, ymax)) + 13, "text-anchor": "end" }, svg);
    lbl.textContent = t(lvl);
  }

  // Y grid + axis
  const ax = el("g", { class: "axis" }, svg);
  for (let v = 0; v <= ymax; v += 0.1) {
    el("line", { class: "gridline", x1: M.l, x2: W - M.r, y1: y(v), y2: y(v) }, ax);
    const tx = el("text", { x: M.l - 6, y: y(v) + 4, "text-anchor": "end" }, ax);
    tx.textContent = `${Math.round(v * 100)}%`;
  }
  el("line", { class: "baseline", x1: M.l, x2: W - M.r, y1: y(0), y2: y(0) }, ax);

  // X ticks (log)
  const ticks = [1, 2, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1000].filter((v) => v >= xmin * 0.999 && v <= xmax * 1.001);
  for (const v of ticks) {
    const tx = el("text", { x: x(v), y: H - M.b + 18, "text-anchor": "middle" }, ax);
    tx.textContent = byDist ? `${v} m` : `${v}`;
  }
  if (!byDist) {
    const u = el("text", { x: W - M.r, y: H - 2, "text-anchor": "end" }, ax);
    u.textContent = "mm";
  }

  // Series
  el("path", { class: "series", d: pts.map((p, i) => `${i ? "L" : "M"}${x(p.x).toFixed(1)},${y(p.risk).toFixed(1)}`).join("") }, svg);

  // Current setting
  const a = evaluate();
  el("line", { class: "cursor", x1: x(cur), x2: x(cur), y1: M.t, y2: H - M.b }, svg);
  el("circle", { class: "marker", cx: x(cur), cy: y(a.risk), r: 5 }, svg);

  // Hover
  const tip = document.createElement("div");
  tip.className = "tooltip";
  tip.hidden = true;
  box.append(tip);
  const hoverLine = el("line", { class: "cursor", y1: M.t, y2: H - M.b, visibility: "hidden" }, svg);
  const hoverDot = el("circle", { class: "marker", r: 4, visibility: "hidden" }, svg);
  const hit = el("rect", { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b, fill: "transparent" }, svg);
  const toSvgX = (evt) => ((evt.clientX - svg.getBoundingClientRect().left) / svg.getBoundingClientRect().width) * W;
  hit.addEventListener("pointermove", (evt) => {
    const sx = toSvgX(evt);
    let best = pts[0];
    for (const p of pts) if (Math.abs(x(p.x) - sx) < Math.abs(x(best.x) - sx)) best = p;
    hoverLine.setAttribute("x1", x(best.x));
    hoverLine.setAttribute("x2", x(best.x));
    hoverLine.setAttribute("visibility", "visible");
    hoverDot.setAttribute("cx", x(best.x));
    hoverDot.setAttribute("cy", y(best.risk));
    hoverDot.setAttribute("visibility", "visible");
    tip.hidden = false;
    const r = svg.getBoundingClientRect();
    tip.style.left = `${(x(best.x) / W) * r.width}px`;
    tip.style.top = `${(y(best.risk) / H) * r.height}px`;
    tip.textContent = `${unit(best.x)} · ${fmt(best.ledPx, 2)} ${t("px")} · ${pct(best.risk)} · ${t(best.level)}`;
  });
  hit.addEventListener("pointerleave", () => {
    tip.hidden = true;
    hoverLine.setAttribute("visibility", "hidden");
    hoverDot.setAttribute("visibility", "hidden");
  });
  hit.addEventListener("click", (evt) => {
    const sx = toSvgX(evt);
    const v = Math.exp(Math.log(xmin) + ((sx - M.l) / (W - M.l - M.r)) * (Math.log(xmax) - Math.log(xmin)));
    if (byDist) state.distance = Math.min(Math.max(v, DIST_MIN), DIST_MAX);
    else state.focal = Math.min(Math.max(v, xmin), xmax);
    render();
  });

  // Ranges summary
  const ranges = riskRanges(pts);
  $("ranges").textContent = ranges.length
    ? t("rangesLead") + ranges.map((r) => `${t("between")(unit(r.from), unit(r.to))} (${t(r.peak)})`).join(" · ")
    : t("rangesNone");
}

// ---------- 3D ----------
let scene3d = null;
let pending3d = false;
let framed = false;
function schedule3d() {
  if (!scene3d || pending3d) return;
  pending3d = true;
  requestAnimationFrame(() => { pending3d = false; update3d(); });
}

function update3d() {
  const wg = wallGeom();
  const cam = camera();
  const hfovDeg = (2 * Math.atan(cam.sensor_w_mm / (2 * state.focal)) * 180) / Math.PI;
  const aspect = cam.sensor_w_mm / cam.sensor_h_mm;

  // Heatmap extent follows the camera distance so the interesting zone stays readable.
  const zmax = Math.min(Math.max(state.distance * 1.6, 30), DIST_MAX);
  const half = Math.max(zmax * 0.45, wg.w);
  const heat = state.heat
    ? buildHeatmap({ xmin: -half, xmax: half, zmin: 0.5, zmax, nx: 72, nz: 72 }, (x, z) => evaluate({ distance: z, camX: x }).level)
    : { rgba: new Uint8Array(4), nx: 1, nz: 1, xmin: 0, xmax: 0.001, zmin: 0, zmax: 0.001 };

  scene3d.update({
    wall: { ...wg, label: tile().name },
    cam: { x: state.camX, y: state.camH, z: state.distance, hfovDeg, aspect },
    heat,
  });
  if (!framed) { scene3d.frame({ wall: wg, cam: { z: state.distance } }); framed = true; }

  $("wall-panels").textContent = t("panels")(wg.cols, wg.rows, fmt(wg.w, 2), fmt(wg.h, 2));
  $("hud").textContent = `${fmtM(geomFor().d)} · ${fmtMm(state.focal)} · HFOV ${fmt(hfovDeg, 1)}° · ${t("frameW")} ${fmtM(2 * geomFor().d * Math.tan((hfovDeg * Math.PI) / 360))}`;
  for (const k of ["wallW", "wallH", "wallBottom", "camX", "camH"]) {
    if (document.activeElement !== $(k)) $(k).value = fmtRaw(state[k]);
  }
}

function syncPlan() {
  $("plan-controls").hidden = !plan.source;
  $("plan-name").textContent = plan.source ? plan.name : t("noPlan");
  for (const k of ["widthM", "rotDeg", "offX", "offZ", "opacity"]) $(`plan-${k}`).value = plan[k];
  scene3d?.setPlan(plan);
}

function wire3d() {
  scene3d = createScene($("scene"), {
    onFloorClick: (x, z) => {
      state.camX = Math.round(x * 10) / 10;
      state.distance = Math.min(Math.max(z, DIST_MIN), DIST_MAX);
      render();
    },
  });
  for (const k of ["wallW", "wallH", "wallBottom", "camX", "camH"]) {
    $(k).addEventListener("change", (e) => {
      const v = parseFloat(e.target.value);
      if (!Number.isNaN(v)) state[k] = v;
      render();
    });
  }
  $("heat").addEventListener("change", (e) => { state.heat = e.target.checked; render(); });
  document.querySelectorAll("[data-view]").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll("[data-view]").forEach((x) => x.classList.toggle("on", x === b));
      scene3d.setView(b.dataset.view);
    }));
  $("plan-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    $("plan-name").textContent = t("loading");
    try {
      plan.source = await loadPlanFile(file);
      plan.name = file.name;
    } catch (err) {
      console.error(err);
      plan.source = null;
      alert(t("planError"));
    }
    syncPlan();
  });
  for (const k of ["widthM", "rotDeg", "offX", "offZ", "opacity"]) {
    $(`plan-${k}`).addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      if (!Number.isNaN(v)) plan[k] = v;
      scene3d.setPlan(plan);
    });
  }
  $("plan-clear").addEventListener("click", () => { plan.source = null; $("plan-file").value = ""; syncPlan(); });
  syncPlan();
}

// ---------- events ----------
function wire() {
  $("tile").addEventListener("change", (e) => {
    state.tile = e.target.value;
    state.fill = tile().emitter_fill ?? 0.3;
    render();
  });
  $("camera").addEventListener("change", (e) => { state.camera = e.target.value; render(); });
  $("lens").addEventListener("change", (e) => { state.lens = e.target.value; render(); });
  $("extender").addEventListener("change", (e) => {
    const k = lens().extender || 1;
    state.focal *= e.target.checked ? k : 1 / k;
    state.ext = e.target.checked;
    render();
  });
  $("focal").addEventListener("input", (e) => {
    const [fmin, fmax] = focalRange();
    state.focal = logMap(+e.target.value, fmin, fmax);
    render();
  });
  $("distance").addEventListener("input", (e) => { state.distance = logMap(+e.target.value, DIST_MIN, DIST_MAX); render(); });
  $("aperture").addEventListener("change", (e) => { state.aperture = e.target.value; render(); });
  $("gap").addEventListener("input", (e) => { state.gap = +e.target.value; render(); });
  $("angle").addEventListener("input", (e) => { state.angle = +e.target.value; render(); });
  $("fill").addEventListener("input", (e) => { state.fill = +e.target.value; render(); });
  document.querySelectorAll("[data-sweep]").forEach((b) =>
    b.addEventListener("click", () => { state.sweep = b.dataset.sweep; render(); }));
  $("lang").addEventListener("click", () => { lang = lang === "fr" ? "en" : "fr"; applyI18n(); render(); });
  $("share").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      $("share").textContent = t("copied");
      setTimeout(() => ($("share").textContent = t("share")), 1500);
    } catch {
      prompt(t("share"), location.href);
    }
  });
}

// ---------- boot ----------
(async () => {
  try {
    const [tiles, cameras, lenses] = await Promise.all([
      loadJSON("data/led-tiles.json"),
      loadJSON("data/cameras.json"),
      loadJSON("data/lenses.json"),
    ]);
    DATA = { tiles: tiles.tiles, cameras: cameras.cameras, lenses: lenses.lenses };
  } catch (err) {
    document.querySelector(".layout").innerHTML =
      `<div class="card"><p>⚠️ Données non chargées / Data failed to load. Voir README (serveur local).</p></div>`;
    console.error(err);
    return;
  }

  const firstOwned = (list) => (list.find((x) => x.owned && x.focal_min_mm !== undefined) || list.find((x) => x.owned) || list[0]).id;
  state.tile = DATA.tiles[0].id;
  state.camera = firstOwned(DATA.cameras);
  state.lens = firstOwned(DATA.lenses.filter((l) => l.focal_min_mm));
  readHash();
  if (!tile()) state.tile = DATA.tiles[0].id;
  if (!camera()) state.camera = DATA.cameras[0].id;
  if (!lens()) state.lens = "manual";
  if (state.fill == null || Number.isNaN(state.fill)) state.fill = tile().emitter_fill ?? 0.3;

  applyI18n();
  wire();
  try {
    wire3d();
  } catch (err) {
    console.error(err);
    $("scene").textContent = t("no3d");
  }
  render();
})();
