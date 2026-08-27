/* =========================================================
   TASKFORGE PRO — MEGA FOCUS ROOM
   Complete JavaScript
   ========================================================= */

"use strict";

/* =========================================================
   CONFIG
   ========================================================= */

const CONFIG = {
  MIN_FRIENDS: 1,
  MAX_FRIENDS: 50,

  MIN_COINS: 10,
  MAX_COINS: 10000,

  MAX_HOURS: 24,

  PLATFORM_TAX: 0.20,
  SURVIVOR_POOL: 0.80,

  DEMO_FRIEND_NAMES: [
    "Alex",
    "Maya",
    "Rohan",
    "Aarav",
    "Zoya",
    "Kabir",
    "Isha",
    "Ryan",
    "Neha",
    "Arjun",
    "Sara",
    "Dev",
    "Anaya",
    "Vihaan",
    "Meera",
    "Leo",
    "Aanya",
    "Sam",
    "Advik",
    "Tara",
    "Reyansh",
    "Nora",
    "Kian",
    "Diya",
    "Yash",
    "Aditi",
    "Neil",
    "Riya",
    "Om",
    "Kiara",
    "Ayaan",
    "Myra",
    "Dhruv",
    "Nia",
    "Aryan",
    "Eva",
    "Manav",
    "Sia",
    "Rudra",
    "Ira",
    "Veer",
    "Alia",
    "Raghav",
    "Anvi",
    "Shaurya",
    "Mira",
    "Krish",
    "Avni",
    "Parth",
    "Rhea"
  ]
};


/* =========================================================
   STATE
   ========================================================= */

const state = {
  taskName: "",
  requestedTime: 25,
  timeUnit: "minutes",
  totalSeconds: 1500,
  remainingSeconds: 1500,

  userCoins: 100,
  friendCount: 5,

  players: [],

  timerId: null,
  timerRunning: false,

  startedAt: null,
  finishedAt: null,

  userEliminated: false,
  roomFinished: false,

  audioReady: false,
  audioContext: null,

  heartbeatTimer: null,

  visibilityTriggered: false,
  blurTriggered: false,

  inviteLink: ""
};


/* =========================================================
   DOM
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const setupScreen = $("#setupScreen");
const roomScreen = $("#roomScreen");
const certificateScreen = $("#certificateScreen");

const taskInput = $("#taskInput");
const timeInput = $("#timeInput");
const timeUnit = $("#timeUnit");
const coinInput = $("#coinInput");
const coinInputValue = $("#coinInputValue");
const friendSlider = $("#friendSlider");
const friendCountValue = $("#friendCountValue");

const friendPreviewGrid = $("#friendPreviewGrid");
const friendPreviewCount = $("#friendPreviewCount");

const copyInviteBtn = $("#copyInviteBtn");
const startRoomBtn = $("#startRoomBtn");

const activeTaskName = $("#activeTaskName");
const activeUserCoins = $("#activeUserCoins");
const survivorCount = $("#survivorCount");
const roomPlayerCount = $("#roomPlayerCount");
const roomPlayerGrid = $("#roomPlayerGrid");

const timerDisplay = $("#timerDisplay");
const timerProgressBar = $("#timerProgressBar");
const timerStartedText = $("#timerStartedText");
const timerTotalText = $("#timerTotalText");

const antiCheatBanner = $("#antiCheatBanner");

const emojiButtons = document.querySelectorAll(".emoji-chip");

const endRoomBtn = $("#endRoomBtn");

const certificateTask = $("#certificateTask");
const certificateTime = $("#certificateTime");
const certificateCoins = $("#certificateCoins");
const certificateDate = $("#certificateDate");
const leaderboardList = $("#leaderboardList");

const newRoomBtn = $("#newRoomBtn");

const toast = $("#toast");
const toastText = $("#toastText");
const toastIcon = $("#toastIcon");

const audioUnlock = $("#audioUnlock");
const unlockAudioBtn = $("#unlockAudioBtn");


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(number) {
  return Math.round(number).toLocaleString("en-IN");
}

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0")
  ].join(":");
}

function formatShortClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getInitials(name) {
  if (!name) {
    return "?";
  }

  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function showScreen(screen) {
  [setupScreen, roomScreen, certificateScreen].forEach((element) => {
    element.classList.remove("active-screen");
  });

  screen.classList.add("active-screen");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   TOAST
   ========================================================= */

