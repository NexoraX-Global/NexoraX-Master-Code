"use strict";

/*
    TASKFORGE-CORE
    MHA BRAHMASTRA 9
    VOID-TITAN GLOBAL RAID

    All persistent data is stored locally.
    No external libraries are required.
*/


/* =========================================================
   CONFIGURATION
========================================================= */

const RAID_CONFIG = {
    maxHP: 10000000,
    startingHP: 9850000,

    initialTimeSeconds: 14 * 60 * 60 + 22 * 60,

    baseDamage: 150,

    rewardPool: 500000,

    feedIntervalMin: 5000,
    feedIntervalMax: 11000,

    storageKeys: {
        bossHP: "taskforge_void_titan_hp",
        personalDamage: "taskforge_void_titan_personal_damage",
        globalStrikes: "taskforge_void_titan_global_strikes",
        raidTime: "taskforge_void_titan_time",
        completed: "taskforge_void_titan_completed"
    }
};


/* =========================================================
   APPLICATION STATE
========================================================= */

const state = {
    bossHP: RAID_CONFIG.startingHP,
    personalDamage: 0,
    globalStrikes: 0,
    remainingSeconds: RAID_CONFIG.initialTimeSeconds,
    completed: false,
    strikeLocked: false,
    timerInterval: null,
    feedInterval: null
};


/* =========================================================
   DOM CACHE
========================================================= */

const dom = {};


/* =========================================================
   FAKE GLOBAL PLAYER DATA
========================================================= */

const GLOBAL_PLAYERS = [
    "EliteCoder",
    "VoidReaper",
    "NeonMonk",
    "QuantumDev",
    "FocusHunter",
    "CyberScholar",
    "IronMind",
    "CodePhantom",
    "DeepWorker",
    "NightOperator",
    "ForgeMaster",
    "ZeroDistraction",
    "TitanSlayer",
    "AlphaFocus",
    "NeuralKnight",
    "DarkOptimizer",
    "HyperFocus",
    "LogicWarrior",
    "ByteSamurai",
    "ProductivityX"
];


/* =========================================================
   FAKE DAMAGE VALUES
========================================================= */

const GLOBAL_DAMAGE_VALUES = [
    50,
    75,
    100,
    125,
    150,
    175,
    200,
    250,
    300,
    350,
    400,
    500
];


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", initialize);


/**
 * Initializes the entire raid system.
 */
function initialize() {

    cacheDOM();

    loadPersistentState();

    sanitizeState();

    updateAllUI();

    startClock();

    startRaidTimer();

    startFakeGlobalFeed();

    bindEvents();

    writeTerminal("SYSTEM ONLINE");
    writeTerminal("VOID-TITAN CORE SYNCHRONIZED");
    writeTerminal("FOCUS STRIKE ENGINE READY");

    if (state.completed) {
        lockRaidAsCompleted();
    }

    if (state.remainingSeconds <= 0 && !state.completed) {
        handleRaidExpiration();
    }
}


/* =========================================================
   DOM
========================================================= */

function cacheDOM() {

    dom.systemClock = document.getElementById("systemClock");

    dom.raidTimer = document.getElementById("raidTimer");

    dom.globalStrikes = document.getElementById("globalStrikes");

    dom.hpText = document.getElementById("hpText");

    dom.bossHpFill = document.getElementById("bossHpFill");

    dom.hpPercentage = document.getElementById("hpPercentage");

    dom.personalDamage = document.getElementById("personalDamage");

    dom.rewardShare = document.getElementById("rewardShare");

    dom.playerRank = document.getElementById("playerRank");

    dom.damagePreview = document.getElementById("damagePreview");

    dom.strikeButton = document.getElementById("strikeButton");

    dom.raidFeed = document.getElementById("raidFeed");

    dom.terminalOutput = document.getElementById("terminalOutput");

    dom.impactOverlay = document.getElementById("impactOverlay");

    dom.impactDamage = document.getElementById("impactDamage");

    dom.victoryOverlay = document.getElementById("victoryOverlay");

    dom.victoryDamage = document.getElementById("victoryDamage");

    dom.victoryReward = document.getElementById("victoryReward");

    dom.closeVictory = document.getElementById("closeVictory");

    dom.defeatOverlay = document.getElementById("defeatOverlay");

    dom.closeDefeat = document.getElementById("closeDefeat");
}


