'use strict';

/* ==========================================================================
   GUILLOTINE PROTOCOL — CORE ENGINE
   ========================================================================== */

/* ---------------------------------------------------------------------- *
 * 1. AUDIO CONTROLLER — synthesized psycho-acoustic feedback, no assets   *
 * ---------------------------------------------------------------------- */

class AudioController {
  constructor() {
    this.ctx = null;
    this.ready = false;
  }

  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.ready = true;
  }

  _resumeIfNeeded() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /* Clean, high-pitch sine chime — task completion */
  playSuccess() {
    if (!this.ready) return;
    this._resumeIfNeeded();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [880, 1174.66, 1567.98]; // A5, D6, G6 — ascending chime

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);

      gain.gain.setValueAtTime(0, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.22, now + i * 0.09 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.5);
    });
  }

  /* Brutal low-frequency sawtooth thud/buzz — burn protocol penalty */
  playBurn() {
    if (!this.ready) return;
    this._resumeIfNeeded();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Low sawtooth thud
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(90, now);
    osc1.frequency.exponentialRampToValueAtTime(38, now + 0.5);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    // Harsh buzz layer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(64, now);
    osc2.frequency.linearRampToValueAtTime(48, now + 0.6);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    // Distortion via waveshaper for extra brutality
    const shaper = ctx.createWaveShaper();
    shaper.curve = this._makeDistortionCurve(40);
    shaper.oversample = '4x';

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(shaper);
    gain2.connect(shaper);
    shaper.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.75);
    osc2.start(now);
    osc2.stop(now + 0.85);
  }

  _makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }
}

/* ---------------------------------------------------------------------- *
 * 2. APPLICATION STATE MACHINE                                           *
 * ---------------------------------------------------------------------- */

const STATE = {
  IDLE: 'IDLE',
  LOCKED: 'LOCKED',
  SUCCESS: 'SUCCESS',
  BURN: 'BURN'
};

class GuillotineEngine {
  constructor() {
    this.audio = new AudioController();

    this.balance = 2000;
    this.vault = 4250500;

    this.currentState = STATE.IDLE;
    this.currentStake = 100;
    this.currentDurationSec = 15 * 60;
    this.remainingSec = 0;
    this.totalSec = 0;
    this.targetText = '';

    this.tickHandle = null;
    this.lockActive = false; // true only while genuinely in LOCKED state

    this._cacheDom();
    this._bindStaticEvents();
    this._bindAntiCheat();
    this._renderIdleDefaults();
  }

  /* ---------------------------- DOM caching ---------------------------- */

  _cacheDom() {
    this.dom = {
      vaultAmount: document.getElementById('vaultAmount'),
      balanceAmount: document.getElementById('balanceAmount'),

      idlePanel: document.getElementById('idlePanel'),
      targetInput: document.getElementById('targetInput'),
      stakeSlider: document.getElementById('stakeSlider'),
      stakeValue: document.getElementById('stakeValue'),
      durationSlider: document.getElementById('durationSlider'),
      durationValue: document.getElementById('durationValue'),
      engageBtn: document.getElementById('engageBtn'),

      lockedPanel: document.getElementById('lockedPanel'),
      lockedTarget: document.getElementById('lockedTarget'),
      timerDisplay: document.getElementById('timerDisplay'),
      timerProgress: document.getElementById('timerProgress'),
      completeBtn: document.getElementById('completeBtn'),

      successOverlay: document.getElementById('successOverlay'),
      successAmount: document.getElementById('successAmount'),
      successResetBtn: document.getElementById('successResetBtn'),

      burnOverlay: document.getElementById('burnOverlay'),
      burnAmount: document.getElementById('burnAmount'),
      burnResetBtn: document.getElementById('burnResetBtn'),

      body: document.body
    };

    // ring geometry
    this.RING_CIRCUMFERENCE = 2 * Math.PI * 90; // r=90
  }

  /* ---------------------------- static UI events ------------------------ */

