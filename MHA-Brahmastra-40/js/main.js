"use strict";

/*
  THE GLADIATOR SYNDICATE
  Client-side productivity multiplayer prototype.

  Network layer:
  - WebSocket behavior is simulated locally.
  - WebRTC peer presence is simulated locally.
  - No real-money wagering exists.
  - Reputation Score is an in-app virtual score.
*/

const state = {
  user: {
    name: "Sarthak",
    clan: "Coders",
    score: 742,
    focusTodaySeconds: 2 * 3600 + 35 * 60,
    duelsWon: 18,
    streak: 12,
    rank: 27
  },

  focus: {
    running: false,
    paused: false,
    totalSeconds: 0,
    remainingSeconds: 0,
    interval: null,
    startedAt: null
  },

  duel: {
    active: false,
    paused: false,
    opponent: null,
    wager: 0,
    totalSeconds: 0,
    remainingSeconds: 0,
    interval: null,
    breakInterval: null,
    breakRemaining: 0
  },

  network: {
    peers: 37,
    rooms: 12,
    latency: 24
  },

  language: "en",
  sound: "pulse",
  audioContext: null,

  messages: [
    {
      name: "[NightOwls] Orion",
      text: "Focus session locked. Let's work. 🔥",
      time: "19:02",
      challenge: true
    },
    {
      name: "[Coders] Nova",
      text: "30 minutes deep work starting now 🚀",
      time: "19:04",
      challenge: false
    },
    {
      name: "[Builders] Atlas",
      text: "Who is entering the Arena tonight?",
      time: "19:06",
      challenge: true
    },
    {
      name: "[Coders] Zen",
      text: "No scrolling. Only execution.",
      time: "19:08",
      challenge: false
    }
  ]
};

const opponents = {
  orion: {
    name: "[NightOwls] Orion",
    score: 691,
    avatar: "O"
  },
  nova: {
    name: "[Builders] Nova",
    score: 824,
    avatar: "N"
  },
  zen: {
    name: "[Coders] Zen",
    score: 588,
    avatar: "Z"
  },
  atlas: {
    name: "[Builders] Atlas",
    score: 913,
    avatar: "A"
  }
};

const liveDuels = [
  {
    left: "[Coders] Kai",
    right: "[NightOwls] Mira",
    leftScore: 811,
    rightScore: 774,
    duration: "23:41",
    wager: 80
  },
  {
    left: "[Builders] Atlas",
    right: "[Coders] Nova",
    leftScore: 913,
    rightScore: 824,
    duration: "12:08",
    wager: 120
  },
  {
    left: "[NightOwls] Orion",
    right: "[Coders] Zen",
    leftScore: 691,
    rightScore: 588,
    duration: "07:56",
    wager: 50
  }
];

