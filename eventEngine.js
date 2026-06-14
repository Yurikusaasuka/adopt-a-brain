// Event engine: loads events, dispatches on timer, handles option selection

import { state } from './gameState.js';
import { applyRegionWeights } from './brainModel.js';

let allEvents = [];
let eventQueue = [];
let onEventCallback    = null;
let onFeedbackCallback = null;
let onSaveCallback     = null;

const EVENT_MIN_MS = 3000;
const EVENT_MAX_MS = 6000;

let nextEventInterval = EVENT_MIN_MS;

export async function loadEvents() {
  const res  = await fetch('./data/events.json');
  const data = await res.json();
  allEvents  = data.events;
  shuffleQueue();
}

function shuffleQueue() {
  eventQueue = [...allEvents].sort(() => Math.random() - 0.5);
}

export function setEventCallback(cb)    { onEventCallback    = cb; }
export function setFeedbackCallback(cb) { onFeedbackCallback = cb; }
export function setSaveCallback(cb)     { onSaveCallback     = cb; }

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
  if (!event) {
    // allEvents is empty (shouldn't happen) — skip dispatch rather than fire undefined
    console.warn('[Adopt-a-Brain] dispatchNextEvent: event pool is empty');
    return;
  }
  state.currentEvent = event;
  if (onEventCallback) onEventCallback(event);
}

export function selectOption(optionIndex) {
  if (!state.currentEvent) return;
  const opt = state.currentEvent.options[optionIndex];
  if (!opt) return;

  applyRegionWeights(opt.regionWeights);

  if (!state.experiencedEvents.includes(state.currentEvent.id)) {
    state.experiencedEvents.push(state.currentEvent.id);
  }
  state.stats.eventsResolved++;

  if (onFeedbackCallback) {
    onFeedbackCallback(opt.feedback_zh, opt.feedback_en);
  }

  if (onSaveCallback) onSaveCallback();

  state.currentEvent = null;
  state.lastEventTime = 0;
  nextEventInterval = EVENT_MIN_MS + Math.random() * (EVENT_MAX_MS - EVENT_MIN_MS);
}

export function forceNextEvent() {
  state.currentEvent = null;
  state.lastEventTime = nextEventInterval;
}
