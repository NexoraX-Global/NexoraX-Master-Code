"use strict";

/*
 * FOCUSGRIND
 * Hardware-linked productivity prototype.
 *
 * APIs used:
 * - MediaDevices / getUserMedia
 * - Canvas 2D
 * - requestAnimationFrame
 * - Vibration API when available
 * - Web Audio API
 *
 * All networking, clan activity, hunters and Ghost data are simulated locally.
 */

class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event).push(callback);
  }

  emit(event, payload) {
    const listeners = this.events.get(event) || [];
    listeners.forEach(callback => callback(payload));
  }
}


class AppState {
  constructor() {
    this.cameraActive = false;
    this.raceActive = false;
    this.proofCaptured = false;
    this.bountyPublished = false;

    this.streak = 7;
    this.focusScore = 84;
    this.points = 1240;

    this.sessionDuration = 25 * 60 * 1000;
    this.sessionStart = null;
    this.elapsed = 0;

    this.userProgress = 0;
    this.ghostProgress = 0;

    this.lastProofDataUrl = null;
    this.lastProofTimestamp = null;
  }
}


class UIController {
  constructor(state, events) {
    this.state = state;
    this.events = events;

    this.elements = {
      systemStatus: document.getElementById("systemStatus"),
      streakValue: document.getElementById("streakValue"),
      focusScore: document.getElementById("focusScore"),
      pointsValue: document.getElementById("pointsValue"),

      cameraPreview: document.getElementById("cameraPreview"),
      proofCanvas: document.getElementById("proofCanvas"),
      cameraPlaceholder: document.getElementById("cameraPlaceholder"),
      cameraTimer: document.getElementById("cameraTimer"),

      startCameraBtn: document.getElementById("startCameraBtn"),
      snapBtn: document.getElementById("snapBtn"),
      stopCameraBtn: document.getElementById("stopCameraBtn"),
      downloadProofBtn: document.getElementById("downloadProofBtn"),

      proofResult: document.getElementById("proofResult"),
      proofMetadata: document.getElementById("proofMetadata"),

      userRaceTime: document.getElementById("userRaceTime"),
      ghostRaceTime: document.getElementById("ghostRaceTime"),
      userPercent: document.getElementById("userPercent"),
      ghostPercent: document.getElementById("ghostPercent"),
      userProgress: document.getElementById("userProgress"),
      ghostProgress: document.getElementById("ghostProgress"),
      userDistance: document.getElementById("userDistance"),
      ghostDistance: document.getElementById("ghostDistance"),

      sessionMinutes: document.getElementById("sessionMinutes"),
      startRaceBtn: document.getElementById("startRaceBtn"),
      stopRaceBtn: document.getElementById("stopRaceBtn"),

      sosBtn: document.getElementById("sosBtn"),
      flareStatus: document.getElementById("flareStatus"),

      wagerInput: document.getElementById("wagerInput"),
      publishBountyBtn: document.getElementById("publishBountyBtn"),
      hunterCount: document.getElementById("hunterCount"),

      leaderStatus: document.getElementById("leaderStatus"),
      leaderScore: document.getElementById("leaderScore"),

      toastContainer: document.getElementById("toastContainer")
    };

    this.bindEvents();
    this.renderInitial();
  }

  bindEvents() {
    this.elements.startCameraBtn.addEventListener(
      "click",
      () => this.events.emit("camera:start")
    );

    this.elements.snapBtn.addEventListener(
      "click",
      () => this.events.emit("camera:snapshot")
    );

    this.elements.stopCameraBtn.addEventListener(
      "click",
      () => this.events.emit("camera:stop")
    );

    this.elements.downloadProofBtn.addEventListener(
      "click",
      () => this.events.emit("proof:download")
    );

    this.elements.startRaceBtn.addEventListener(
      "click",
      () => this.events.emit("race:start")
    );

    this.elements.stopRaceBtn.addEventListener(
      "click",
      () => this.events.emit("race:stop")
    );

    this.elements.sosBtn.addEventListener(
      "click",
      () => this.events.emit("support:flare")
    );

    this.elements.publishBountyBtn.addEventListener(
      "click",
      () => this.events.emit("bounty:publish")
    );
  }

  renderInitial() {
    this.updateStats();
    this.updateHunterCount(12);
  }