const translations = {
  en: {
    heroTitle: "Turn Focus Into Reputation.",
    heroSubtitle: "Work publicly. Prove your focus. Build your reputation.",
    startFocus: "Start Focus",
    duel: "Focus Duel",
    focusToday: "Focus Today",
    verification: "Verification",
    duelsWon: "Duels Won",
    clan: "Clan",
    focusCore: "Proof of Work",
    arena: "The Gladiator Arena",
    clanNetwork: "Clan Network",
    elite: "Elite Rooms",
    eliteDesc: "Requires 500+ Reputation Score.",
    warRoom: "The War Room",
    minutes: "Focus Minutes",
    chatPlaceholder: "Send a message..."
  },

  hi: {
    heroTitle: "Focus को Reputation में बदलो।",
    heroSubtitle: "Publicly काम करो। Focus साबित करो। Reputation बनाओ।",
    startFocus: "Focus शुरू करें",
    duel: "Focus Duel",
    focusToday: "आज का Focus",
    verification: "Verification",
    duelsWon: "जीते हुए Duels",
    clan: "Clan",
    focusCore: "Proof of Work",
    arena: "Gladiator Arena",
    clanNetwork: "Clan Network",
    elite: "Elite Rooms",
    eliteDesc: "500+ Reputation Score जरूरी है।",
    warRoom: "War Room",
    minutes: "Focus Minutes",
    chatPlaceholder: "Message भेजें..."
  },

  fr: {
    heroTitle: "Transformez votre concentration en réputation.",
    heroSubtitle: "Travaillez publiquement. Prouvez votre concentration. Construisez votre réputation.",
    startFocus: "Démarrer",
    duel: "Duel de concentration",
    focusToday: "Focus aujourd'hui",
    verification: "Vérification",
    duelsWon: "Duels gagnés",
    clan: "Clan",
    focusCore: "Preuve de travail",
    arena: "Arène des gladiateurs",
    clanNetwork: "Réseau des clans",
    elite: "Salles Elite",
    eliteDesc: "Score de réputation 500+ requis.",
    warRoom: "Salle de guerre",
    minutes: "Minutes de focus",
    chatPlaceholder: "Envoyer un message..."
  },

  ru: {
    heroTitle: "Преврати фокус в репутацию.",
    heroSubtitle: "Работай публично. Докажи свой фокус. Создавай репутацию.",
    startFocus: "Начать фокус",
    duel: "Фокус-дуэль",
    focusToday: "Фокус сегодня",
    verification: "Проверка",
    duelsWon: "Побед в дуэлях",
    clan: "Клан",
    focusCore: "Доказательство работы",
    arena: "Арена гладиаторов",
    clanNetwork: "Сеть кланов",
    elite: "Элитные комнаты",
    eliteDesc: "Требуется 500+ очков репутации.",
    warRoom: "Военная комната",
    minutes: "Минуты фокуса",
    chatPlaceholder: "Отправить сообщение..."
  },

  es: {
    heroTitle: "Convierte el enfoque en reputación.",
    heroSubtitle: "Trabaja públicamente. Demuestra tu enfoque. Construye tu reputación.",
    startFocus: "Iniciar enfoque",
    duel: "Duelo de enfoque",
    focusToday: "Enfoque de hoy",
    verification: "Verificación",
    duelsWon: "Duelos ganados",
    clan: "Clan",
    focusCore: "Prueba de trabajo",
    arena: "Arena de gladiadores",
    clanNetwork: "Red de clanes",
    elite: "Salas Elite",
    eliteDesc: "Se requieren 500+ puntos de reputación.",
    warRoom: "Sala de guerra",
    minutes: "Minutos de enfoque",
    chatPlaceholder: "Enviar mensaje..."
  },

  de: {
    heroTitle: "Verwandle Fokus in Reputation.",
    heroSubtitle: "Arbeite öffentlich. Beweise deinen Fokus. Baue deine Reputation auf.",
    startFocus: "Fokus starten",
    duel: "Fokus-Duell",
    focusToday: "Fokus heute",
    verification: "Verifizierung",
    duelsWon: "Gewonnene Duelle",
    clan: "Clan",
    focusCore: "Arbeitsnachweis",
    arena: "Gladiatoren-Arena",
    clanNetwork: "Clan-Netzwerk",
    elite: "Elite-Räume",
    eliteDesc: "500+ Reputationspunkte erforderlich.",
    warRoom: "Kriegsraum",
    minutes: "Fokus-Minuten",
    chatPlaceholder: "Nachricht senden..."
  },

  ja: {
    heroTitle: "集中力を評判に変える。",
    heroSubtitle: "公開で働く。集中力を証明する。評判を築く。",
    startFocus: "集中開始",
    duel: "集中デュエル",
    focusToday: "今日の集中",
    verification: "認証",
    duelsWon: "勝利デュエル",
    clan: "クラン",
    focusCore: "作業証明",
    arena: "グラディエーター・アリーナ",
    clanNetwork: "クランネットワーク",
    elite: "エリートルーム",
    eliteDesc: "500以上の評判スコアが必要です。",
    warRoom: "ウォールーム",
    minutes: "集中時間（分）",
    chatPlaceholder: "メッセージを送信..."
  },

  ar: {
    heroTitle: "حوّل تركيزك إلى سمعة.",
    heroSubtitle: "اعمل علناً. أثبت تركيزك. ابنِ سمعتك.",
    startFocus: "ابدأ التركيز",
    duel: "مبارزة التركيز",
    focusToday: "تركيز اليوم",
    verification: "التحقق",
    duelsWon: "المبارزات الفائزة",
    clan: "العشيرة",
    focusCore: "إثبات العمل",
    arena: "ساحة المصارعين",
    clanNetwork: "شبكة العشائر",
    elite: "الغرف النخبة",
    eliteDesc: "يتطلب 500+ من نقاط السمعة.",
    warRoom: "غرفة الحرب",
    minutes: "دقائق التركيز",
    chatPlaceholder: "إرسال رسالة..."
  }
};