/* =========================================================
   EVENT BINDINGS
========================================================= */

function bindEvents() {

    dom.strikeButton.addEventListener(
        "click",
        executeFocusStrike
    );

    dom.closeVictory.addEventListener(
        "click",
        closeVictoryOverlay
    );

    dom.closeDefeat.addEventListener(
        "click",
        closeDefeatOverlay
    );
}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function loadPersistentState() {

    const savedHP = localStorage.getItem(
        RAID_CONFIG.storageKeys.bossHP
    );

    const savedDamage = localStorage.getItem(
        RAID_CONFIG.storageKeys.personalDamage
    );

    const savedStrikes = localStorage.getItem(
        RAID_CONFIG.storageKeys.globalStrikes
    );

    const savedTime = localStorage.getItem(
        RAID_CONFIG.storageKeys.raidTime
    );

    const savedCompleted = localStorage.getItem(
        RAID_CONFIG.storageKeys.completed
    );


    if (savedHP !== null) {
        state.bossHP = Number(savedHP);
    }

    if (savedDamage !== null) {
        state.personalDamage = Number(savedDamage);
    }

    if (savedStrikes !== null) {
        state.globalStrikes = Number(savedStrikes);
    }

    if (savedTime !== null) {
        state.remainingSeconds = Number(savedTime);
    }

    if (savedCompleted === "true") {
        state.completed = true;
    }
}


/**
 * Saves the complete raid state.
 */
function savePersistentState() {

    localStorage.setItem(
        RAID_CONFIG.storageKeys.bossHP,
        String(state.bossHP)
    );

    localStorage.setItem(
        RAID_CONFIG.storageKeys.personalDamage,
        String(state.personalDamage)
    );

    localStorage.setItem(
        RAID_CONFIG.storageKeys.globalStrikes,
        String(state.globalStrikes)
    );

    localStorage.setItem(
        RAID_CONFIG.storageKeys.raidTime,
        String(state.remainingSeconds)
    );

    localStorage.setItem(
        RAID_CONFIG.storageKeys.completed,
        String(state.completed)
    );
}


/* =========================================================
   STATE VALIDATION
========================================================= */

function sanitizeState() {

    if (!Number.isFinite(state.bossHP)) {
        state.bossHP = RAID_CONFIG.startingHP;
    }

    if (!Number.isFinite(state.personalDamage)) {
        state.personalDamage = 0;
    }

    if (!Number.isFinite(state.globalStrikes)) {
        state.globalStrikes = 0;
    }

    if (!Number.isFinite(state.remainingSeconds)) {
        state.remainingSeconds = RAID_CONFIG.initialTimeSeconds;
    }


    state.bossHP = Math.max(
        0,
        Math.min(
            RAID_CONFIG.maxHP,
            Math.floor(state.bossHP)
        )
    );

    state.personalDamage = Math.max(
        0,
        Math.floor(state.personalDamage)
    );

    state.globalStrikes = Math.max(
        0,
        Math.floor(state.globalStrikes)
    );

    state.remainingSeconds = Math.max(
        0,
        Math.floor(state.remainingSeconds)
    );
}


/* =========================================================
   UI UPDATE
========================================================= */

function updateAllUI() {

    updateBossHealth();

    updatePersonalStats();

    updateGlobalStats();

    updateTimerUI();
}


/**
 * Updates boss HP visual state.
 */
function updateBossHealth() {

    const percentage =
        (state.bossHP / RAID_CONFIG.maxHP) * 100;

    const safePercentage = Math.max(
        0,
        Math.min(100, percentage)
    );

    dom.bossHpFill.style.width =
        safePercentage + "%";

    dom.hpText.textContent =
        formatNumber(state.bossHP) +
        " / " +
        formatNumber(RAID_CONFIG.maxHP) +
        " HP";

    dom.hpPercentage.textContent =
        safePercentage.toFixed(2) +
        "% REMAINING";
}


/**
 * Updates personal damage and reward.
 */
function updatePersonalStats() {

    dom.personalDamage.textContent =
        formatNumber(state.personalDamage);

    const reward =
        calculateRewardShare();

    dom.rewardShare.textContent =
        formatNumber(reward);

    const rank =
        calculateEstimatedRank();

    dom.playerRank.textContent =
        rank;
}