  updateStats() {
    this.elements.streakValue.textContent =
      String(this.state.streak).padStart(2, "0");

    this.elements.focusScore.textContent =
      Math.round(this.state.focusScore);

    this.elements.pointsValue.textContent =
      this.state.points.toLocaleString();

    this.elements.leaderScore.textContent =
      this.state.points.toLocaleString();
  }

  setSystemStatus(text, active = false) {
    this.elements.systemStatus.textContent = text;

    const dot = document.querySelector(".system-status .status-dot");

    if (dot) {
      dot.style.background = active ? "var(--cyan)" : "var(--green)";
      dot.style.boxShadow = active
        ? "0 0 14px var(--cyan)"
        : "0 0 14px var(--green)";
    }
  }

  cameraStarted() {
    this.elements.cameraPlaceholder.classList.add("hidden");
    this.elements.startCameraBtn.disabled = true;
    this.elements.snapBtn.disabled = false;
    this.elements.stopCameraBtn.disabled = false;

    this.setSystemStatus("CAMERA LINKED", true);
  }

  cameraStopped() {
    this.elements.cameraPlaceholder.classList.remove("hidden");
    this.elements.startCameraBtn.disabled = false;
    this.elements.snapBtn.disabled = true;
    this.elements.stopCameraBtn.disabled = true;

    this.setSystemStatus("SYSTEM READY");
  }

  showProof(metadata) {
    this.elements.proofResult.classList.remove("hidden");
    this.elements.proofMetadata.textContent = metadata;
  }

  setRaceActive(active) {
    this.elements.startRaceBtn.disabled = active;
    this.elements.stopRaceBtn.disabled = !active;
    this.elements.sessionMinutes.disabled = active;

    document.body.classList.toggle("racing", active);

    this.elements.leaderStatus.textContent = active
      ? "Focus race active"
      : "Ready to focus";

    this.setSystemStatus(
      active ? "FOCUS RACE ACTIVE" : "SYSTEM READY",
      active
    );
  }

  updateRace(userProgress, ghostProgress, elapsed, duration) {
    const userPercent = Math.min(100, userProgress);
    const ghostPercent = Math.min(100, ghostProgress);

    this.elements.userProgress.style.width = `${userPercent}%`;
    this.elements.ghostProgress.style.width = `${ghostPercent}%`;

    this.elements.userPercent.textContent =
      `${Math.round(userPercent)}%`;

    this.elements.ghostPercent.textContent =
      `${Math.round(ghostPercent)}%`;

    this.elements.userDistance.textContent =
      `${Math.round(userPercent)} / 100`;

    this.elements.ghostDistance.textContent =
      `${Math.round(ghostPercent)} / 100`;

    this.elements.userRaceTime.textContent =
      this.formatTime(elapsed);

    const ghostElapsed =
      Math.min(duration, elapsed * 0.93);

    this.elements.ghostRaceTime.textContent =
      this.formatTime(ghostElapsed);
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  updateCameraTimer(milliseconds) {
    this.elements.cameraTimer.textContent =
      this.formatTime(milliseconds);
  }

  updateHunterCount(value) {
    this.elements.hunterCount.textContent = value;
  }

  showToast(title, message) {
    const toast = document.createElement("div");
    toast.className = "toast";

    const strong = document.createElement("strong");
    strong.textContent = title;

    const span = document.createElement("span");
    span.textContent = message;

    toast.appendChild(strong);
    toast.appendChild(span);

    this.elements.toastContainer.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";

      window.setTimeout(() => toast.remove(), 250);
    }, 3200);
  }
}


class CameraProofEngine {
  constructor(state, ui, events) {
    this.state = state;
    this.ui = ui;
    this.events = events;

    this.stream = null;
    this.cameraStartedAt = null;
    this.timerFrame = null;

    this.video = ui.elements.cameraPreview;
    this.canvas = ui.elements.proofCanvas;
    this.context = this.canvas.getContext("2d");

    this.bindEvents();
  }

  bindEvents() {
    this.events.on("camera:start", () => this.startCamera());
    this.events.on("camera:snapshot", () => this.captureSnapshot());
    this.events.on("camera:stop", () => this.stopCamera());
    this.events.on("proof:download", () => this.downloadProof());
  }