const $ = selector => document.querySelector(selector);

const elements = {
  heroScore: $("#heroScore"),
  profileScore: $("#profileScore"),
  focusToday: $("#focusToday"),
  verificationStatus: $("#verificationStatus"),
  verificationBadge: $("#verifiedBadge"),
  timerState: $("#timerState"),
  focusTimer: $("#focusTimer"),
  timerSubtext: $("#timerSubtext"),
  focusProgress: $("#focusProgress"),
  focusMinutes: $("#focusMinutes"),
  focusStartControl: $("#focusStartControl"),
  focusPauseControl: $("#focusPauseControl"),
  focusStopControl: $("#focusStopControl"),
  startFocusButton: $("#startFocusButton"),
  duelModal: $("#duelModal"),
  settingsModal: $("#settingsModal"),
  duelOpponent: $("#duelOpponent"),
  duelMinutes: $("#duelMinutes"),
  duelWager: $("#duelWager"),
  yourStake: $("#yourStake"),
  potentialPool: $("#potentialPool"),
  confirmDuelButton: $("#confirmDuelButton"),
  chatMessages: $("#chatMessages"),
  chatForm: $("#chatForm"),
  chatInput: $("#chatInput"),
  languageSelect: $("#languageSelect"),
  testSoundButton: $("#testSoundButton"),
  activeDuelBar: $("#activeDuelBar"),
  activeDuelTitle: $("#activeDuelTitle"),
  activeDuelTimer: $("#activeDuelTimer"),
  breakModal: $("#breakModal"),
  breakCountdown: $("#breakCountdown"),
  peerCount: $("#peerCount"),
  roomCount: $("#roomCount"),
  latency: $("#latency"),
  onlineCount: $("#onlineCount"),
  eliteProgress: $("#eliteProgress"),
  eliteScore: $("#eliteScore")
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(totalSeconds) {
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

function formatShortTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatFocusToday(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function showToast(message, duration = 3000) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  $("#toastContainer").appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";

    window.setTimeout(() => toast.remove(), 250);
  }, duration);
}

function openModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.classList.add("hidden");
  }
}

function updateScoreUI() {
  elements.heroScore.textContent = state.user.score;
  elements.profileScore.textContent = state.user.score;
  elements.eliteScore.textContent = `${state.user.score} / 500`;

  const percent = clamp((state.user.score / 500) * 100, 0, 100);
  elements.eliteProgress.style.width = `${percent}%`;
}

function updateFocusToday() {
  elements.focusToday.textContent =
    formatFocusToday(state.user.focusTodaySeconds);
}

function updateVerification(active) {
  if (active) {
    elements.verificationStatus.textContent = "VERIFIED";
    elements.verificationBadge.classList.remove("inactive");
    elements.verificationBadge.innerHTML = "<span>✓</span> VERIFIED";
  } else {
    elements.verificationStatus.textContent = "READY";
    elements.verificationBadge.classList.add("inactive");
    elements.verificationBadge.innerHTML = "<span>×</span> NOT VERIFIED";
  }
}

function updateTimerRing(progress) {
  const angle = Math.round(progress * 360);

  document.querySelector(".timer-ring").style.background = `
    radial-gradient(circle, rgba(7,11,24,.96) 65%, transparent 66%),
    conic-gradient(
      var(--cyan) 0deg,
      var(--purple) ${angle * .65}deg,
      var(--pink) ${angle}deg,
      rgba(255,255,255,.06) ${angle}deg
    )
  `;
}

