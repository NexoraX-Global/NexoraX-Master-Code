"use strict";

/*
 * TASKFORGE CORE
 * CYBER-COLOSSEUM
 *
 * Virtual $FORGE PvP productivity simulation.
 *
 * Persistent data:
 * taskforge_core_vault
 * taskforge_core_stats
 */

const STORAGE = {
  vault: "taskforge_core_vault",
  stats: "taskforge_core_stats"
};

const DEFAULT_VAULT = 50000;

const WAGER_OPTIONS = [
  1000,
  2500,
  5000,
  10000
];

const MATCH_DURATION = 120;

const GAME = {
  active: false,
  searching: false,
  wager: 5000,
  playerPower: 50,
  enemyPower: 50,
  elapsedSeconds: 0,
  cooldown: false,
  roundTimer: null,
  opponentTimer: null,
  matchSearchTimer: null
};

let persistentState = {
  vault: DEFAULT_VAULT,
  wins: 0,
  losses: 0,
  totalDuels: 0,
  totalProductivityActions: 0
};


/* --------------------------------------------------
   DOM HELPER
-------------------------------------------------- */

function $(selector) {
  return document.querySelector(selector);
}


/* --------------------------------------------------
   SAFE NUMBER
-------------------------------------------------- */

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/* --------------------------------------------------
   NUMBER FORMAT
-------------------------------------------------- */

function formatNumber(value) {
  return Math.max(
    0,
    Math.floor(value)
  ).toLocaleString("en-IN");
}


/* --------------------------------------------------
   LOAD STORAGE
-------------------------------------------------- */

function loadPersistentState() {

  const storedVault =
    localStorage.getItem(STORAGE.vault);

  const storedStats =
    localStorage.getItem(STORAGE.stats);


  if (storedVault !== null) {

    persistentState.vault =
      Math.max(
        0,
        safeNumber(
          storedVault,
          DEFAULT_VAULT
        )
      );

  } else {

    persistentState.vault =
      DEFAULT_VAULT;

  }


  if (storedStats) {

    try {

      const parsed =
        JSON.parse(storedStats);

      if (
        parsed &&
        typeof parsed === "object"
      ) {

        persistentState.wins =
          safeNumber(parsed.wins, 0);

        persistentState.losses =
          safeNumber(parsed.losses, 0);

        persistentState.totalDuels =
          safeNumber(parsed.totalDuels, 0);

        persistentState.totalProductivityActions =
          safeNumber(
            parsed.totalProductivityActions,
            0
          );

      }

    } catch {

      persistentState.wins = 0;
      persistentState.losses = 0;
      persistentState.totalDuels = 0;
      persistentState.totalProductivityActions = 0;

    }

  }

}


/* --------------------------------------------------
   SAVE STORAGE
-------------------------------------------------- */

function savePersistentState() {

  localStorage.setItem(
    STORAGE.vault,
    String(
      Math.floor(
        persistentState.vault
      )
    )
  );


  localStorage.setItem(
    STORAGE.stats,
    JSON.stringify({
      wins: persistentState.wins,
      losses: persistentState.losses,
      totalDuels: persistentState.totalDuels,
      totalProductivityActions:
        persistentState.totalProductivityActions
    })
  );

}


/* --------------------------------------------------
   VAULT UI
-------------------------------------------------- */

function updateVaultUI() {

  $("#vaultBalance").textContent =
    formatNumber(
      persistentState.vault
    );


  updateRankUI();

}


/* --------------------------------------------------
   RANK
-------------------------------------------------- */

function updateRankUI() {

  const wins =
    persistentState.wins;

  let rank = "ROOKIE";

  if (wins >= 25) {
    rank = "GRANDMASTER";
  } else if (wins >= 15) {
    rank = "ELITE";
  } else if (wins >= 8) {
    rank = "VETERAN";
  } else if (wins >= 3) {
    rank = "CONTENDER";
  }

  $("#playerRank").textContent =
    rank;

}


/* --------------------------------------------------
   WAGER UI
-------------------------------------------------- */

function updateWagerUI() {

  $("#wagerValue").textContent =
    formatNumber(GAME.wager);

  $("#entryAmount").textContent =
    formatNumber(GAME.wager);

  $("#potentialPot").textContent =
    formatNumber(GAME.wager * 2);

  $("#arenaWager").textContent =
    formatNumber(GAME.wager);

  $("#arenaPot").textContent =
    formatNumber(GAME.wager * 2);


  document
    .querySelectorAll(".wager-presets button")
    .forEach(button => {

      const value =
        safeNumber(
          button.dataset.wager
        );

      button.classList.toggle(
        "selected",
        value === GAME.wager
      );

    });

}