/**
 * Updates global strike counter.
 */
function updateGlobalStats() {

    dom.globalStrikes.textContent =
        formatNumber(state.globalStrikes);
}


/* =========================================================
   ECONOMY
========================================================= */

/**
 * Calculates the player's estimated reward share.
 *
 * The reward is proportional to personal contribution
 * relative to total damage dealt during this local raid.
 */
function calculateRewardShare() {

    const totalDamage =
        RAID_CONFIG.maxHP - state.bossHP;

    if (totalDamage <= 0) {
        return 0;
    }

    const contribution =
        state.personalDamage / totalDamage;

    const reward =
        RAID_CONFIG.rewardPool * contribution;

    return Math.max(
        0,
        Math.floor(reward)
    );
}


/**
 * Provides an estimated contribution rank.
 */
function calculateEstimatedRank() {

    if (state.personalDamage <= 0) {
        return "--";
    }

    if (state.personalDamage >= 10000) {
        return 1;
    }

    if (state.personalDamage >= 5000) {
        return 3;
    }

    if (state.personalDamage >= 2500) {
        return 7;
    }

    if (state.personalDamage >= 1000) {
        return 15;
    }

    return 25;
}


/* =========================================================
   FOCUS STRIKE ENGINE
========================================================= */

/**
 * Executes one player focus strike.
 */
function executeFocusStrike() {

    if (state.strikeLocked) {
        return;
    }

    if (state.completed) {
        return;
    }

    if (state.remainingSeconds <= 0) {
        handleRaidExpiration();
        return;
    }

    if (state.bossHP <= 0) {
        triggerVictory();
        return;
    }


    state.strikeLocked = true;

    dom.strikeButton.classList.add("disabled");

    const damage =
        calculatePlayerDamage();

    applyDamage(damage);

    playImpactAnimation(damage);

    logPlayerStrike(damage);

    writeTerminal(
        "PLAYER STRIKE // " +
        damage +
        " DAMAGE CONFIRMED"
    );

    savePersistentState();

    setTimeout(() => {

        if (!state.completed) {
            state.strikeLocked = false;
            dom.strikeButton.classList.remove("disabled");
        }

    }, 900);
}


/**
 * Calculates player strike damage.
 *
 * Adds small deterministic variation to make
 * repeated sessions feel different.
 */
function calculatePlayerDamage() {

    const variation =
        Math.floor(Math.random() * 101);

    return RAID_CONFIG.baseDamage + variation;
}


/**
 * Applies damage to Titan.
 */
function applyDamage(damage) {

    const actualDamage =
        Math.min(
            damage,
            state.bossHP
        );

    state.bossHP -= actualDamage;

    state.personalDamage += actualDamage;

    state.globalStrikes += 1;

    updateAllUI();

    if (state.bossHP <= 0) {
        state.bossHP = 0;

        savePersistentState();

        setTimeout(() => {
            triggerVictory();
        }, 650);
    }
}


/* =========================================================
   IMPACT EFFECT
========================================================= */

function playImpactAnimation(damage) {

    dom.impactDamage.textContent =
        "+" + formatNumber(damage);

    dom.impactOverlay.classList.remove("active");

    void dom.impactOverlay.offsetWidth;

    dom.impactOverlay.classList.add("active");

    document.body.classList.remove("screen-impact");
    document.body.classList.remove("hit-flash");

    void document.body.offsetWidth;

    document.body.classList.add("screen-impact");
    document.body.classList.add("hit-flash");

    dom.personalDamage.classList.remove("number-pop");

    void dom.personalDamage.offsetWidth;

    dom.personalDamage.classList.add("number-pop");

    setTimeout(() => {

        dom.impactOverlay.classList.remove("active");

    }, 700);
}


/* =========================================================
   PLAYER FEED
========================================================= */

function logPlayerStrike(damage) {

    const now =
        new Date();

    const time =
        formatClockTime(now);

    const entry =
        createFeedEntry(
            time,
            "YOU",
            damage,
            true
        );

    dom.raidFeed.prepend(entry);

    limitFeedEntries();
}


/**
 * Creates a feed entry element.
 */