function startFocus() {
  if (state.focus.running) {
    return;
  }

  const minutes = Number.parseInt(elements.focusMinutes.value, 10);

  if (!Number.isFinite(minutes) || minutes < 1) {
    showToast("Enter at least 1 focus minute.");
    elements.focusMinutes.focus();
    return;
  }

  if (minutes > 1440) {
    showToast("Maximum focus duration is 1440 minutes.");
    return;
  }

  state.focus.totalSeconds = minutes * 60;
  state.focus.remainingSeconds = state.focus.totalSeconds;
  state.focus.running = true;
  state.focus.paused = false;
  state.focus.startedAt = Date.now();

  elements.focusMinutes.disabled = true;
  elements.focusStartControl.classList.add("hidden");
  elements.focusPauseControl.classList.remove("hidden");
  elements.focusStopControl.classList.remove("hidden");
  elements.startFocusButton.classList.add("hidden");

  elements.timerState.textContent = "ACTIVE";
  elements.timerSubtext.textContent = "Anti-Fake Engine verified";
  updateVerification(true);

  playSound("pulse");
  showToast("Focus mission started. You are now Verified.");

  runFocusTick();
}

function runFocusTick() {
  clearInterval(state.focus.interval);

  updateFocusDisplay();

  state.focus.interval = setInterval(() => {
    if (!state.focus.running || state.focus.paused) {
      return;
    }

    state.focus.remainingSeconds -= 1;
    state.user.focusTodaySeconds += 1;

    updateFocusDisplay();
    updateFocusToday();

    if (state.focus.remainingSeconds <= 0) {
      completeFocus();
    }
  }, 1000);
}

function updateFocusDisplay() {
  const remaining = state.focus.remainingSeconds;
  const total = state.focus.totalSeconds || 1;

  elements.focusTimer.textContent = formatTime(remaining);

  const progress =
    clamp((total - remaining) / total, 0, 1);

  elements.focusProgress.style.width = `${progress * 100}%`;
  updateTimerRing(progress);
}

function pauseFocus() {
  if (!state.focus.running) {
    return;
  }

  state.focus.paused = !state.focus.paused;

  if (state.focus.paused) {
    elements.focusPauseControl.textContent = "RESUME";
    elements.timerState.textContent = "PAUSED";

    updateVerification(false);
    showToast("Focus paused. Verification is temporarily inactive.");
  } else {
    elements.focusPauseControl.textContent = "PAUSE";
    elements.timerState.textContent = "ACTIVE";

    updateVerification(true);
    showToast("Focus resumed. Verification restored.");
  }
}

function stopFocus(reason = "abort") {
  if (!state.focus.running) {
    return;
  }

  clearInterval(state.focus.interval);

  state.focus.running = false;
  state.focus.paused = false;
  state.focus.interval = null;

  elements.focusMinutes.disabled = false;
  elements.focusStartControl.classList.remove("hidden");
  elements.focusPauseControl.classList.add("hidden");
  elements.focusStopControl.classList.add("hidden");
  elements.startFocusButton.classList.remove("hidden");

  elements.timerState.textContent = reason === "complete" ? "COMPLETE" : "STANDBY";
  elements.timerSubtext.textContent =
    reason === "complete"
      ? "Mission completed successfully."
      : "Set your focus duration";

  updateVerification(false);

  if (reason === "complete") {
    const reward = Math.max(
      5,
      Math.round(state.focus.totalSeconds / 60)
    );

    state.user.score += reward;
    updateScoreUI();

    playSound("bell");
    showToast(`Mission complete. +${reward} Reputation Score.`);
  } else {
    playSound("siren");
    showToast("Focus mission aborted.");
  }
}

function completeFocus() {
  stopFocus("complete");
}

function resetFocusDisplay() {
  elements.focusTimer.textContent = "00:00:00";
  elements.focusProgress.style.width = "0%";
  updateTimerRing(0);
}