/* --------------------------------------------------
   CHANGE WAGER
-------------------------------------------------- */

function setWager(value) {

  if (GAME.active || GAME.searching) {
    return;
  }

  const selected =
    WAGER_OPTIONS.find(
      option => option === value
    );

  if (!selected) {
    return;
  }

  if (
    selected >
    persistentState.vault
  ) {

    showToast(
      "INSUFFICIENT VAULT",
      "Choose a smaller virtual wager.",
      "enemy"
    );

    return;
  }

  GAME.wager = selected;

  updateWagerUI();

}


/* --------------------------------------------------
   ADJUST WAGER
-------------------------------------------------- */

function adjustWager(direction) {

  if (GAME.active || GAME.searching) {
    return;
  }

  const currentIndex =
    WAGER_OPTIONS.indexOf(
      GAME.wager
    );

  let nextIndex =
    currentIndex + direction;

  nextIndex =
    Math.max(
      0,
      Math.min(
        WAGER_OPTIONS.length - 1,
        nextIndex
      )
    );

  setWager(
    WAGER_OPTIONS[nextIndex]
  );

}


/* --------------------------------------------------
   SEARCH OPPONENT
-------------------------------------------------- */

function searchOpponent() {

  if (GAME.active || GAME.searching) {
    return;
  }


  if (
    persistentState.vault <
    GAME.wager
  ) {

    showToast(
      "INSUFFICIENT FUNDS",
      "Your virtual vault cannot cover this wager.",
      "enemy"
    );

    return;
  }


  GAME.searching = true;

  $("#searchOpponent").disabled = true;

  $("#matchOverlay").classList.add(
    "visible"
  );


  $("#matchStatus").textContent =
    "SEARCHING...";

  $("#matchStatusText").textContent =
    "Scanning the Colosseum network for a challenger.";


  const progress =
    $("#searchProgress");

  progress.style.width = "0%";


  let value = 0;


  GAME.matchSearchTimer =
    setInterval(() => {

      value +=
        8 + Math.random() * 15;

      if (value > 100) {
        value = 100;
      }

      progress.style.width =
        `${value}%`;


      if (value >= 100) {

        clearInterval(
          GAME.matchSearchTimer
        );

        GAME.matchSearchTimer =
          null;

        createOpponent();

      }

    }, 180);

}


/* --------------------------------------------------
   CREATE OPPONENT
-------------------------------------------------- */

function createOpponent() {

  $("#matchStatus").textContent =
    "CHALLENGER FOUND";

  $("#matchStatusText").textContent =
    "UNKNOWN CHALLENGER // SYNCING PRODUCTIVITY METRICS";


  setTimeout(() => {

    $("#matchOverlay").classList.remove(
      "visible"
    );

    GAME.searching = false;

    startDuel();

  }, 1000);

}


/* --------------------------------------------------
   START DUEL
-------------------------------------------------- */

function startDuel() {

  if (GAME.active) {
    return;
  }


  persistentState.vault -=
    GAME.wager;

  persistentState.totalDuels += 1;

  savePersistentState();
  updateVaultUI();


  GAME.active = true;

  GAME.playerPower = 50;
  GAME.enemyPower = 50;

  GAME.elapsedSeconds = 0;

  GAME.cooldown = false;


  $("#lobbySection").classList.add(
    "hidden"
  );

  $("#arenaSection").classList.remove(
    "hidden"
  );


  resetArenaUI();

  addCombatLog(
    "[SYSTEM]",
    "DUEL STARTED // WAGER LOCKED"
  );


  addCombatLog(
    "[SYSTEM]",
    "PRODUCTIVITY ENGINE READY"
  );


  startRoundTimer();

  startOpponentEngine();

}


/* --------------------------------------------------
   RESET ARENA
-------------------------------------------------- */

function resetArenaUI() {

  $("#roundTimer").textContent =
    "02:00";

  $("#playerScore").textContent =
    "0";

  $("#enemyScore").textContent =
    "0";

  $("#playerPercent").textContent =
    "0%";

  $("#enemyPercent").textContent =
    "0%";

  $("#playerHealth").style.width =
    "0%";

  $("#enemyHealth").style.width =
    "0%";

  $("#tugPlayer").style.width =
    "50%";

  $("#tugEnemy").style.width =
    "50%";

  $("#tugMarker").style.left =
    "50%";

  $("#advantageText").textContent =
    "EVEN";

  $("#cooldownFill").style.transform =
    "scaleX(1)";

  $("#deepWorkButton").disabled =
    false;

}


