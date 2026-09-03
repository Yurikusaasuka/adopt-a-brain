// renderer.js — lateral pixel brain, EEG, fMRI pixel-grid, bubble background, emotion arrows

import { activations, REGIONS } from './brainModel.js';
import { state } from './gameState.js';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED region colors — identical in both brain view and fMRI
// ─────────────────────────────────────────────────────────────────────────────
export const REGION_COLORS = {
  prefrontal:    { base: [28,  60, 160], active: [100, 170, 255] },
  amygdala:      { base: [155, 30,  55], active: [255,  70, 105] },
  hippocampus:   { base: [28, 125,  75], active: [ 60, 240, 135] },
  basal_ganglia: { base: [145, 105, 14], active: [245, 200,  50] },
  cerebellum:    { base: [ 85,  28, 145], active: [185, 100, 245] },
  thalamus:      { base: [ 22, 145, 145], active: [ 60, 240, 240] },
  cingulate:     { base: [165,  60, 125], active: [245, 125, 200] },
};

function lerpColor(base, active, t) {
  return base.map((b, i) => Math.round(b + (active[i] - b) * t));
}

// ── Canvas refs ───────────────────────────────────────────────────────────────
let canvasBG,    ctxBG;
let canvasBrain, ctxBrain;
let canvasEEG,   ctxEEG;
let canvasFMRI,  ctxFMRI;
let canvasAxial, ctxAxial;

// ── EEG ───────────────────────────────────────────────────────────────────────
let eegBuffer = [];
let eegPhase  = 0;
const EEG_HISTORY = 320;

// ── fMRI pixel grid ───────────────────────────────────────────────────────────
const FMRI_GRID = 40;
let fmriMap = null;

// ── Lateral brain pixel data ──────────────────────────────────────────────────
const B_PIX = 6;
let brainCells = null;

// ── Axial (top-down) brain pixel data ────────────────────────────────────────
const A_PIX = 6;
let axialCells = null;

// ── Bubbles ───────────────────────────────────────────────────────────────────
const bubbles = [];
let bubbleFrame = 0;

// ── Emotion delta tracking ────────────────────────────────────────────────────
const prevEmotions    = {};
const arrowFadeTimers = {};

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
export function initBackground(bgCanvas) {
  canvasBG = bgCanvas;
  ctxBG    = bgCanvas.getContext('2d');
  const resizeBG = () => { canvasBG.width = window.innerWidth; canvasBG.height = window.innerHeight; };
  resizeBG();
  window.addEventListener('resize', resizeBG);
}

export function initRenderer(brainCanvas, eegCanvas, fmriCanvas, axialCanvas) {
  canvasBrain = brainCanvas; ctxBrain = brainCanvas.getContext('2d');
  canvasEEG   = eegCanvas;   ctxEEG   = eegCanvas.getContext('2d');
  canvasFMRI  = fmriCanvas;  ctxFMRI  = fmriCanvas.getContext('2d');
  canvasAxial = axialCanvas; ctxAxial = axialCanvas.getContext('2d');

  if (eegBuffer.length === 0) for (let i = 0; i < EEG_HISTORY; i++) eegBuffer.push(0);

  watchWrap(canvasBrain, () => buildBrainCells());
  watchWrap(canvasEEG,   null);
  watchWrap(canvasFMRI,  () => buildFMRIMap());
  watchWrap(canvasAxial, () => buildAxialCells());

  renderLegendDots();
}

function watchWrap(canvas, onReady) {
  const wrap = canvas.parentElement;
  if (!wrap) return;
  const obs = new ResizeObserver(entries => {
    for (const entry of entries) {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w < 1 || h < 1) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
      }
      if (onReady) onReady();
    }
  });
  obs.observe(wrap);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGEND DOTS
