'use strict';

/* =========================================================
   EXECUTION EXCHANGE — MAIN CONTROLLER
   Heavy client-side logic: audio synthesis, market simulation,
   economy state machine, and anti-cheat lockdown.
   All values below are virtual / local only. No real currency,
   no payment gateways, no network calls of any kind.
   ========================================================= */

/* ---------------------------------------------------------
   1. AUDIO CONTROLLER
   Synthesizes all UI sounds live via the Web Audio API.
   No external audio files are used anywhere.
   --------------------------------------------------------- */
class AudioController {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
  }

  _ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.unlocked = true;
    return this.ctx;
  }

  _envelope(gainNode, ctx, startTime, peak, attack, decay) {
    gainNode.gain.cancelScheduledValues(startTime);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(peak, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay);
  }

  /* High-pitch, rewarding chime for BACKING a peer */
  playBacking() {
    const ctx = this._ensureContext();
    const now = ctx.currentTime;
    const notes = [880, 1108.73, 1318.51]; // A5, C#6, E6 — bright major arpeggio

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'highpass';
      filter.frequency.value = 300;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      const startAt = now + i * 0.07;
      this._envelope(gain, ctx, startAt, 0.22, 0.008, 0.35);

      osc.start(startAt);
      osc.stop(startAt + 0.45);
    });

    // subtle shimmer layer
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(2637, now);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    this._envelope(shimmerGain, ctx, now + 0.1, 0.06, 0.02, 0.5);
    shimmer.start(now + 0.1);
    shimmer.stop(now + 0.65);
  }

  /* Aggressive, low-frequency synth for SHORTING a peer */
  playShorting() {
    const ctx = this._ensureContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const distortion = ctx.createWaveShaper();

    // simple aggressive distortion curve
    const curveAmount = 60;
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + curveAmount) * x * 20 * (Math.PI / 180)) / (Math.PI + curveAmount * Math.abs(x));
    }
    distortion.curve = curve;
    distortion.oversample = '4x';

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(110, now);
    osc1.frequency.exponentialRampToValueAtTime(55, now + 0.4);
    osc2.frequency.setValueAtTime(112, now);
    osc2.frequency.exponentialRampToValueAtTime(54, now + 0.4);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.4);
    filter.Q.value = 8;

    osc1.connect(distortion);
    osc2.connect(distortion);
    distortion.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    this._envelope(gain, ctx, now, 0.28, 0.01, 0.42);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  /* Subtle digital tick for TAX DEDUCTION */
  playTaxTick() {
    const ctx = this._ensureContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.03);

    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 6;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    this._envelope(gain, ctx, now, 0.12, 0.002, 0.05);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /* Sharp buzz for insufficient-funds error */
  playError() {
    const ctx = this._ensureContext();
    const now = ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now + i * 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._envelope(gain, ctx, now + i * 0.12, 0.18, 0.005, 0.1);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.13);
    }
  }

  /* Soft confirmation blip for locking a focus session */
  playLockIn() {
    const ctx = this._ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    this._envelope(gain, ctx, now, 0.2, 0.01, 0.25);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /* Harsh alarm for anti-cheat breach */
  playBreachAlarm() {
    const ctx = this._ensureContext();
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now + i * 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._envelope(gain, ctx, now + i * 0.18, 0.22, 0.005, 0.12);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.15);
    }
  }
}

/* ---------------------------------------------------------
   2. NUMBER COUNTER ANIMATION UTILITY
   Smoothly animates a numeric text value from A to B.
   --------------------------------------------------------- */
function animateCounter(el, fromValue, toValue, duration, formatter) {
  const startTime = performance.now();
  const delta = toValue - fromValue;

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = fromValue + delta * eased;
    el.textContent = formatter(Math.round(current));
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = formatter(toValue);
    }
  }
  requestAnimationFrame(tick);
}

function formatCoins(n) {
  return '🪙 ' + n.toLocaleString('en-US');
}

function formatFC(n) {
  return n.toLocaleString('en-US') + ' FC';
}

/* ---------------------------------------------------------
   3. TOAST NOTIFICATIONS
   --------------------------------------------------------- */
function showToast(message, type) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || 'info');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 2800);
}