function startDuel() {
  if (state.duel.active) {
    showToast("You already have an active duel.");
    return;
  }

  const opponentId = elements.duelOpponent.value;
  const minutes = Number.parseInt(elements.duelMinutes.value, 10);
  const wager = Number.parseInt(elements.duelWager.value, 10);

  const opponent = opponents[opponentId];

  if (!opponent) {
    showToast("Opponent unavailable.");
    return;
  }

  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
    showToast("Choose a duration between 1 and 1440 minutes.");
    return;
  }

  if (!Number.isFinite(wager) || wager < 1) {
    showToast("Virtual wager must be at least 1 REP.");
    return;
  }

  if (wager > state.user.score) {
    showToast("You cannot wager more Reputation than you currently have.");
    return;
  }

  state.duel.active = true;
  state.duel.paused = false;
  state.duel.opponent = opponent;
  state.duel.wager = wager;
  state.duel.totalSeconds = minutes * 60;
  state.duel.remainingSeconds = state.duel.totalSeconds;

  state.user.score -= wager;

  updateScoreUI();

  closeModal("duelModal");

  elements.activeDuelBar.classList.remove("hidden");
  elements.activeDuelTitle.textContent =
    `DUEL: [Coders] Sarthak vs ${opponent.name}`;

  playSound("synth");

  showToast(
    `Duel accepted. ${wager} virtual REP has been staked.`
  );

  runDuelTick();
}

function runDuelTick() {
  clearInterval(state.duel.interval);

  updateDuelDisplay();

  state.duel.interval = setInterval(() => {
    if (!state.duel.active || state.duel.paused) {
      return;
    }

    state.duel.remainingSeconds -= 1;

    updateDuelDisplay();

    if (state.duel.remainingSeconds <= 0) {
      completeDuel();
    }
  }, 1000);
}

function updateDuelDisplay() {
  elements.activeDuelTimer.textContent =
    formatShortTime(state.duel.remainingSeconds);
}

function completeDuel() {
  clearInterval(state.duel.interval);

  const opponent = state.duel.opponent;
  const wager = state.duel.wager;
  const pool = wager * 2;

  /*
    Simulated opponent result.
    In a real backend this must be server-authoritative.
  */
  const won = Math.random() >= 0.35;

  state.duel.active = false;
  state.duel.paused = false;
  state.duel.interval = null;

  elements.activeDuelBar.classList.add("hidden");

  if (won) {
    state.user.score += pool;
    state.user.duelsWon += 1;

    playSound("bell");
    showToast(
      `VICTORY. You won the duel pool of ${pool} virtual REP.`
    );
  } else {
    playSound("siren");
    showToast(
      `Duel lost. The ${wager} virtual REP stake was forfeited.`
    );
  }

  updateScoreUI();
}

function forfeitDuel() {
  if (!state.duel.active) {
    return;
  }

  const confirmed = window.confirm(
    "Forfeit this duel? Your virtual wager will be lost."
  );

  if (!confirmed) {
    return;
  }

  clearInterval(state.duel.interval);

  state.duel.active = false;
  state.duel.paused = false;
  state.duel.interval = null;

  elements.activeDuelBar.classList.add("hidden");

  playSound("siren");
  showToast(
    `Duel forfeited. ${state.duel.wager} virtual REP lost.`
  );
}

function requestTacticalBreak() {
  if (!state.duel.active || state.duel.paused) {
    return;
  }

  state.duel.paused = true;
  state.duel.breakRemaining = 300;

  elements.breakCountdown.textContent = "05:00";
  openModal("breakModal");

  showToast(
    "Tactical pause approved. Duel timer is safely paused."
  );

  clearInterval(state.duel.breakInterval);

  state.duel.breakInterval = setInterval(() => {
    state.duel.breakRemaining -= 1;

    elements.breakCountdown.textContent =
      formatShortTime(state.duel.breakRemaining);

    if (state.duel.breakRemaining <= 0) {
      endTacticalBreak();
    }
  }, 1000);
}

function endTacticalBreak() {
  clearInterval(state.duel.breakInterval);

  state.duel.breakInterval = null;
  state.duel.breakRemaining = 0;
  state.duel.paused = false;

  closeModal("breakModal");

  playSound("pulse");
  showToast("Tactical pause complete. Duel resumed.");
}

function watchDuel(index) {
  const duel = liveDuels[index];

  if (!duel) {
    return;
  }

  showToast(
    `Spectating ${duel.left} vs ${duel.right} • ${duel.wager} virtual REP pool`
  );
}

