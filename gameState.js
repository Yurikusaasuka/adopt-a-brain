// Central game state — shared across all modules

export const state = {
  brainName: '',
  started: false,
  gameInitialized: false,

  // 8 computed emotion dimensions (0–1, derived from region activations each frame)
  emotions: {
    pleasure:   0,
    stress:     0,
    motivation: 0,
    focus:      0,
    memory:     0,
    social:     0,
    creative:   0,
    fluency:    0,
  },

  emotionHistory: [],
  currentEvent: null,
  feedbackTimer: 0,
  lastEventTime: 0,
  gameTime: 0,

  // Save system
  playTimeSeconds: 0,
  experiencedEvents: [],

  // Cumulative stats — persist in save, never reset between events
  stats: {
    eventsResolved: 0,
    peakPleasure: 0,
    peakStress: 0,
    totalActivation: 0,
    // cumulativeActivation per region: lifetime total of positive deltas, never decays
    regionAccumulated: {
      prefrontal:    0,
      amygdala:      0,
      hippocampus:   0,
      basal_ganglia: 0,
      cerebellum:    0,
      thalamus:      0,
      cingulate:     0,
    },
  },

  // Brain type classification (recalculated every 10 events from cumulative data)
  brainType: null,
  brainTypeScores: { reptilian: 0, limbic: 0, cortical: 0, bas: 0.5, bis: 0.5 },
  brainTypeChanged: false,
};

export function setBrainName(name) {
  state.brainName = name.trim();
}