function createFeedEntry(
    time,
    player,
    damage,
    isPlayer
) {

    const entry =
        document.createElement("div");

    entry.className =
        "feed-entry";

    if (isPlayer) {
        entry.classList.add("system-entry");
    }

    const timeElement =
        document.createElement("span");

    timeElement.className =
        "feed-time";

    timeElement.textContent =
        time;


    const messageElement =
        document.createElement("span");

    messageElement.className =
        "feed-message";

    messageElement.innerHTML =
        escapeHTML(player) +
        " dealt <strong>" +
        formatNumber(damage) +
        " DMG</strong>";


    entry.appendChild(timeElement);

    entry.appendChild(messageElement);

    return entry;
}


/* =========================================================
   FAKE MULTIPLAYER FEED
========================================================= */

function startFakeGlobalFeed() {

    scheduleNextGlobalFeed();
}


/**
 * Schedules fake global player activity.
 */
function scheduleNextGlobalFeed() {

    const delay =
        randomInteger(
            RAID_CONFIG.feedIntervalMin,
            RAID_CONFIG.feedIntervalMax
        );

    state.feedInterval =
        setTimeout(() => {

            if (!state.completed &&
                state.remainingSeconds > 0) {

                simulateGlobalAttack();

            }

            scheduleNextGlobalFeed();

        }, delay);
}


/**
 * Simulates another global player's attack.
 *
 * This is local UI simulation only.
 */
function simulateGlobalAttack() {

    if (state.bossHP <= 0) {
        return;
    }

    const player =
        GLOBAL_PLAYERS[
            randomInteger(
                0,
                GLOBAL_PLAYERS.length - 1
            )
        ];

    const damage =
        GLOBAL_DAMAGE_VALUES[
            randomInteger(
                0,
                GLOBAL_DAMAGE_VALUES.length - 1
            )
        ];

    const actualDamage =
        Math.min(
            damage,
            state.bossHP
        );

    state.bossHP -= actualDamage;

    state.globalStrikes += 1;

    updateAllUI();

    const time =
        formatClockTime(
            new Date()
        );

    const entry =
        createFeedEntry(
            time,
            player,
            actualDamage,
            false
        );

    dom.raidFeed.prepend(entry);

    limitFeedEntries();

    writeTerminal(
        player.toUpperCase() +
        " // GLOBAL STRIKE // " +
        actualDamage +
        " DMG"
    );

    savePersistentState();

    if (state.bossHP <= 0) {
        state.bossHP = 0;

        savePersistentState();

        setTimeout(() => {
            triggerVictory();
        }, 500);
    }
}


/**
 * Keeps the feed from becoming excessively large.
 */
function limitFeedEntries() {

    const maxEntries = 35;

    while (
        dom.raidFeed.children.length >
        maxEntries
    ) {
        dom.raidFeed.removeChild(
            dom.raidFeed.lastElementChild
        );
    }
}


/* =========================================================
   RAID TIMER
========================================================= */

function startRaidTimer() {

    if (state.timerInterval) {
        clearInterval(
            state.timerInterval
        );
    }

    if (
        state.remainingSeconds <= 0 ||
        state.completed
    ) {
        updateTimerUI();
        return;
    }

    state.timerInterval =
        setInterval(() => {

            if (state.remainingSeconds <= 0) {

                clearInterval(
                    state.timerInterval
                );

                state.timerInterval = null;

                handleRaidExpiration();

                return;
            }

            state.remainingSeconds -= 1;

            updateTimerUI();

            if (
                state.remainingSeconds % 10 === 0
            ) {
                savePersistentState();
            }

        }, 1000);
}


/**
 * Updates countdown display.
 */
function updateTimerUI() {

    dom.raidTimer.textContent =
        formatDuration(
            state.remainingSeconds
        );
}


/**
 * Handles raid expiration.
 */
function handleRaidExpiration() {

    if (state.completed) {
        return;
    }

    state.remainingSeconds = 0;

    savePersistentState();

    updateTimerUI();

    dom.strikeButton.classList.add("disabled");

    writeTerminal(
        "RAID TIMER EXPIRED"
    );

    dom.defeatOverlay.classList.add("active");
}


/* =========================================================
   VICTORY
========================================================= */