let toastTimeout = null;

function showToast(message, type = "success", icon = "✓") {
  toastText.textContent = message;
  toastIcon.textContent = icon;

  toast.classList.remove("error");
  toast.classList.remove("show");

  if (type === "error") {
    toast.classList.add("error");
  }

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}


/* =========================================================
   AUDIO ENGINE
   ========================================================= */

function ensureAudioContext() {
  if (state.audioContext) {
    return state.audioContext;
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  try {
    state.audioContext = new AudioContextClass();
  } catch (error) {
    console.warn("AudioContext could not start.", error);
    return null;
  }

  return state.audioContext;
}

async function unlockAudio() {
  const context = ensureAudioContext();

  if (!context) {
    state.audioReady = true;
    audioUnlock.classList.add("hidden");
    return;
  }

  try {
    if (context.state === "suspended") {
      await context.resume();
    }

    state.audioReady = true;
    audioUnlock.classList.add("hidden");

    playPing();
    showToast("Sound is ready", "success", "🔊");
  } catch (error) {
    console.warn("Audio unlock failed.", error);

    state.audioReady = true;
    audioUnlock.classList.add("hidden");
  }
}

function makeOscillator(
  frequency,
  duration,
  type = "sine",
  volume = 0.05,
  startTime = 0
) {
  const context = ensureAudioContext();

  if (!context || !state.audioReady) {
    return;
  }

  const now = context.currentTime + startTime;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + duration
  );

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function playPing() {
  makeOscillator(880, 0.08, "sine", 0.045);
  makeOscillator(1320, 0.11, "sine", 0.025, 0.05);
}

function playHeartbeat() {
  if (!state.audioReady) {
    return;
  }

  makeOscillator(70, 0.12, "sine", 0.04);
  makeOscillator(58, 0.16, "sine", 0.03, 0.14);
}

function playShatterBuzz() {
  const context = ensureAudioContext();

  if (!context || !state.audioReady) {
    return;
  }

  const now = context.currentTime;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sawtooth";

  oscillator.frequency.setValueAtTime(110, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    42,
    now + 0.35
  );

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(
    0.16,
    now + 0.02
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.38
  );

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.42);

  makeOscillator(55, 0.25, "square", 0.035);
}

function playCashChime() {
  makeOscillator(523.25, 0.11, "sine", 0.045);
  makeOscillator(659.25, 0.13, "sine", 0.04, 0.09);
  makeOscillator(783.99, 0.18, "sine", 0.035, 0.18);
  makeOscillator(1046.5, 0.25, "sine", 0.03, 0.28);
}


/* =========================================================
   TIME ENGINE
   ========================================================= */

function calculateSeconds() {
  let amount = Number(timeInput.value);

  if (!Number.isFinite(amount)) {
    amount = 1;
  }

  amount = Math.floor(amount);

  if (timeUnit.value === "hours") {
    amount = clamp(amount, 1, CONFIG.MAX_HOURS);
    timeInput.value = amount;

    return amount * 60 * 60;
  }

  amount = clamp(amount, 1, CONFIG.MAX_HOURS * 60);
  timeInput.value = amount;

  return amount * 60;
}

function getTimeLabel() {
  const amount = Number(timeInput.value);

  if (timeUnit.value === "hours") {
    return amount === 1
      ? "1 hour"
      : `${amount} hours`;
  }

  return amount === 1
    ? "1 minute"
    : `${amount} minutes`;
}

function updateTimePreview() {
  const seconds = calculateSeconds();

  timerTotalText.textContent = getTimeLabel();

  if (!state.timerRunning) {
    timerDisplay.textContent = formatClock(seconds);
  }
}


/* =========================================================
   COINS
   ========================================================= */

function updateCoinDisplay() {
  const value = clamp(
    Number(coinInput.value) || CONFIG.MIN_COINS,
    CONFIG.MIN_COINS,
    CONFIG.MAX_COINS
  );

  coinInput.value = value;
  coinInputValue.textContent = formatNumber(value);
}


/* =========================================================
   PLAYER GENERATION
   ========================================================= */

function createPlayer(id, name, coins, isUser = false) {
  return {
    id,
    name,
    coins,
    originalCoins: coins,
    isUser,
    alive: true,
    eliminatedAt: null
  };
}

