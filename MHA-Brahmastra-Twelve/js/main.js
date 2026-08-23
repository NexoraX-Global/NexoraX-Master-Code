"use strict";

/*
 * TASKFORGE-CORE
 * Global Pantheon Status Matrix
 *
 * All persistent data is stored in localStorage.
 * No external libraries or additional files are required.
 */

const STORAGE_KEY = "taskforge_pantheon_v12";

const DEFAULT_STATE = {
    player: {
        name: "SYNTHRA",
        xp: 47650,
        forge: 48500,
        level: 38,
        rank: 42,
        buffClaimed: false,
        sessions: 0
    },

    operators: [
        {
            name: "NOVA PRIME",
            level: 99,
            xp: 98450,
            forge: 250000,
            badge: "GLOBAL TITAN"
        },
        {
            name: "VOID REAPER",
            level: 91,
            xp: 90220,
            forge: 214500,
            badge: "ELITE"
        },
        {
            name: "CYBER MONK",
            level: 87,
            xp: 85100,
            forge: 198200,
            badge: "ELITE"
        },
        {
            name: "FOCUS WRAITH",
            level: 80,
            xp: 79300,
            forge: 182000,
            badge: "ELITE"
        },
        {
            name: "NEURAL FOX",
            level: 76,
            xp: 75100,
            forge: 171500,
            badge: "ELITE"
        },
        {
            name: "QUANTUM ACE",
            level: 72,
            xp: 71100,
            forge: 164000,
            badge: "ELITE"
        },
        {
            name: "IRON MIND",
            level: 69,
            xp: 67800,
            forge: 151200,
            badge: "ELITE"
        },
        {
            name: "ZERO DISTRACT",
            level: 65,
            xp: 63800,
            forge: 144900,
            badge: "ELITE"
        },
        {
            name: "DEEPWORKER",
            level: 61,
            xp: 60100,
            forge: 133000,
            badge: "ELITE"
        },
        {
            name: "NEXUS PRIME",
            level: 57,
            xp: 55800,
            forge: 120500,
            badge: "ELITE"
        }
    ]
};

let state = loadState();

const elements = {
    titanName: document.getElementById("titanName"),
    titanLevel: document.getElementById("titanLevel"),
    titanXP: document.getElementById("titanXP"),
    titanForge: document.getElementById("titanForge"),

    playerRank: document.getElementById("playerRank"),
    currentXP: document.getElementById("currentXP"),
    nextXP: document.getElementById("nextXP"),
    distanceText: document.getElementById("distanceText"),
    rankProgress: document.getElementById("rankProgress"),

    playerLevel: document.getElementById("playerLevel"),
    playerTotalXP: document.getElementById("playerTotalXP"),
    playerForge: document.getElementById("playerForge"),

    buffStatus: document.getElementById("buffStatus"),
    claimBuffBtn: document.getElementById("claimBuffBtn"),

    leaderboard: document.getElementById("leaderboard"),
    onlineCount: document.getElementById("onlineCount"),

    sessionMinutes: document.getElementById("sessionMinutes"),
    logSessionBtn: document.getElementById("logSessionBtn"),
    sessionMessage: document.getElementById("sessionMessage"),

    screenFlash: document.getElementById("screenFlash"),
    particleLayer: document.getElementById("particleLayer"),

    rankModal: document.getElementById("rankModal"),
    oldRank: document.getElementById("oldRank"),
    newRank: document.getElementById("newRank"),
    modalTitle: document.getElementById("modalTitle"),
    modalMessage: document.getElementById("modalMessage"),
    closeModalBtn: document.getElementById("closeModalBtn"),

    clock: document.getElementById("clock")
};


function cloneDefaultState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
}


function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            const freshState = cloneDefaultState();
            saveState(freshState);
            return freshState;
        }

        const parsed = JSON.parse(saved);

        if (
            !parsed ||
            !parsed.player ||
            !Array.isArray(parsed.operators)
        ) {
            const freshState = cloneDefaultState();
            saveState(freshState);
            return freshState;
        }

        return parsed;

    } catch (error) {
        const freshState = cloneDefaultState();

        try {
            saveState(freshState);
        } catch (storageError) {
            console.warn("Storage unavailable.");
        }

        return freshState;
    }
}


function saveState(nextState = state) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(nextState)
        );
    } catch (error) {
        console.warn(
            "TaskForge state could not be persisted.",
            error
        );
    }
}


