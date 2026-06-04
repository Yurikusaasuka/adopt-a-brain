// Central game state — shared across all modules

export const state = {
  brainName: '',
  started: false,

  // Emotion vector: -1 to 1
  emotions: {
    pleasure: 0,
    stress: 0,
    cognitive: 0,
    social: 0,
    creative: 0
  },

  // History of emotion snapshots for EEG/trend
  emotionHistory: [],

  // Current active event (or null)
  currentEvent: null,

  // Feedback message timing
  feedbackTimer: 0,

  // Timestamps
  lastEventTime: 0,
  gameTime: 0,       // increments each frame in ms
};

export function setBrainName(name) {
  state.brainName = name.trim();
}

export function applyEmotionVector(vector) {
  const decay = 0.85; // existing emotions partially persist
  for (const key of Object.keys(state.emotions)) {
    if (vector[key] !== undefined) {
      state.emotions[key] = Math.max(-1, Math.min(1,
        state.emotions[key] * decay + vector[key]
      ));
    }
  }
  // Push snapshot to history (keep last 200 frames for EEG)
  state.emotionHistory.push({ ...state.emotions });
  if (state.emotionHistory.length > 200) state.emotionHistory.shift();
}

export function decayEmotions(dt) {
  // Passive decay toward 0 each frame
  const decayRate = 0.0008 * dt;
  for (const key of Object.keys(state.emotions)) {
    const v = state.emotions[key];
    if (Math.abs(v) < decayRate) {
      state.emotions[key] = 0;
    } else {
      state.emotions[key] -= Math.sign(v) * decayRate;
    }
  }
}