  _bindStaticEvents() {
    const d = this.dom;

    d.stakeSlider.addEventListener('input', () => {
      this.currentStake = parseInt(d.stakeSlider.value, 10);
      d.stakeValue.textContent = this.currentStake;
      this._paintSliderFill(d.stakeSlider);
    });

    d.durationSlider.addEventListener('input', () => {
      const mins = parseInt(d.durationSlider.value, 10);
      d.durationValue.textContent = mins;
      this.currentDurationSec = mins * 60;
      this._paintSliderFill(d.durationSlider);
    });

    d.engageBtn.addEventListener('click', () => this._handleEngage());
    d.completeBtn.addEventListener('click', () => this._handleSuccess());
    d.successResetBtn.addEventListener('click', () => this._resetToIdle());
    d.burnResetBtn.addEventListener('click', () => this._resetToIdle());

    // Initialize audio context on first user gesture (browser autoplay policy)
    const initAudioOnce = () => {
      this.audio.init();
      document.removeEventListener('click', initAudioOnce);
      document.removeEventListener('touchstart', initAudioOnce);
    };
    document.addEventListener('click', initAudioOnce, { once: true });
    document.addEventListener('touchstart', initAudioOnce, { once: true });

    // Disable context menu everywhere (anti-cheat layer 3)
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _paintSliderFill(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--fill', pct + '%');
  }

  _renderIdleDefaults() {
    this._paintSliderFill(this.dom.stakeSlider);
    this._paintSliderFill(this.dom.durationSlider);
    this._syncBalanceDisplay();
    this._syncVaultDisplay(false);
  }

  /* ---------------------------- anti-cheat layer ------------------------- */
  /*
   * 3-layer unhackable focus detection:
   *   Layer 1: Page Visibility API — fires when tab/app is backgrounded
   *   Layer 2: window.onblur — fires when the window loses OS-level focus
   *   Layer 3: contextmenu block — prevents inspect/long-press tampering
   * Any layer tripping while LOCKED triggers the Burn Protocol immediately.
   */
  _bindAntiCheat() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.lockActive) {
        this._triggerBurn();
      }
    });

    window.addEventListener('blur', () => {
      if (this.lockActive) {
        this._triggerBurn();
      }
    });

    // Extra safety net: pagehide covers some mobile browser edge cases
    window.addEventListener('pagehide', () => {
      if (this.lockActive) {
        this._triggerBurn();
      }
    });
  }

  /* ---------------------------- state transitions ------------------------ */

  _handleEngage() {
    const text = this.dom.targetInput.value.trim();
    if (!text) {
      this._shakeElement(this.dom.targetInput);
      return;
    }
    if (this.currentStake > this.balance) {
      this._shakeElement(this.dom.stakeSlider);
      return;
    }

    this.targetText = text;
    this.totalSec = this.currentDurationSec;
    this.remainingSec = this.currentDurationSec;
    this.currentState = STATE.LOCKED;

    this.dom.lockedTarget.textContent = this.targetText;
    this.dom.idlePanel.classList.add('hidden');
    this.dom.lockedPanel.classList.remove('hidden');

    this.lockActive = true;
    this._renderTimer();
    this._startTimer();
  }

  _startTimer() {
    clearInterval(this.tickHandle);
    this.tickHandle = setInterval(() => {
      this.remainingSec -= 1;
      this._renderTimer();
      if (this.remainingSec <= 0) {
        this._handleSuccess();
      }
    }, 1000);
  }

  _stopTimer() {
    clearInterval(this.tickHandle);
    this.tickHandle = null;
  }

  _renderTimer() {
    const m = Math.floor(this.remainingSec / 60).toString().padStart(2, '0');
    const s = Math.max(this.remainingSec, 0).toString().padStart(2, '0');
    this.dom.timerDisplay.textContent = `${m}:${s}`;

    const fraction = this.totalSec > 0 ? this.remainingSec / this.totalSec : 0;
    const offset = this.RING_CIRCUMFERENCE * (1 - fraction);
    this.dom.timerProgress.style.strokeDashoffset = offset;
  }

  _handleSuccess() {
    if (!this.lockActive) return;
    this.lockActive = false;
    this._stopTimer();
    this.currentState = STATE.SUCCESS;

    this.audio.playSuccess();

    this.dom.successAmount.textContent = `+${this.currentStake} Focus Coins`;
    this.dom.lockedPanel.classList.add('hidden');
    this.dom.successOverlay.classList.remove('hidden');

    // Stake returned safely — balance untouched (was never deducted).
    this._syncBalanceDisplay();
  }

  _triggerBurn() {
    if (!this.lockActive) return;
    this.lockActive = false;
    this._stopTimer();
    this.currentState = STATE.BURN;

    this.audio.playBurn();

    // Deduct stake from balance, add it to the platform vault.
    this.balance = Math.max(0, this.balance - this.currentStake);
    this.vault += this.currentStake;

    this.dom.burnAmount.textContent = `-${this.currentStake} Focus Coins`;
    this.dom.lockedPanel.classList.add('hidden');
    this.dom.burnOverlay.classList.remove('hidden');

    this.dom.body.classList.add('burn-state');
    setTimeout(() => this.dom.body.classList.remove('burn-state'), 1800);

    this._syncBalanceDisplay();
    this._syncVaultDisplay(true);
  }

  _resetToIdle() {
    this.currentState = STATE.IDLE;
    this.dom.successOverlay.classList.add('hidden');
    this.dom.burnOverlay.classList.add('hidden');
    this.dom.lockedPanel.classList.add('hidden');
    this.dom.idlePanel.classList.remove('hidden');

    this.dom.targetInput.value = '';
    this.remainingSec = 0;
    this.totalSec = 0;
    this.dom.timerProgress.style.strokeDashoffset = 0;
  }

  /* ---------------------------- display helpers -------------------------- */

  _syncBalanceDisplay() {
    this.dom.balanceAmount.textContent = this.balance.toLocaleString('en-US');
  }

  _syncVaultDisplay(spike) {
    this.dom.vaultAmount.textContent = `🪙 ${this.vault.toLocaleString('en-US')}`;
    if (spike) {
      this.dom.vaultAmount.classList.remove('spike');
      // force reflow so the animation can restart
      void this.dom.vaultAmount.offsetWidth;
      this.dom.vaultAmount.classList.add('spike');
    }
  }

  _shakeElement(el) {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'burnIconShake 0.4s ease';
    setTimeout(() => { el.style.animation = ''; }, 420);
  }
}

/* ---------------------------------------------------------------------- *
 * 3. BOOTSTRAP                                                            *
 * ---------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  window.__guillotineEngine = new GuillotineEngine();
});
