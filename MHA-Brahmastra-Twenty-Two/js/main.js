"use strict";

/*
 * TASKFORGE-CORE
 * APEX-ECHO MATRIX
 *
 * Three visual evolution states:
 * 0–15 seconds  = Dormant
 * 16–30 seconds = Awakened
 * 31+ seconds   = God-Tier
 *
 * Progress is stored locally in the browser.
 * No external libraries or APIs are required.
 */

const STORAGE_KEY = "taskforge_apex_echo_v1";

const state = {
    elapsedSeconds: 0,
    isRunning: false,
    lastTimestamp: null,
    timerId: null,
    toastTimer: null
};

const dom = {
    apexCore: document.getElementById("apexCore"),
    coreStage: document.getElementById("coreStage"),

    timer: document.getElementById("timer"),
    startButton: document.getElementById("startButton"),
    pauseButton: document.getElementById("pauseButton"),
    resetButton: document.getElementById("resetButton"),

    sessionIndicator: document.getElementById("sessionIndicator"),
    sessionStatus: document.getElementById("sessionStatus"),

    stateName: document.getElementById("stateName"),
    stateDescription: document.getElementById("stateDescription"),

    progressFill: document.getElementById("progressFill"),
    sessionLevel: document.getElementById("sessionLevel"),

    totalFocus: document.getElementById("totalFocus"),
    statState: document.getElementById("statState"),
    evolutionPercent: document.getElementById("evolutionPercent"),

    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toastMessage")
};

const evolutionStates = {
    dormant: {
        name: "DORMANT",
        description:
            "The core is waiting for your first moment of focus.",
        className: "dormant",
        color: "#aab0b3"
    },

    awakened: {
        name: "AWAKENED",
        description:
            "Your focus is building. The Apex-Echo is beginning to respond.",
        className: "awakened",
        color: "#00e5ff"
    },

    godTier: {
        name: "GOD-TIER OPERATOR",
        description:
            "A sustained focus state. Your Apex-Echo Core is fully radiant.",
        className: "god-tier",
        color: "#ffd700"
    }
};

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return;
        }

        const parsed = JSON.parse(saved);

        if (
            typeof parsed.elapsedSeconds === "number" &&
            Number.isFinite(parsed.elapsedSeconds) &&
            parsed.elapsedSeconds >= 0
        ) {
            state.elapsedSeconds = Math.floor(parsed.elapsedSeconds);
        }

        if (typeof parsed.isRunning === "boolean") {
            state.isRunning = parsed.isRunning;
        }

        if (
            typeof parsed.lastTimestamp === "number" &&
            Number.isFinite(parsed.lastTimestamp)
        ) {
            state.lastTimestamp = parsed.lastTimestamp;
        }

        /*
         * If the browser was refreshed while the session was running,
         * calculate the time that passed while the page was unloaded.
         */
        if (state.isRunning && state.lastTimestamp !== null) {
            const now = Date.now();

            const elapsedAway = Math.floor(
                (now - state.lastTimestamp) / 1000
            );

            if (elapsedAway > 0 && elapsedAway < 86400) {
                state.elapsedSeconds += elapsedAway;
            }

            state.lastTimestamp = now;
        }
    } catch (error) {
        console.warn("Apex-Echo state could not be loaded.", error);

        state.elapsedSeconds = 0;
        state.isRunning = false;
        state.lastTimestamp = null;
    }
}

function saveState() {
    try {
        const data = {
            elapsedSeconds: state.elapsedSeconds,
            isRunning: state.isRunning,
            lastTimestamp: state.lastTimestamp
        };

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data)
        );
    } catch (error) {
        console.warn("Apex-Echo state could not be saved.", error);
    }
}

function formatTime(totalSeconds) {
    const safeSeconds = Math.max(
        0,
        Math.floor(Number(totalSeconds) || 0)
    );

    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor(
        (safeSeconds % 3600) / 60
    );
    const seconds = safeSeconds % 60;

    if (hours > 0) {
        return (
            String(hours).padStart(2, "0") +
            ":" +
            String(minutes).padStart(2, "0") +
            ":" +
            String(seconds).padStart(2, "0")
        );
    }

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0")
    );
}

function determineEvolution(seconds) {
    if (seconds <= 15) {
        return evolutionStates.dormant;
    }

    if (seconds <= 30) {
        return evolutionStates.awakened;
    }

    return evolutionStates.godTier;
}

function calculateEvolutionPercent(seconds) {
    /*
     * Visual progress reaches 100% at 60 seconds.
     * The timer itself has no maximum.
     */
    return Math.min(
        100,
        Math.round((seconds / 60) * 100)
    );
}

function calculateLevel(seconds) {
    /*
     * Every completed 60 seconds represents another
     * visual evolution level.
     */
    return Math.max(
        1,
        Math.floor(seconds / 60) + 1
    );
}

