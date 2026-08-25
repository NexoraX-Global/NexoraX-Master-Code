"use strict";

/*
 * TASKFORGE-CORE
 * Visual Legacy Engine
 *
 * Persistent state:
 * - streak: consecutive focus days
 * - state: dormant | active | paused
 */

const STORAGE_KEY = "taskforge-core-legacy-v1";

const DEFAULT_STATE = {
    streak: 0,
    state: "dormant"
};

const RUNE_SYMBOLS = [
    "◇",
    "◈",
    "△",
    "✦",
    "◊",
    "⬡",
    "⋄",
    "⌁",
    "✧",
    "◌",
    "⟐",
    "▽"
];

const MAX_VISIBLE_RUNES = RUNE_SYMBOLS.length;

const elements = {
    stage: document.getElementById("monolithStage"),
    runeField: document.getElementById("runeField"),
    streakValue: document.getElementById("streakValue"),
    streakUnit: document.getElementById("streakUnit"),
    statusIndicator: document.getElementById("statusIndicator"),
    statusText: document.getElementById("statusText"),
    stateMessage: document.getElementById("stateMessage"),
    logFocusButton: document.getElementById("logFocusButton"),
    missedDayButton: document.getElementById("missedDayButton"),
    controlNote: document.getElementById("controlNote")
};

let appState = loadState();

initialize();

function initialize() {
    createRuneElements();
    normalizeState();
    renderAll(false);
    bindEvents();
}

function bindEvents() {
    elements.logFocusButton.addEventListener("click", handleLogFocus);
    elements.missedDayButton.addEventListener("click", handleMissedDay);

    document.addEventListener("visibilitychange", handleVisibilityChange);
}

function handleVisibilityChange() {
    if (!document.hidden) {
        appState = loadState();
        normalizeState();
        renderAll(false);
    }
}

function loadState() {
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);

        if (!storedData) {
            return { ...DEFAULT_STATE };
        }

        const parsedData = JSON.parse(storedData);

        return {
            streak: sanitizeStreak(parsedData.streak),
            state: sanitizeState(parsedData.state)
        };
    } catch (error) {
        console.warn("TaskForge-Core: Could not load saved state.", error);
        return { ...DEFAULT_STATE };
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (error) {
        console.warn("TaskForge-Core: Could not save state.", error);
    }
}

function sanitizeStreak(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return 0;
    }

    return Math.max(0, Math.floor(numericValue));
}

function sanitizeState(value) {
    const validStates = ["dormant", "active", "paused"];

    return validStates.includes(value) ? value : DEFAULT_STATE.state;
}

function normalizeState() {
    appState.streak = sanitizeStreak(appState.streak);
    appState.state = sanitizeState(appState.state);

    if (appState.streak === 0 && appState.state === "active") {
        appState.state = "dormant";
    }
}

function createRuneElements() {
    const fragment = document.createDocumentFragment();

    RUNE_SYMBOLS.forEach((symbol, index) => {
        const rune = document.createElement("span");

        rune.className = "rune";
        rune.textContent = symbol;
        rune.setAttribute("aria-hidden", "true");
        rune.dataset.index = String(index);

        fragment.appendChild(rune);
    });

    elements.runeField.appendChild(fragment);
}

function handleLogFocus() {
    appState.streak += 1;
    appState.state = "active";

    saveState();

    renderAll(true);
    updateControlMessage(
        `LEGACY MARKED · ${appState.streak} ${appState.streak === 1 ? "DAY" : "DAYS"} OF FOCUS`
    );
}

function handleMissedDay() {
    if (appState.state !== "paused") {
        appState.state = "paused";

        saveState();

        renderAll(true);
        updateControlMessage(
            "REST STATE ACTIVE · YOUR LEGACY IS SAFELY PAUSED"
        );

        return;
    }

    resetLegacy();
}

function resetLegacy() {
    elements.stage.classList.remove("resetting");

    void elements.stage.offsetWidth;

    elements.stage.classList.add("resetting");

    appState.streak = 0;
    appState.state = "dormant";

    saveState();

    renderAll(false);

    updateControlMessage("FRESH START · YOUR MONUMENT AWAITS");

    window.setTimeout(() => {
        elements.stage.classList.remove("resetting");
    }, 900);
}

function renderAll(animate) {
    renderStreak(animate);
    renderState();
    renderRunes(animate);
    renderStatus();
}

function renderStreak(animate) {
    elements.streakValue.textContent = String(appState.streak);
    elements.streakUnit.textContent = appState.streak === 1 ? "DAY" : "DAYS";

    if (!animate) {
        elements.streakValue.classList.remove("updated");
        return;
    }

    elements.streakValue.classList.remove("updated");

    void elements.streakValue.offsetWidth;

    elements.streakValue.classList.add("updated");

    window.setTimeout(() => {
        elements.streakValue.classList.remove("updated");
    }, 500);
}

function renderState() {
    elements.stage.dataset.state = appState.state;

    if (appState.state === "active") {
        elements.stateMessage.textContent = "LEGACY IN MOTION";
        return;
    }

    if (appState.state === "paused") {
        elements.stateMessage.textContent = "REST · RETURN WHEN READY";
        return;
    }

    elements.stateMessage.textContent = "BEGIN YOUR LEGACY";
}

function renderStatus() {
    elements.statusIndicator.classList.remove("paused");

    if (appState.state === "paused") {
        elements.statusIndicator.classList.add("paused");
        elements.statusText.textContent = "PAUSED";
        return;
    }

    if (appState.state === "active") {
        elements.statusText.textContent = "ACTIVE";
        return;
    }

    elements.statusText.textContent = "READY";
}

function renderRunes(animate) {
    const runes = Array.from(elements.runeField.querySelectorAll(".rune"));

    const visibleCount = Math.min(
        appState.streak,
        MAX_VISIBLE_RUNES
    );

    runes.forEach((rune, index) => {
        const shouldBeVisible = index < visibleCount;

        if (!shouldBeVisible) {
            rune.classList.remove("visible");
            rune.style.animation = "";
            return;
        }

        if (!animate) {
            rune.classList.add("visible");
            rune.style.animation = "";
            return;
        }

        if (index === visibleCount - 1) {
            rune.classList.remove("visible");

            void rune.offsetWidth;

            rune.style.animation = `runeIgnite 700ms ${
                index * 45
            }ms cubic-bezier(0.22, 1, 0.36, 1) both`;

            rune.classList.add("visible");
        } else {
            rune.classList.add("visible");
            rune.style.animation = "";
        }
    });
}

function updateControlMessage(message) {
    elements.controlNote.textContent = message;

    window.clearTimeout(updateControlMessage.timeoutId);

    updateControlMessage.timeoutId = window.setTimeout(() => {
        elements.controlNote.textContent =
            "Your progress is stored locally on this device.";
    }, 3500);
}