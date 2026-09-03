// Entry point: game loop, UI wiring, module init

import { state, setBrainName }   from './gameState.js';
import { activations, tickBrainModel, computeBrainType, REGIONS } from './brainModel.js';
import { loadEvents, tickEventEngine, selectOption, setEventCallback, setFeedbackCallback, setSaveCallback } from './eventEngine.js';
import { initRenderer, initBackground, renderFrame } from './renderer.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const menuScreen        = document.getElementById('menu-screen');
const menuResumeSection = document.getElementById('menu-resume');
const menuNewSection    = document.getElementById('menu-new');
const menuSaveInfo      = document.getElementById('menu-save-info');
const menuContinueBtn   = document.getElementById('menu-continue-btn');
const menuNewBrainBtn   = document.getElementById('menu-newbrain-btn');
const clearSaveBtn      = document.getElementById('clear-save-btn');

const nameInput    = document.getElementById('name-input');
const nameSubmit   = document.getElementById('name-submit');
const nameConfirm  = document.getElementById('name-confirm');
const nameStartBtn = document.getElementById('name-start-btn');

const brainNameDisp = document.getElementById('brain-name-display');
const eventTitleZH  = document.getElementById('event-title-zh');
const eventTitleEN  = document.getElementById('event-title-en');
const eventDescZH   = document.getElementById('event-desc-zh');
const eventDescEN   = document.getElementById('event-desc-en');
const optionsCont   = document.getElementById('options-container');
const feedbackText  = document.getElementById('feedback-text');
const feedbackEN    = document.getElementById('feedback-en');

const statTime         = document.getElementById('stat-time');
const statEvents       = document.getElementById('stat-events');
const statPeakPleasure = document.getElementById('stat-peak-pleasure');
const statPeakStress   = document.getElementById('stat-peak-stress');
const statMostActive   = document.getElementById('stat-most-active');
const statTotalAct     = document.getElementById('stat-total-act');
const backToMenuBtn    = document.getElementById('back-to-menu-btn');

const savedFlash = document.getElementById('saved-flash');

const canvasBG    = document.getElementById('canvas-bg');
const canvasBrain = document.getElementById('canvas-brain');
const canvasEEG   = document.getElementById('canvas-eeg');
const canvasFMRI  = document.getElementById('canvas-fmri');
const canvasAxial = document.getElementById('canvas-axial');

// ── Save system ───────────────────────────────────────────────────────────────
const SAVE_KEY = 'adopt-a-brain-save';

function saveGame() {
  if (!state.gameInitialized || !state.brainName) return;
  const data = {
    brainName:         state.brainName,
    activations:       { ...activations },
    emotions:          { ...state.emotions },
    experiencedEvents: [...state.experiencedEvents],
    playTimeSeconds:   Math.floor(state.playTimeSeconds),
    stats: {
      eventsResolved:    state.stats.eventsResolved,
      peakPleasure:      state.stats.peakPleasure,
      peakStress:        state.stats.peakStress,
      totalActivation:   state.stats.totalActivation,
      regionAccumulated: { ...state.stats.regionAccumulated },
    },
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    showSavedFlash();
  } catch (_) {}
}

function loadSaveData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
}

function clearSaveData() {
  localStorage.removeItem(SAVE_KEY);
}

function applySaveData(save) {
  setBrainName(save.brainName);
  for (const [region, val] of Object.entries(save.activations || {})) {
    if (activations[region] !== undefined) activations[region] = val;
  }
  state.experiencedEvents = save.experiencedEvents || [];
  state.playTimeSeconds   = save.playTimeSeconds   || 0;
  if (save.stats) {
    state.stats.eventsResolved  = save.stats.eventsResolved  || 0;
    state.stats.peakPleasure    = save.stats.peakPleasure    || 0;
    state.stats.peakStress      = save.stats.peakStress      || 0;
    state.stats.totalActivation = save.stats.totalActivation || 0;
    if (save.stats.regionAccumulated) {
      for (const [r, v] of Object.entries(save.stats.regionAccumulated)) {
        if (state.stats.regionAccumulated[r] !== undefined)
          state.stats.regionAccumulated[r] = v;
      }
    }
  }
}