  async startCamera() {
    if (!navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function") {
      this.ui.showToast(
        "CAMERA UNAVAILABLE",
        "This browser does not expose getUserMedia."
      );
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "user"
          },
          width: {
            ideal: 1280
          },
          height: {
            ideal: 720
          }
        },
        audio: false
      });

      this.video.srcObject = this.stream;
      await this.video.play();

      this.state.cameraActive = true;
      this.cameraStartedAt = performance.now();

      this.ui.cameraStarted();
      this.startCameraTimer();

      this.ui.showToast(
        "CAMERA LINKED",
        "Preview is active locally."
      );
    } catch (error) {
      console.error(error);

      this.ui.showToast(
        "CAMERA ACCESS FAILED",
        this.getCameraErrorMessage(error)
      );
    }
  }

  getCameraErrorMessage(error) {
    if (!error) {
      return "Unable to access the camera.";
    }

    switch (error.name) {
      case "NotAllowedError":
        return "Camera permission was denied.";
      case "NotFoundError":
        return "No compatible camera was found.";
      case "NotReadableError":
        return "The camera is already being used.";
      case "SecurityError":
        return "Camera access requires a secure browser context.";
      default:
        return "The browser could not start the camera.";
    }
  }

  startCameraTimer() {
    const tick = now => {
      if (!this.state.cameraActive) {
        return;
      }

      const elapsed = now - this.cameraStartedAt;
      this.ui.updateCameraTimer(elapsed);

      this.timerFrame = requestAnimationFrame(tick);
    };

    this.timerFrame = requestAnimationFrame(tick);
  }

  stopCameraTimer() {
    if (this.timerFrame !== null) {
      cancelAnimationFrame(this.timerFrame);
      this.timerFrame = null;
    }
  }

  async captureSnapshot() {
    if (!this.state.cameraActive) {
      return;
    }

    if (!this.video.videoWidth || !this.video.videoHeight) {
      this.ui.showToast(
        "CAMERA NOT READY",
        "Wait until the preview becomes visible."
      );
      return;
    }

    const width = this.video.videoWidth;
    const height = this.video.videoHeight;

    this.canvas.width = width;
    this.canvas.height = height;

    this.context.drawImage(
      this.video,
      0,
      0,
      width,
      height
    );

    this.drawCyberStamp(width, height);

    const dataUrl = this.canvas.toDataURL(
      "image/jpeg",
      0.92
    );

    this.state.lastProofDataUrl = dataUrl;
    this.state.lastProofTimestamp = new Date();
    this.state.proofCaptured = true;

    const timestamp = this.formatDate(
      this.state.lastProofTimestamp
    );

    this.ui.showProof(
      `STAMPED ${timestamp} • SIMULATED LOCATION • LOCAL CAPTURE`
    );

    this.ui.showToast(
      "PROOF CAPTURED",
      "Focus stamp burned into the image."
    );
  }

  drawCyberStamp(width, height) {
    const ctx = this.context;
    const date = new Date();

    const timestamp = this.formatDate(date);

    const stampWidth = Math.min(
      width * 0.82,
      760
    );

    const stampHeight = 128;

    const x = (width - stampWidth) / 2;
    const y = height - stampHeight - 30;

    ctx.save();

    ctx.fillStyle = "rgba(3, 8, 15, 0.82)";
    ctx.fillRect(x, y, stampWidth, stampHeight);

    ctx.strokeStyle = "#20e8ff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, stampWidth, stampHeight);

    ctx.fillStyle = "rgba(32, 232, 255, 0.12)";
    ctx.fillRect(x, y, stampWidth, 6);

    ctx.font = "700 26px Arial";
    ctx.fillStyle = "#20e8ff";
    ctx.fillText(
      "FOCUS GRIND // VERIFIED SESSION",
      x + 22,
      y + 38
    );

    ctx.font = "700 19px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      "FOCUS-STREAK ACTIVE",
      x + 22,
      y + 70
    );

    ctx.font = "14px monospace";
    ctx.fillStyle = "#a7b5c8";
    ctx.fillText(
      `TIME  ${timestamp}`,
      x + 22,
      y + 98
    );

    ctx.fillText(
      "LOCATION  SIMULATED / LOCAL DEMO",
      x + 260,
      y + 98
    );

    ctx.restore();
  }

  formatDate(date) {
    const pad = value => String(value).padStart(2, "0");

    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-") + " " +
      [
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds())
      ].join(":");
  }

  downloadProof() {
    if (!this.state.lastProofDataUrl) {
      this.ui.showToast(
        "NO PROOF",
        "Capture a proof image first."
      );
      return;
    }

    const link = document.createElement("a");

    const timestamp = Date.now();

    link.href = this.state.lastProofDataUrl;
    link.download = `focus-proof-${timestamp}.jpg`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    this.ui.showToast(
      "IMAGE READY",
      "Your stamped proof was saved by the browser."
    );
  }

  stopCamera() {
    this.stopCameraTimer();

    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });

      this.stream = null;
    }

    this.video.srcObject = null;
    this.state.cameraActive = false;

    this.ui.updateCameraTimer(0);
    this.ui.cameraStopped();

    this.ui.showToast(
      "CAMERA STOPPED",
      "Camera tracks have been released."
    );
  }
}


