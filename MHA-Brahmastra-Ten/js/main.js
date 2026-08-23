"use strict";

/*
    TASKFORGE-CORE
    NEURAL STREAK ENGINE

    Everything is intentionally contained inside this single JavaScript file.
*/

const STORAGE_KEY = "taskforge_neural_streak_v1";

const DEFAULT_STATE = {
    vaultBalance: 50000,
    streak: 0,
    lastCheckIn: null,
    multiplier: 1,
    streakVault: 0,
    shieldAvailable: true,
    shieldUsedDate: null,
    checkIns: [],
    activity: [],
    createdAt: Date.now()
};

const CONFIG = {
    dailyBaseReward: 250,
    shieldCost: 1000,
    maxActivityItems: 20,
    maxCheckIns: 90,
    multiplierStep: 0.1,
    multiplierCap: 5,
    shieldRecoveryHours: 24
};

let state = loadState();

const DOM = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
    cacheDOM();
    repairState();
    renderEverything();
    bindEvents();
    startClock();
    createAmbientParticles();
}


/* =========================================================
   STORAGE
========================================================= */

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return cloneDefaultState();
        }

        const parsed = JSON.parse(saved);

        return {
            ...cloneDefaultState(),
            ...parsed
        };

    } catch (error) {
        console.warn("TaskForge storage reset:", error);
        return cloneDefaultState();
    }
}

function cloneDefaultState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );
    } catch (error) {
        console.warn("Could not save TaskForge state:", error);
    }
}

function repairState() {
    if (!Number.isFinite(state.vaultBalance) || state.vaultBalance < 0) {
        state.vaultBalance = DEFAULT_STATE.vaultBalance;
    }

    if (!Number.isFinite(state.streak) || state.streak < 0) {
        state.streak = 0;
    }

    if (!Number.isFinite(state.multiplier) || state.multiplier < 1) {
        state.multiplier = 1;
    }

    if (!Number.isFinite(state.streakVault) || state.streakVault < 0) {
        state.streakVault = 0;
    }

    if (!Array.isArray(state.checkIns)) {
        state.checkIns = [];
    }

    if (!Array.isArray(state.activity)) {
        state.activity = [];
    }

    saveState();
}


/* =========================================================
   DOM
========================================================= */

function cacheDOM() {
    DOM.vaultBalance = document.getElementById("vaultBalance");
    DOM.streakCount = document.getElementById("streakCount");
    DOM.xpMultiplier = document.getElementById("xpMultiplier");
    DOM.multiplierBar = document.getElementById("multiplierBar");

    DOM.heroMessage = document.getElementById("heroMessage");

    DOM.todayStatus = document.getElementById("todayStatus");
    DOM.vaultReward = document.getElementById("vaultReward");
    DOM.shieldStatus = document.getElementById("shieldStatus");

    DOM.weekGrid = document.getElementById("weekGrid");
    DOM.weekIndicator = document.getElementById("weekIndicator");

    DOM.checkInButton = document.getElementById("checkInButton");
    DOM.checkInText = document.getElementById("checkInText");

    DOM.streakVault = document.getElementById("streakVault");
    DOM.dailyReward = document.getElementById("dailyReward");
    DOM.vaultMultiplier = document.getElementById("vaultMultiplier");
    DOM.nextBonus = document.getElementById("nextBonus");

    DOM.shieldState = document.getElementById("shieldState");
    DOM.shieldDescription = document.getElementById("shieldDescription");
    DOM.shieldTimer = document.getElementById("shieldTimer");
    DOM.shieldButton = document.getElementById("shieldButton");

    DOM.activityLog = document.getElementById("activityLog");

    DOM.successModal = document.getElementById("successModal");
    DOM.successTitle = document.getElementById("successTitle");
    DOM.rewardPopup = document.getElementById("rewardPopup");
    DOM.successMessage = document.getElementById("successMessage");
    DOM.closeModal = document.getElementById("closeModal");

    DOM.toast = document.getElementById("toast");
    DOM.toastIcon = document.getElementById("toastIcon");
    DOM.toastMessage = document.getElementById("toastMessage");

    DOM.screenFlash = document.getElementById("screenFlash");
    DOM.particles = document.getElementById("particles");
}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {
    DOM.checkInButton.addEventListener(
        "click",
        handleCheckIn
    );

    DOM.shieldButton.addEventListener(
        "click",
        activateShield
    );

    DOM.closeModal.addEventListener(
        "click",
        closeSuccessModal
    );

    DOM.successModal.addEventListener(
        "click",
        function(event) {
            if (event.target === DOM.successModal) {
                closeSuccessModal();
            }
        }
    );

    document.addEventListener(
        "visibilitychange",
        function() {
            if (!document.hidden) {
                refreshTimeSensitiveUI();
            }
        }
    );
}


