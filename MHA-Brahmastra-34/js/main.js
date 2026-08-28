'use strict';

/* ============================================================
   VELOCITY MATRIX — MICRO-MISSIONS ENGINE
   Core state, audio engine, and anti-cheat time-lock system
   ============================================================ */

const state = {
  missions: [],
  nextId: 1,
  totalCoins: 0,
  completedCount: 0,
};

/* ---------- DOM REFS ---------- */
const els = {
  mainGoalInput: document.getElementById('mainGoalInput'),
  missionCountInput: document.getElementById('missionCountInput'),
  generateBtn: document.getElementById('generateBtn'),
  goalDisplay: document.getElementById('goalDisplay'),
  missionsGrid: document.getElementById('missionsGrid'),
  emptyState: document.getElementById('emptyState'),
  totalCoinsEl: document.getElementById('totalCoins'),
  completedCountEl: document.getElementById('completedCount'),
  activeCountEl: document.getElementById('activeCount'),
  toastContainer: document.getElementById('toastContainer'),
};

/* ============================================================
   AUDIO ENGINE (Web Audio API — no external assets)
   ============================================================ */

let audioCtx = null;

function ensureAudioContext() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playErrorBuzz() {
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.32);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(140, now + 0.08);
  gain2.gain.setValueAtTime(0.0001, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.32);
}

function playUnlockSound() {
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;

  const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6 - vault unlock arpeggio
  freqs.forEach((freq, i) => {
    const start = now + i * 0.07;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.25);
  });

  // low sub-thump for the "vault" weight
  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(90, now);
  thump.frequency.exponentialRampToValueAtTime(40, now + 0.3);
  thumpGain.gain.setValueAtTime(0.4, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  thump.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thump.start(now);
  thump.stop(now + 0.36);
}

function playSuccessSound() {
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;

  // Arcade power-up: fast rising sweep + sparkle chord
  const sweep = ctx.createOscillator();
  const sweepGain = ctx.createGain();
  sweep.type = 'square';
  sweep.frequency.setValueAtTime(220, now);
  sweep.frequency.exponentialRampToValueAtTime(1400, now + 0.35);
  sweepGain.gain.setValueAtTime(0.0001, now);
  sweepGain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
  sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  sweep.connect(sweepGain);
  sweepGain.connect(ctx.destination);
  sweep.start(now);
  sweep.stop(now + 0.42);

  const chordFreqs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  chordFreqs.forEach((freq, i) => {
    const start = now + 0.3 + i * 0.045;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.42);
  });

  const noise = createNoiseBurst(ctx, now + 0.28, 0.15, 0.12);
  noise.start(now + 0.28);
}

function createNoiseBurst(ctx, startTime, duration, volume) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;

  noiseSource.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  return noiseSource;
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2600);
}

/* ============================================================
   MISSION GENERATION
   ============================================================ */

const MISSION_VERBS = [
  'Draft', 'Outline', 'Review', 'Polish', 'Research', 'Sketch',
  'Refactor', 'Organize', 'Prototype', 'Finalize', 'Audit', 'Brainstorm'
];