function buildPlayers() {
  state.players = [];

  const user = createPlayer(
    "user",
    "You",
    state.userCoins,
    true
  );

  state.players.push(user);

  for (let i = 0; i < state.friendCount; i++) {
    const name =
      CONFIG.DEMO_FRIEND_NAMES[i] ||
      `Friend ${i + 1}`;

    /*
      Small variation in demo friend coins.
      These are virtual points only.
    */
    const variation = 0.75 + (i % 6) * 0.08;

    const friendCoins = Math.max(
      10,
      Math.round(state.userCoins * variation)
    );

    state.players.push(
      createPlayer(
        `friend-${i + 1}`,
        name,
        friendCoins,
        false
      )
    );
  }
}


/* =========================================================
   FRIEND PREVIEW
   ========================================================= */

function renderFriendPreview() {
  const count = Number(friendSlider.value);

  state.friendCount = clamp(
    count,
    CONFIG.MIN_FRIENDS,
    CONFIG.MAX_FRIENDS
  );

  friendCountValue.textContent = state.friendCount;
  friendPreviewCount.textContent = state.friendCount;

  friendPreviewGrid.innerHTML = "";

  for (let i = 0; i < state.friendCount; i++) {
    const name =
      CONFIG.DEMO_FRIEND_NAMES[i] ||
      `Friend ${i + 1}`;

    const card = document.createElement("div");

    card.className = "friend-card";

    card.innerHTML = `
      <div class="avatar">${getInitials(name)}</div>
      <div class="friend-info">
        <div class="friend-name">${name}</div>
        <div class="friend-state">Ready</div>
      </div>
    `;

    friendPreviewGrid.appendChild(card);
  }
}


/* =========================================================
   ROOM PLAYER UI
   ========================================================= */

function renderRoomPlayers() {
  roomPlayerGrid.innerHTML = "";

  state.players.forEach((player) => {
    const card = document.createElement("div");

    card.className = "friend-card";

    if (player.isUser) {
      card.classList.add("is-user");
    }

    if (!player.alive) {
      card.classList.add("eliminated");
    }

    const stateText = player.alive
      ? player.isUser
        ? "You • Focusing"
        : "Focusing"
      : "Eliminated";

    card.innerHTML = `
      <div class="avatar">${getInitials(player.name)}</div>
      <div class="friend-info">
        <div class="friend-name">${player.name}</div>
        <div class="friend-state">${stateText}</div>
      </div>
    `;

    roomPlayerGrid.appendChild(card);
  });

  updateSurvivorCount();
}

function updateSurvivorCount() {
  const survivors = state.players.filter(
    (player) => player.alive
  );

  survivorCount.textContent = survivors.length;
  roomPlayerCount.textContent = state.players.length;
}


/* =========================================================
   SETUP INPUT EVENTS
   ========================================================= */

taskInput.addEventListener("input", () => {
  taskInput.value = taskInput.value.replace(/\s{2,}/g, " ");
});

timeInput.addEventListener("input", updateTimePreview);
timeUnit.addEventListener("change", updateTimePreview);

coinInput.addEventListener("input", updateCoinDisplay);

friendSlider.addEventListener("input", renderFriendPreview);


/* =========================================================
   INVITE LINK
   ========================================================= */

function generateInviteLink() {
  const roomCode =
    Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();

  state.inviteLink =
    `${window.location.href.split("#")[0]}#room-${roomCode}`;

  return state.inviteLink;
}

async function copyInviteLink() {
  const link = generateInviteLink();

  try {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(link);

      playPing();
      showToast(
        "Invite link copied",
        "success",
        "🔗"
      );

      return;
    }
  } catch (error) {
    console.warn("Clipboard API failed.", error);
  }

  /*
    Fallback for browsers where clipboard access is blocked.
  */
  const temporaryInput =
    document.createElement("textarea");

  temporaryInput.value = link;
  temporaryInput.style.position = "fixed";
  temporaryInput.style.left = "-9999px";

  document.body.appendChild(temporaryInput);

  temporaryInput.select();

  try {
    document.execCommand("copy");

    playPing();

    showToast(
      "Invite link copied",
      "success",
      "🔗"
    );
  } catch (error) {
    showToast(
      "Room link ready",
      "success",
      "🔗"
    );
  }

  temporaryInput.remove();
}

copyInviteBtn.addEventListener(
  "click",
  async () => {
    await unlockAudioIfNeeded();
    copyInviteLink();
  }
);


