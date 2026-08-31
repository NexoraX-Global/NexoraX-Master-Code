document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- AUDIO ENGINE ---------------- */
  const AudioEngine = {
    ctx: null,
    sirenNodes: null,
    init() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    deepBass() {
      this.init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    },
    softBell() {
      this.init();
      const ctx = this.ctx;
      const now = ctx.currentTime;
      [880, 1320, 1760].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.25 / (i + 1), now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.5);
      });
    },
    beep(freq = 1000, dur = 0.12, vol = 0.3) {
      this.init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    },
    startSiren() {
      this.init();
      if (this.sirenNodes) return;
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(4, ctx.currentTime);
      lfoGain.gain.setValueAtTime(300, ctx.currentTime);
      lfo.connect(lfoGain).connect(osc.frequency);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      lfo.start();
      this.sirenNodes = { osc, gain, lfo };
    },
    stopSiren() {
      if (!this.sirenNodes) return;
      const { osc, gain, lfo } = this.sirenNodes;
      const ctx = this.ctx;
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.stop(ctx.currentTime + 0.2);
      lfo.stop(ctx.currentTime + 0.2);
      this.sirenNodes = null;
    }
  };

  /* ---------------- DOM REFS ---------------- */
  const deskModeBtn = document.getElementById('deskModeBtn');
  const workoutModeBtn = document.getElementById('workoutModeBtn');
  const deskSettings = document.getElementById('deskSettings');
  const workoutActiveSettings = document.getElementById('workoutActiveSettings');
  const idleSlider = document.getElementById('idleSlider');
  const idleValue = document.getElementById('idleValue');
  const activeLengthGroup = document.getElementById('activeLengthGroup');
  const breakLengthGroup = document.getElementById('breakLengthGroup');
  const statusLabel = document.getElementById('statusLabel');
  const timerDisplay = document.getElementById('timerDisplay');
  const phaseSub = document.getElementById('phaseSub');
  const startBtn = document.getElementById('startBtn');
  const breakBtn = document.getElementById('breakBtn');
  const skipBtn = document.getElementById('skipBtn');
  const idleOverlay = document.getElementById('idleOverlay');
  const tabWarning = document.getElementById('tabWarning');
  const tabCountdownEl = document.getElementById('tabCountdown');
  const lockScreen = document.getElementById('lockScreen');
  const pinDisplay = document.getElementById('pinDisplay');
  const pinInput = document.getElementById('pinInput');
  const unlockBtn = document.getElementById('unlockBtn');
  const lockError = document.getElementById('lockError');
  const sirenOverlay = document.getElementById('sirenOverlay');
  const shakeDots = [document.getElementById('shakeDot1'), document.getElementById('shakeDot2'), document.getElementById('shakeDot3')];
  const restBanner = document.getElementById('restBanner');
  const restText = document.getElementById('restText');

  /* ---------------- STATE ---------------- */
  const state = {
    mode: 'desk',
    phase: 'idle', // idle, working, break, active, rest, locked
    idleThresholdMs: 30000,
    activeDurationMs: 15 * 60000,
    breakDurationMs: 60000,
    segmentStart: null,
    segmentRemainingMs: null, // for countdown phases
    tickInterval: null,
    lastActivity: Date.now(),
    idleFadeTimer: null,
    hiddenAt: null,
    tabGraceTimer: null,
    tabBeepInterval: null,
    currentPin: null,
    motionGranted: false,
    motionBuffer: [],
    stillnessSince: null,
    lastAccelMag: null,
    shakeCount: 0,
    lastShakeAt: 0,
    sirenActive: false
  };

  /* ---------------- HELPERS ---------------- */
  function fmt(ms) {
    const totalSec = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function setButtons({ start, brk, skip }) {
    startBtn.classList.toggle('hidden', !start);
    breakBtn.classList.toggle('hidden', !brk);
    skipBtn.classList.toggle('hidden', !skip);
  }

  /* ---------------- MODE SWITCHING ---------------- */
  function switchMode(mode) {
    if (state.phase !== 'idle') return; // don't allow switching mid-session
    state.mode = mode;
    deskModeBtn.classList.toggle('active', mode === 'desk');
    workoutModeBtn.classList.toggle('active', mode === 'workout');
    deskSettings.classList.toggle('hidden', mode !== 'desk');
    workoutActiveSettings.classList.toggle('hidden', mode !== 'workout');
    startBtn.textContent = 'Start Work';
    statusLabel.textContent = 'Ready When You Are';
    phaseSub.textContent = mode === 'desk' ? 'Tap Start Work to begin' : 'Tap Start Work to begin moving';
  }
  deskModeBtn.addEventListener('click', () => switchMode('desk'));
  workoutModeBtn.addEventListener('click', () => switchMode('workout'));

  /* ---------------- SETTINGS ---------------- */
  idleSlider.addEventListener('input', () => {
    const v = parseInt(idleSlider.value, 10);
    state.idleThresholdMs = v * 1000;
    idleValue.textContent = `${v} seconds`;
  });

  activeLengthGroup.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeLengthGroup.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeDurationMs = parseInt(chip.dataset.min, 10) * 60000;
    });
  });

  breakLengthGroup.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      breakLengthGroup.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.breakDurationMs = parseInt(chip.dataset.sec, 10) * 1000;
    });
  });

  /* ---------------- CORE TIMER LOOP ---------------- */
  function startTicking() {
    stopTicking();
    state.tickInterval = setInterval(tick, 250);
  }
  function stopTicking() {
    if (state.tickInterval) clearInterval(state.tickInterval);
    state.tickInterval = null;
  }

  function tick() {
    if (state.phase === 'working' || state.phase === 'active') {
      const elapsed = Date.now() - state.segmentStart;
      timerDisplay.textContent = fmt(elapsed);
      if (state.phase === 'active') {
        const remaining = state.activeDurationMs - elapsed;
        if (remaining <= 0) {
          enterRest(true);
        }
      }
    } else if (state.phase === 'break' || state.phase === 'rest') {
      const elapsed = Date.now() - state.segmentStart;
      const remaining = state.segmentRemainingMs - elapsed;
      timerDisplay.textContent = fmt(remaining);
      if (state.phase === 'rest') restText.textContent = `Resting... ${fmt(remaining)}`;
      if (remaining <= 0) {
        if (state.phase === 'break') endBreak();
        else endRest();
      }
    }
  }

  /* ---------------- START / BUTTON HANDLERS ---------------- */
  startBtn.addEventListener('click', () => {
    AudioEngine.init();
    AudioEngine.deepBass();
    if (state.mode === 'desk') startDeskWork();
    else startWorkoutActive();
  });

  breakBtn.addEventListener('click', () => {
    if (state.mode === 'desk') startDeskBreak();
  });

  skipBtn.addEventListener('click', () => {
    if (state.phase === 'break') endBreak();
    else if (state.phase === 'rest') endRest();
  });

  /* ---------------- DESK / FOCUS MODE ---------------- */
  function startDeskWork() {
    state.phase = 'working';
    state.segmentStart = Date.now();
    statusLabel.textContent = 'Working — Stay Focused';
    phaseSub.textContent = 'Screen dims if you go still. Switching tabs starts a grace timer.';
    setButtons({ start: false, brk: true, skip: false });
    startTicking();
    resetIdleTimer();
  }

  function startDeskBreak() {
    clearIdleFade();
    state.phase = 'break';
    state.segmentStart = Date.now();
    state.segmentRemainingMs = state.breakDurationMs;
    AudioEngine.softBell();
    statusLabel.textContent = 'On Break';
    phaseSub.textContent = 'Relax. Work resumes automatically after this.';
    setButtons({ start: false, brk: false, skip: true });
  }

  function endBreak() {
    AudioEngine.beep(1200, 0.15);
    startDeskWork();
  }

  /* ---------------- IDLE TRACKER (Desk mode) ---------------- */
  function resetIdleTimer() {
    if (state.phase !== 'working') return;
    clearIdleFade();
    idleOverlay.classList.remove('active');
    state.idleFadeTimer = setTimeout(() => {
      if (state.phase === 'working') idleOverlay.classList.add('active');
    }, state.idleThresholdMs);
  }
  function clearIdleFade() {
    if (state.idleFadeTimer) clearTimeout(state.idleFadeTimer);
    state.idleFadeTimer = null;
  }
  ['mousemove', 'keydown', 'touchstart', 'touchmove', 'click', 'scroll'].forEach(evt => {
    document.addEventListener(evt, () => {
      state.lastActivity = Date.now();
      if (state.phase === 'working') {
        idleOverlay.classList.remove('active');
        resetIdleTimer();
      }
    }, { passive: true });
  });

  /* ---------------- TAB-SNIPER (Desk mode) ---------------- */
  document.addEventListener('visibilitychange', () => {
    if (state.mode !== 'desk' || state.phase !== 'working') return;
    if (document.hidden) {
      state.hiddenAt = Date.now();
      let secondsLeft = 10;
      tabWarning.classList.remove('hidden');
      tabCountdownEl.textContent = secondsLeft;
      state.tabBeepInterval = setInterval(() => {
        secondsLeft -= 1;
        tabCountdownEl.textContent = Math.max(secondsLeft, 0);
        AudioEngine.beep(900, 0.08, 0.2);
        if (secondsLeft <= 0) {
          clearInterval(state.tabBeepInterval);
          state.tabBeepInterval = null;
        }
      }, 1000);
      state.tabGraceTimer = setTimeout(() => {
        // if still hidden after 10s, lock will trigger on return
      }, 10000);
    } else {
      const elapsed = state.hiddenAt ? Date.now() - state.hiddenAt : 0;
      tabWarning.classList.add('hidden');
      if (state.tabBeepInterval) { clearInterval(state.tabBeepInterval); state.tabBeepInterval = null; }
      if (state.tabGraceTimer) { clearTimeout(state.tabGraceTimer); state.tabGraceTimer = null; }
      if (elapsed >= 10000) {
        triggerLock();
      }
      state.hiddenAt = null;
    }
  });

  /* ---------------- PIN LOCK ---------------- */
  function triggerLock() {
    state.phase = 'locked';
    stopTicking();
    clearIdleFade();
    idleOverlay.classList.remove('active');
    state.currentPin = Math.floor(1000 + Math.random() * 9000).toString();
    pinDisplay.textContent = state.currentPin;
    pinInput.value = '';
    lockError.classList.add('hidden');
    lockScreen.classList.remove('hidden');
    AudioEngine.beep(300, 0.4, 0.4);
  }
  pinInput.addEventListener('paste', e => e.preventDefault());
  pinInput.addEventListener('copy', e => e.preventDefault());
  pinInput.addEventListener('cut', e => e.preventDefault());
  pinInput.addEventListener('contextmenu', e => e.preventDefault());

  function tryUnlock() {
    if (pinInput.value.trim() === state.currentPin) {
      lockScreen.classList.add('hidden');
      lockError.classList.add('hidden');
      state.phase = 'working';
      state.segmentStart = state.segmentStart || Date.now();
      startTicking();
      resetIdleTimer();
      AudioEngine.beep(1400, 0.15);
    } else {
      lockError.classList.remove('hidden');
      pinInput.value = '';
      AudioEngine.beep(200, 0.2, 0.4);
    }
  }
  unlockBtn.addEventListener('click', tryUnlock);
  pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });

  /* ---------------- WORKOUT / KINETIC MODE ---------------- */
  async function requestMotionPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const res = await DeviceMotionEvent.requestPermission();
        return res === 'granted';
      } catch (e) {
        return false;
      }
    }
    return true; // non-iOS: assume granted, event just won't fire if unsupported
  }

  async function startWorkoutActive() {
    if (!state.motionGranted) {
      state.motionGranted = await requestMotionPermission();
      if (state.motionGranted) {
        window.addEventListener('devicemotion', handleMotion);
      } else {
        phaseSub.textContent = 'Motion access denied — stillness alarm disabled.';
      }
    }
    state.phase = 'active';
    state.segmentStart = Date.now();
    state.stillnessSince = null;
    state.motionBuffer = [];
    statusLabel.textContent = 'Active — Keep Moving';
    phaseSub.textContent = 'The siren sounds if you stay still for 15 seconds.';
    setButtons({ start: false, brk: false, skip: false });
    breakBtn.classList.add('hidden');
    startTicking();
  }

  function handleMotion(event) {
    if (state.phase !== 'active' && !state.sirenActive) return;
    const a = event.acceleration && (event.acceleration.x !== null)
      ? event.acceleration
      : event.accelerationIncludingGravity;
    if (!a) return;
    const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);

    if (state.sirenActive) {
      handleShakeDefuse(mag);
      return;
    }

    if (state.phase !== 'active') return;

    const now = Date.now();
    state.motionBuffer.push({ t: now, m: mag });
    // keep last 15s
    state.motionBuffer = state.motionBuffer.filter(p => now - p.t <= 15000);

    if (state.motionBuffer.length > 5) {
      const mags = state.motionBuffer.map(p => p.m);
      const range = Math.max(...mags) - Math.min(...mags);
      if (range < 0.6) {
        if (!state.stillnessSince) state.stillnessSince = state.motionBuffer[0].t;
        if (now - state.stillnessSince >= 15000) {
          triggerSiren();
        }
      } else {
        state.stillnessSince = null;
      }
    }
  }

  function triggerSiren() {
    if (state.sirenActive) return;
    state.sirenActive = true;
    state.shakeCount = 0;
    shakeDots.forEach(d => d.classList.remove('filled'));
    sirenOverlay.classList.remove('hidden');
    AudioEngine.startSiren();
  }

  function handleShakeDefuse(mag) {
    const now = Date.now();
    const delta = state.lastAccelMag !== null ? Math.abs(mag - state.lastAccelMag) : 0;
    state.lastAccelMag = mag;
    if (delta > 12 && now - state.lastShakeAt > 350) {
      state.lastShakeAt = now;
      state.shakeCount += 1;
      if (shakeDots[state.shakeCount - 1]) shakeDots[state.shakeCount - 1].classList.add('filled');
      if (state.shakeCount >= 3) {
        AudioEngine.stopSiren();
        sirenOverlay.classList.add('hidden');
        state.sirenActive = false;
        state.stillnessSince = null;
        state.motionBuffer = [];
      }
    }
  }

  function enterRest(auto) {
    state.phase = 'rest';
    state.segmentStart = Date.now();
    state.segmentRemainingMs = state.breakDurationMs;
    AudioEngine.softBell();
    restBanner.classList.remove('hidden');
    statusLabel.textContent = 'Resting';
    phaseSub.textContent = 'Catch your breath. Motion tracking is paused.';
    restText.textContent = `Resting... ${fmt(state.breakDurationMs)}`;
  }

  function endRest() {
    restBanner.classList.add('hidden');
    AudioEngine.beep(1200, 0.15);
    startWorkoutActive();
  }

  /* Manual "Take a Break" for workout mode reuses rest flow */
  breakBtn.addEventListener('click', () => {
    if (state.mode === 'workout' && state.phase === 'active') enterRest(false);
  });

  /* init */
  switchMode('desk');
});