// ─────────────────────────────────────────────────────────────────────────────
function renderLegendDots() {
  for (const [region, col] of Object.entries(REGION_COLORS)) {
    const el = document.getElementById('dot-' + region);
    if (!el) continue;
    el.width = el.height = 6;
    const ctx = el.getContext('2d');
    const [r, g, b] = col.active;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 6, 6);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LATERAL BRAIN — geometry helpers
// ─────────────────────────────────────────────────────────────────────────────
function inMainBrain(nx, ny) {
  const oval = Math.pow((nx - 0.44) / 0.38, 2) + Math.pow((ny - 0.40) / 0.35, 2) <= 1.0;
  const temp = Math.pow((nx - 0.34) / 0.27, 2) + Math.pow((ny - 0.68) / 0.16, 2) <= 1.0
               && nx > 0.09 && nx < 0.63 && ny > 0.54 && ny < 0.82;
  const notFrontChin = !(nx < 0.16 && ny > 0.64);
  return (oval || temp) && notFrontChin;
}

function inCerebellum(nx, ny) {
  return Math.pow((nx - 0.74) / 0.155, 2) + Math.pow((ny - 0.70) / 0.135, 2) <= 1.0;
}

function assignLateralRegion(nx, ny, isCB) {
  if (isCB) return 'cerebellum';
  if (nx < 0.30) return 'prefrontal';
  if (ny < 0.20 && nx < 0.68) return 'cingulate';
  if (nx > 0.39 && nx < 0.59 && ny > 0.33 && ny < 0.54) return 'thalamus';
  if (nx < 0.37 && ny > 0.53) return 'amygdala';
  if (ny > 0.53 && nx >= 0.37 && nx < 0.70) return 'hippocampus';
  if (nx > 0.30 && nx < 0.64 && ny > 0.24 && ny < 0.58) return 'basal_ganglia';
  if (nx > 0.68) return 'hippocampus';
  return 'prefrontal';
}

const FOLD_DEFS = [
  [0.08, 0.78, 0.18, 0.022, 7.5],
  [0.06, 0.82, 0.30, 0.028, 7.0],
  [0.08, 0.80, 0.44, 0.025, 6.5],
  [0.12, 0.62, 0.62, 0.018, 5.5],
  [0.15, 0.57, 0.74, 0.014, 4.5],
  [0.22, 0.26, 0.26, 0.075, 1.5],
];

function onFoldLine(nx, ny, ROWS) {
  for (const [nxS, nxE, baseNy, amp, freq] of FOLD_DEFS) {
    if (nx < nxS || nx > nxE) continue;
    const t = (nx - nxS) / (nxE - nxS);
    const foldY = baseNy + amp * Math.sin(t * Math.PI * freq);
    if (Math.abs(ny - foldY) < 0.65 / ROWS) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// LATERAL BRAIN — build pixel data
// ─────────────────────────────────────────────────────────────────────────────
function buildBrainCells() {
  brainCells = [];
  const W = canvasBrain.width, H = canvasBrain.height;
  if (W < 10 || H < 10) return;

  const COLS = Math.floor(W / B_PIX);
  const ROWS = Math.floor(H / B_PIX);

  const regionMap = new Array(COLS * ROWS).fill(null);
  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const nx = (gx + 0.5) / COLS;
      const ny = (gy + 0.5) / ROWS;
      const isCB   = inCerebellum(nx, ny);
      const isMain = !isCB && inMainBrain(nx, ny);
      if (isCB || isMain) regionMap[gy * COLS + gx] = assignLateralRegion(nx, ny, isCB);
    }
  }

  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const region = regionMap[gy * COLS + gx];
      if (!region) continue;

      const nx = (gx + 0.5) / COLS;
      const ny = (gy + 0.5) / ROWS;

      const border =
        (gx === 0       || !regionMap[gy * COLS + (gx-1)]) ||
        (gx === COLS-1  || !regionMap[gy * COLS + (gx+1)]) ||
        (gy === 0       || !regionMap[(gy-1) * COLS + gx])  ||
        (gy === ROWS-1  || !regionMap[(gy+1) * COLS + gx]);

      let shade;
      if (border) {
        shade = 0.20;
      } else if (onFoldLine(nx, ny, ROWS)) {
        shade = 0.32;
      } else {
        const lightX = 0.52 - nx;
        const lightY = 0.30 - ny;
        const diff = lightX * 0.55 + lightY * 0.65;
        shade = Math.max(0.42, Math.min(1.18, 0.74 + diff * 0.52));
        if (ny > 0.78) shade *= 0.48;
        else if (ny > 0.70) shade *= 0.66;
        else if (ny > 0.62) shade *= 0.82;
        if (region === 'cerebellum' && ny > 0.74) shade *= 0.60;
      }

      brainCells.push({ px: gx * B_PIX, py: gy * B_PIX, region, shade });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LATERAL BRAIN — render
// ─────────────────────────────────────────────────────────────────────────────
function renderBrain() {
  const ctx = ctxBrain;
  const W = canvasBrain.width, H = canvasBrain.height;
  ctx.fillStyle = '#020a14';
  ctx.fillRect(0, 0, W, H);

  if (!brainCells || brainCells.length === 0) return;

  for (const { px, py, region, shade } of brainCells) {
    const act = activations[region] ?? 0;
    const { base, active } = REGION_COLORS[region];

    const tAct = 0.12 + act * 0.88;
    const [r, g, b] = lerpColor(
      base.map(v => Math.round(v * 0.25)),
      active,
      tAct
    );

    const br = Math.min(255, Math.round(r * shade));
    const bg = Math.min(255, Math.round(g * shade));
    const bb = Math.min(255, Math.round(b * shade));

    ctx.fillStyle = `rgb(${br},${bg},${bb})`;
    ctx.fillRect(px, py, B_PIX - 1, B_PIX - 1);

    if (act > 0.20 && Math.random() < act * 0.20) {
      const gr = Math.min(255, active[0] + 70);
      const gg = Math.min(255, active[1] + 70);
      const gb = Math.min(255, active[2] + 70);
      ctx.fillStyle = `rgba(${gr},${gg},${gb},${0.55 + act * 0.35})`;
      const ox = Math.floor(Math.random() * (B_PIX - 1));
      const oy = Math.floor(Math.random() * (B_PIX - 1));
      ctx.fillRect(px + ox, py + oy, 2, 2);
    }
  }

  const hcx = W * 0.22, hcy = H * 0.20;
  for (let i = 0; i < 10; i++) {
    const sx = hcx + (Math.random() - 0.5) * W * 0.16;
    const sy = hcy + (Math.random() - 0.5) * H * 0.14;
    const nx = (sx / W - 0.44) / 0.38;
    const ny = (sy / H - 0.40) / 0.35;
    if (nx*nx + ny*ny > 0.88) continue;
    ctx.fillStyle = `rgba(200,230,255,${0.18 + Math.random() * 0.35})`;
    ctx.fillRect(Math.round(sx), Math.round(sy), Math.random() < 0.3 ? 3 : 2, 1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EEG
// ─────────────────────────────────────────────────────────────────────────────
function renderEEG(dt) {
  const ctx = ctxEEG;
  const W = canvasEEG.width, H = canvasEEG.height;

  const stress   = state.emotions.stress   ?? 0;
  const focus    = state.emotions.focus    ?? 0;
  const pleasure = state.emotions.pleasure ?? 0;

  const activity = (stress + focus) * 0.5;
  const freq = 0.028 + activity * 0.13;
  const amp  = 7 + activity * 24 + Math.abs(pleasure) * 5;
  const noise = activity * 3.5;

  eegPhase += freq * (dt / 16.67);

  const sample =
    Math.sin(eegPhase * Math.PI * 2) * amp +
    Math.sin(eegPhase * Math.PI * 2 * 2.4) * amp * 0.28 * activity +
    Math.sin(eegPhase * Math.PI * 2 * 0.37) * amp * 0.18 +
    (Math.random() - 0.5) * noise;

  eegBuffer.push(sample);
  if (eegBuffer.length > EEG_HISTORY) eegBuffer.shift();

  ctx.fillStyle = '#000a00';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#001400';
  for (let x = 0; x < W; x += 24) ctx.fillRect(x, 0, 1, H);
  for (let y = 0; y < H; y += 12) ctx.fillRect(0, y, W, 1);

  for (let y = 0; y < H; y += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, y, W, 1);
  }

  const midY = Math.floor(H / 2);
  ctx.fillStyle = '#003300';
  ctx.fillRect(0, midY, W, 1);

  const step = W / EEG_HISTORY;
  for (let i = 1; i < eegBuffer.length; i++) {
    const x = Math.floor(i * step);
    const y = Math.floor(midY - eegBuffer[i]);
    const norm = Math.min(1, Math.abs(eegBuffer[i]) / (amp + 1));
    const gCh  = Math.floor(110 + norm * 145);
    ctx.fillStyle = `rgb(0,${gCh},0)`;
    ctx.fillRect(x, Math.max(0, Math.min(H - 2, y)), 2, 2);
    if (i > 2) {
      const py2 = Math.floor(midY - eegBuffer[i - 2]);
      ctx.fillStyle = `rgba(0,${Math.floor(gCh * 0.30)},0,0.45)`;
      ctx.fillRect(x - 2, Math.max(0, Math.min(H - 2, py2)), 2, 1);
    }
  }

  const mode = activity > 0.55 ? 'β BETA' : activity > 0.20 ? 'α/β MIX' : 'α ALPHA';
  const el = document.getElementById('eeg-mode-tag');
  if (el) el.textContent = mode;
}

// ─────────────────────────────────────────────────────────────────────────────
// fMRI
// ─────────────────────────────────────────────────────────────────────────────
function buildFMRIMap() {
  fmriMap = new Array(FMRI_GRID * FMRI_GRID).fill(null);
  for (let gy = 0; gy < FMRI_GRID; gy++) {
    for (let gx = 0; gx < FMRI_GRID; gx++) {
      const nx = (gx + 0.5) / FMRI_GRID;
      const ny = (gy + 0.5) / FMRI_GRID;
      const dx = nx - 0.50, dy = ny - 0.50;

      const inMain = (dx*dx)/(0.40*0.40) + (dy*dy)/(0.44*0.44) <= 1;
      const cdy    = ny - 0.87;
      const inCB   = (dx*dx)/(0.20*0.20) + (cdy*cdy)/(0.09*0.09) <= 1;

      if (inCB)        fmriMap[gy * FMRI_GRID + gx] = 'cerebellum';
      else if (inMain) fmriMap[gy * FMRI_GRID + gx] = assignFMRIRegion(nx, ny);
    }
  }
}

function assignFMRIRegion(nx, ny) {
  const dx = nx - 0.50, dy = ny - 0.50, ax = Math.abs(dx);
  if (dy < -0.16) return 'prefrontal';
  if (ax < 0.07  && dy < 0.14) return 'cingulate';
  if (ax < 0.10  && Math.abs(dy) < 0.10) return 'thalamus';
  if (ax < 0.22  && Math.abs(dy) < 0.20) return 'basal_ganglia';
  if (ax >= 0.16 && ax < 0.35 && dy > -0.12 && dy < 0.12) return 'amygdala';
  if (ax >= 0.14 && dy >= 0.10) return 'hippocampus';
  return 'prefrontal';
}

function heatColor(t) {
  t = Math.max(0, Math.min(1, Math.floor(t * 8) / 8));
  if (t < 0.25) {
    const s = t / 0.25;
    return [Math.round(s * 25), Math.round(s * 70), Math.round(80 + s * 160)];
  } else if (t < 0.50) {
    const s = (t - 0.25) / 0.25;
    return [Math.round(25 + s * 210), Math.round(70 + s * 180), Math.round(240 - s * 210)];
  } else if (t < 0.75) {
    const s = (t - 0.50) / 0.25;
    return [Math.round(235 + s * 20), Math.round(250 - s * 140), Math.round(30 - s * 30)];
  } else {
    const s = (t - 0.75) / 0.25;
    return [255, Math.round(110 + s * 145), Math.round(s * 255)];
  }
}

function renderFMRI() {
  const ctx = ctxFMRI;
  const W = canvasFMRI.width, H = canvasFMRI.height;
  ctx.fillStyle = '#010814';
  ctx.fillRect(0, 0, W, H);
  if (!fmriMap) return;

  const cellW = W / FMRI_GRID;
  const cellH = H / FMRI_GRID;

  for (let gy = 0; gy < FMRI_GRID; gy++) {
    for (let gx = 0; gx < FMRI_GRID; gx++) {
      const region = fmriMap[gy * FMRI_GRID + gx];
      if (!region) continue;
      const act = activations[region] ?? 0;
      const [r, g, b] = heatColor(0.04 + act * 0.96);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(Math.floor(gx * cellW), Math.floor(gy * cellH),
                   Math.ceil(cellW) + 1, Math.ceil(cellH) + 1);
    }
  }

  ctx.fillStyle = 'rgba(0,6,20,0.60)';
  for (let gx = 0; gx <= FMRI_GRID; gx++) ctx.fillRect(Math.floor(gx * cellW), 0, 1, H);
  for (let gy = 0; gy <= FMRI_GRID; gy++) ctx.fillRect(0, Math.floor(gy * cellH), W, 1);

  for (let y = 0; y < H; y += 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.fillRect(0, y, W, 1);
  }

  ctx.fillStyle = 'rgba(40,100,120,0.55)';
  ctx.font = `${Math.max(6, Math.floor(W * 0.042))}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('A', W * 0.50, 11);
  ctx.fillText('P', W * 0.50, H - 3);
  ctx.textAlign = 'left';
  ctx.fillText('L', 3, H * 0.52);
  ctx.textAlign = 'right';
  ctx.fillText('R', W - 3, H * 0.52);
  ctx.textAlign = 'left';

  const barH = Math.min(H * 0.5, 70), barW = 6;
  const bx = W - 12, by = (H - barH) / 2;
  for (let i = 0; i < barH; i++) {
    const [r, g, b] = heatColor(1 - i / barH);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(bx, Math.floor(by + i), barW, 1);
  }
  ctx.fillStyle = 'rgba(40,100,120,0.55)';
  ctx.font = '5px monospace';
  ctx.fillText('HI', bx - 1, Math.floor(by) - 1);
  ctx.fillText('LO', bx - 1, Math.floor(by + barH) + 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// AXIAL BRAIN
// ─────────────────────────────────────────────────────────────────────────────
function buildAxialCells() {
  axialCells = [];
  const W = canvasAxial.width, H = canvasAxial.height;
  if (W < 10 || H < 10) return;

  const COLS = Math.floor(W / A_PIX);
  const ROWS = Math.floor(H / A_PIX);
  const cx = COLS * 0.50, cy = ROWS * 0.50;
  const rx = COLS * 0.42, ry = ROWS * 0.46;

  const regionMap = new Array(COLS * ROWS).fill(null);

  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const ndx = (gx - cx) / rx;
      const ndy = (gy - cy) / ry;
      if (ndx*ndx + ndy*ndy > 1.0) continue;
      regionMap[gy * COLS + gx] = assignAxialRegion(ndx, ndy);
    }
  }

  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const region = regionMap[gy * COLS + gx];
      if (!region) continue;
      const border =
        (gx === 0      || !regionMap[gy * COLS + (gx-1)]) ||
        (gx === COLS-1 || !regionMap[gy * COLS + (gx+1)]) ||
        (gy === 0      || !regionMap[(gy-1) * COLS + gx])  ||
        (gy === ROWS-1 || !regionMap[(gy+1) * COLS + gx]);
      axialCells.push({ px: gx * A_PIX, py: gy * A_PIX, region, border });
    }
  }
}

function assignAxialRegion(ndx, ndy) {
  const ax = Math.abs(ndx);
  if (ndy > 0.72 && ax < 0.40) return 'cerebellum';
  if (ndy < -0.38) return 'prefrontal';
  if (ax < 0.18 && ndy < 0.22) return 'cingulate';
  if (ax < 0.20 && Math.abs(ndy) < 0.20) return 'thalamus';
  if (ax >= 0.36 && ndy < 0.10) return 'amygdala';
  if (ax >= 0.28 && ndy >= 0.08) return 'hippocampus';
  if (ax < 0.44 && Math.abs(ndy) < 0.42) return 'basal_ganglia';
  return 'prefrontal';
}

function renderAxial() {
  const ctx = ctxAxial;
  const W = canvasAxial.width, H = canvasAxial.height;
  ctx.fillStyle = '#030308';
  ctx.fillRect(0, 0, W, H);
  if (!axialCells || axialCells.length === 0) return;

  const cx = W * 0.50, cy = H * 0.50;
  const rx = W * 0.42, ry = H * 0.46;

  for (const { px, py, region, border } of axialCells) {
    const act = activations[region] ?? 0;
    const { base, active } = REGION_COLORS[region];
    const tAct = 0.14 + act * 0.86;
    const [r, g, b] = lerpColor(base.map(v => Math.round(v * 0.22)), active, tAct);

    let shade = 1.0;
    if (border) {
      shade = 0.20;
    } else {
      const nx = (px / W - 0.50) / 0.42;
      const ny = (py / H - 0.50) / 0.46;
      const lightDot = (-0.5*nx - 0.7*ny + 0.5*Math.sqrt(Math.max(0, 1 - nx*nx - ny*ny)));
      shade = Math.max(0.45, Math.min(1.10, 0.72 + lightDot * 0.40));
    }

    ctx.fillStyle = `rgb(${Math.min(255,Math.round(r*shade))},${Math.min(255,Math.round(g*shade))},${Math.min(255,Math.round(b*shade))})`;
    ctx.fillRect(px, py, A_PIX - 1, A_PIX - 1);

    if (act > 0.22 && Math.random() < act * 0.18) {
      ctx.fillStyle = `rgba(${Math.min(255,active[0]+80)},${Math.min(255,active[1]+80)},${Math.min(255,active[2]+80)},${act * 0.7})`;
      ctx.fillRect(px + Math.floor(Math.random()*(A_PIX-1)), py + Math.floor(Math.random()*(A_PIX-1)), 2, 2);
    }
  }

  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  for (let py = cy - ry * 0.82; py <= cy + ry * 0.65; py += 1) {
    const ndy = (py - cy) / ry;
    const maxX = rx * Math.sqrt(Math.max(0, 1 - ndy*ndy));
    if (maxX < 3) continue;
    ctx.fillRect(Math.round(cx) - 1, Math.round(py), 2, 1);
  }

  ctx.fillStyle = 'rgba(40,100,80,0.50)';
  ctx.font = `${Math.max(6, Math.floor(W * 0.05))}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('前 A', W * 0.50, 11);
  ctx.fillText('后 P', W * 0.50, H - 3);
  ctx.textAlign = 'left';
}

// ─────────────────────────────────────────────────────────────────────────────
// BUBBLE BACKGROUND
// ─────────────────────────────────────────────────────────────────────────────
function spawnBubble() {
  if (!canvasBG) return;
  bubbles.push({
    x:    Math.random() * canvasBG.width,
    y:    canvasBG.height + 4,
    size: Math.random() < 0.45 ? 2 : 3,
    speed: 0.14 + Math.random() * 0.28,
    wobFreq:  0.018 + Math.random() * 0.030,
    wobPhase: Math.random() * Math.PI * 2,
    alpha: 0.20 + Math.random() * 0.32,
    age: 0,
  });
}

function renderBackground() {
  if (!canvasBG) return;
  const W = canvasBG.width, H = canvasBG.height;

  ctxBG.fillStyle = '#020d1a';
  ctxBG.fillRect(0, 0, W, H);

  bubbleFrame++;
  if (bubbleFrame % (10 + Math.floor(Math.random() * 12)) === 0) spawnBubble();

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.y -= b.speed;
    b.age++;
    b.x += Math.sin(b.wobPhase + b.age * b.wobFreq) * 0.45;

    const fadeT = Math.min(1, (b.y / H) * 4);
    const a = b.alpha * fadeT;

    if (b.y < -6 || a < 0.01) { bubbles.splice(i, 1); continue; }

    ctxBG.fillStyle = `rgba(150, 225, 255, ${a})`;
    ctxBG.fillRect(Math.round(b.x), Math.round(b.y), b.size, b.size);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMOTION CHIPS — 8 dimensions
// ─────────────────────────────────────────────────────────────────────────────
const EMOTION_KEYS = ['pleasure', 'stress', 'motivation', 'focus', 'memory', 'social', 'creative', 'fluency'];

function updateEmotionChips() {
  for (const key of EMOTION_KEYS) {
    const curr = state.emotions[key] ?? 0;
    const prev = prevEmotions[key] ?? curr;
    const delta = curr - prev;
    prevEmotions[key] = curr;

    const chipEl  = document.getElementById('chip-' + key);
    const arrowEl = document.getElementById('arrow-' + key);
    if (!chipEl || !arrowEl) continue;

    chipEl.classList.toggle('active', Math.abs(curr) > 0.08);

    if (Math.abs(delta) >= 0.040) {
      const up  = delta > 0;
      const big = Math.abs(delta) >= 0.28;
      arrowEl.textContent = up ? (big ? '▲▲' : '▲') : (big ? '▼▼' : '▼');
      arrowEl.className   = 'chip-arrow active ' + (up ? 'up' : 'down');

      clearTimeout(arrowFadeTimers[key]);
      arrowFadeTimers[key] = setTimeout(() => {
        arrowEl.classList.remove('active');
      }, 2000);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAIN TYPE PANEL
// ─────────────────────────────────────────────────────────────────────────────
const LAYER_COLORS = {
  reptilian: '#7a5c10',
  limbic:    '#a83030',
  cortical:  '#1a52b8',
};

function updateBrainTypePanel() {
  const section = document.getElementById('brain-type-section');
  if (!section) return;

  if (state.brainTypeChanged) {
    state.brainTypeChanged = false;
    section.classList.remove('bt-flash');
    // Force reflow so the animation restarts
    void section.offsetWidth;
    section.classList.add('bt-flash');
    section.addEventListener('animationend', () => section.classList.remove('bt-flash'), { once: true });
  }

  const bt = state.brainType;
  if (!bt) return;

  const emojiEl   = document.getElementById('brain-type-emoji');
  const nameZhEl  = document.getElementById('brain-type-name-zh');
  const nameEnEl  = document.getElementById('brain-type-name-en');
  const descZhEl  = document.getElementById('brain-type-desc-zh');
  const descEnEl  = document.getElementById('brain-type-desc-en');

  if (emojiEl)  emojiEl.textContent  = bt.emoji;
  if (nameZhEl) nameZhEl.textContent = bt.name_zh;
  if (nameEnEl) nameEnEl.textContent = bt.name_en;
  if (descZhEl) descZhEl.textContent = bt.desc_zh;
  if (descEnEl) descEnEl.textContent = bt.desc_en;

  // Three-layer composition bar
  const sc = state.brainTypeScores;
  const layerRep = document.getElementById('layer-reptilian');
  const layerLim = document.getElementById('layer-limbic');
  const layerCor = document.getElementById('layer-cortical');
  if (layerRep) layerRep.style.flex = String(Math.max(0.01, sc.reptilian));
  if (layerLim) layerLim.style.flex = String(Math.max(0.01, sc.limbic));
  if (layerCor) layerCor.style.flex = String(Math.max(0.01, sc.cortical));

  // BIS/BAS marker position (sc.bas is the approach ratio 0–1)
  const marker = document.getElementById('bisbas-marker');
  if (marker) {
    const pct = Math.round(sc.bas * 100);
    marker.style.left = `calc(${pct}% - 3px)`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RENDER
// ─────────────────────────────────────────────────────────────────────────────
export function renderFrame(dt) {
  renderBackground();
  renderBrain();
  renderEEG(dt);
  renderFMRI();
  renderAxial();
  updateEmotionChips();
  updateBrainTypePanel();
}