/* =========================================================
   DATE SYSTEM
========================================================= */

function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getStartOfDay(date = new Date()) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );
}

function getDayDifference(dateA, dateB) {
    const a = getStartOfDay(dateA).getTime();
    const b = getStartOfDay(dateB).getTime();

    return Math.round(
        Math.abs(a - b) / 86400000
    );
}

function hasCheckedInToday() {
    if (!state.lastCheckIn) {
        return false;
    }

    return state.lastCheckIn === getDateKey();
}

function getLastCheckInDate() {
    if (!state.lastCheckIn) {
        return null;
    }

    const date = new Date(
        `${state.lastCheckIn}T00:00:00`
    );

    return Number.isNaN(date.getTime())
        ? null
        : date;
}


/* =========================================================
   STREAK LOGIC
========================================================= */

function handleCheckIn() {
    if (hasCheckedInToday()) {
        showToast(
            "✓",
            "Today's focus is already locked in."
        );

        return;
    }

    const lastDate = getLastCheckInDate();

    if (lastDate) {
        const gap = getDayDifference(
            new Date(),
            lastDate
        );

        if (gap > 1) {
            const protectedByShield =
                state.shieldUsedDate === getDateKey();

            if (!protectedByShield) {
                state.streak = 0;

                addActivity(
                    "Momentum reset after a missed day. Fresh start available.",
                    0
                );
            }
        }
    }

    const today = getDateKey();

    state.streak += 1;
    state.lastCheckIn = today;

    const reward = calculateDailyReward();

    state.vaultBalance += reward;
    state.streakVault += reward;

    state.multiplier = calculateMultiplier(
        state.streak
    );

    state.checkIns.push({
        date: today,
        streak: state.streak,
        reward: reward,
        timestamp: Date.now()
    });

    if (state.checkIns.length > CONFIG.maxCheckIns) {
        state.checkIns =
            state.checkIns.slice(
                -CONFIG.maxCheckIns
            );
    }

    state.shieldUsedDate = null;

    addActivity(
        `Focus session locked — Day ${state.streak}`,
        reward
    );

    saveState();

    triggerFocusImpact();
    renderEverything();

    showSuccessModal(reward);
}


/* =========================================================
   REWARD ECONOMY
========================================================= */

function calculateMultiplier(streak) {
    const calculated =
        1 +
        Math.floor(streak / 5) *
        CONFIG.multiplierStep;

    return Math.min(
        CONFIG.multiplierCap,
        Number(calculated.toFixed(1))
    );
}

function calculateDailyReward() {
    return Math.round(
        CONFIG.dailyBaseReward *
        state.multiplier
    );
}

function getNextMultiplier() {
    const current = state.multiplier;

    if (current >= CONFIG.multiplierCap) {
        return current;
    }

    return Math.min(
        CONFIG.multiplierCap,
        Number(
            (current + CONFIG.multiplierStep)
                .toFixed(1)
        )
    );
}

function getDaysUntilMultiplier() {
    if (state.multiplier >= CONFIG.multiplierCap) {
        return 0;
    }

    const nextLevel =
        Math.round(
            (state.multiplier + CONFIG.multiplierStep) * 10
        ) / 10;

    const currentStreak = state.streak;

    for (
        let day = currentStreak + 1;
        day <= currentStreak + 100;
        day++
    ) {
        const possible =
            calculateMultiplier(day);

        if (possible >= nextLevel) {
            return day - currentStreak;
        }
    }

    return 0;
}


/* =========================================================
   SHIELD SYSTEM
========================================================= */