function renderDuels() {
  const container = $("#duelList");

  container.innerHTML = "";

  liveDuels.forEach((duel, index) => {
    const row = document.createElement("div");
    row.className = "duel-row";

    const leftInitial =
      duel.left.replace(/\[.*?\]\s*/, "").charAt(0);

    const rightInitial =
      duel.right.replace(/\[.*?\]\s*/, "").charAt(0);

    row.innerHTML = `
      <div class="player">
        <div class="player-avatar">${leftInitial}</div>
        <div>
          <strong>${escapeHtml(duel.left)}</strong>
          <span>${duel.leftScore} REP</span>
        </div>
      </div>

      <div class="vs">VS</div>

      <div class="player right">
        <div>
          <strong>${escapeHtml(duel.right)}</strong>
          <span>${duel.rightScore} REP</span>
        </div>
        <div class="player-avatar">${rightInitial}</div>
      </div>

      <button class="watch-button" data-watch="${index}">
        👁 WATCH • ${duel.duration}
      </button>
    `;

    container.appendChild(row);
  });

  container
    .querySelectorAll("[data-watch]")
    .forEach(button => {
      button.addEventListener("click", () => {
        watchDuel(Number(button.dataset.watch));
      });
    });
}

function renderMessages() {
  elements.chatMessages.innerHTML = "";

  state.messages.forEach(message => {
    const wrapper = document.createElement("div");

    const isMine =
      message.name === `[${state.user.clan}] ${state.user.name}`;

    wrapper.className =
      `message${isMine ? " mine" : ""}`;

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const name = document.createElement("span");
    name.className = "message-name";
    name.textContent = message.name;

    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = message.time;

    meta.append(name, time);

    const text = document.createElement("div");
    text.className = "message-text";
    text.textContent = message.text;

    wrapper.append(meta, text);

    if (message.challenge && !isMine) {
      const challengeButton =
        document.createElement("button");

      challengeButton.className = "challenge-button";
      challengeButton.textContent = "⚔ Challenge to Duel";

      challengeButton.addEventListener("click", () => {
        challengeFromChat(message.name);
      });

      wrapper.appendChild(challengeButton);
    }

    elements.chatMessages.appendChild(wrapper);
  });

  elements.chatMessages.scrollTop =
    elements.chatMessages.scrollHeight;
}

function challengeFromChat(name) {
  const match = Object.entries(opponents)
    .find(([, opponent]) => opponent.name === name);

  if (match) {
    elements.duelOpponent.value = match[0];
  }

  openModal("duelModal");
  showToast(`Preparing a duel challenge for ${name}.`);
}

function sendMessage(text) {
  const clean = text.trim();

  if (!clean) {
    return;
  }

  const now = new Date();

  const time =
    now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

  state.messages.push({
    name: `[${state.user.clan}] ${state.user.name}`,
    text: clean,
    time,
    challenge: false
  });

  renderMessages();

  simulateNetworkResponse(clean);
}

function simulateNetworkResponse(text) {
  const lower = text.toLowerCase();

  let response =
    "Acknowledged. Stay focused. ⚡";

  if (lower.includes("duel")) {
    response =
      "Arena is open. Pick your opponent. ⚔️";
  } else if (lower.includes("focus")) {
    response =
      "Focus signal received. Keep executing. 🔥";
  } else if (lower.includes("hello") || lower.includes("hi")) {
    response =
      "Welcome to the War Room, gladiator. 🚀";
  }

  window.setTimeout(() => {
    state.messages.push({
      name: "[NightOwls] Orion",
      text: response,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      }),
      challenge: Math.random() > .7
    });

    renderMessages();
  }, 800 + Math.random() * 1400);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function updateDuelPreview() {
  const wager = Number.parseInt(elements.duelWager.value, 10) || 0;

  elements.yourStake.textContent =
    `${wager} REP`;

  elements.potentialPool.textContent =
    `${wager * 2} REP`;
}

