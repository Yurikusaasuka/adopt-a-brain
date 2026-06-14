// Central game state — shared across all modules

export const state = {
  brainName: '',
  started: false,
  gameInitialized: false,

  // 6 computed emotion dimensions (0–1, derived from region activations each frame)
  emotions: {
    pleasure:  0,
    stress:    0,
    focus:     0,
    cognitive: 0,
    social:    0,
    creative:  0,
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
};

export function setBrainName(name) {
  state.brainName = name.trim();
}