function formatNumber(value) {
    return Math.max(0, Math.round(value)).toLocaleString("en-US");
}


function formatCompact(value) {
    const number = Number(value);

    if (number >= 1000000) {
        return `${(number / 1000000).toFixed(1)}M`;
    }

    if (number >= 1000) {
        return `${(number / 1000).toFixed(1)}K`;
    }

    return formatNumber(number);
}


function calculateLevel(xp) {
    return Math.max(
        1,
        Math.floor(Math.sqrt(xp / 100)) + 1
    );
}


function getRankThreshold(rank) {
    const safeRank = Math.max(1, Number(rank));

    if (safeRank === 1) {
        return 100000;
    }

    return Math.max(
        1000,
        Math.round(50000 + (safeRank - 40) * 750)
    );
}


function getNextThreshold(xp) {
    const base = Math.max(
        50000,
        Math.ceil(xp / 2500) * 2500
    );

    return base + 2500;
}


function getPlayerOperator() {
    return {
        name: state.player.name,
        level: state.player.level,
        xp: state.player.xp,
        forge: state.player.forge,
        badge: "YOU"
    };
}


function buildLeaderboardData() {

    const player = getPlayerOperator();

    const combined = [
        ...state.operators.filter(
            operator => operator.name !== player.name
        ),
        player
    ];

    combined.sort((a, b) => b.xp - a.xp);

    return combined;
}


function calculatePlayerRank() {

    const leaderboard = buildLeaderboardData();

    const index = leaderboard.findIndex(
        operator => operator.name === state.player.name
    );

    return index >= 0 ? index + 1 : state.player.rank;
}


function renderTitan() {

    const leaderboard = buildLeaderboardData();

    const titan = leaderboard[0];

    if (!titan) {
        return;
    }

    elements.titanName.textContent = titan.name;
    elements.titanLevel.textContent = titan.level;
    elements.titanXP.textContent = formatNumber(titan.xp);
    elements.titanForge.textContent = formatCompact(titan.forge);
}


function renderPlayerDashboard() {

    const actualRank = calculatePlayerRank();

    state.player.rank = actualRank;
    state.player.level = calculateLevel(state.player.xp);

    const nextThreshold = getNextThreshold(
        state.player.xp
    );

    const previousThreshold = nextThreshold - 2500;

    const progress =
        ((state.player.xp - previousThreshold) /
            (nextThreshold - previousThreshold)) *
        100;

    const remaining = Math.max(
        0,
        nextThreshold - state.player.xp
    );

    elements.playerRank.textContent = `#${actualRank}`;

    elements.playerLevel.textContent =
        state.player.level;

    elements.playerTotalXP.textContent =
        formatNumber(state.player.xp);

    elements.playerForge.textContent =
        formatNumber(state.player.forge);

    elements.currentXP.textContent =
        `${formatNumber(state.player.xp)} XP`;

    elements.nextXP.textContent =
        `${formatNumber(nextThreshold)} XP`;

    elements.distanceText.textContent =
        `${formatNumber(remaining)} XP`;

    elements.rankProgress.style.width =
        `${Math.min(100, Math.max(0, progress))}%`;
}


function renderLeaderboard() {

    const leaderboard = buildLeaderboardData();

    elements.leaderboard.innerHTML = "";

    leaderboard.forEach((operator, index) => {

        const rank = index + 1;
        const row = document.createElement("div");

        row.className = "operator-row";

        if (operator.name === state.player.name) {
            row.classList.add("player-row");
        }

        const position = document.createElement("div");
        position.className = "rank-position";

        if (rank === 1) {
            position.textContent = "♛";
        } else if (rank === 2) {
            position.textContent = "②";
        } else if (rank === 3) {
            position.textContent = "③";
        } else {
            position.textContent = `#${rank}`;
        }

        const name = document.createElement("div");
        name.className = "operator-name";

        const nameStrong = document.createElement("strong");
        nameStrong.textContent = operator.name;

        const nameSmall = document.createElement("span");
        nameSmall.textContent =
            operator.badge === "YOU"
                ? "CURRENT OPERATOR"
                : operator.badge;

        name.appendChild(nameStrong);
        name.appendChild(nameSmall);

        const level = document.createElement("div");
        level.className = "operator-level";
        level.textContent = `LVL ${operator.level}`;

        const xp = document.createElement("div");
        xp.className = "operator-xp";
        xp.textContent = `${formatCompact(operator.xp)} XP`;

        row.appendChild(position);
        row.appendChild(name);
        row.appendChild(level);
        row.appendChild(xp);

        elements.leaderboard.appendChild(row);
    });
}