// Reset ALL in-memory game state to blank (used by New Brain — no page reload)
function resetState() {
  state.brainName        = '';
  state.started          = false;
  state.gameInitialized  = false;
  state.playTimeSeconds  = 0;
  state.experiencedEvents = [];
  state.currentEvent     = null;
  state.lastEventTime    = 0;
  state.gameTime         = 0;
  state.emotionHistory   = [];
  for (const key of Object.keys(state.emotions)) state.emotions[key] = 0;
  for (const key of REGIONS) activations[key] = 0;
  state.stats.eventsResolved  = 0;
  state.stats.peakPleasure    = 0;
  state.stats.peakStress      = 0;
  state.stats.totalActivation = 0;
  for (const key of Object.keys(state.stats.regionAccumulated))
    state.stats.regionAccumulated[key] = 0;
  state.brainType        = null;
  state.brainTypeScores  = { reptilian: 0, limbic: 0, cortical: 0, bas: 0.5, bis: 0.5 };
  state.brainTypeChanged = false;
  // Reset name prompt UI to its initial state for reuse
  nameInput.value          = '';
  nameInput.style.display  = '';
  nameConfirm.style.display  = 'none';
  nameStartBtn.style.display = 'none';
  nameSubmit.style.display   = '';
}

// ── Saved flash ───────────────────────────────────────────────────────────────
let savedFlashTimer = null;
function showSavedFlash() {
  savedFlash.classList.add('visible');
  clearTimeout(savedFlashTimer);
  savedFlashTimer = setTimeout(() => savedFlash.classList.remove('visible'), 2000);
}

// 30-second auto-save
setInterval(() => { if (state.gameInitialized && state.started) saveGame(); }, 30000);

// ── Stats helpers ─────────────────────────────────────────────────────────────
const REGION_LABELS = {
  prefrontal:    '前额叶 PFC',
  amygdala:      '杏仁核 AMY',
  hippocampus:   '海马体 HPC',
  basal_ganglia: '基底核 BG',
  cerebellum:    '小脑 CB',
  thalamus:      '丘脑 THL',
  cingulate:     '扣带回 CG',
};

function formatTime(secs) {
  const s   = Math.floor(secs);
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function getMostActiveRegion() {
  const acc = state.stats.regionAccumulated;
  let best = '—', bestVal = -1;
  for (const [r, v] of Object.entries(acc)) {
    if (v > bestVal) { bestVal = v; best = r; }
  }
  return bestVal > 0 ? (REGION_LABELS[best] || best) : '—';
}

let statsUpdateTimer = 0;
function updateStatsDOM(dt) {
  statsUpdateTimer += dt;
  if (statsUpdateTimer < 1000) return;
  statsUpdateTimer = 0;
  if (statTime)          statTime.textContent         = formatTime(state.playTimeSeconds);
  if (statEvents)        statEvents.textContent        = state.stats.eventsResolved;
  if (statPeakPleasure)  statPeakPleasure.textContent  = Math.round(state.stats.peakPleasure * 100) + '%';
  if (statPeakStress)    statPeakStress.textContent    = Math.round(state.stats.peakStress * 100) + '%';
  if (statMostActive)    statMostActive.textContent    = getMostActiveRegion();
  if (statTotalAct)      statTotalAct.textContent      = state.stats.totalActivation.toFixed(2);
}

// ── Menu screen ───────────────────────────────────────────────────────────────
// menuScreen is shown in exactly TWO situations:
//   1. boot() when there is NO save (fresh player → show name prompt)
//   2. backToMenuBtn is explicitly clicked (manual pause mid-game)
// ALL OTHER TIMES menuScreen stays hidden. No location.reload() anywhere.

function showNamePromptScreen() {
  menuResumeSection.style.display = 'none';
  menuNewSection.style.display    = 'flex';
  clearSaveBtn.style.display      = 'none';
  menuScreen.style.display        = 'flex';
}

function showPauseMenuScreen() {
  menuResumeSection.style.display = 'flex';
  menuNewSection.style.display    = 'none';
  clearSaveBtn.style.display      = 'block';
  const save = loadSaveData();
  menuSaveInfo.textContent = save
    ? `「${save.brainName}」· ${formatTime(save.playTimeSeconds || 0)}`
    : `「${state.brainName}」· ${formatTime(state.playTimeSeconds)}`;
  menuScreen.style.display = 'flex';
}

function hideMenuScreen() {
  menuScreen.style.display = 'none';
}

// Continue (unpause)
menuContinueBtn.addEventListener('click', () => {
  hideMenuScreen();
  state.started = true;
});

// New Brain — no reload; reset state in-place and show name prompt
menuNewBrainBtn.addEventListener('click', () => {
  clearSaveData();
  resetState();
  hideMenuScreen();
  showNamePromptScreen();
});

// Clear Save — same as New Brain
clearSaveBtn.addEventListener('click', () => {
  clearSaveData();
  resetState();
  hideMenuScreen();
  showNamePromptScreen();
});

// ── Back to Menu button (stats panel) ────────────────────────────────────────
// Two-click confirm with minimum 500 ms between clicks so double-tap doesn't fire it.
let menuBtnArmed   = false;
let menuBtnArmTime = 0;
let menuBtnArmTimer = null;

function disarmMenuBtn() {
  menuBtnArmed = false;
  clearTimeout(menuBtnArmTimer);
  menuBtnArmTimer = null;
  backToMenuBtn.innerHTML        = '回到菜单<br/>Back to Menu';
  backToMenuBtn.style.color      = '';
  backToMenuBtn.style.borderColor = '';
}

backToMenuBtn.addEventListener('click', () => {
  if (!state.gameInitialized) return;
  const now = Date.now();
  if (!menuBtnArmed) {
    menuBtnArmed   = true;
    menuBtnArmTime = now;
    backToMenuBtn.innerHTML        = '确认？ / Confirm?';
    backToMenuBtn.style.color      = '#ffcc44';
    backToMenuBtn.style.borderColor = 'rgba(200,160,40,0.6)';
    menuBtnArmTimer = setTimeout(disarmMenuBtn, 3000);
  } else {
    if (now - menuBtnArmTime < 500) {
      // Too fast — treat as double-tap accident, reset arm timer
      disarmMenuBtn();
      return;
    }
    disarmMenuBtn();
    saveGame();
    state.started = false;
    showPauseMenuScreen();
  }
});

// ── Name input flow ───────────────────────────────────────────────────────────
nameSubmit.addEventListener('click', handleNameSubmit);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleNameSubmit(); });