/* --------------------------------------------------
   ROUND TIMER
-------------------------------------------------- */

function startRoundTimer() {

  clearInterval(
    GAME.roundTimer
  );


  GAME.roundTimer =
    setInterval(() => {

      if (!GAME.active) {
        return;
      }

      GAME.elapsedSeconds += 1;

      const remaining =
        MATCH_DURATION -
        GAME.elapsedSeconds;


      updateRoundTimer(
        Math.max(
          0,
          remaining
        )
      );


      if (remaining <= 0) {

        clearInterval(
          GAME.roundTimer
        );

        resolveByScore();

      }

    }, 1000);

}


/* --------------------------------------------------
   ROUND TIMER UI
-------------------------------------------------- */

function updateRoundTimer(seconds) {

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    seconds % 60;


  $("#roundTimer").textContent =
    `${String(minutes).padStart(2,"0")}:` +
    `${String(remainingSeconds).padStart(2,"0")}`;


  if (seconds <= 15) {

    $("#roundTimer").style.color =
      "#ff003c";

  } else {

    $("#roundTimer").style.color =
      "#ff003c";

  }

}


/* --------------------------------------------------
   OPPONENT ENGINE
-------------------------------------------------- */

function startOpponentEngine() {

  clearInterval(
    GAME.opponentTimer
  );


  GAME.opponentTimer =
    setInterval(() => {

      if (!GAME.active) {
        return;
      }


      /*
       * Simulated opponent productivity.
       * The opponent's progress is bounded and
       * randomized so every duel is slightly different.
       */

      const basePower =
        2.0 + Math.random() * 3.5;

      GAME.enemyPower +=
        basePower;


      GAME.enemyPower =
        Math.min(
          100,
          GAME.enemyPower
        );


      updateArenaUI();


      addCombatLog(
        "[CHALLENGER]",
        `PRODUCTIVITY +${basePower.toFixed(1)}`
      );


      if (GAME.enemyPower >= 100) {

        finishDuel(false);

      }

    }, 3500);

}


/* --------------------------------------------------
   PLAYER ATTACK
-------------------------------------------------- */

function executeDeepWork() {

  if (!GAME.active) {
    return;
  }

  if (GAME.cooldown) {
    return;
  }


  GAME.cooldown = true;

  $("#deepWorkButton").disabled =
    true;


  /*
   * Productivity action power.
   * The value is intentionally bounded.
   */

  const power =
    6 + Math.random() * 4;


  GAME.playerPower +=
    power;


  GAME.playerPower =
    Math.min(
      100,
      GAME.playerPower
    );


  persistentState.totalProductivityActions += 1;

  savePersistentState();


  triggerAttackVisual(
    power
  );


  addCombatLog(
    "[PLAYER]",
    `DEEP WORK EXECUTED // +${power.toFixed(1)} POWER`
  );


  updateArenaUI();


  if (GAME.playerPower >= 100) {

    setTimeout(() => {

      finishDuel(true);

    }, 350);

    return;
  }


  runCooldown();

}


/* --------------------------------------------------
   ATTACK VISUAL
-------------------------------------------------- */

function triggerAttackVisual(power) {

  const button =
    $("#deepWorkButton");

  button.classList.remove(
    "impact"
  );

  void button.offsetWidth;

  button.classList.add(
    "impact"
  );


  const flash =
    $("#impactFlash");

  flash.classList.remove(
    "active"
  );

  void flash.offsetWidth;

  flash.classList.add(
    "active"
  );


  const hit =
    $("#hitText");

  hit.textContent =
    `+${power.toFixed(1)} POWER`;

  hit.classList.remove(
    "active"
  );

  void hit.offsetWidth;

  hit.classList.add(
    "active"
  );

}


/* --------------------------------------------------
   COOLDOWN
-------------------------------------------------- */

function runCooldown() {

  const fill =
    $("#cooldownFill");

  fill.style.transition =
    "none";

  fill.style.transform =
    "scaleX(1)";


  requestAnimationFrame(() => {

    requestAnimationFrame(() => {

      fill.style.transition =
        "transform 2.5s linear";

      fill.style.transform =
        "scaleX(0)";

    });

  });


  setTimeout(() => {

    if (!GAME.active) {
      return;
    }

    GAME.cooldown = false;

    $("#deepWorkButton").disabled =
      false;

  }, 2500);

}