function triggerVictory() {

    if (state.completed) {
        return;
    }

    state.completed = true;

    state.bossHP = 0;

    if (state.timerInterval) {
        clearInterval(
            state.timerInterval
        );

        state.timerInterval = null;
    }

    dom.strikeButton.classList.add("disabled");

    updateAllUI();

    const reward =
        calculateRewardShare();

    dom.victoryDamage.textContent =
        formatNumber(
            state.personalDamage
        );

    dom.victoryReward.textContent =
        formatNumber(reward) +
        " $FORGE";

    dom.victoryOverlay.classList.add("active");

    writeTerminal(
        "!!! VOID TITAN DESTROYED !!!"
    );

    writeTerminal(
        "GLOBAL RAID VICTORY PROTOCOL"
    );

    writeTerminal(
        "PERSONAL CONTRIBUTION: " +
        state.personalDamage
    );

    savePersistentState();
}


function lockRaidAsCompleted() {

    dom.strikeButton.classList.add("disabled");

    dom.damagePreview.textContent =
        "COMPLETE";

    updateAllUI();
}


function closeVictoryOverlay() {

    dom.victoryOverlay.classList.remove(
        "active"
    );
}


function closeDefeatOverlay() {

    dom.defeatOverlay.classList.remove(
        "active"
    );
}


/* =========================================================
   SYSTEM CLOCK
========================================================= */

function startClock() {

    updateSystemClock();

    setInterval(
        updateSystemClock,
        1000
    );
}


function updateSystemClock() {

    const now =
        new Date();

    dom.systemClock.textContent =
        formatClockTime(
            now,
            true
        );
}


/* =========================================================
   TERMINAL
========================================================= */

function writeTerminal(message) {

    if (!dom.terminalOutput) {
        return;
    }

    const line =
        document.createElement("div");

    line.textContent =
        "> " +
        message;

    dom.terminalOutput.appendChild(
        line
    );

    while (
        dom.terminalOutput.children.length >
        12
    ) {
        dom.terminalOutput.removeChild(
            dom.terminalOutput.firstElementChild
        );
    }

    dom.terminalOutput.scrollTop =
        dom.terminalOutput.scrollHeight;
}


/* =========================================================
   FORMATTING
========================================================= */

function formatNumber(value) {

    return Number(value).toLocaleString(
        "en-US"
    );
}


function formatDuration(totalSeconds) {

    const seconds =
        Math.max(
            0,
            Math.floor(totalSeconds)
        );

    const hours =
        Math.floor(
            seconds / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const remainingSeconds =
        seconds % 60;

    return [
        pad(hours),
        pad(minutes),
        pad(remainingSeconds)
    ].join(":");
}


function formatClockTime(
    date,
    includeSeconds = false
) {

    const hours =
        pad(
            date.getHours()
        );

    const minutes =
        pad(
            date.getMinutes()
        );

    if (!includeSeconds) {
        return hours + ":" + minutes;
    }

    const seconds =
        pad(
            date.getSeconds()
        );

    return (
        hours +
        ":" +
        minutes +
        ":" +
        seconds
    );
}


function pad(value) {

    return String(value)
        .padStart(2, "0");
}


/* =========================================================
   RANDOM HELPERS
========================================================= */

function randomInteger(min, max) {

    return Math.floor(
        Math.random() *
        (max - min + 1)
    ) + min;
}


/* =========================================================
   SECURITY HELPER
========================================================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   PAGE VISIBILITY
========================================================= */

/*
    Keeps the countdown approximately synchronized when
    the browser temporarily suspends the page.
*/

let lastVisibilityTime =
    Date.now();

document.addEventListener(
    "visibilitychange",
    () => {

        const now =
            Date.now();

        if (document.visibilityState === "visible") {

            const elapsed =
                Math.floor(
                    (now - lastVisibilityTime) /
                    1000
                );

            if (
                elapsed > 1 &&
                !state.completed &&
                state.remainingSeconds > 0
            ) {

                state.remainingSeconds =
                    Math.max(
                        0,
                        state.remainingSeconds - elapsed
                    );

                updateTimerUI();

                savePersistentState();

                if (
                    state.remainingSeconds <= 0
                ) {
                    handleRaidExpiration();
                }
            }
        }

        lastVisibilityTime =
            now;
    }
);


/* =========================================================
   BEFORE UNLOAD
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        savePersistentState();

        if (state.feedInterval) {
            clearTimeout(
                state.feedInterval
            );
        }

        if (state.timerInterval) {
            clearInterval(
                state.timerInterval
            );
        }
    }
);