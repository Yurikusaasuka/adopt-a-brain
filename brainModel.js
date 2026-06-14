// Brain region activation model — lerped region weights → computed emotion dimensions

import { state } from './gameState.js';

export const REGIONS = [
  'prefrontal', 'amygdala', 'hippocampus',
  'basal_ganglia', 'cerebellum', 'thalamus', 'cingulate'
];

// Current activation levels: 0 to 1
export const activations = {
  prefrontal:    0,
  amygdala:      0,
  hippocampus:   0,
  basal_ganglia: 0,
  cerebellum:    0,
  thalamus:      0,
  cingulate:     0,
};

// ── Lerp state ────────────────────────────────────────────────────────────────
// On option pick: snapshot activations → target, then interpolate over
// LERP_DURATION ms (suspending decay so the visual rise is never cancelled).
const LERP_DURATION = 2500; // ms
const lerpFrom = { prefrontal:0, amygdala:0, hippocampus:0, basal_ganglia:0, cerebellum:0, thalamus:0, cingulate:0 };
const lerpTo   = { prefrontal:0, amygdala:0, hippocampus:0, basal_ganglia:0, cerebellum:0, thalamus:0, cingulate:0 };
let lerpElapsed = 0;
let lerpActive  = false;

// ease-out cubic so the activation rises quickly then settles
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

export function applyRegionWeights(weights) {
  // Snapshot current state as lerp start
  for (const key of REGIONS) {
    lerpFrom[key] = activations[key];
    lerpTo[key]   = activations[key]; // default: keep current
  }

  let totalPositiveDelta = 0;
  for (const [region, delta] of Object.entries(weights)) {
    if (lerpTo[region] !== undefined) {
      lerpTo[region] = Math.max(0, Math.min(1, activations[region] + delta));
    }
    if (delta > 0 && state.stats.regionAccumulated[region] !== undefined) {
      state.stats.regionAccumulated[region] += delta;
      totalPositiveDelta += delta;
    }
  }
  state.stats.totalActivation += totalPositiveDelta;

  lerpElapsed = 0;
  lerpActive  = true;
}

export function computeEmotions() {
  const a = activations;
  state.emotions.pleasure  = a.basal_ganglia * 0.6 + a.amygdala  * 0.4;
  state.emotions.stress    = a.amygdala      * 0.5 + a.cingulate  * 0.5;
  state.emotions.focus     = a.prefrontal    * 0.6 + a.thalamus   * 0.4;
  state.emotions.cognitive = a.hippocampus   * 0.6 + a.prefrontal * 0.4;
  state.emotions.social    = a.amygdala      * 0.4 + a.prefrontal * 0.6;
  state.emotions.creative  = a.cingulate     * 0.5 + a.prefrontal * 0.5;
}

export function decayActivations(dt) {
  const rate = 0.0006 * dt;
  for (const key of REGIONS) {
    activations[key] = Math.max(0, activations[key] - rate);
  }
}

export function tickBrainModel(dt) {
  if (lerpActive) {
    // Absolute interpolation: move activations from lerpFrom → lerpTo
    // Decay is suspended so the lerp rise is never cancelled mid-animation
    lerpElapsed += dt;
    const t = Math.min(1, lerpElapsed / LERP_DURATION);
    const te = easeOut(t);
    for (const key of REGIONS) {
      activations[key] = lerpFrom[key] + (lerpTo[key] - lerpFrom[key]) * te;
    }
    if (t >= 1) {
      lerpActive = false;
      for (const key of REGIONS) activations[key] = lerpTo[key];
    }
  } else {
    // Normal frame: passive decay toward 0
    decayActivations(dt);
  }

  computeEmotions();
  state.emotionHistory.push({ ...state.emotions });
  if (state.emotionHistory.length > 200) state.emotionHistory.shift();
}