class AudioHapticEngine {
  constructor(ui) {
    this.ui = ui;
    this.audioContext = null;
  }

  async getAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextClass) {
        return null;
      }

      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  vibrate() {
    if (!("vibrate" in navigator)) {
      return false;
    }

    try {
      navigator.vibrate([
        80,
        80,
        120
      ]);

      return true;
    } catch {
      return false;
    }
  }

  async playSupportPulse() {
    const context = await this.getAudioContext();

    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      110,
      context.currentTime
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      55,
      context.currentTime + 0.45
    );

    gain.gain.setValueAtTime(
      0.0001,
      context.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.08,
      context.currentTime + 0.03
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + 0.48
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
  }

  async triggerSupportCue() {
    const didVibrate = this.vibrate();

    try {
      await this.playSupportPulse();
    } catch (error) {
      console.warn("Audio unavailable:", error);
    }

    return didVibrate;
  }
}


class GhostRiderEngine {
  constructor(state, ui, events) {
    this.state = state;
    this.ui = ui;
    this.events = events;

    this.animationFrame = null;
    this.lastFrameTime = null;

    this.ghostBaseSpeed = 0.0000102;
    this.userBoost = 0;

    this.bindEvents();
  }

  bindEvents() {
    this.events.on("race:start", () => this.start());
    this.events.on("race:stop", () => this.stop());
  }

  start() {
    if (this.state.raceActive) {
      return;
    }

    const minutes = Number(
      this.ui.elements.sessionMinutes.value
    );

    if (!Number.isFinite(minutes) ||
        minutes < 1 ||
        minutes > 240) {
      this.ui.showToast(
        "INVALID SESSION",
        "Choose a duration from 1 to 240 minutes."
      );
      return;
    }

    this.state.sessionDuration =
      minutes * 60 * 1000;

    this.state.sessionStart = performance.now();
    this.state.elapsed = 0;
    this.state.userProgress = 0;
    this.state.ghostProgress = 0;

    this.state.raceActive = true;

    this.lastFrameTime = performance.now();

    this.ui.setRaceActive(true);

    this.ui.showToast(
      "RACE STARTED",
      `${minutes}-minute focus session is now running.`
    );

    this.loop(this.lastFrameTime);
  }

  loop(now) {
    if (!this.state.raceActive) {
      return;
    }

    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.state.elapsed =
      now - this.state.sessionStart;

    const duration =
      this.state.sessionDuration;

    /*
     * User progresses linearly through the requested
     * session duration. Small simulated momentum variation
     * makes the visual bar feel alive without affecting
     * the actual timer.
     */
    const normalized =
      Math.min(1, this.state.elapsed / duration);

    const momentum =
      Math.sin(now / 1800) * 0.0004;

    this.state.userProgress =
      Math.min(
        100,
        (normalized * 100) + momentum
      );

    /*
     * Ghost is intentionally simulated. It represents a
     * recorded benchmark rather than another real user.
     */
    this.state.ghostProgress =
      Math.min(
        100,
        normalized * 93 +
        Math.sin(now / 2400) * 1.4
      );

    this.ui.updateRace(
      this.state.userProgress,
      this.state.ghostProgress,
      this.state.elapsed,
      duration
    );

    if (this.state.elapsed >= duration) {
      this.completeRace();
      return;
    }

    this.animationFrame =
      requestAnimationFrame(time => this.loop(time));
  }

  completeRace() {
    this.state.raceActive = false;

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.state.points += 100;
    this.state.focusScore =
      Math.min(
        100,
        this.state.focusScore + 2
      );

    this.state.streak += 1;

    this.ui.setRaceActive(false);
    this.ui.updateStats();

    this.ui.showToast(
      "SESSION COMPLETE",
      "Focus session finished successfully. +100 points."
    );

    this.ui.updateRace(
      100,
      100,
      this.state.sessionDuration,
      this.state.sessionDuration
    );
  }