function activateShield() {
    if (state.shieldUsedDate === getDateKey()) {
        showToast(
            "!",
            "Today's shield has already been used."
        );

        return;
    }

    if (!state.shieldAvailable) {
        showToast(
            "!",
            "No recovery shield is available."
        );

        return;
    }

    if (state.vaultBalance < CONFIG.shieldCost) {
        showToast(
            "!",
            "Not enough $FORGE for the shield."
        );

        return;
    }

    const lastDate = getLastCheckInDate();

    if (!lastDate) {
        showToast(
            "i",
            "Complete your first focus session before using recovery."
        );

        return;
    }

    const gap = getDayDifference(
        new Date(),
        lastDate
    );

    if (gap <= 1) {
        showToast(
            "i",
            "Your streak is currently safe."
        );

        return;
    }

    state.vaultBalance -= CONFIG.shieldCost;
    state.shieldUsedDate = getDateKey();

    state.streak = Math.max(
        1,
        state.streak
    );

    state.shieldAvailable = false;

    addActivity(
        "Quantum Shield activated — streak recovery preserved.",
        -CONFIG.shieldCost
    );

    saveState();

    renderEverything();

    showToast(
        "⬡",
        "Quantum Shield activated."
    );

    createParticles(
        window.innerWidth / 2,
        window.innerHeight / 2,
        25
    );
}


/* =========================================================
   RENDER ENGINE
========================================================= */

function renderEverything() {
    renderVault();
    renderStreak();
    renderMultiplier();
    renderStatus();
    renderWeek();
    renderVaultPanel();
    renderShield();
    renderActivity();
}

function renderVault() {
    DOM.vaultBalance.textContent =
        formatNumber(state.vaultBalance);
}

function renderStreak() {
    DOM.streakCount.textContent =
        state.streak;

    if (state.streak === 0) {
        DOM.heroMessage.textContent =
            "Start with one meaningful focus session.";
    } else if (state.streak < 7) {
        DOM.heroMessage.textContent =
            "Momentum is building. Keep the next session simple.";
    } else if (state.streak < 30) {
        DOM.heroMessage.textContent =
            "Strong consistency. Protect your time and energy.";
    } else {
        DOM.heroMessage.textContent =
            "Long-term momentum unlocked. Sustainable progress wins.";
    }
}

function renderMultiplier() {
    DOM.xpMultiplier.textContent =
        `${state.multiplier.toFixed(1)}x`;

    const percentage =
        Math.min(
            100,
            ((state.multiplier - 1) /
                (CONFIG.multiplierCap - 1)) *
                100
        );

    DOM.multiplierBar.style.width =
        `${percentage}%`;
}

function renderStatus() {
    const checkedIn = hasCheckedInToday();

    DOM.todayStatus.textContent =
        checkedIn
            ? "COMPLETE"
            : "READY";

    DOM.todayStatus.style.color =
        checkedIn
            ? "var(--green)"
            : "var(--orange)";

    DOM.vaultReward.textContent =
        formatNumber(calculateDailyReward());

    DOM.shieldStatus.textContent =
        state.shieldAvailable
            ? "AVAILABLE"
            : "USED";

    DOM.shieldStatus.style.color =
        state.shieldAvailable
            ? "var(--green)"
            : "#777";

    DOM.checkInButton.disabled =
        checkedIn;

    DOM.checkInText.textContent =
        checkedIn
            ? "TODAY'S FOCUS IS LOCKED"
            : "LOCK IN TODAY'S FOCUS";
}

function renderWeek() {
    DOM.weekGrid.innerHTML = "";

    const today = new Date();

    const monday = getMonday(today);

    const dayNames = [
        "MON",
        "TUE",
        "WED",
        "THU",
        "FRI",
        "SAT",
        "SUN"
    ];

    const weekNumber =
        getWeekNumber(today);

    DOM.weekIndicator.textContent =
        `WEEK ${String(weekNumber).padStart(2, "0")}`;

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);

        date.setDate(
            monday.getDate() + i
        );

        const key = getDateKey(date);

        const completed =
            state.checkIns.some(
                item => item.date === key
            );

        const isToday =
            key === getDateKey(today);

        const node =
            document.createElement("div");

        node.className = "day-node";

        if (completed) {
            node.classList.add("completed");
        }

        if (isToday) {
            node.classList.add("today");
        }

        const name =
            document.createElement("span");

        name.className = "day-name";
        name.textContent = dayNames[i];

        const circle =
            document.createElement("div");

        circle.className = "day-circle";

        circle.textContent =
            completed
                ? "✓"
                : String(date.getDate());

        node.appendChild(name);
        node.appendChild(circle);

        DOM.weekGrid.appendChild(node);
    }
}

function renderVaultPanel() {
    DOM.streakVault.textContent =
        formatNumber(state.streakVault);

    DOM.dailyReward.textContent =
        formatNumber(calculateDailyReward());

    DOM.vaultMultiplier.textContent =
        `${state.multiplier.toFixed(1)}x`;

    const days =
        getDaysUntilMultiplier();

    DOM.nextBonus.textContent =
        days === 0
            ? "MAX"
            : `${days} DAY${days === 1 ? "" : "S"} `;
}