function updateEvolution() {
    const evolution = determineEvolution(
        state.elapsedSeconds
    );

    dom.apexCore.classList.remove(
        "dormant",
        "awakened",
        "god-tier"
    );

    dom.apexCore.classList.add(
        evolution.className
    );

    dom.stateName.textContent =
        evolution.name;

    dom.stateName.style.color =
        evolution.color;

    if (evolution.className === "awakened") {
        dom.stateName.style.textShadow =
            "0 0 18px rgba(0,229,255,.35)";
    } else if (evolution.className === "god-tier") {
        dom.stateName.style.textShadow =
            "0 0 20px rgba(255,215,0,.45)";
    } else {
        dom.stateName.style.textShadow = "none";
    }

    dom.stateDescription.textContent =
        evolution.description;

    dom.statState.textContent =
        evolution.name;

    dom.evolutionPercent.textContent =
        calculateEvolutionPercent(
            state.elapsedSeconds
        ) + "%";

    dom.sessionLevel.textContent =
        "LEVEL " +
        String(
            calculateLevel(
                state.elapsedSeconds
            )
        ).padStart(2, "0");

    dom.progressFill.style.width =
        calculateEvolutionPercent(
            state.elapsedSeconds
        ) + "%";
}

function updateTimerDisplay() {
    dom.timer.textContent =
        formatTime(state.elapsedSeconds);

    dom.totalFocus.textContent =
        formatTime(state.elapsedSeconds);
}

function updateControls() {
    if (state.isRunning) {
        dom.startButton.disabled = true;
        dom.pauseButton.disabled = false;

        dom.sessionIndicator.classList.add(
            "running"
        );

        dom.sessionStatus.textContent =
            "IN FLOW";

        dom.timer.classList.add("running");
    } else {
        dom.startButton.disabled = false;
        dom.pauseButton.disabled = true;

        dom.sessionIndicator.classList.remove(
            "running"
        );

        dom.sessionStatus.textContent =
            state.elapsedSeconds > 0
                ? "PAUSED"
                : "READY";

        dom.timer.classList.remove("running");
    }
}

function render() {
    updateTimerDisplay();
    updateEvolution();
    updateControls();
}

function timerTick() {
    if (!state.isRunning) {
        return;
    }

    const now = Date.now();

    if (state.lastTimestamp === null) {
        state.lastTimestamp = now;
    }

    const difference = Math.floor(
        (now - state.lastTimestamp) / 1000
    );

    if (difference >= 1) {
        state.elapsedSeconds += difference;
        state.lastTimestamp = now;

        render();

        /*
         * Save periodically while running.
         * This protects progress if the browser closes unexpectedly.
         */
        saveState();
    }
}

function startTimer() {
    if (state.isRunning) {
        return;
    }

    state.isRunning = true;
    state.lastTimestamp = Date.now();

    saveState();
    render();

    showToast("Flow state commenced.");

    if (state.timerId !== null) {
        clearInterval(state.timerId);
    }

    state.timerId = setInterval(
        timerTick,
        250
    );
}

function pauseTimer() {
    if (!state.isRunning) {
        return;
    }

    /*
     * Capture the final fraction of a second before pausing.
     */
    timerTick();

    state.isRunning = false;
    state.lastTimestamp = null;

    saveState();
    render();

    showToast("Progress safely paused.");
}

function resetTimer() {
    const confirmed = window.confirm(
        "Reset this focus session? Your current session time will return to 00:00."
    );

    if (!confirmed) {
        return;
    }

    state.isRunning = false;
    state.elapsedSeconds = 0;
    state.lastTimestamp = null;

    if (state.timerId !== null) {
        clearInterval(state.timerId);
        state.timerId = null;
    }

    saveState();
    render();

    showToast("Session reset.");
}

function showToast(message) {
    dom.toastMessage.textContent = message;

    dom.toast.classList.add("visible");

    if (state.toastTimer !== null) {
        clearTimeout(state.toastTimer);
    }

    state.toastTimer = setTimeout(() => {
        dom.toast.classList.remove("visible");
        state.toastTimer = null;
    }, 2400);
}

function handleVisibilityChange() {
    /*
     * This application deliberately does NOT penalize the user
     * for leaving the page.
     *
     * When returning to the page, the running stopwatch simply
     * catches up using the saved timestamp.
     */
    if (
        document.visibilityState === "visible" &&
        state.isRunning
    ) {
        timerTick();
        render();
    }
}

function handlePageHide() {
    /*
     * Save the timestamp immediately when the page is
     * backgrounded or closed.
     */
    if (state.isRunning) {
        state.lastTimestamp = Date.now();
    }

    saveState();
}

function initialise() {
    loadState();

    dom.startButton.addEventListener(
        "click",
        startTimer
    );

    dom.pauseButton.addEventListener(
        "click",
        pauseTimer
    );

    dom.resetButton.addEventListener(
        "click",
        resetTimer
    );

    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );

    window.addEventListener(
        "pagehide",
        handlePageHide
    );

    window.addEventListener(
        "beforeunload",
        handlePageHide
    );

    render();

    if (state.isRunning) {
        if (state.timerId !== null) {
            clearInterval(state.timerId);
        }

        state.timerId = setInterval(
            timerTick,
            250
        );
    }

    /*
     * Render again on a lightweight animation frame so
     * the initial visual state appears immediately.
     */
    window.requestAnimationFrame(() => {
        render();
    });
}

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initialise,
        { once: true }
    );
} else {
    initialise();
}