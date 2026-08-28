(function () {
  "use strict";

  // ---------- CONSTANTS ----------
  var STORAGE_KEY = "phantomRivalBestTime";
  var DEFAULT_TARGET_MS = 60000; // 60 seconds default challenging time
  var ACCEL_MULTIPLIER = 5;

  // ---------- DOM REFS ----------
  var startBtn = document.getElementById("startBtn");
  var finishBtn = document.getElementById("finishBtn");
  var userBar = document.getElementById("userBar");
  var phantomBar = document.getElementById("phantomBar");
  var userPercentEl = document.getElementById("userPercent");
  var phantomPercentEl = document.getElementById("phantomPercent");
  var liveTimerEl = document.getElementById("liveTimer");
  var bestTimeDisplayEl = document.getElementById("bestTimeDisplay");
  var toastContainer = document.getElementById("toastContainer");
  var victoryOverlay = document.getElementById("victoryOverlay");
  var defeatOverlay = document.getElementById("defeatOverlay");
  var victorySub = document.getElementById("victorySub");
  var defeatSub = document.getElementById("defeatSub");
  var claimBtn = document.getElementById("claimBtn");
  var retryBtn = document.getElementById("retryBtn");

  // ---------- STATE ----------
  var racing = false;
  var raceEnded = false;
  var rafId = null;
  var targetMs = DEFAULT_TARGET_MS;
  var raceStartTimestamp = 0;
  var userElapsedMs = 0;
  var phantomElapsedMs = 0;
  var lastFrameTime = 0;
  var accelActive = false;
  var hasCrossed = false;
  var tickIntervalId = null;

  // ---------- LOCAL STORAGE (THE BRAIN) ----------
  function loadBestTime() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null || isNaN(parseFloat(stored))) {
      return DEFAULT_TARGET_MS;
    }
    var val = parseFloat(stored);
    if (val <= 0) return DEFAULT_TARGET_MS;
    return val;
  }

  function saveBestTime(ms) {
    localStorage.setItem(STORAGE_KEY, String(ms));
  }

  function refreshBestTimeDisplay() {
    bestTimeDisplayEl.textContent = (targetMs / 1000).toFixed(1) + "s";
  }

  // ---------- AUDIO ENGINE ----------
  var audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, duration, type, gainVal, delay) {
    try {
      var ctx = getAudioCtx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      gain.gain.value = gainVal !== undefined ? gainVal : 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      var startAt = ctx.currentTime + (delay || 0);
      gain.gain.setValueAtTime(gain.gain.value, startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.02);
    } catch (e) {
      // audio not available, fail silently
    }
  }

  function playTick() {
    playTone(1800, 0.04, "square", 0.06);
  }

  function playWarningBeep() {
    playTone(880, 0.15, "square", 0.2);
    playTone(880, 0.15, "square", 0.2, 0.2);
  }

  function playVictoryChime() {
    playTone(523.25, 0.18, "sine", 0.2, 0);
    playTone(659.25, 0.18, "sine", 0.2, 0.15);
    playTone(783.99, 0.18, "sine", 0.2, 0.3);
    playTone(1046.5, 0.4, "sine", 0.25, 0.45);
  }

  function playDefeatBuzz() {
    playTone(110, 0.6, "sawtooth", 0.25, 0);
    playTone(80, 0.7, "sawtooth", 0.2, 0.1);
  }

  function startTicking() {
    stopTicking();
    tickIntervalId = setInterval(function () {
      if (racing && !raceEnded) {
        playTick();
      }
    }, 1000);
  }

  function stopTicking() {
    if (tickIntervalId) {
      clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
  }

  // ---------- TOAST ----------
  function showToast(message) {
    var toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 2600);
  }

  // ---------- RACE LOGIC ----------
  function resetRaceUI() {
    userBar.style.width = "0%";
    phantomBar.style.width = "0%";
    userPercentEl.textContent = "0%";
    phantomPercentEl.textContent = "0%";
    liveTimerEl.textContent = "0.0s";
    victoryOverlay.classList.add("hidden");
    defeatOverlay.classList.add("hidden");
    hasCrossed = false;
    accelActive = false;
  }

  function startRace() {
    targetMs = loadBestTime();
    refreshBestTimeDisplay();
    resetRaceUI();

    racing = true;
    raceEnded = false;
    userElapsedMs = 0;
    phantomElapsedMs = 0;
    raceStartTimestamp = performance.now();
    lastFrameTime = raceStartTimestamp;

    startBtn.classList.add("hidden");
    finishBtn.classList.remove("hidden");

    startTicking();
    rafId = requestAnimationFrame(animationLoop);
  }

  function animationLoop(now) {
    if (!racing || raceEnded) return;

    var deltaMs = now - lastFrameTime;
    lastFrameTime = now;

    userElapsedMs += deltaMs;
    var phantomRate = accelActive ? ACCEL_MULTIPLIER : 1;
    phantomElapsedMs += deltaMs * phantomRate;

    var userPct = Math.min(100, (userElapsedMs / targetMs) * 100);
    var phantomPct = Math.min(100, (phantomElapsedMs / targetMs) * 100);

    userBar.style.width = userPct.toFixed(2) + "%";
    phantomBar.style.width = phantomPct.toFixed(2) + "%";
    userPercentEl.textContent = Math.floor(userPct) + "%";
    phantomPercentEl.textContent = Math.floor(phantomPct) + "%";
    liveTimerEl.textContent = (userElapsedMs / 1000).toFixed(1) + "s";

    if (!hasCrossed && phantomPct >= userPct && phantomElapsedMs > 300) {
      hasCrossed = true;
      playWarningBeep();
    }

    if (phantomPct >= 100) {
      endRace(false);
      return;
    }

    rafId = requestAnimationFrame(animationLoop);
  }

  function endRace(userWon) {
    racing = false;
    raceEnded = true;
    stopTicking();
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    startBtn.classList.remove("hidden");
    finishBtn.classList.add("hidden");
    startBtn.textContent = "Race Again";

    if (userWon) {
      var finalTime = userElapsedMs;
      var previousBest = loadBestTime();
      if (finalTime < previousBest) {
        saveBestTime(finalTime);
        victorySub.textContent = "New record set: " + (finalTime / 1000).toFixed(2) + "s. The Phantom just got faster.";
      } else {
        victorySub.textContent = "You beat the Phantom in " + (finalTime / 1000).toFixed(2) + "s.";
      }
      playVictoryChime();
      victoryOverlay.classList.remove("hidden");
    } else {
      defeatSub.textContent = "The Phantom finished the race before you. Zero rewards this time.";
      playDefeatBuzz();
      defeatOverlay.classList.remove("hidden");
    }
  }

  function finishTask() {
    if (!racing || raceEnded) return;
    endRace(true);
  }

  // ---------- ANTI-CHEAT: VISIBILITY API ----------
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (racing && !raceEnded) {
        accelActive = true;
        showToast("Focus Lost! Phantom Accelerated.");
      }
    }
  });

  // ---------- EVENT LISTENERS ----------
  startBtn.addEventListener("click", function () {
    getAudioCtx();
    startRace();
  });

  finishBtn.addEventListener("click", finishTask);

  claimBtn.addEventListener("click", function () {
    victoryOverlay.classList.add("hidden");
  });

  retryBtn.addEventListener("click", function () {
    defeatOverlay.classList.add("hidden");
  });

  // ---------- INIT ----------
  function init() {
    targetMs = loadBestTime();
    refreshBestTimeDisplay();
    resetRaceUI();
  }

  init();
})();