function handleNameSubmit() {
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.style.borderColor = '#ff4444';
    setTimeout(() => { nameInput.style.borderColor = 'rgba(180,140,0,0.6)'; }, 700);
    return;
  }
  setBrainName(name);
  nameConfirm.textContent    = `「${name}」是你的大脑了\n"${name}" is your brain now`;
  nameConfirm.style.display  = 'block';
  nameStartBtn.style.display = 'block';
  nameSubmit.style.display   = 'none';
  nameInput.style.display    = 'none';
}

nameStartBtn.addEventListener('click', () => {
  hideMenuScreen();
  startGame();
});

// ── Game start (one-way gate) ─────────────────────────────────────────────────
function startGame() {
  if (state.gameInitialized) return;
  state.gameInitialized     = true;
  state.started             = true;
  state.lastEventTime       = 2500; // first event fires ~0.5 s in
  brainNameDisp.textContent = `[ ${state.brainName} ]`;
  setIdleCard();
}

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
  optionsCont.innerHTML    = '';

  evt.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';

    const zhSpan = document.createElement('span');
    zhSpan.style.cssText = 'display:block;color:#b8d0f8;margin-bottom:3px';
    zhSpan.textContent   = opt.text_zh;

    const enSpan = document.createElement('span');
    enSpan.style.cssText = 'display:block;color:#384860;font-size:0.7em';
    enSpan.textContent   = opt.text_en;

    btn.appendChild(zhSpan);
    btn.appendChild(enSpan);

    btn.addEventListener('click', () => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      [...optionsCont.querySelectorAll('.option-btn')].forEach(b => {
        b.style.opacity       = '0.35';
        b.style.pointerEvents = 'none';
      });
      selectOption(i);
      setTimeout(() => setIdleCard(), 80);
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

setSaveCallback(saveGame);

// ── Game loop ─────────────────────────────────────────────────────────────────
let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 100);
  lastTime = timestamp;

  if (state.started) {
    state.playTimeSeconds += dt / 1000;
    if (state.emotions.pleasure > state.stats.peakPleasure)
      state.stats.peakPleasure = state.emotions.pleasure;
    if (state.emotions.stress > state.stats.peakStress)
      state.stats.peakStress = state.emotions.stress;
    tickBrainModel(dt);
    tickEventEngine(dt);
    updateStatsDOM(dt);
  }

  renderFrame(dt);
  requestAnimationFrame(loop);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
// Rule: menuScreen is shown here ONLY when there is NO save (fresh player).
// When a save exists, we auto-restore and skip the menu entirely.
async function boot() {
  await loadEvents();
  initBackground(canvasBG);
  initRenderer(canvasBrain, canvasEEG, canvasFMRI, canvasAxial);

  const save = loadSaveData();
  if (save) {
    // Returning player: silently restore and start — no menu shown
    applySaveData(save);
    computeBrainType(); // re-derive from restored cumulative data
    startGame();
  } else {
    // New player: show name prompt (only automatic menu appearance)
    showNamePromptScreen();
  }

  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
}

boot();