/* =========================================================
   AUDIO HELPER
   ========================================================= */

async function unlockAudioIfNeeded() {
  if (!state.audioReady) {
    await unlockAudio();
  } else {
    const context = ensureAudioContext();

    if (
      context &&
      context.state === "suspended"
    ) {
      try {
        await context.resume();
      } catch (error) {
        console.warn(error);
      }
    }
  }
}

unlockAudioBtn.addEventListener(
  "click",
  async () => {
    await unlockAudio();
  }
);


/* =========================================================
   START ROOM
   ========================================================= */

async function startRoom() {
  await unlockAudioIfNeeded();

  const task = taskInput.value.trim();

  if (!task) {
    taskInput.focus();

    showToast(
      "Please enter your task first",
      "error",
      "!"
    );

    return;
  }

  if (task.length < 2) {
    taskInput.focus();

    showToast(
      "Please enter a clear task",
      "error",
      "!"
    );

    return;
  }

  const seconds = calculateSeconds();

  if (
    seconds < 60 ||
    seconds > CONFIG.MAX_HOURS * 60 * 60
  ) {
    showToast(
      "Choose a time up to 24 hours",
      "error",
      "!"
    );

    return;
  }

  state.taskName = task;
  state.requestedTime = Number(timeInput.value);
  state.timeUnit = timeUnit.value;

  state.totalSeconds = seconds;
  state.remainingSeconds = seconds;

  state.userCoins = Number(coinInput.value);

  state.friendCount = Number(friendSlider.value);

  state.userEliminated = false;
  state.roomFinished = false;
  state.visibilityTriggered = false;
  state.blurTriggered = false;

  buildPlayers();

  activeTaskName.textContent =
    state.taskName;

  activeUserCoins.textContent =
    formatNumber(state.userCoins);

  timerStartedText.textContent =
    "Focus started";

  timerTotalText.textContent =
    getTimeLabel();

  timerDisplay.textContent =
    formatClock(state.remainingSeconds);

  renderRoomPlayers();

  showScreen(roomScreen);

  state.startedAt = Date.now();
  state.timerRunning = true;

  startTimer();
  startHeartbeat();

  playPing();

  showToast(
    "Focus room started",
    "success",
    "🔒"
  );
}

startRoomBtn.addEventListener(
  "click",
  startRoom
);


/* =========================================================
   TIMER
   ========================================================= */

function startTimer() {
  stopTimer();

  state.timerRunning = true;

  state.timerId = setInterval(
    tickTimer,
    1000
  );

  tickTimer();
}

function stopTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function tickTimer() {
  if (!state.timerRunning) {
    return;
  }

  if (state.userEliminated) {
    stopTimer();
    return;
  }

  if (state.remainingSeconds <= 0) {
    finishRoom();
    return;
  }

  state.remainingSeconds -= 1;

  updateTimerUI();

  if (
    state.remainingSeconds <= 0
  ) {
    finishRoom();
  }
}

function updateTimerUI() {
  timerDisplay.textContent =
    formatClock(state.remainingSeconds);

  const progress =
    state.totalSeconds > 0
      ? (
          state.remainingSeconds /
          state.totalSeconds
        ) * 100
      : 0;

  timerProgressBar.style.width =
    `${clamp(progress, 0, 100)}%`;

  if (
    state.remainingSeconds <= 60 &&
    state.remainingSeconds > 0
  ) {
    timerDisplay.style.color =
      "var(--green)";
  } else {
    timerDisplay.style.color =
      "var(--white)";
  }
}


/* =========================================================
   HEARTBEAT
   ========================================================= */

function startHeartbeat() {
  stopHeartbeat();

  state.heartbeatTimer = setInterval(() => {
    if (
      state.timerRunning &&
      !state.userEliminated
    ) {
      playHeartbeat();
    }
  }, 2800);
}

function stopHeartbeat() {
  if (state.heartbeatTimer !== null) {
    clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = null;
  }
}


/* =========================================================
   ANTI-CHEAT
   ========================================================= */

/*
  Important:
  Browser visibility/blur events are used here as a
  front-end demo. A real multiplayer system must verify
  player state on a trusted server as well.
*/