function renderShield() {
    const lastDate =
        getLastCheckInDate();

    const today =
        getStartOfDay(new Date());

    let missedDay = false;

    if (lastDate) {
        missedDay =
            getDayDifference(
                today,
                lastDate
            ) > 1;
    }

    if (missedDay && state.shieldAvailable) {
        DOM.shieldState.textContent =
            "RECOVERY AVAILABLE";

        DOM.shieldState.style.color =
            "var(--orange)";

        DOM.shieldDescription.textContent =
            "You missed a day. You can use one recovery token to preserve your current momentum.";

        DOM.shieldButton.disabled = false;
    } else if (state.shieldUsedDate === getDateKey()) {
        DOM.shieldState.textContent =
            "RECOVERY USED";

        DOM.shieldState.style.color =
            "#777";

        DOM.shieldDescription.textContent =
            "Today's recovery protection has already been used.";

        DOM.shieldButton.disabled = true;
    } else {
        DOM.shieldState.textContent =
            "AVAILABLE";

        DOM.shieldState.style.color =
            "var(--green)";

        DOM.shieldDescription.textContent =
            "A recovery token can preserve your streak if you miss a day.";

        DOM.shieldButton.disabled =
            !state.shieldAvailable;
    }
}

function renderActivity() {
    DOM.activityLog.innerHTML = "";

    if (state.activity.length === 0) {
        const empty =
            document.createElement("div");

        empty.className =
            "activity-item";

        empty.innerHTML = `
            <span class="activity-time">--:--</span>
            <span class="activity-text">No focus sessions logged yet.</span>
            <span class="activity-reward">READY</span>
        `;

        DOM.activityLog.appendChild(empty);

        return;
    }

    const items =
        [...state.activity]
            .reverse();

    items.forEach(item => {
        const row =
            document.createElement("div");

        row.className =
            "activity-item";

        const time =
            document.createElement("span");

        time.className =
            "activity-time";

        time.textContent =
            formatTime(item.timestamp);

        const text =
            document.createElement("span");

        text.className =
            "activity-text";

        text.textContent =
            item.message;

        const reward =
            document.createElement("span");

        reward.className =
            "activity-reward";

        if (item.reward > 0) {
            reward.textContent =
                `+${formatNumber(item.reward)}`;
        } else if (item.reward < 0) {
            reward.textContent =
                formatNumber(item.reward);
        } else {
            reward.textContent = "LOG";
        }

        row.appendChild(time);
        row.appendChild(text);
        row.appendChild(reward);

        DOM.activityLog.appendChild(row);
    });
}


/* =========================================================
   ACTIVITY
========================================================= */

function addActivity(message, reward) {
    state.activity.push({
        message: message,
        reward: reward,
        timestamp: Date.now()
    });

    if (
        state.activity.length >
        CONFIG.maxActivityItems
    ) {
        state.activity =
            state.activity.slice(
                -CONFIG.maxActivityItems
            );
    }
}


/* =========================================================
   VISUAL ENGINE
========================================================= */

function triggerFocusImpact() {
    DOM.screenFlash.classList.remove("active");

    void DOM.screenFlash.offsetWidth;

    DOM.screenFlash.classList.add("active");

    document.body.classList.remove("impact");

    void document.body.offsetWidth;

    document.body.classList.add("impact");

    createParticles(
        window.innerWidth / 2,
        window.innerHeight * 0.32,
        45
    );

    setTimeout(() => {
        document.body.classList.remove("impact");
    }, 500);
}

function createParticles(x, y, amount) {
    for (let i = 0; i < amount; i++) {
        const particle =
            document.createElement("div");

        particle.className = "particle";

        const angle =
            Math.random() *
            Math.PI *
            2;

        const distance =
            60 +
            Math.random() * 220;

        const tx =
            Math.cos(angle) *
            distance;

        const ty =
            Math.sin(angle) *
            distance;

        particle.style.left =
            `${x}px`;

        particle.style.top =
            `${y}px`;

        particle.style.setProperty(
            "--tx",
            `${tx}px`
        );

        particle.style.setProperty(
            "--ty",
            `${ty}px`
        );

        const size =
            2 +
            Math.random() * 5;

        particle.style.width =
            `${size}px`;

        particle.style.height =
            `${size}px`;

        DOM.particles.appendChild(
            particle
        );

        setTimeout(() => {
            particle.remove();
        }, 900);
    }
}