function renderBuff() {

    if (state.player.buffClaimed) {

        elements.buffStatus.textContent = "CLAIMED";
        elements.claimBuffBtn.textContent = "CLAIMED";
        elements.claimBuffBtn.disabled = true;

    } else {

        elements.buffStatus.textContent = "AVAILABLE";
        elements.claimBuffBtn.textContent = "CLAIM";
        elements.claimBuffBtn.disabled = false;
    }
}


function renderOnlineCount() {

    const base = 12847;

    const variation =
        Math.floor(Math.random() * 130) - 65;

    elements.onlineCount.textContent =
        formatNumber(base + variation);
}


function renderAll() {

    renderTitan();
    renderPlayerDashboard();
    renderLeaderboard();
    renderBuff();
    renderOnlineCount();

    saveState();
}


function createParticles(amount = 28) {

    elements.particleLayer.innerHTML = "";

    const rect =
        elements.logSessionBtn.getBoundingClientRect();

    const originX =
        rect.left + rect.width / 2;

    const originY =
        rect.top + rect.height / 2;

    for (let i = 0; i < amount; i++) {

        const particle =
            document.createElement("span");

        particle.className = "particle";

        particle.style.left =
            `${originX}px`;

        particle.style.top =
            `${originY}px`;

        particle.style.setProperty(
            "--x",
            String(Math.random() * 100)
        );

        particle.style.setProperty(
            "--y",
            String(Math.random() * 100)
        );

        const size =
            Math.floor(Math.random() * 5) + 3;

        particle.style.width =
            `${size}px`;

        particle.style.height =
            `${size}px`;

        elements.particleLayer.appendChild(
            particle
        );
    }

    window.setTimeout(() => {
        elements.particleLayer.innerHTML = "";
    }, 1100);
}


function flashScreen() {

    elements.screenFlash.classList.remove("active");

    void elements.screenFlash.offsetWidth;

    elements.screenFlash.classList.add("active");
}


function triggerImpact() {

    document.body.classList.remove("session-impact");

    void document.body.offsetWidth;

    document.body.classList.add("session-impact");

    flashScreen();
    createParticles(30);
}


function showRankModal(oldRank, newRank, xpGain) {

    elements.oldRank.textContent =
        `#${oldRank}`;

    elements.newRank.textContent =
        `#${newRank}`;

    if (newRank < oldRank) {

        elements.modalTitle.textContent =
            "RANK ADVANCED";

        elements.modalMessage.textContent =
            `+${formatNumber(xpGain)} XP logged. Your simulated global position improved.`;

    } else if (newRank === oldRank) {

        elements.modalTitle.textContent =
            "SESSION LOGGED";

        elements.modalMessage.textContent =
            `+${formatNumber(xpGain)} XP added. Continue building consistent focus habits.`;

    } else {

        elements.modalTitle.textContent =
            "SESSION COMPLETE";

        elements.modalMessage.textContent =
            `+${formatNumber(xpGain)} XP added. The leaderboard is dynamically recalculated.`;
    }

    elements.rankModal.classList.add("visible");
}


function closeRankModal() {
    elements.rankModal.classList.remove("visible");
}


function logFocusSession() {

    const rawMinutes =
        Number(elements.sessionMinutes.value);

    if (!Number.isFinite(rawMinutes)) {
        showSessionMessage(
            "ENTER A VALID SESSION LENGTH.",
            true
        );
        return;
    }

    const minutes =
        Math.min(
            480,
            Math.max(5, Math.floor(rawMinutes))
        );

    elements.sessionMinutes.value = minutes;

    const oldRank =
        calculatePlayerRank();

    /*
     * Transparent XP calculation:
     * 10 XP per focus minute + a small session bonus.
     */
    const xpGain =
        (minutes * 10) +
        Math.min(250, minutes * 2);

    const forgeGain =
        Math.round(minutes * 2);

    state.player.xp += xpGain;
    state.player.forge += forgeGain;
    state.player.sessions += 1;

    state.player.level =
        calculateLevel(state.player.xp);

    renderAll();

    const newRank =
        calculatePlayerRank();

    triggerImpact();

    elements.logSessionBtn.disabled = true;

    showSessionMessage(
        `SESSION LOGGED • +${formatNumber(xpGain)} XP • +${formatNumber(forgeGain)} $FORGE`
    );

    elements.logSessionBtn.classList.add(
        "rank-up-animation"
    );

    window.setTimeout(() => {

        elements.logSessionBtn.disabled = false;

        elements.logSessionBtn.classList.remove(
            "rank-up-animation"
        );

        showRankModal(
            oldRank,
            newRank,
            xpGain
        );

    }, 700);
}