  stop() {
    if (!this.state.raceActive) {
      return;
    }

    this.state.raceActive = false;

    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.ui.setRaceActive(false);

    const progress =
      Math.round(this.state.userProgress);

    this.ui.showToast(
      "SESSION ENDED",
      `${progress}% of the focus race completed.`
    );
  }
}


class SupportFlare {
  constructor(state, ui, events, audio) {
    this.state = state;
    this.ui = ui;
    this.events = events;
    this.audio = audio;

    this.cooldown = false;

    this.bindEvents();
  }

  bindEvents() {
    this.events.on(
      "support:flare",
      () => this.activate()
    );
  }

  async activate() {
    if (this.cooldown) {
      this.ui.showToast(
        "COOLDOWN",
        "Support flare is temporarily cooling down."
      );
      return;
    }

    this.cooldown = true;

    const button = this.ui.elements.sosBtn;

    button.style.transform = "scale(.96)";

    window.setTimeout(() => {
      button.style.transform = "";
    }, 180);

    const didVibrate =
      await this.audio.triggerSupportCue();

    this.ui.elements.flareStatus.innerHTML =
      `<span></span> SUPPORT PING SENT • ` +
      `${didVibrate ? "HAPTIC ACK" : "HAPTIC N/A"}`;

    this.ui.showToast(
      "SUPPORT PING",
      "Your simulated clan received a reset signal."
    );

    window.setTimeout(() => {
      this.ui.elements.flareStatus.innerHTML =
        `<span></span> CLAN CHANNEL STANDBY`;

      this.cooldown = false;
    }, 3500);
  }
}


class BountyBoard {
  constructor(state, ui, events) {
    this.state = state;
    this.ui = ui;
    this.events = events;

    this.bindEvents();
    this.startRadarSimulation();
  }

  bindEvents() {
    this.events.on(
      "bounty:publish",
      () => this.publish()
    );
  }

  publish() {
    const wager =
      Number(this.ui.elements.wagerInput.value);

    if (!Number.isFinite(wager) ||
        wager < 0 ||
        wager > 100000) {
      this.ui.showToast(
        "INVALID WAGER",
        "Enter a value between 0 and 100,000 points."
      );
      return;
    }

    if (wager > this.state.points) {
      this.ui.showToast(
        "NOT ENOUGH POINTS",
        "Your simulated balance is lower than this wager."
      );
      return;
    }

    this.state.bountyPublished = true;

    const hunters =
      8 + Math.floor(Math.random() * 13);

    this.ui.updateHunterCount(hunters);

    this.ui.showToast(
      "CHALLENGE PUBLISHED",
      `${wager.toLocaleString()} points committed to this simulated challenge.`
    );
  }

  startRadarSimulation() {
    window.setInterval(() => {
      const hunters =
        8 + Math.floor(Math.random() * 13);

      this.ui.updateHunterCount(hunters);
    }, 4200);
  }
}


class Application {
  constructor() {
    this.events = new EventBus();
    this.state = new AppState();
    this.ui = new UIController(
      this.state,
      this.events
    );

    this.camera = new CameraProofEngine(
      this.state,
      this.ui,
      this.events
    );

    this.audio = new AudioHapticEngine(
      this.ui
    );

    this.ghostRider = new GhostRiderEngine(
      this.state,
      this.ui,
      this.events
    );

    this.supportFlare = new SupportFlare(
      this.state,
      this.ui,
      this.events,
      this.audio
    );

    this.bountyBoard = new BountyBoard(
      this.state,
      this.ui,
      this.events
    );

    this.bindLifecycleEvents();
  }

  bindLifecycleEvents() {
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden &&
            this.state.raceActive) {
          this.ui.showToast(
            "SESSION RUNNING",
            "Return to the app when you are ready to continue."
          );
        }
      }
    );

    window.addEventListener(
      "beforeunload",
      () => {
        if (this.state.cameraActive) {
          this.camera.stopCamera();
        }
      }
    );

    window.addEventListener(
      "pagehide",
      () => {
        if (this.state.cameraActive) {
          this.camera.stopCamera();
        }
      }
    );
  }
}


document.addEventListener(
  "DOMContentLoaded",
  () => {
    window.focusGrindApp =
      new Application();
  }
);