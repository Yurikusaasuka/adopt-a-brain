// Event engine: loads events, dispatches on timer, handles option selection

import { state, applyEmotionVector } from './gameState.js';
import { applyEmotionsToRegions } from './brainModel.js';

let allEvents = [];
let eventQueue = [];
let onEventCallback = null;
let onFeedbackCallback = null;

const EVENT_MIN_MS = 8000;
const EVENT_MAX_MS = 15000;

// Fixed interval drawn once per cycle so the random check is stable each frame
let nextEventInterval = EVENT_MIN_MS;

export async function loadEvents() {
  const res = await fetch('./data/events.json');
  const data = await res.json();
  allEvents = data.events;
  shuffleQueue();
}

function shuffleQueue() {
  eventQueue = [...allEvents].sort(() => Math.random() - 0.5);
}

export function setEventCallback(cb) {
  onEventCallback = cb;
}

export function setFeedbackCallback(cb) {
  onFeedbackCallback = cb;
}

export function tickEventEngine(dt) {
  if (!state.started) return;
  if (state.currentEvent) return;

  state.lastEventTime += dt;

  if (state.lastEventTime >= nextEventInterval) {
    state.lastEventTime = 0;
    nextEventInterval = EVENT_MIN_MS + Math.random() * (EVENT_MAX_MS - EVENT_MIN_MS);
    dispatchNextEvent();
  }
}

function dispatchNextEvent() {
  if (eventQueue.length === 0) shuffleQueue();
  const event = eventQueue.shift();
  state.currentEvent = event;
  if (onEventCallback) onEventCallback(event);
}

export function selectOption(optionIndex) {
  if (!state.currentEvent) return;
  const opt = state.currentEvent.options[optionIndex];
  if (!opt) return;

  applyEmotionVector(opt.emotionVector);
  applyEmotionsToRegions();

  if (onFeedbackCallback) {
    onFeedbackCallback(opt.feedback_zh, opt.feedback_en);
  }

  state.currentEvent = null;
  state.lastEventTime = 0;
  nextEventInterval = EVENT_MIN_MS + Math.random() * (EVENT_MAX_MS - EVENT_MIN_MS);
}

export function forceNextEvent() {
  state.currentEvent = null;
  state.lastEventTime = nextEventInterval; // trigger on next tick
}