function applyLanguage(language) {
  if (!translations[language]) {
    language = "en";
  }

  state.language = language;

  const dictionary = translations[language];

  document.documentElement.lang = language;

  const mappings = {
    heroTitle: "#heroTitle",
    heroSubtitle: "#heroSubtitle",
    startFocus: "#startFocusText",
    duel: "#duelText",
    focusToday: "#statFocusLabel",
    verification: "#statVerifiedLabel",
    duelsWon: "#statDuelsLabel",
    clan: "#statClanLabel",
    focusCore: "#focusCoreTitle",
    arena: "#arenaTitle",
    clanNetwork: "#clanTitle",
    elite: "#eliteTitle",
    eliteDesc: "#eliteDescription",
    warRoom: "#warRoomTitle",
    minutes: "#minutesLabel"
  };

  Object.entries(mappings).forEach(([key, selector]) => {
    const node = document.querySelector(selector);

    if (node && dictionary[key]) {
      node.textContent = dictionary[key];
    }
  });

  elements.chatInput.placeholder =
    dictionary.chatPlaceholder;

  if (language === "ar") {
    document.body.dir = "rtl";
  } else {
    document.body.dir = "ltr";
  }

  showToast(`Language switched: ${language.toUpperCase()}`);
}

function getAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    state.audioContext = new AudioContextClass();
  }

  if (state.audioContext.state === "suspended") {
    state.audioContext.resume();
  }

  return state.audioContext;
}

function playTone(
  frequency,
  duration,
  type = "sine",
  volume = 0.08,
  delay = 0
) {
  const ctx = getAudioContext();

  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(
    frequency,
    ctx.currentTime + delay
  );

  gain.gain.setValueAtTime(
    0.0001,
    ctx.currentTime + delay
  );

  gain.gain.exponentialRampToValueAtTime(
    volume,
    ctx.currentTime + delay + .02
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + delay + duration
  );

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(ctx.currentTime + delay);
  oscillator.stop(ctx.currentTime + delay + duration + .03);
}

function playSound(sound = state.sound) {
  state.sound = sound;

  switch (sound) {
    case "pulse":
      playTone(440, .12, "sine", .06);
      playTone(660, .16, "sine", .05, .12);
      break;

    case "synth":
      playTone(220, .18, "sawtooth", .04);
      playTone(330, .2, "sawtooth", .04, .12);
      playTone(440, .25, "sawtooth", .03, .25);
      break;

    case "bell":
      playTone(784, .55, "sine", .07);
      playTone(1046, .7, "sine", .04, .12);
      break;

    case "siren":
      playTone(500, .15, "square", .035);
      playTone(850, .15, "square", .035, .18);
      playTone(500, .15, "square", .035, .36);
      playTone(850, .15, "square", .035, .54);
      break;
  }
}

function updateNetworkSimulation() {
  const variation = Math.floor(Math.random() * 5) - 2;

  state.network.latency =
    clamp(state.network.latency + variation, 12, 75);

  if (Math.random() > .75) {
    state.network.peers =
      clamp(
        state.network.peers +
        (Math.random() > .5 ? 1 : -1),
        25,
        65
      );
  }

  elements.peerCount.textContent =
    state.network.peers;

  elements.onlineCount.textContent =
    state.network.peers;

  elements.latency.textContent =
    `${state.network.latency}ms`;
}