/* ---------------------------------------------------------
   4. ECONOMY STATE MACHINE
   Owns the user's wallet and the platform tax vault.
   Handles staking, fee deduction, and insufficient-funds flow.
   --------------------------------------------------------- */
class EconomyEngine {
  constructor(audio) {
    this.audio = audio;
    this.wallet = 2500;
    this.taxVault = 5890200;
    this.STAKE_AMOUNT = 50;
    this.BROKER_FEE_RATE = 0.10; // 10% broker fee on every staked position

    this.walletEl = document.getElementById('walletAmount');
    this.vaultEl = document.getElementById('taxVault');
  }

  getBrokerFee() {
    return Math.round(this.STAKE_AMOUNT * this.BROKER_FEE_RATE); // 5 FC
  }

  canAfford(amount) {
    return this.wallet >= amount;
  }

  /**
   * Attempts to place a stake. Returns true if successful, false if
   * the user has insufficient liquidity.
   */
  placeStake(cardEl, buttonEl) {
    if (!this.canAfford(this.STAKE_AMOUNT)) {
      this._handleInsufficientFunds(cardEl, buttonEl);
      return false;
    }

    const previousWallet = this.wallet;
    this.wallet -= this.STAKE_AMOUNT;

    animateCounter(this.walletEl, previousWallet, this.wallet, 350, formatFC);
    this.walletEl.classList.add('deduct-flash');
    setTimeout(() => this.walletEl.classList.remove('deduct-flash'), 250);

    // Broker fee routes into the platform tax vault, with a slight delay
    // so the deduction and the tax tick feel like two distinct events.
    setTimeout(() => this._collectBrokerFee(), 320);

    return true;
  }

  _collectBrokerFee() {
    const fee = this.getBrokerFee();
    const previousVault = this.taxVault;
    this.taxVault += fee;

    this.audio.playTaxTick();
    animateCounter(this.vaultEl, previousVault, this.taxVault, 600, formatCoins);
    this.vaultEl.classList.add('bump');
    setTimeout(() => this.vaultEl.classList.remove('bump'), 300);
  }

  _handleInsufficientFunds(cardEl, buttonEl) {
    this.audio.playError();
    if (cardEl) {
      cardEl.classList.add('shake-error');
      setTimeout(() => cardEl.classList.remove('shake-error'), 400);
    }
    this.walletEl.classList.add('shake');
    setTimeout(() => this.walletEl.classList.remove('shake'), 400);
    showToast('Insufficient liquidity — you need ' + this.STAKE_AMOUNT + ' FC to enter this position.', 'danger');
  }

  refreshDisplays() {
    this.walletEl.textContent = formatFC(this.wallet);
    this.vaultEl.textContent = formatCoins(this.taxVault);
  }
}

/* ---------------------------------------------------------
   5. MARKET SIMULATOR
   Continuously animates the live market feed: countdown timers,
   fluctuating odds, progress bars, and trader pool sizes.
   --------------------------------------------------------- */
class MarketSimulator {
  constructor() {
    this.markets = {
      'market-1': {
        secondsRemaining: this._hmsToSeconds(1, 19, 42),
        totalSeconds: this._hmsToSeconds(2, 0, 0),
        odds: 62,
        pool: 184,
        oddsDirection: 1,
      },
      'market-2': {
        secondsRemaining: this._hmsToSeconds(0, 37, 11),
        totalSeconds: this._hmsToSeconds(1, 30, 0),
        odds: 47,
        pool: 96,
        oddsDirection: -1,
      },
    };
    this.intervalHandle = null;
  }

  _hmsToSeconds(h, m, s) {
    return h * 3600 + m * 60 + s;
  }