function showSessionMessage(message, isError = false) {

    elements.sessionMessage.textContent =
        message;

    if (isError) {
        elements.sessionMessage.style.color =
            "var(--danger)";
    } else {
        elements.sessionMessage.style.color =
            "var(--cyan)";
    }

    window.clearTimeout(
        showSessionMessage.timer
    );

    showSessionMessage.timer =
        window.setTimeout(() => {

            elements.sessionMessage.textContent =
                "READY FOR SESSION";

            elements.sessionMessage.style.color =
                "var(--muted)";

        }, 4500);
}


function claimDailyBuff() {

    if (state.player.buffClaimed) {
        return;
    }

    const oldRank =
        calculatePlayerRank();

    const buffXP = 250;

    state.player.xp += buffXP;
    state.player.forge += 50;
    state.player.buffClaimed = true;

    state.player.level =
        calculateLevel(state.player.xp);

    renderAll();

    const newRank =
        calculatePlayerRank();

    triggerImpact();

    elements.claimBuffBtn.classList.add(
        "rank-up-animation"
    );

    showSessionMessage(
        `STATUS BUFF CLAIMED • +${buffXP} XP • +50 $FORGE`
    );

    window.setTimeout(() => {

        elements.claimBuffBtn.classList.remove(
            "rank-up-animation"
        );

        showRankModal(
            oldRank,
            newRank,
            buffXP
        );

    }, 500);
}


function simulateNetworkActivity() {

    if (!Array.isArray(state.operators)) {
        return;
    }

    /*
     * Small simulated score movement.
     * The user's saved XP is never reduced.
     */
    state.operators.forEach(operator => {

        const movement =
            Math.floor(
                Math.random() * 21
            ) - 10;

        operator.xp =
            Math.max(
                1000,
                operator.xp + movement
            );

        operator.level =
            calculateLevel(operator.xp);
    });

    renderAll();
}


function updateClock() {

    const now = new Date();

    const hours =
        String(now.getHours()).padStart(2, "0");

    const minutes =
        String(now.getMinutes()).padStart(2, "0");

    const seconds =
        String(now.getSeconds()).padStart(2, "0");

    elements.clock.textContent =
        `${hours}:${minutes}:${seconds}`;
}


function preventInvalidInput() {

    elements.sessionMinutes.addEventListener(
        "input",
        () => {

            let value =
                Number(elements.sessionMinutes.value);

            if (!Number.isFinite(value)) {
                return;
            }

            if (value > 480) {
                elements.sessionMinutes.value = 480;
            }

            if (value < 5 && elements.sessionMinutes.value !== "") {
                elements.sessionMinutes.value = 5;
            }
        }
    );
}


function setupEvents() {

    elements.logSessionBtn.addEventListener(
        "click",
        logFocusSession
    );

    elements.claimBuffBtn.addEventListener(
        "click",
        claimDailyBuff
    );

    elements.closeModalBtn.addEventListener(
        "click",
        closeRankModal
    );

    elements.rankModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                elements.rankModal
            ) {
                closeRankModal();
            }
        }
    );

    elements.sessionMinutes.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {
                logFocusSession();
            }
        }
    );

    preventInvalidInput();
}


function initialize() {

    setupEvents();

    renderAll();

    updateClock();

    window.setInterval(
        updateClock,
        1000
    );

    window.setInterval(
        renderOnlineCount,
        5000
    );

    /*
     * Lightweight simulated network activity.
     * It keeps the leaderboard feeling alive without
     * creating artificial punishment or loss mechanics.
     */
    window.setInterval(
        simulateNetworkActivity,
        12000
    );
}


if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

} else {

    initialize();
}