function handleCheat(reason) {
  if (
    !state.timerRunning ||
    state.roomFinished ||
    state.userEliminated
  ) {
    return;
  }

  state.userEliminated = true;

  const user =
    state.players.find(
      (player) => player.isUser
    );

  if (!user) {
    return;
  }

  user.alive = false;
  user.eliminatedAt = Date.now();

  stopTimer();
  stopHeartbeat();

  playShatterBuzz();

  renderRoomPlayers();

  activeUserCoins.textContent = "0";

  antiCheatBanner.innerHTML = `
    <div class="warning-icon">✕</div>
    <div>
      <strong>Run ended</strong>
      <span>${reason}. Your coins are removed from this run.</span>
    </div>
  `;

  antiCheatBanner.style.borderColor =
    "rgba(255, 23, 68, 0.55)";

  showToast(
    "You left the focus room",
    "error",
    "✕"
  );

  /*
    We show the final result after a short delay so the
    user can see the red/grayscale eliminated card.
  */
  setTimeout(() => {
    finishRoom(false);
  }, 1300);
}

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState === "hidden" &&
      state.timerRunning
    ) {
      state.visibilityTriggered = true;

      handleCheat(
        "You switched away from the room"
      );
    }
  }
);

window.addEventListener(
  "blur",
  () => {
    if (
      state.timerRunning &&
      !state.visibilityTriggered
    ) {
      state.blurTriggered = true;

      handleCheat(
        "The room lost focus"
      );
    }
  }
);


/* =========================================================
   EMOJI CHAT
   ========================================================= */

emojiButtons.forEach((button) => {
  button.addEventListener(
    "click",
    async () => {
      await unlockAudioIfNeeded();

      const message =
        button.dataset.message ||
        button.textContent.trim();

      button.classList.remove("pinged");

      requestAnimationFrame(() => {
        button.classList.add("pinged");
      });

      playPing();

      showToast(
        `You sent: ${message}`,
        "success",
        "💬"
      );

      setTimeout(() => {
        button.classList.remove("pinged");
      }, 500);
    }
  );
});


/* =========================================================
   END ROOM BUTTON
   ========================================================= */

endRoomBtn.addEventListener(
  "click",
  async () => {
    await unlockAudioIfNeeded();

    if (
      !state.timerRunning ||
      state.roomFinished
    ) {
      return;
    }

    /*
      Ending the run voluntarily counts as a failed run
      in this demo.
    */
    handleCheat(
      "You ended your focus run"
    );
  }
);


/* =========================================================
   SURVIVOR POOL MATH
   ========================================================= */

function calculatePoolResults() {
  const failedPlayers =
    state.players.filter(
      (player) => !player.alive
    );

  const survivorPlayers =
    state.players.filter(
      (player) => player.alive
    );

  let failedCoins = 0;

  failedPlayers.forEach((player) => {
    failedCoins += player.originalCoins;
  });

  const platformTax =
    failedCoins * CONFIG.PLATFORM_TAX;

  const survivorPool =
    failedCoins * CONFIG.SURVIVOR_POOL;

  let perSurvivor = 0;

  if (survivorPlayers.length > 0) {
    perSurvivor =
      survivorPool /
      survivorPlayers.length;
  }

  survivorPlayers.forEach((player) => {
    player.wonCoins =
      Math.round(perSurvivor);

    player.finalCoins =
      player.originalCoins +
      player.wonCoins;
  });

  failedPlayers.forEach((player) => {
    player.wonCoins = 0;
    player.finalCoins = 0;
  });

  /*
    User's certificate winnings.
  */
  const user =
    state.players.find(
      (player) => player.isUser
    );

  return {
    failedCoins,
    platformTax,
    survivorPool,
    survivorPlayers,
    failedPlayers,
    perSurvivor,
    userWinnings:
      user && user.alive
        ? user.wonCoins
        : 0
  };
}


/* =========================================================
   SIMULATED FRIEND EVENTS
   ========================================================= */

/*
  This keeps the demo room feeling alive.

  Friends may randomly leave during longer demo sessions.
  For very short sessions the chance is kept low.

  This is NOT real multiplayer. Real multiplayer requires
  a server, authenticated users, and server-side room state.
*/

let simulatedEvents = [];