const MISSION_NOUNS = [
  'the core plan', 'key talking points', 'the first draft', 'the checklist',
  'the reference notes', 'the layout', 'the next step', 'the summary',
  'the action items', 'the rough structure', 'the priority list', 'the follow-up'
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function generateMissionTitle(index) {
  return `${pickRandom(MISSION_VERBS)} ${pickRandom(MISSION_NOUNS)}`;
}

function generateMissions() {
  ensureAudioContext();

  const goal = els.mainGoalInput.value.trim();
  let count = parseInt(els.missionCountInput.value, 10);

  if (!goal) {
    showToast('⚠️ Enter a Main Goal first.', 'error');
    els.mainGoalInput.focus();
    return;
  }
  if (isNaN(count) || count < 1) count = 1;
  if (count > 12) count = 12;
  els.missionCountInput.value = count;

  // Clear existing missions and cancel their animation frames
  state.missions.forEach(m => {
    if (m.rafId) cancelAnimationFrame(m.rafId);
  });
  state.missions = [];
  state.totalCoins = 0;
  state.completedCount = 0;
  els.missionsGrid.innerHTML = '';

  els.goalDisplay.innerHTML = `Active Goal: <span>${escapeHTML(goal)}</span>`;

  for (let i = 0; i < count; i++) {
    const durationSeconds = randomInt(30, 90);
    const baseCoins = randomInt(50, 500);
    const isBoosted = Math.random() < 0.3;
    const multiplier = isBoosted ? pickRandom([1.5, 2]) : 1;

    const mission = {
      id: state.nextId++,
      title: generateMissionTitle(i),
      durationSeconds,
      lockDurationMs: durationSeconds * 0.25 * 1000,
      baseCoins,
      multiplier,
      isBoosted,
      state: 'idle', // idle -> running-locked -> running-unlocked -> completed
      startTime: null,
      rafId: null,
      unlockSoundPlayed: false,
      el: null,
      progressFillEl: null,
      timerTextEl: null,
      actionBtnEl: null,
    };

    state.missions.push(mission);
    renderMissionCard(mission);
  }

  updateStatsBar();
  toggleEmptyState();
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================
   MISSION CARD RENDERING
   ============================================================ */

function renderMissionCard(mission) {
  const card = document.createElement('div');
  card.className = 'mission-card' + (mission.isBoosted ? ' boosted' : '');
  card.dataset.missionId = mission.id;

  const totalReward = Math.round(mission.baseCoins * mission.multiplier);

  card.innerHTML = `
    <div class="mission-top">
      <div class="mission-title">${escapeHTML(mission.title)}</div>
      ${mission.isBoosted ? `<div class="boost-badge">${mission.multiplier}x BOOST</div>` : ''}
    </div>
    <div class="mission-reward">Reward: <span class="coin-amount">🪙 ${totalReward}</span></div>
    <div class="mission-duration">Duration: ${mission.durationSeconds}s &middot; Lock: ${Math.round(mission.lockDurationMs / 1000)}s</div>
    <div class="progress-track">
      <div class="progress-fill" style="width:100%"></div>
    </div>
    <div class="timer-readout">
      <span class="time-remaining">Ready to start</span>
      <span class="lock-status"></span>
    </div>
    <button class="mission-action-btn state-idle" type="button">🚀 Start Mission</button>
  `;

  mission.el = card;
  mission.progressFillEl = card.querySelector('.progress-fill');
  mission.timerTextEl = card.querySelector('.time-remaining');
  mission.lockStatusEl = card.querySelector('.lock-status');
  mission.actionBtnEl = card.querySelector('.mission-action-btn');

  mission.actionBtnEl.addEventListener('click', () => handleActionClick(mission));

  els.missionsGrid.appendChild(card);
}

/* ============================================================
   MISSION LIFECYCLE
   ============================================================ */

function handleActionClick(mission) {
  ensureAudioContext();

  if (mission.state === 'idle') {
    startMission(mission);
    return;
  }

  if (mission.state === 'running-locked') {
    // HARD BLOCK: even if somehow clicked, re-validate and reject
    triggerLockedRejection(mission);
    return;
  }

  if (mission.state === 'running-unlocked') {
    attemptCompleteMission(mission);
    return;
  }

  // state === 'completed' -> no-op, button is disabled anyway
}

function startMission(mission) {
  mission.state = 'running-locked';
  mission.startTime = performance.now();
  mission.unlockSoundPlayed = false;

  // HARDCORE JS LOCK — not just CSS
  mission.actionBtnEl.disabled = true;
  mission.actionBtnEl.className = 'mission-action-btn state-locked';
  mission.actionBtnEl.innerHTML = '🔒 Locked';

  mission.el.classList.add('is-running');

  updateStatsBar();
  runMissionLoop(mission);
}

function runMissionLoop(mission) {
  const totalMs = mission.durationSeconds * 1000;

  function tick() {
    // Stop the loop entirely if mission was completed via click already
    if (mission.state === 'completed') {
      return;
    }

    const elapsed = performance.now() - mission.startTime;
    const remainingMs = Math.max(totalMs - elapsed, 0);
    const remainingPercent = Math.max((remainingMs / totalMs) * 100, 0);

    // 60fps progress bar shrink via requestAnimationFrame
    mission.progressFillEl.style.width = remainingPercent + '%';

    const remainingSeconds = Math.ceil(remainingMs / 1000);
    mission.timerTextEl.textContent =
      remainingMs > 0 ? `⏱ ${remainingSeconds}s remaining` : '⏱ Time complete';

    // ===== 25% ANTI-CHEAT TIME-LOCK CHECK =====
    if (mission.state === 'running-locked') {
      const lockRemainingMs = Math.max(mission.lockDurationMs - elapsed, 0);
      const lockRemainingSec = Math.ceil(lockRemainingMs / 1000);

      if (lockRemainingMs > 0) {
        mission.lockStatusEl.innerHTML = `<span class="lock-tag">🔒 ${lockRemainingSec}s to unlock</span>`;
      }

      if (elapsed >= mission.lockDurationMs) {
        unlockMission(mission);
      }
    } else if (mission.state === 'running-unlocked') {
      mission.lockStatusEl.innerHTML = `<span class="lock-tag" style="color:var(--purple)">⚡ Ready</span>`;
      mission.progressFillEl.classList.add('unlocked-fill');
    }

    mission.rafId = requestAnimationFrame(tick);
  }

  mission.rafId = requestAnimationFrame(tick);
}

function unlockMission(mission) {
  // Defensive re-validation: confirm the actual elapsed time before unlocking
  const elapsedNow = performance.now() - mission.startTime;
  if (elapsedNow < mission.lockDurationMs) {
    // Should never happen, but never trust a single check — bail safely
    return;
  }

  mission.state = 'running-unlocked';

  mission.actionBtnEl.disabled = false;
  mission.actionBtnEl.className = 'mission-action-btn state-unlocked';
  mission.actionBtnEl.innerHTML = '⚡ Mark Complete';

  mission.progressFillEl.classList.add('unlocked-fill');

  if (!mission.unlockSoundPlayed) {
    mission.unlockSoundPlayed = true;
    playUnlockSound();
    showToast('🔓 Vault unlocked — mission ready to complete.', 'info');
  }
}

function attemptCompleteMission(mission) {
  // ===== UN-HACKABLE STATE VALIDATION =====
  // Never trust the button's disabled attribute alone — recompute from timestamps.
  const elapsed = performance.now() - mission.startTime;

  if (elapsed < mission.lockDurationMs || mission.actionBtnEl.disabled) {
    triggerLockedRejection(mission);
    return;
  }

  if (mission.state !== 'running-unlocked') {
    return;
  }

  completeMission(mission);
}

function completeMission(mission) {
  mission.state = 'completed';

  if (mission.rafId) {
    cancelAnimationFrame(mission.rafId);
    mission.rafId = null;
  }

  const totalReward = Math.round(mission.baseCoins * mission.multiplier);
  state.totalCoins += totalReward;
  state.completedCount += 1;

  mission.actionBtnEl.disabled = true;
  mission.actionBtnEl.className = 'mission-action-btn state-completed';
  mission.actionBtnEl.innerHTML = '✅ Completed';

  mission.progressFillEl.classList.remove('unlocked-fill');
  mission.progressFillEl.classList.add('completed-fill');
  mission.progressFillEl.style.width = '100%';

  mission.timerTextEl.textContent = '🏁 Mission complete';
  mission.lockStatusEl.innerHTML = `<span style="color:var(--emerald)">+${totalReward} 🪙</span>`;

  mission.el.classList.add('state-completed');

  playSuccessSound();
  showToast(`🎉 +${totalReward} coins earned!`, 'success');

  updateStatsBar();
}

function triggerLockedRejection(mission) {
  playErrorBuzz();
  showToast('⏳ Still locked! Wait for the 25% time-lock to clear.', 'error');

  mission.el.classList.remove('shake');
  // Force reflow so the shake animation can retrigger
  void mission.el.offsetWidth;
  mission.el.classList.add('shake');
  setTimeout(() => mission.el.classList.remove('shake'), 400);
}

/* ============================================================
   STATS BAR
   ============================================================ */

function updateStatsBar() {
  els.totalCoinsEl.textContent = state.totalCoins.toLocaleString();
  els.completedCountEl.textContent = `${state.completedCount} / ${state.missions.length}`;

  const activeCount = state.missions.filter(
    m => m.state === 'running-locked' || m.state === 'running-unlocked'
  ).length;
  els.activeCountEl.textContent = activeCount;
}

function toggleEmptyState() {
  els.emptyState.style.display = state.missions.length === 0 ? 'block' : 'none';
}

/* ============================================================
   INIT
   ============================================================ */

els.generateBtn.addEventListener('click', generateMissions);

els.mainGoalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') generateMissions();
});

// Prime audio context on first interaction anywhere (mobile browser requirement)
document.addEventListener('click', function primeAudio() {
  ensureAudioContext();
}, { once: true });