/* --------------------------------------------------
   ARENA UI
-------------------------------------------------- */

function updateArenaUI() {

  const player =
    Math.max(
      0,
      Math.min(
        100,
        GAME.playerPower
      )
    );

  const enemy =
    Math.max(
      0,
      Math.min(
        100,
        GAME.enemyPower
      )
    );


  $("#playerScore").textContent =
    Math.floor(player);

  $("#enemyScore").textContent =
    Math.floor(enemy);


  $("#playerPercent").textContent =
    `${Math.floor(player)}%`;

  $("#enemyPercent").textContent =
    `${Math.floor(enemy)}%`;


  $("#playerHealth").style.width =
    `${player}%`;

  $("#enemyHealth").style.width =
    `${enemy}%`;


  /*
   * Tug-of-war position is based on
   * the difference between the two
   * productivity scores.
   */

  const difference =
    player - enemy;


  const marker =
    Math.max(
      5,
      Math.min(
        95,
        50 + difference / 2
      )
    );


  $("#tugMarker").style.left =
    `${marker}%`;


  const playerWidth =
    marker;

  const enemyWidth =
    100 - marker;


  $("#tugPlayer").style.width =
    `${playerWidth}%`;

  $("#tugEnemy").style.width =
    `${enemyWidth}%`;


  let text =
    "EVEN";


  if (difference >= 25) {

    text =
      "PLAYER DOMINATING";

  } else if (difference >= 8) {

    text =
      "PLAYER ADVANTAGE";

  } else if (difference <= -25) {

    text =
      "CHALLENGER DOMINATING";

  } else if (difference <= -8) {

    text =
      "CHALLENGER ADVANTAGE";

  }


  $("#advantageText").textContent =
    text;

}


/* --------------------------------------------------
   COMBAT LOG
-------------------------------------------------- */

function addCombatLog(source, message) {

  const log =
    $("#combatLog");


  const entry =
    document.createElement("div");

  entry.className =
    "log-entry impact-log";


  const sourceClass =
    source.includes("CHALLENGER")
      ? " style=\"color:#ff003c\""
      : "";


  entry.innerHTML =
    `<span${sourceClass}>${source}</span> ${message}`;


  log.prepend(entry);


  while (
    log.children.length > 8
  ) {

    log.removeChild(
      log.lastElementChild
    );

  }

}


/* --------------------------------------------------
   RESOLVE SCORE
-------------------------------------------------- */

function resolveByScore() {

  if (!GAME.active) {
    return;
  }


  if (
    GAME.playerPower >=
    GAME.enemyPower
  ) {

    finishDuel(true);

  } else {

    finishDuel(false);

  }

}


/* --------------------------------------------------
   FINISH DUEL
-------------------------------------------------- */

function finishDuel(playerWon) {

  if (!GAME.active) {
    return;
  }


  GAME.active = false;


  clearInterval(
    GAME.roundTimer
  );

  clearInterval(
    GAME.opponentTimer
  );


  GAME.roundTimer = null;
  GAME.opponentTimer = null;


  $("#deepWorkButton").disabled =
    true;


  if (playerWon) {

    handleVictory();

  } else {

    handleDefeat();

  }

}


/* --------------------------------------------------
   VICTORY
-------------------------------------------------- */

function handleVictory() {

  /*
   * The player's original wager was removed
   * when the duel started.
   *
   * Winning returns the original wager plus
   * the opponent's matching virtual wager.
   */

  const winnings =
    GAME.wager * 2;


  persistentState.vault +=
    winnings;


  persistentState.wins += 1;


  savePersistentState();

  updateVaultUI();


  addCombatLog(
    "[SYSTEM]",
    "VICTORY // WAGER RETURNED + OPPONENT POT"
  );


  showResult(
    true,
    winnings
  );

}


/* --------------------------------------------------
   DEFEAT
-------------------------------------------------- */

function handleDefeat() {

  persistentState.losses += 1;

  savePersistentState();

  updateVaultUI();


  addCombatLog(
    "[SYSTEM]",
    "DEFEAT // DUEL ENDED"
  );


  showResult(
    false,
    0
  );

}


/* --------------------------------------------------
   RESULT MODAL
-------------------------------------------------- */