function startFriendSimulation() {
  stopFriendSimulation();

  /*
    No random eliminations during very short sessions.
    This makes testing a 1-minute room easier.
  */
  if (state.totalSeconds < 120) {
    return;
  }

  state.players.forEach((player) => {
    if (player.isUser) {
      return;
    }

    const delay =
      15000 +
      Math.random() *
      Math.max(
        15000,
        state.totalSeconds * 1000 * 0.55
      );

    const timer =
      setTimeout(() => {
        simulateFriendLeaving(player.id);
      }, delay);

    simulatedEvents.push(timer);
  });
}

function stopFriendSimulation() {
  simulatedEvents.forEach((timer) => {
    clearTimeout(timer);
  });

  simulatedEvents = [];
}

function simulateFriendLeaving(playerId) {
  if (
    !state.timerRunning ||
    state.roomFinished
  ) {
    return;
  }

  const player =
    state.players.find(
      (item) => item.id === playerId
    );

  if (!player || !player.alive) {
    return;
  }

  /*
    Low random chance that a scheduled demo event
    actually becomes a leave.
  */
  if (Math.random() > 0.45) {
    startFriendSimulationForOne(player);
    return;
  }

  player.alive = false;
  player.eliminatedAt = Date.now();

  renderRoomPlayers();

  playShatterBuzz();

  showToast(
    `${player.name} left the room`,
    "error",
    "⚡"
  );
}

function startFriendSimulationForOne(player) {
  if (
    !state.timerRunning ||
    state.roomFinished
  ) {
    return;
  }

  const timer =
    setTimeout(() => {
      simulateFriendLeaving(player.id);
    }, 12000 + Math.random() * 25000);

  simulatedEvents.push(timer);
}


/* =========================================================
   FINISH ROOM
   ========================================================= */

function finishRoom(success = true) {
  if (state.roomFinished) {
    return;
  }

  state.roomFinished = true;
  state.timerRunning = false;

  stopTimer();
  stopHeartbeat();
  stopFriendSimulation();

  state.finishedAt = Date.now();

  /*
    If called after a successful countdown,
    force the display to zero.
  */
  if (success) {
    state.remainingSeconds = 0;
    timerDisplay.textContent = "00:00:00";
    timerProgressBar.style.width = "0%";
  }

  const results =
    calculatePoolResults();

  const user =
    state.players.find(
      (player) => player.isUser
    );

  if (
    success &&
    user &&
    user.alive
  ) {
    playCashChime();
  }

  buildCertificate(
    results,
    success
  );

  showScreen(certificateScreen);

  if (success) {
    showToast(
      "Mission complete!",
      "success",
      "🏆"
    );
  }
}


/* =========================================================
   CERTIFICATE
   ========================================================= */

function buildCertificate(results, success) {
  certificateTask.textContent =
    state.taskName;

  certificateTime.textContent =
    formatShortClock(
      state.totalSeconds
    );

  certificateCoins.textContent =
    formatNumber(
      results.userWinnings
    );

  const date =
    new Date();

  certificateDate.textContent =
    `Completed ${date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    )}`;

  renderLeaderboard(
    results,
    success
  );
}

function renderLeaderboard(
  results,
  success
) {
  leaderboardList.innerHTML = "";

  /*
    Survivors first, then failed players.
    Within survivors, more final coins first.
  */
  const sorted =
    [...state.players].sort(
      (a, b) => {
        if (
          a.alive !== b.alive
        ) {
          return a.alive ? -1 : 1;
        }

        return (
          (b.finalCoins || 0) -
          (a.finalCoins || 0)
        );
      }
    );

  sorted.forEach(
    (player, index) => {
      const row =
        document.createElement("div");

      row.className =
        "leaderboard-row";

      if (!player.alive) {
        row.classList.add("failed");
      }

      const resultText =
        player.alive
          ? "SURVIVED"
          : "FAILED";

      const finalCoins =
        player.alive
          ? player.finalCoins || 0
          : 0;

      row.innerHTML = `
        <div class="leaderboard-rank">
          #${index + 1}
        </div>

        <div class="leaderboard-player">
          <div class="leaderboard-avatar">
            ${getInitials(player.name)}
          </div>

          <div class="leaderboard-name">
            ${player.name}
          </div>
        </div>

        <div class="leaderboard-coins">
          ${formatNumber(finalCoins)}
        </div>

        <div class="leaderboard-result">
          ${resultText}
        </div>
      `;

      leaderboardList.appendChild(row);
    }
  );
}


/* =========================================================
   NEW ROOM
   ========================================================= */

