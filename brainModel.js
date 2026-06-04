// Brain region activation model: maps emotion vector → region activations

import { state } from './gameState.js';

export const REGIONS = [
  'prefrontal', 'amygdala', 'hippocampus',
  'basal_ganglia', 'cerebellum', 'thalamus', 'cingulate'
];

// Activation levels: 0 to 1
export const activations = {
  prefrontal: 0,
  amygdala: 0,
  hippocampus: 0,
  basal_ganglia: 0,
  cerebellum: 0,
  thalamus: 0,
  cingulate: 0
};

let emotionMap = null;

export async function loadEmotionMap() {
  const res = await fetch('./data/emotionMap.json');
  const data = await res.json();
  emotionMap = data.mappings;
}

export function applyEmotionsToRegions() {
  if (!emotionMap) return;
  const em = state.emotions;

  for (const mapping of emotionMap) {
    const emotionValue = em[mapping.emotion] ?? 0;
    if (emotionValue === 0) continue;

    const sign = Math.sign(emotionValue);
    const magnitude = Math.abs(emotionValue);

    if (sign > 0) {
      for (const { region, weight } of mapping.positive) {
        activations[region] = Math.min(1, activations[region] + magnitude * weight * 0.6);
      }
      for (const { region, weight } of mapping.negative) {
        activations[region] = Math.max(0, activations[region] - magnitude * weight * 0.4);
      }
    } else {
      // Negative emotion reverses the mapping
      for (const { region, weight } of mapping.positive) {
        activations[region] = Math.max(0, activations[region] - magnitude * weight * 0.3);
      }
      for (const { region, weight } of mapping.negative) {
        activations[region] = Math.min(1, activations[region] + magnitude * weight * 0.3);
      }
    }
  }
}

export function decayActivations(dt) {
  const rate = 0.0006 * dt;
  for (const key of REGIONS) {
    activations[key] = Math.max(0, activations[key] - rate);
  }
}

export function tickBrainModel(dt) {
  applyEmotionsToRegions();
  decayActivations(dt);
}
