// Brain region activation model — lerped region weights → computed emotion dimensions

import { state } from './gameState.js';

export const REGIONS = [
  'prefrontal', 'amygdala', 'hippocampus',
  'basal_ganglia', 'cerebellum', 'thalamus', 'cingulate'
];

// Current activation levels: 0 to 1 (instantaneous, decays each frame)
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
const LERP_DURATION = 2500; // ms
const lerpFrom = { prefrontal:0, amygdala:0, hippocampus:0, basal_ganglia:0, cerebellum:0, thalamus:0, cingulate:0 };
const lerpTo   = { prefrontal:0, amygdala:0, hippocampus:0, basal_ganglia:0, cerebellum:0, thalamus:0, cingulate:0 };
let lerpElapsed = 0;
let lerpActive  = false;

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

export function applyRegionWeights(weights) {
  for (const key of REGIONS) {
    lerpFrom[key] = activations[key];
    lerpTo[key]   = activations[key];
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

// ── 8 emotion dimensions ──────────────────────────────────────────────────────
// All derived from instantaneous region activations, updated every frame.
export function computeEmotions() {
  const a = activations;
  state.emotions.pleasure   = a.basal_ganglia * 0.6  + a.amygdala    * 0.4;
  state.emotions.stress     = a.amygdala      * 0.6  + a.cingulate   * 0.4;
  state.emotions.motivation = a.basal_ganglia * 0.7  + a.prefrontal  * 0.3;
  state.emotions.focus      = a.prefrontal    * 0.65 + a.cingulate   * 0.35;
  state.emotions.memory     = a.hippocampus   * 0.7  + a.prefrontal  * 0.3;
  state.emotions.social     = a.amygdala      * 0.5  + a.prefrontal  * 0.5;
  state.emotions.creative   = a.prefrontal    * 0.4  + a.cingulate   * 0.35 + a.hippocampus * 0.25;
  state.emotions.fluency    = a.cerebellum    * 0.8  + a.thalamus    * 0.2;
}

// ── Brain type lookup table ───────────────────────────────────────────────────
export const BRAIN_TYPE_TABLE = {
  reptilian: {
    approach: { id: 'gear',       emoji: '⚙️',  name_zh: '齿轮脑', name_en: 'Gear Brain',
      desc_zh: '高效执行机器。习惯一旦建立便全力运转，高流畅、低创意，遇到新情况容易卡壳。',
      desc_en: 'A high-efficiency executor. Once habits form, it runs at full power — high fluency, low creativity, struggles with novelty.' },
    avoidant: { id: 'shell',      emoji: '🐚',  name_zh: '贝壳脑', name_en: 'Shell Brain',
      desc_zh: '用固定程序保护自己。对变化高度警觉，舒适区极窄但在其中极度稳定。',
      desc_en: 'Uses fixed routines as armor. Highly alert to change, narrow comfort zone but supremely stable within it.' },
    balanced: { id: 'bedrock',    emoji: '🪨',  name_zh: '基岩脑', name_en: 'Bedrock Brain',
      desc_zh: '最稳定的存在。几乎不被外界影响，缺乏弹性但极度耐压，长期低调运作。',
      desc_en: 'The most stable of all types. Barely moved by the outside world — inflexible but nearly unbreakable.' }
  },
  limbic: {
    approach: { id: 'furnace',    emoji: '🔥',  name_zh: '熔炉脑', name_en: 'Furnace Brain',
      desc_zh: '情感充沛且行动力强。愉悦和动力双高，热情投入但容易燃尽，对奖励极度敏感。',
      desc_en: 'Emotionally charged and highly driven. Pleasure and motivation both peak — burns bright but risks burnout.' },
    avoidant: { id: 'deep_sea',   emoji: '🌊',  name_zh: '深海脑', name_en: 'Deep Sea Brain',
      desc_zh: '情感丰富但内敛。记忆中藏着大量细节，对负面事件高度敏感，共情能力极强但容易内耗。',
      desc_en: 'Emotionally rich but contained. Stores vast detail in memory, deeply empathetic, prone to quiet exhaustion.' },
    balanced: { id: 'roots',      emoji: '🌿',  name_zh: '根系脑', name_en: 'Root Brain',
      desc_zh: '情感稳定且关系导向。像植物一样缓慢生长，用记忆和情感连接周围的一切。',
      desc_en: 'Emotionally stable and relationship-driven. Grows slowly like a plant, connecting everything through memory and feeling.' }
  },
  cortical: {
    approach: { id: 'arc',        emoji: '⚡',  name_zh: '电弧脑', name_en: 'Arc Brain',
      desc_zh: '理性与行动力的结合体。分析完立刻执行，目标导向极强，情绪几乎不干扰决策。',
      desc_en: 'Reason meets action. Analyzes then executes immediately — goal-driven, emotions rarely interfere.' },
    avoidant: { id: 'microscope', emoji: '🔬',  name_zh: '显微脑', name_en: 'Microscope Brain',
      desc_zh: '过度分析型。专注极高但动力偏低，把所有可能性都想一遍才敢行动，容易陷入分析瘫痪。',
      desc_en: 'The overthinker. Focus peaks but motivation lags — examines every possibility before acting, risks analysis paralysis.' },
    balanced: { id: 'network',    emoji: '🌐',  name_zh: '网络脑', name_en: 'Network Brain',
      desc_zh: '理性与情绪平衡最好的类型。能在分析和感受之间自由切换，适应性最强。',
      desc_en: 'The most balanced cortical type. Switches freely between analysis and feeling — the most adaptable of all.' }
  }
};

// ── Brain type classification ─────────────────────────────────────────────────
// Computed from cumulativeActivation (regionAccumulated) — never from instantaneous.
// Step 1: dominant brain layer. Step 2: BIS/BAS profile. Step 3: table lookup.
export function computeBrainType() {
  const c = state.stats.regionAccumulated;

  const reptilian = c.cerebellum    * 0.7  + c.thalamus    * 0.3;
  const limbic    = c.amygdala      * 0.45 + c.hippocampus * 0.35 + c.basal_ganglia * 0.2;
  const cortical  = c.prefrontal    * 0.55 + c.cingulate   * 0.45;

  const total = reptilian + limbic + cortical;
  if (total < 0.5) return; // not enough data yet

  let dominantLayer;
  if (reptilian >= limbic && reptilian >= cortical) dominantLayer = 'reptilian';
  else if (limbic >= cortical) dominantLayer = 'limbic';
  else dominantLayer = 'cortical';

  const bas = c.basal_ganglia * 0.55 + c.prefrontal * 0.45;
  const bis = c.amygdala      * 0.6  + c.cingulate  * 0.4;
  const ratio = (bas + bis > 0) ? bas / (bas + bis) : 0.5;

  let bisBasProfile;
  if (ratio > 0.6)      bisBasProfile = 'approach';
  else if (ratio < 0.4) bisBasProfile = 'avoidant';
  else                  bisBasProfile = 'balanced';

  const newType = BRAIN_TYPE_TABLE[dominantLayer][bisBasProfile];
  const oldType = state.brainType;

  state.brainType = newType;
  state.brainTypeScores = {
    reptilian: reptilian / total,
    limbic:    limbic    / total,
    cortical:  cortical  / total,
    bas:       ratio,
    bis:       1 - ratio,
  };

  if (!oldType || oldType.id !== newType.id) {
    state.brainTypeChanged = true;
  }
}

export function decayActivations(dt) {
  const rate = 0.0006 * dt;
  for (const key of REGIONS) {
    activations[key] = Math.max(0, activations[key] - rate);
  }
}

export function tickBrainModel(dt) {
  if (lerpActive) {
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
    decayActivations(dt);
  }

  computeEmotions();
  state.emotionHistory.push({ ...state.emotions });
  if (state.emotionHistory.length > 200) state.emotionHistory.shift();
}
