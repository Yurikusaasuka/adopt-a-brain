// Entry point: game loop, UI wiring, module init

import { state, setBrainName, decayEmotions } from './gameState.js';
import { loadEmotionMap, tickBrainModel }       from './brainModel.js';
import { loadEvents, tickEventEngine, selectOption, setEventCallback, setFeedbackCallback } from './eventEngine.js';
import { initRenderer, initBackground, renderFrame } from './renderer.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const namePrompt    = document.getElementById('name-prompt');
const nameInput     = document.getElementById('name-input');
const nameSubmit    = document.getElementById('name-submit');
const nameConfirm   = document.getElementById('name-confirm');
const nameStartBtn  = document.getElementById('name-start-btn');
const brainNameDisp = document.getElementById('brain-name-display');

const eventTitleZH  = document.getElementById('event-title-zh');
const eventTitleEN  = document.getElementById('event-title-en');
const eventDescZH   = document.getElementById('event-desc-zh');
const eventDescEN   = document.getElementById('event-desc-en');
const optionsCont   = document.getElementById('options-container');
const feedbackText  = document.getElementById('feedback-text');
const feedbackEN    = document.getElementById('feedback-en');

const canvasBG    = document.getElementById('canvas-bg');
const canvasBrain = document.getElementById('canvas-brain');
const canvasEEG   = document.getElementById('canvas-eeg');
const canvasFMRI  = document.getElementById('canvas-fmri');
const canvasAxial = document.getElementById('canvas-axial');

// ── Name prompt ───────────────────────────────────────────────────────────────
nameSubmit.addEventListener('click', handleNameSubmit);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleNameSubmit(); });

function handleNameSubmit() {
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.style.borderColor = '#ff4444';
    setTimeout(() => { nameInput.style.borderColor = '#996600'; }, 700);
    return;
  }
  setBrainName(name);
  nameConfirm.textContent = `「${name}」是你的大脑了\n"${name}" is your brain now`;
  nameConfirm.style.display = 'block';
  nameStartBtn.style.display = 'block';
  nameSubmit.style.display = 'none';
  nameInput.style.display  = 'none';
}

nameStartBtn.addEventListener('click', () => {
  namePrompt.style.display = 'none';
  state.started = true;
  state.lastEventTime = 6500; // first event fires quickly
  brainNameDisp.textContent = `[ ${state.brainName} ]`;
  setIdleCard();
});

// ── Event card helpers ────────────────────────────────────────────────────────
function setIdleCard() {
  eventTitleZH.textContent = '大脑正在待机…';
  eventTitleEN.textContent = 'Brain idling — next event incoming…';
  eventDescZH.textContent  = '';
  eventDescEN.textContent  = '';
  optionsCont.innerHTML    = '';
}

setEventCallback(evt => {
  eventTitleZH.textContent = evt.title_zh;
  eventTitleEN.textContent = evt.title_en;
  eventDescZH.textContent  = evt.description_zh;
  eventDescEN.textContent  = evt.description_en;

  feedbackText.textContent = '';
  feedbackEN.textContent   = '';

  optionsCont.innerHTML = '';
  evt.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';

    const zhSpan = document.createElement('span');
    zhSpan.style.cssText = 'display:block;color:#b8d0f8;font-size:7px;margin-bottom:3px';
    zhSpan.textContent = opt.text_zh;

    const enSpan = document.createElement('span');
    enSpan.style.cssText = 'display:block;color:#384860;font-size:5px';
    enSpan.textContent = opt.text_en;

    btn.appendChild(zhSpan);
    btn.appendChild(enSpan);

    btn.addEventListener('click', () => {
      selectOption(i);
      // Dim all buttons briefly, then clear
      [...optionsCont.querySelectorAll('.option-btn')].forEach(b => {
        b.style.opacity = '0.35';
        b.style.pointerEvents = 'none';
      });
      setTimeout(() => setIdleCard(), 400);
    });

    optionsCont.appendChild(btn);
  });
});

setFeedbackCallback((zh, en) => {
  feedbackText.style.opacity = '1';
  feedbackEN.style.opacity   = '1';
  feedbackText.textContent   = zh;
  feedbackEN.textContent     = en;

  clearTimeout(state._feedbackTimer);
  state._feedbackTimer = setTimeout(() => {
    feedbackText.style.transition = 'opacity 1s';
    feedbackEN.style.transition   = 'opacity 1s';
    feedbackText.style.opacity    = '0.25';
    feedbackEN.style.opacity      = '0.25';
  }, 4200);
});

// ── Game loop ─────────────────────────────────────────────────────────────────
let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 100);
  lastTime = timestamp;

  if (state.started) {
    decayEmotions(dt);
    tickBrainModel(dt);
    tickEventEngine(dt);
  }

  renderFrame(dt);
  requestAnimationFrame(loop);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  await Promise.all([loadEmotionMap(), loadEvents()]);
  initBackground(canvasBG);
  initRenderer(canvasBrain, canvasEEG, canvasFMRI, canvasAxial);
  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
}

boot();