function createAmbientParticles() {
    const amount =
        window.innerWidth < 500
            ? 12
            : 20;

    for (let i = 0; i < amount; i++) {
        const particle =
            document.createElement("div");

        particle.className =
            "ambient-particle";

        particle.style.position =
            "fixed";

        particle.style.width = "2px";
        particle.style.height = "2px";

        particle.style.borderRadius =
            "50%";

        particle.style.background =
            "rgba(255,85,0,0.35)";

        particle.style.boxShadow =
            "0 0 8px rgba(255,85,0,0.5)";

        particle.style.left =
            `${Math.random() * 100}%`;

        particle.style.top =
            `${Math.random() * 100}%`;

        particle.style.pointerEvents =
            "none";

        particle.style.zIndex =
            "1";

        document.body.appendChild(
            particle
        );

        animateAmbientParticle(
            particle
        );
    }
}

function animateAmbientParticle(element) {
    const duration =
        4000 +
        Math.random() * 7000;

    const startTop =
        Math.random() * 100;

    const endTop =
        startTop -
        15 -
        Math.random() * 25;

    element.animate(
        [
            {
                transform: `translateY(0px)`,
                opacity: 0
            },
            {
                transform: `translateY(-20px)`,
                opacity: 0.8
            },
            {
                transform: `translateY(-60px)`,
                opacity: 0
            }
        ],
        {
            duration: duration,
            iterations: Infinity,
            delay: Math.random() * 3000
        }
    );

    element.style.top =
        `${startTop}%`;
}


/* =========================================================
   SUCCESS MODAL
========================================================= */

function showSuccessModal(reward) {
    DOM.successTitle.textContent =
        `DAY ${state.streak} LOCKED`;

    DOM.rewardPopup.textContent =
        `+${formatNumber(reward)} $FORGE`;

    DOM.successMessage.textContent =
        `Focus session recorded. Your current multiplier is ${state.multiplier.toFixed(1)}x.`;

    DOM.successModal.classList.add(
        "active"
    );
}

function closeSuccessModal() {
    DOM.successModal.classList.remove(
        "active"
    );
}


/* =========================================================
   TOAST
========================================================= */

let toastTimeout = null;

function showToast(icon, message) {
    DOM.toastIcon.textContent = icon;
    DOM.toastMessage.textContent = message;

    DOM.toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout =
        setTimeout(() => {
            DOM.toast.classList.remove(
                "show"
            );
        }, 2800);
}


/* =========================================================
   CLOCK
========================================================= */

function startClock() {
    updateClock();

    setInterval(
        updateClock,
        1000
    );
}

function updateClock() {
    refreshTimeSensitiveUI();
}

function refreshTimeSensitiveUI() {
    const now = new Date();

    const nextDay =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            0,
            0,
            0
        );

    const remaining =
        Math.max(
            0,
            nextDay.getTime() -
            now.getTime()
        );

    DOM.shieldTimer.textContent =
        formatDuration(
            remaining
        );

    renderStatus();
    renderShield();
}


/* =========================================================
   DATE HELPERS
========================================================= */

function getMonday(date) {
    const result =
        new Date(date);

    const day =
        result.getDay();

    const difference =
        day === 0
            ? -6
            : 1 - day;

    result.setDate(
        result.getDate() +
        difference
    );

    result.setHours(
        0,
        0,
        0,
        0
    );

    return result;
}

function getWeekNumber(date) {
    const target =
        new Date(date.valueOf());

    const dayNumber =
        (date.getDay() + 6) % 7;

    target.setDate(
        target.getDate() -
        dayNumber +
        3
    );

    const firstThursday =
        new Date(
            target.getFullYear(),
            0,
            4
        );

    return (
        1 +
        Math.round(
            (
                target -
                firstThursday
            ) /
            604800000
        )
    );
}


/* =========================================================
   FORMATTING
========================================================= */

function formatNumber(number) {
    return Number(
        number
    ).toLocaleString(
        "en-IN"
    );
}

function formatTime(timestamp) {
    return new Date(
        timestamp
    ).toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function formatDuration(milliseconds) {
    const totalSeconds =
        Math.floor(
            milliseconds / 1000
        );

    const hours =
        Math.floor(
            totalSeconds / 3600
        );

    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    const seconds =
        totalSeconds % 60;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0")
    ].join(":");
}