  _formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
  }

  start() {
    this.intervalHandle = setInterval(() => this._tick(), 1000);
  }

  stop() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }

  _tick() {
    Object.keys(this.markets).forEach((id) => {
      const m = this.markets[id];

      // Countdown
      if (m.secondsRemaining > 0) {
        m.secondsRemaining -= 1;
      } else {
        // Reset the session once it completes, simulating a fresh peer goal
        m.secondsRemaining = m.totalSeconds;
      }

      // Odds drift randomly within a believable band, nudged by direction
      const drift = (Math.random() * 2.2) * m.oddsDirection + (Math.random() - 0.5);
      m.odds = Math.min(94, Math.max(6, m.odds + drift));
      if (m.odds > 90 || m.odds < 10) m.oddsDirection *= -1;
      if (Math.random() < 0.08) m.oddsDirection *= -1;

      // Trader pool grows organically
      if (Math.random() < 0.35) {
        m.pool += Math.random() < 0.75 ? 1 : 2;
      }

      this._render(id, m);
    });
  }

  _render(id, m) {
    const timeEl = document.getElementById('time-' + id);
    const oddsEl = document.getElementById('odds-' + id);
    const poolEl = document.getElementById('pool-' + id);
    const progressEl = document.getElementById('progress-' + id);

    if (timeEl) timeEl.textContent = this._formatTime(m.secondsRemaining);
    if (poolEl) poolEl.textContent = m.pool.toString();

    if (oddsEl) {
      const roundedOdds = Math.round(m.odds);
      oddsEl.textContent = roundedOdds + '% HOLD';
      if (roundedOdds >= 55) {
        oddsEl.style.background = 'rgba(0, 255, 170, 0.14)';
        oddsEl.style.color = '#00ffaa';
      } else if (roundedOdds <= 45) {
        oddsEl.style.background = 'rgba(255, 17, 51, 0.14)';
        oddsEl.style.color = '#ff1133';
      } else {
        oddsEl.style.background = 'rgba(255, 255, 255, 0.06)';
        oddsEl.style.color = '#7d8c88';
      }
    }

    if (progressEl) {
      const elapsedRatio = 1 - m.secondsRemaining / m.totalSeconds;
      progressEl.style.width = Math.min(100, Math.max(0, elapsedRatio * 100)) + '%';
    }
  }
}

/* ---------------------------------------------------------
   6. ANTI-CHEAT LOCKDOWN
   Watches visibility state during an active focus session and
   flags any tab-switch or backgrounding as a discipline breach.
   --------------------------------------------------------- */
class AntiCheatMonitor {
  constructor(audio) {
    this.audio = audio;
    this.active = false;
    this.breachCount = 0;
    this.logEl = document.getElementById('anticheatLog');
    this.statusEl = document.getElementById('focusStatus');

    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onBlur = this._onBlur.bind(this);
  }

  arm() {
    this.active = true;
    this.breachCount = 0;
    if (this.logEl) this.logEl.textContent = '';
    if (this.statusEl) {
      this.statusEl.textContent = 'SESSION ACTIVE — MONITORED';
      this.statusEl.classList.remove('breach');
    }
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    window.addEventListener('blur', this._onBlur);
  }

  disarm() {
    this.active = false;
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    window.removeEventListener('blur', this._onBlur);
  }

  _onVisibilityChange() {
    if (!this.active) return;
    if (document.hidden) {
      this._registerBreach('Tab switch detected — session flagged as UNSTABLE.');
    }
  }

  _onBlur() {
    if (!this.active) return;
    // Blur can double-fire alongside visibilitychange on some platforms;
    // only escalate loudly if the document is not actually hidden (e.g.
    // a picture-in-picture, split screen, or window-switch scenario).
    if (!document.hidden) {
      this._registerBreach('Window focus lost — discipline integrity at risk.');
    }
  }

  _registerBreach(message) {
    this.breachCount += 1;
    this.audio.playBreachAlarm();
    if (this.statusEl) {
      this.statusEl.textContent = 'BREACH DETECTED (' + this.breachCount + ')';
      this.statusEl.classList.add('breach');
    }
    if (this.logEl) {
      this.logEl.textContent = message;
    }
    showToast(message, 'danger');
  }
}

/* ---------------------------------------------------------
   7. FOCUS SESSION CONTROLLER
   Manages declaring a goal, locking in, the countdown overlay,
   and wiring the anti-cheat monitor to the session lifecycle.
   --------------------------------------------------------- */
class FocusSessionController {
  constructor(audio, antiCheat) {
    this.audio = audio;
    this.antiCheat = antiCheat;
    this.timerHandle = null;
    this.remainingSeconds = 0;

    this.goalInput = document.getElementById('goalInput');
    this.durationSelect = document.getElementById('durationSelect');
    this.lockBtn = document.getElementById('lockFocusBtn');
    this.overlay = document.getElementById('focusOverlay');
    this.timerEl = document.getElementById('focusTimer');
    this.goalDisplayEl = document.getElementById('focusGoalDisplay');
    this.abortBtn = document.getElementById('abortFocusBtn');

    this.lockBtn.addEventListener('click', () => this.lockFocus());
    this.abortBtn.addEventListener('click', () => this.abortSession());
  }