function showResult(
  playerWon,
  reward
) {

  const modal =
    $("#resultModal");


  modal.classList.toggle(
    "defeat",
    !playerWon
  );


  if (playerWon) {

    $("#resultIcon").textContent =
      "✦";

    $("#resultKicker").textContent =
      "COLOSSEUM VICTORY";

    $("#resultTitle").textContent =
      "VICTORY";

    $("#resultDescription").textContent =
      "Your productivity score defeated the challenger.";

    $("#resultReward").textContent =
      `+${formatNumber(reward)} $FORGE`;

  } else {

    $("#resultIcon").textContent =
      "×";

    $("#resultKicker").textContent =
      "COLOSSEUM RESULT";

    $("#resultTitle").textContent =
      "DEFEAT";

    $("#resultDescription").textContent =
      "The challenger finished with the higher productivity score.";

    $("#resultReward").textContent =
      "+0 $FORGE";

  }


  $("#resultOverlay").classList.add(
    "visible"
  );

}


/* --------------------------------------------------
   RETURN TO LOBBY
-------------------------------------------------- */

function returnToLobby() {

  $("#resultOverlay").classList.remove(
    "visible"
  );


  $("#arenaSection").classList.add(
    "hidden"
  );

  $("#lobbySection").classList.remove(
    "hidden"
  );


  $("#searchOpponent").disabled =
    false;


  GAME.playerPower = 50;
  GAME.enemyPower = 50;
  GAME.elapsedSeconds = 0;
  GAME.cooldown = false;


  updateWagerUI();
  updateVaultUI();

}


/* --------------------------------------------------
   FORFEIT
-------------------------------------------------- */

function forfeitDuel() {

  if (!GAME.active) {
    return;
  }


  const confirmed =
    window.confirm(
      "End this duel? Your locked virtual wager will not be returned."
    );


  if (!confirmed) {
    return;
  }


  GAME.active = false;


  clearInterval(
    GAME.roundTimer
  );

  clearInterval(
    GAME.opponentTimer
  );


  GAME.roundTimer = null;
  GAME.opponentTimer = null;


  persistentState.losses += 1;

  savePersistentState();

  updateVaultUI();


  showResult(
    false,
    0
  );

}


/* --------------------------------------------------
   TOAST
-------------------------------------------------- */

function showToast(
  title,
  message,
  type = "normal"
) {

  const container =
    $("#toastContainer");


  const toast =
    document.createElement("div");


  toast.className =
    `toast ${type}`;


  toast.innerHTML =
    `<strong>${title}</strong>
     <span>${message}</span>`;


  container.appendChild(
    toast
  );


  setTimeout(() => {

    toast.style.opacity =
      "0";

    toast.style.transform =
      "translateX(25px)";

    setTimeout(() => {

      toast.remove();

    }, 250);

  }, 3200);

}


/* --------------------------------------------------
   EVENT SETUP
-------------------------------------------------- */

function setupEvents() {

  /*
   * Wager presets
   */

  document
    .querySelectorAll(
      ".wager-presets button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          setWager(
            safeNumber(
              button.dataset.wager
            )
          );

        }
      );

    });


  /*
   * Wager +/- buttons
   */

  $("#decreaseWager")
    .addEventListener(
      "click",
      () => {
        adjustWager(-1);
      }
    );


  $("#increaseWager")
    .addEventListener(
      "click",
      () => {
        adjustWager(1);
      }
    );


  /*
   * Matchmaking
   */

  $("#searchOpponent")
    .addEventListener(
      "click",
      searchOpponent
    );


  /*
   * Main productivity action
   */

  $("#deepWorkButton")
    .addEventListener(
      "click",
      executeDeepWork
    );


  /*
   * End duel
   */

  $("#forfeitButton")
    .addEventListener(
      "click",
      forfeitDuel
    );


  /*
   * Result modal
   */

  $("#returnLobby")
    .addEventListener(
      "click",
      returnToLobby
    );


  /*
   * Keyboard shortcut for desktop
   */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.code === "Space" &&
        GAME.active
      ) {

        event.preventDefault();

        executeDeepWork();

      }

    }
  );

}


/* --------------------------------------------------
   INITIALIZE
-------------------------------------------------- */

function initialize() {

  loadPersistentState();

  setupEvents();

  updateVaultUI();

  updateWagerUI();

}


/* --------------------------------------------------
   DOM READY
-------------------------------------------------- */

document.addEventListener(
  "DOMContentLoaded",
  initialize
);