newRoomBtn.addEventListener(
  "click",
  async () => {
    await unlockAudioIfNeeded();

    resetRoom();

    showScreen(setupScreen);

    playPing();
  }
);

function resetRoom() {
  stopTimer();
  stopHeartbeat();
  stopFriendSimulation();

  state.timerRunning = false;
  state.roomFinished = false;
  state.userEliminated = false;

  state.players = [];

  antiCheatBanner.innerHTML = `
    <div class="warning-icon">⚡</div>
    <div>
      <strong>Stay on this screen</strong>
      <span>Leaving the room ends your run.</span>
    </div>
  `;

  antiCheatBanner.style.borderColor =
    "rgba(255, 23, 68, 0.18)";

  taskInput.value = "";
  timeInput.value = 25;
  timeUnit.value = "minutes";
  coinInput.value = 100;
  friendSlider.value = 5;

  updateCoinDisplay();
  renderFriendPreview();
  updateTimePreview();
}


/* =========================================================
   IMPROVE START FLOW
   ========================================================= */

const originalStartRoom =
  startRoom;

startRoomBtn.addEventListener(
  "dblclick",
  (event) => {
    event.preventDefault();
  }
);


/*
  Start friend simulation after the room becomes active.
  We attach this by wrapping the room-start behavior through
  a small observer-style check.
*/
const originalRenderRoomPlayers =
  renderRoomPlayers;

renderRoomPlayers = function () {
  originalRenderRoomPlayers();

  /*
    Simulation is started only when the room is active.
  */
};


/* =========================================================
   PAGE LOAD
   ========================================================= */

function initializeApp() {
  updateCoinDisplay();
  renderFriendPreview();
  updateTimePreview();

  /*
    The first user click unlocks audio.
    The overlay remains until explicitly tapped.
  */
  audioUnlock.classList.remove("hidden");

  /*
    Avoid browser navigation changing the room state.
  */
  window.addEventListener(
    "beforeunload",
    () => {
      if (state.timerRunning) {
        /*
          We do not try to block closing the page.
          Browsers control this behavior.
        */
      }
    }
  );
}

initializeApp();


/* =========================================================
   FRIEND SIMULATION HOOK
   ========================================================= */

/*
  Because startRoom() is the primary room creation function,
  this listener checks shortly after the setup screen changes.
  It keeps the main start flow simple and smartphone-friendly.
*/
const roomScreenObserver =
  new MutationObserver(() => {
    if (
      roomScreen.classList.contains(
        "active-screen"
      ) &&
      state.timerRunning &&
      simulatedEvents.length === 0
    ) {
      startFriendSimulation();
    }
  });

roomScreenObserver.observe(
  roomScreen,
  {
    attributes: true,
    attributeFilter: ["class"]
  }
);


/* =========================================================
   KEYBOARD SUPPORT
   ========================================================= */

taskInput.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Enter"
    ) {
      event.preventDefault();
      startRoom();
    }
  }
);


/* =========================================================
   VISIBILITY SAFETY
   ========================================================= */

window.addEventListener(
  "pageshow",
  () => {
    /*
      No automatic resume after page restore.
      The room state stays stopped if it was eliminated.
    */
    if (state.userEliminated) {
      state.timerRunning = false;
    }
  }
);


/* =========================================================
   FINAL SETUP VALIDATION
   ========================================================= */

function validateSetupValues() {
  let friends =
    Number(friendSlider.value);

  friends = clamp(
    friends,
    CONFIG.MIN_FRIENDS,
    CONFIG.MAX_FRIENDS
  );

  friendSlider.value = friends;

  state.friendCount = friends;

  let coins =
    Number(coinInput.value);

  coins = clamp(
    coins,
    CONFIG.MIN_COINS,
    CONFIG.MAX_COINS
  );

  coinInput.value = coins;

  updateCoinDisplay();
  renderFriendPreview();
  updateTimePreview();
}

validateSetupValues();


/* =========================================================
   SMALL ROOM STATUS EFFECT
   ========================================================= */

setInterval(() => {
  if (
    state.timerRunning &&
    !state.userEliminated
  ) {
    const user =
      state.players.find(
        (player) => player.isUser
      );

    if (user) {
      activeUserCoins.textContent =
        formatNumber(
          user.originalCoins
        );
    }
  }
}, 2000);


/* =========================================================
   END OF TASKFORGE PRO MEGA FOCUS ROOM
   ========================================================= */