  lockFocus() {
    const goalText = this.goalInput.value.trim();
    if (!goalText) {
      this.goalInput.focus();
      showToast('Declare a goal before entering the market.', 'info');
      this.goalInput.style.borderColor = 'rgba(255, 17, 51, 0.6)';
      setTimeout(() => { this.goalInput.style.borderColor = ''; }, 900);
      return;
    }

    this.remainingSeconds = parseInt(this.durationSelect.value, 10) || 3600;
    this.goalDisplayEl.textContent = '"' + goalText + '"';

    this.audio.playLockIn();
    this.overlay.classList.remove('hidden');
    this.antiCheat.arm();

    this._updateTimerDisplay();
    this.timerHandle = setInterval(() => this._tickTimer(), 1000);

    showToast('Focus locked. You are now live on the exchange.', 'success');
  }

  _tickTimer() {
    this.remainingSeconds -= 1;
    if (this.remainingSeconds <= 0) {
      this._completeSession();
      return;
    }
    this._updateTimerDisplay();
  }

  _updateTimerDisplay() {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    this.timerEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  _completeSession() {
    clearInterval(this.timerHandle);
    this.antiCheat.disarm();
    this.overlay.classList.add('hidden');
    this.audio.playBacking();
    showToast('Session complete. Execution verified by the market.', 'success');
    this.goalInput.value = '';
  }

  abortSession() {
    clearInterval(this.timerHandle);
    this.antiCheat.disarm();
    this.overlay.classList.add('hidden');
    showToast('Session aborted. No stake was affected by this abort.', 'info');
  }
}

/* ---------------------------------------------------------
   8. MARKET CARD INTERACTION BINDER
   Wires BACK / SHORT buttons on each market card into the
   economy engine and audio controller.
   --------------------------------------------------------- */
function bindMarketCardActions(audio, economy) {
  const grid = document.getElementById('marketGrid');
  if (!grid) return;

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.classList.contains('locked')) return;

    const action = button.dataset.action;
    const cardEl = button.closest('.market-card');
    const marketId = button.dataset.market;

    const success = economy.placeStake(cardEl, button);
    if (!success) return;

    if (action === 'back') {
      audio.playBacking();
      button.classList.add('pulse-success');
    } else if (action === 'short') {
      audio.playShorting();
      button.classList.add('pulse-success');
    }

    // Lock this specific position button; the sibling action remains
    // available in case the user wants to hedge on the other side.
    button.classList.add('locked');
    button.innerHTML = '<span class="btn-icon">🔒</span> POSITION LOCKED';

    showToast(
      (action === 'back' ? 'Backed ' : 'Shorted ') +
        (cardEl.querySelector('.peer-name') ? cardEl.querySelector('.peer-name').textContent : 'peer') +
        ' — 50 FC staked, 5 FC broker fee routed to vault.',
      action === 'back' ? 'success' : 'danger'
    );
  });
}

/* ---------------------------------------------------------
   9. GLOBAL AUDIO UNLOCK
   Mobile browsers require a user gesture before AudioContext
   can produce sound — this primes it on first touch anywhere.
   --------------------------------------------------------- */
function primeAudioOnFirstInteraction(audio) {
  const unlock = () => {
    audio._ensureContext();
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('click', unlock);
  };
  document.addEventListener('touchstart', unlock, { once: true, passive: true });
  document.addEventListener('click', unlock, { once: true });
}

/* ---------------------------------------------------------
   10. BOOTSTRAP
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const audio = new AudioController();
  const economy = new EconomyEngine(audio);
  const market = new MarketSimulator();
  const antiCheat = new AntiCheatMonitor(audio);
  const focusSession = new FocusSessionController(audio, antiCheat);

  primeAudioOnFirstInteraction(audio);
  economy.refreshDisplays();
  bindMarketCardActions(audio, economy);
  market.start();

  window.addEventListener('beforeunload', () => market.stop());
});
