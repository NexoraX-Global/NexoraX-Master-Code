// ============================================================
// PRESENCE TRACKER — CORE ENGINE
// ============================================================

(() => {
  'use strict';

  // ---------------- DOM REFS ----------------
  const deskModeBtn   = document.getElementById('desk-mode-btn');
  const fieldModeBtn  = document.getElementById('field-mode-btn');
  const videoWrapper  = document.getElementById('video-wrapper');
  const cameraFeed    = document.getElementById('camera-feed');
  const scannerLine   = document.getElementById('scanner-line');
  const cameraOffMsg  = document.getElementById('camera-off-msg');
  const switchCamBtn  = document.getElementById('switch-camera-btn');
  const voiceSelect   = document.getElementById('voice-lang-select');
  const motionPanel   = document.getElementById('motion-panel');
  const motionBarFill = document.getElementById('motion-bar-fill');
  const motionIdleTxt = document.getElementById('motion-idle-text');
  const timerDisplay  = document.getElementById('timer-display');
  const pauseBtn      = document.getElementById('pause-btn');
  const completeBtn   = document.getElementById('complete-btn');
  const statusDot     = document.getElementById('status-dot');
  const statusText    = document.getElementById('status-text');

  const resumeOverlay = document.getElementById('resume-overlay');
  const bigCountdown  = document.getElementById('big-countdown');
  const resumeBtn     = document.getElementById('resume-btn');

  const failOverlay   = document.getElementById('fail-overlay');
  const failReason    = document.getElementById('fail-reason');
  const restartBtn    = document.getElementById('restart-btn');

  const successOverlay  = document.getElementById('success-overlay');
  const successSummary  = document.getElementById('success-summary');
  const successRestart  = document.getElementById('success-restart-btn');

  // ---------------- STATE ----------------
  const state = {
    mode: null,               // 'desk' | 'field'
    mediaStream: null,
    facingMode: 'user',       // 'user' | 'environment'
    sessionActive: false,
    sessionPaused: false,
    sessionSeconds: 0,
    sessionTimerId: null,
    pauseSecondsLeft: 60,
    pauseTimerId: null,
    lastMotionTime: 0,
    motionCheckId: null,
    lastAccel: { x: 0, y: 0, z: 0 },
    audioCtx: null,
    audioUnlocked: false
  };

  // ============================================================
  // AUDIO ENGINE
  // ============================================================
  function unlockAudio() {
    if (state.audioUnlocked) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new Ctx();
      if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }
      state.audioUnlocked = true;
    } catch (e) {
      console.warn('AudioContext unlock failed', e);
    }
  }

  function playBuzzer(callback) {
    if (!state.audioCtx) {
      if (typeof callback === 'function') callback();
      return;
    }
    const ctx = state.audioCtx;
    const duration = 0.9;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.linearRampToValueAtTime(90, now + duration);
    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.linearRampToValueAtTime(180, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.4, now + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);

    osc1.onended = () => {
      if (typeof callback === 'function') callback();
    };
  }

  function playSoftBeep() {
    if (!state.audioCtx) return;
    const ctx = state.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // ============================================================
  // VOICE ENGINE (Robotic, forced heavy tone)
  // ============================================================
  const VOICE_LINES = {
    en: {
      lang: 'en-US',
      text: 'Focus alert. Return to your mission immediately to secure your progress.'
    },
    hi: {
      lang: 'hi-IN',
      text: 'Dhyan de. Apne lakshya par wapas aao aur apna task poora karo.'
    }
  };

  function speakRobotic(customText) {
    if (!('speechSynthesis' in window)) return;

    const selectedLang = voiceSelect.value; // 'en' | 'hi'
    const line = VOICE_LINES[selectedLang] || VOICE_LINES.en;
    const textToSpeak = customText || line.text;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = line.lang;
    utterance.rate = 0.7;   // FORCED heavy/robotic pacing
    utterance.pitch = 0.1;  // FORCED mechanical low pitch
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang === line.lang) ||
                          voices.find(v => v.lang && v.lang.startsWith(selectedLang));
    if (matchedVoice) utterance.voice = matchedVoice;

    window.speechSynthesis.speak(utterance);
  }

  // Some browsers load voices asynchronously
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  function triggerFocusAlert() {
    unlockAudio();
    playBuzzer(() => {
      speakRobotic();
    });
  }

  // ============================================================
  // STATUS HELPERS
  // ============================================================
  function setStatus(text, level) {
    statusText.textContent = text;
    statusDot.classList.remove('active', 'danger');
    if (level === 'active') statusDot.classList.add('active');
    if (level === 'danger') statusDot.classList.add('danger');
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ============================================================
  // CAMERA ENGINE
  // ============================================================
  async function startCamera(facingMode) {
    stopCamera();
    const constraints = {
      audio: false,
      video: {
        facingMode: facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.mediaStream = stream;
      state.facingMode = facingMode;
      cameraFeed.srcObject = stream;
      cameraOffMsg.classList.remove('show');

      if (facingMode === 'user') {
        cameraFeed.classList.add('mirrored');
      } else {
        cameraFeed.classList.remove('mirrored');
      }

      scannerLine.classList.add('scanning');
    } catch (err) {
      console.warn('Camera access failed:', err);
      cameraOffMsg.classList.add('show');
      cameraOffMsg.textContent = 'Camera unavailable or permission denied';
      scannerLine.classList.remove('scanning');
    }
  }

  function stopCamera() {
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(track => track.stop());
      state.mediaStream = null;
    }
  }

  async function switchCamera() {
    const newFacing = state.facingMode === 'user' ? 'environment' : 'user';
    await startCamera(newFacing);
  }

  switchCamBtn.addEventListener('click', () => {
    unlockAudio();
    switchCamera();
  });

  // ============================================================
  // MODE SELECTION
  // ============================================================
  deskModeBtn.addEventListener('click', () => selectMode('desk'));
  fieldModeBtn.addEventListener('click', () => selectMode('field'));

  async function selectMode(mode) {
    unlockAudio();
    state.mode = mode;

    deskModeBtn.classList.toggle('selected', mode === 'desk');
    fieldModeBtn.classList.toggle('selected', mode === 'field');

    if (mode === 'desk') {
      motionPanel.classList.remove('show');
      videoWrapper.style.display = 'block';
      await startCamera(state.facingMode);
    } else {
      videoWrapper.style.display = 'block';
      motionPanel.classList.add('show');
      await startCamera(state.facingMode);
      initMotionTracking();
    }

    startSession();
  }

  // ============================================================
  // SESSION TIMER
  // ============================================================
  function startSession() {
    if (state.sessionActive) return;
    state.sessionActive = true;
    state.sessionPaused = false;
    state.sessionSeconds = 0;

    pauseBtn.disabled = false;
    completeBtn.disabled = false;

    setStatus('TRACKING ACTIVE', 'active');

    clearInterval(state.sessionTimerId);
    state.sessionTimerId = setInterval(() => {
      if (!state.sessionPaused) {
        state.sessionSeconds++;
        timerDisplay.textContent = `SESSION ${formatTime(state.sessionSeconds)}`;
      }
    }, 1000);
  }

  function stopSessionTimers() {
    clearInterval(state.sessionTimerId);
    clearInterval(state.pauseTimerId);
    clearInterval(state.motionCheckId);
    state.sessionActive = false;
  }

  // ============================================================
  // BIOMETRIC PAUSE (60s survival break)
  // ============================================================
  pauseBtn.addEventListener('click', () => {
    unlockAudio();
    if (!state.sessionActive || state.sessionPaused) return;
    startPauseCountdown();
  });

  function startPauseCountdown() {
    state.sessionPaused = true;
    state.pauseSecondsLeft = 60;
    bigCountdown.textContent = state.pauseSecondsLeft;
    resumeOverlay.classList.add('show');
    setStatus('BIOMETRIC PAUSE', 'danger');

    clearInterval(state.pauseTimerId);
    state.pauseTimerId = setInterval(() => {
      state.pauseSecondsLeft--;
      bigCountdown.textContent = state.pauseSecondsLeft;

      if (state.pauseSecondsLeft <= 10 && state.pauseSecondsLeft > 0) {
        playSoftBeep();
      }

      if (state.pauseSecondsLeft <= 0) {
        clearInterval(state.pauseTimerId);
        resumeOverlay.classList.remove('show');
        triggerFailure('Biometric pause expired without resuming. Session integrity compromised.');
      }
    }, 1000);
  }

  resumeBtn.addEventListener('click', () => {
    unlockAudio();
    clearInterval(state.pauseTimerId);
    resumeOverlay.classList.remove('show');
    state.sessionPaused = false;
    state.lastMotionTime = Date.now();
    setStatus('TRACKING ACTIVE', 'active');
  });

  // ============================================================
  // FIELD MODE — DEVICEMOTION ACCELEROMETER TRACKING
  // ============================================================
  function initMotionTracking() {
    state.lastMotionTime = Date.now();

    async function beginListening() {
      window.addEventListener('devicemotion', handleMotion);

      clearInterval(state.motionCheckId);
      state.motionCheckId = setInterval(() => {
        if (!state.sessionActive || state.sessionPaused) return;

        const idleSeconds = Math.floor((Date.now() - state.lastMotionTime) / 1000);
        motionIdleTxt.textContent = `Idle: ${idleSeconds}s`;

        if (idleSeconds >= 10) {
          motionIdleTxt.style.color = 'var(--crimson)';
          triggerInactivityAlert();
          state.lastMotionTime = Date.now(); // reset window after alerting
        } else {
          motionIdleTxt.style.color = '';
        }
      }, 1000);
    }

    // iOS 13+ requires explicit permission request
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(response => {
          if (response === 'granted') beginListening();
        })
        .catch(err => console.warn('Motion permission denied', err));
    } else {
      beginListening();
    }
  }

  function handleMotion(event) {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;

    const dx = Math.abs((acc.x || 0) - state.lastAccel.x);
    const dy = Math.abs((acc.y || 0) - state.lastAccel.y);
    const dz = Math.abs((acc.z || 0) - state.lastAccel.z);
    const delta = dx + dy + dz;

    state.lastAccel = { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 };

    const intensity = Math.min(100, Math.round(delta * 8));
    motionBarFill.style.width = intensity + '%';

    const SHAKE_THRESHOLD = 3.5;
    if (delta > SHAKE_THRESHOLD) {
      state.lastMotionTime = Date.now();
    }
  }

  let inactivityAlertCooldown = false;
  function triggerInactivityAlert() {
    if (inactivityAlertCooldown) return;
    inactivityAlertCooldown = true;
    triggerFocusAlert();
    setTimeout(() => { inactivityAlertCooldown = false; }, 8000);
  }

  // ============================================================
  // FAILURE / SUCCESS FLOWS
  // ============================================================
  function triggerFailure(reasonText) {
    stopSessionTimers();
    window.speechSynthesis && window.speechSynthesis.cancel();

    failReason.textContent = reasonText;
    failOverlay.classList.add('show');
    setStatus('MISSION FAILED', 'danger');

    unlockAudio();
    playBuzzer(() => {
      speakRobotic();
    });

    pauseBtn.disabled = true;
    completeBtn.disabled = true;
  }

  restartBtn.addEventListener('click', () => {
    failOverlay.classList.remove('show');
    resetToStandby();
  });

  completeBtn.addEventListener('click', () => {
    if (!state.sessionActive) return;
    unlockAudio();
    stopSessionTimers();

    successSummary.textContent = `You stayed focused for ${formatTime(state.sessionSeconds)}. Session logged successfully.`;
    successOverlay.classList.add('show');
    setStatus('MISSION COMPLETE', 'active');

    speakRobotic(
      voiceSelect.value === 'hi'
        ? 'Mission poori hui. Bahut badhiya kaam kiya aapne.'
        : 'Mission complete. Excellent work securing your progress.'
    );

    pauseBtn.disabled = true;
    completeBtn.disabled = true;
  });

  successRestart.addEventListener('click', () => {
    successOverlay.classList.remove('show');
    resetToStandby();
  });

  function resetToStandby() {
    stopCamera();
    stopSessionTimers();
    window.removeEventListener('devicemotion', handleMotion);

    state.mode = null;
    state.sessionSeconds = 0;
    state.sessionPaused = false;

    deskModeBtn.classList.remove('selected');
    fieldModeBtn.classList.remove('selected');
    motionPanel.classList.remove('show');
    scannerLine.classList.remove('scanning');
    cameraOffMsg.classList.remove('show');

    timerDisplay.textContent = 'SESSION 00:00';
    motionBarFill.style.width = '0%';
    motionIdleTxt.textContent = 'Idle: 0s';

    pauseBtn.disabled = true;
    completeBtn.disabled = true;

    setStatus('STANDBY', null);
  }

  // ============================================================
  // INIT
  // ============================================================
  window.addEventListener('DOMContentLoaded', () => {
    setStatus('STANDBY', null);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.sessionActive && !state.sessionPaused) {
      // tab/app backgrounded mid-session — treat as a pause trigger
      startPauseCountdown();
    }
  });

})();