function initializeEvents() {
  elements.startFocusButton.addEventListener(
    "click",
    startFocus
  );

  elements.focusStartControl.addEventListener(
    "click",
    startFocus
  );

  elements.focusPauseControl.addEventListener(
    "click",
    pauseFocus
  );

  elements.focusStopControl.addEventListener(
    "click",
    () => stopFocus("abort")
  );

  $("#openDuelButton").addEventListener(
    "click",
    () => openModal("duelModal")
  );

  $("#confirmDuelButton").addEventListener(
    "click",
    startDuel
  );

  $("#settingsButton").addEventListener(
    "click",
    () => openModal("settingsModal")
  );

  $("#requestBreakButton").addEventListener(
    "click",
    requestTacticalBreak
  );

  $("#resumeBreakButton").addEventListener(
    "click",
    endTacticalBreak
  );

  $("#forfeitDuelButton").addEventListener(
    "click",
    forfeitDuel
  );

  $("#eliteEnterButton").addEventListener(
    "click",
    () => {
      if (state.user.score >= 500) {
        showToast("Elite Room unlocked. Welcome, gladiator.");
      } else {
        showToast("Access denied. 500 Reputation Score required.");
      }
    }
  );

  $("#viewClansButton").addEventListener(
    "click",
    () => showToast("Clan directory synchronized.")
  );

  elements.chatForm.addEventListener(
    "submit",
    event => {
      event.preventDefault();

      sendMessage(elements.chatInput.value);

      elements.chatInput.value = "";
      elements.chatInput.focus();
    }
  );

  document.querySelectorAll("[data-emoji]")
    .forEach(button => {
      button.addEventListener("click", () => {
        elements.chatInput.value += button.dataset.emoji;
        elements.chatInput.focus();
      });
    });

  elements.duelWager.addEventListener(
    "input",
    updateDuelPreview
  );

  elements.languageSelect.addEventListener(
    "change",
    event => applyLanguage(event.target.value)
  );

  document.querySelectorAll(
    'input[name="sound"]'
  ).forEach(radio => {
    radio.addEventListener("change", event => {
      state.sound = event.target.value;
    });
  });

  elements.testSoundButton.addEventListener(
    "click",
    () => playSound(state.sound)
  );

  document.querySelectorAll("[data-close]")
    .forEach(button => {
      button.addEventListener("click", () => {
        closeModal(button.dataset.close);
      });
    });

  document.querySelectorAll(".modal")
    .forEach(modal => {
      modal.addEventListener("click", event => {
        if (event.target === modal) {
          modal.classList.add("hidden");
        }
      });
    });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal")
        .forEach(modal => modal.classList.add("hidden"));
    }
  });

  /*
    Anti-Fake behavior:
    Switching away from the page does not claim that the user
    is actively focused. The focus timer pauses and verification
    is removed until the user returns.
  */
  document.addEventListener(
    "visibilitychange",
    () => {
      if (!state.focus.running) {
        return;
      }

      if (document.hidden) {
        state.focus.paused = true;
        elements.focusPauseControl.textContent = "RESUME";
        elements.timerState.textContent = "PAUSED";
        updateVerification(false);

        showToast(
          "Focus paused because the page became inactive."
        );
      }
    }
  );

  window.addEventListener(
    "focus",
    () => {
      if (
        state.focus.running &&
        state.focus.paused
      ) {
        showToast(
          "Page active again. Press RESUME to continue verified focus."
        );
      }
    }
  );
}

function initialize() {
  updateScoreUI();
  updateFocusToday();
  updateVerification(false);
  resetFocusDisplay();

  renderDuels();
  renderMessages();

  updateDuelPreview();

  elements.peerCount.textContent =
    state.network.peers;

  elements.onlineCount.textContent =
    state.network.peers;

  elements.roomCount.textContent =
    state.network.rooms;

  elements.latency.textContent =
    `${state.network.latency}ms`;

  setInterval(
    updateNetworkSimulation,
    2500
  );

  /*
    Simulated peer activity.
    This gives the War Room a multiplayer-like feel
    while keeping everything local and safe.
  */
  setInterval(() => {
    if (Math.random() < .32) {
      const ambientMessages = [
        {
          name: "[NightOwls] Mira",
          text: "Deep work mode activated. 🧠"
        },
        {
          name: "[Builders] Atlas",
          text: "One task. Full execution. 🚀"
        },
        {
          name: "[Coders] Kai",
          text: "Arena looking strong tonight. ⚔️"
        },
        {
          name: "[NightOwls] Orion",
          text: "Keep the streak alive. 🔥"
        }
      ];

      const item =
        ambientMessages[
          Math.floor(
            Math.random() *
            ambientMessages.length
          )
        ];

      state.messages.push({
        ...item,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        }),
        challenge: Math.random() > .8
      });

      if (state.messages.length > 30) {
        state.messages.shift();
      }

      renderMessages();
    }
  }, 7000);

  showToast(
    "Gladiator Syndicate initialized. P2P simulation online."
  );
}

initialize();