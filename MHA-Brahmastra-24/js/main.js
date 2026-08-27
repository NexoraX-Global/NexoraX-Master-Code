"use strict";

/*
 * TASKFORGE-CORE
 * Momentum Engine
 *
 * Three phases:
 * 01 — Define the Big Goal + 5-Minute Micro-Action
 * 02 — Five-minute Momentum Session
 * 03 — Activation Friction Broken
 *
 * No page reloads are used.
 * The timer uses an absolute end timestamp to remain accurate
 * even if the browser temporarily delays an interval callback.
 */

const SESSION_DURATION = 5 * 60 * 1000;
const STORAGE_KEY = "taskforge-core-momentum-session-v1";

const state = {
    bigGoal: "",
    microAction: "",
    phase: "input",
    endTime: null,
    remainingMs: SESSION_DURATION,
    timerId: null,
    lastRenderedSecond: null
};

const elements = {
    inputPhase: document.getElementById("inputPhase"),
    focusPhase: document.getElementById("focusPhase"),
    successPhase: document.getElementById("successPhase"),

    momentumForm: document.getElementById("momentumForm"),
    bigGoal: document.getElementById("bigGoal"),
    microAction: document.getElementById("microAction"),

    goalCounter: document.getElementById("goalCounter"),
    actionCounter: document.getElementById("actionCounter"),
    formMessage: document.getElementById("formMessage"),

    focusGoal: document.getElementById("focusGoal"),
    activeAction: document.getElementById("activeAction"),

    timerValue: document.getElementById("timerValue"),
    ringProgress: document.getElementById("ringProgress"),
    ringProgressGlow: document.querySelector(".ring-progress-glow"),

    exitFocusButton: document.getElementById("exitFocusButton"),

    completedAction: document.getElementById("completedAction"),
    returnBaseButton: document.getElementById("returnBaseButton"),

    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toastMessage")
};

let toastTimeoutId = null;

initialize();

function initialize() {
    restoreSession();
    bindEvents();
    bindCharacterCounters();
    renderCharacterCounters();

    if (state.phase === "focus" && state.endTime) {
        const remaining = state.endTime - Date.now();

        if (remaining > 0) {
            showFocusPhase(false);
            startTimerLoop();
            updateTimer();
            return;
        }

        completeSession();
        return;
    }

    if (state.phase === "success") {
        showSuccessPhase(false);
        return;
    }

    showInputPhase(false);
}

function bindEvents() {
    elements.momentumForm.addEventListener("submit", handleFormSubmit);

    elements.bigGoal.addEventListener("input", () => {
        state.bigGoal = elements.bigGoal.value;
        renderCharacterCounters();
        saveSession();
        clearFormMessage();
    });

    elements.microAction.addEventListener("input", () => {
        state.microAction = elements.microAction.value;
        renderCharacterCounters();
        saveSession();
        clearFormMessage();
    });

    elements.exitFocusButton.addEventListener("click", handlePauseSession);
    elements.returnBaseButton.addEventListener("click", returnToBase);

    window.addEventListener("beforeunload", saveSession);

    document.addEventListener("visibilitychange", handleVisibilityChange);
}

function bindCharacterCounters() {
    updateCounter(
        elements.bigGoal,
        elements.goalCounter
    );

    updateCounter(
        elements.microAction,
        elements.actionCounter
    );
}

function renderCharacterCounters() {
    updateCounter(
        elements.bigGoal,
        elements.goalCounter
    );

    updateCounter(
        elements.microAction,
        elements.actionCounter
    );
}

function updateCounter(input, counter) {
    const currentLength = input.value.length;
    const maximumLength = input.maxLength;

    counter.textContent = `${currentLength} / ${maximumLength}`;
}

function handleFormSubmit(event) {
    event.preventDefault();

    const bigGoal = elements.bigGoal.value.trim();
    const microAction = elements.microAction.value.trim();

    if (!bigGoal) {
        showFormError(
            "Start by naming the big goal. It can be as simple as one sentence.",
            elements.bigGoal
        );
        return;
    }

    if (!microAction) {
        showFormError(
            "Now define one tiny action you can realistically begin within five minutes.",
            elements.microAction
        );
        return;
    }

    state.bigGoal = bigGoal;
    state.microAction = microAction;
    state.phase = "focus";
    state.remainingMs = SESSION_DURATION;
    state.endTime = Date.now() + SESSION_DURATION;
    state.lastRenderedSecond = null;

    saveSession();

    showFocusPhase(true);
    updateTimer();
    startTimerLoop();
}

function showFormError(message, inputElement) {
    elements.formMessage.textContent = message;

    const wrapper = inputElement.closest(".field-wrapper");

    if (wrapper) {
        wrapper.classList.add("invalid");

        window.setTimeout(() => {
            wrapper.classList.remove("invalid");
        }, 1800);
    }

    inputElement.focus();
}

function clearFormMessage() {
    elements.formMessage.textContent = "";
}

function showInputPhase(animate) {
    state.phase = "input";

    setPhaseVisibility(
        elements.inputPhase,
        true,
        animate
    );

    setPhaseVisibility(
        elements.focusPhase,
        false,
        false
    );

    setPhaseVisibility(
        elements.successPhase,
        false,
        false
    );
}

function showFocusPhase(animate) {
    state.phase = "focus";

    elements.focusGoal.textContent = state.bigGoal;
    elements.activeAction.textContent = state.microAction;

    setPhaseVisibility(
        elements.inputPhase,
        false,
        false
    );

    setPhaseVisibility(
        elements.focusPhase,
        true,
        animate
    );

    setPhaseVisibility(
        elements.successPhase,
        false,
        false
    );
}

function showSuccessPhase(animate) {
    state.phase = "success";

    elements.completedAction.textContent = state.microAction;

    setPhaseVisibility(
        elements.inputPhase,
        false,
        false
    );

    setPhaseVisibility(
        elements.focusPhase,
        false,
        false
    );

    setPhaseVisibility(
        elements.successPhase,
        true,
        animate
    );
}

function setPhaseVisibility(element, visible, animate) {
    element.classList.toggle("active", visible);
    element.setAttribute("aria-hidden", visible ? "false" : "true");

    if (visible && animate) {
        element.style.animation = "none";

        void element.offsetWidth;

        element.style.animation = "";
    }
}

function startTimerLoop() {
    stopTimerLoop();

    updateTimer();

    state.timerId = window.setInterval(() => {
        updateTimer();
    }, 250);
}

function stopTimerLoop() {
    if (state.timerId !== null) {
        window.clearInterval(state.timerId);
        state.timerId = null;
    }
}

function updateTimer() {
    if (!state.endTime) {
        return;
    }

    const currentTime = Date.now();
    const remaining = Math.max(
        0,
        state.endTime - currentTime
    );

    state.remainingMs = remaining;

    const totalSeconds = Math.ceil(remaining / 1000);

    if (
        totalSeconds === state.lastRenderedSecond &&
        remaining > 0
    ) {
        return;
    }

    state.lastRenderedSecond = totalSeconds;

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    elements.timerValue.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    updateRing(remaining);

    if (remaining <= 0) {
        completeSession();
    }
}

function updateRing(remainingMs) {
    const progress =
        Math.max(
            0,
            Math.min(
                1,
                remainingMs / SESSION_DURATION
            )
        );

    const offset = (1 - progress) * 100;

    elements.ringProgress.style.strokeDashoffset =
        String(offset);

    elements.ringProgressGlow.style.strokeDashoffset =
        String(offset);
}

function completeSession() {
    stopTimerLoop();

    state.remainingMs = 0;
    state.endTime = null;
    state.phase = "success";
    state.lastRenderedSecond = null;

    elements.timerValue.textContent = "00:00";

    elements.ringProgress.style.strokeDashoffset = "100";
    elements.ringProgressGlow.style.strokeDashoffset = "100";

    saveSession();

    showSuccessPhase(true);

    showToast(
        "Five minutes complete. You started."
    );
}

function handlePauseSession() {
    stopTimerLoop();

    state.phase = "input";
    state.endTime = null;
    state.remainingMs = SESSION_DURATION;
    state.lastRenderedSecond = null;

    saveSession();

    showInputPhase(true);

    showToast(
        "Session paused. Your next small step is still here."
    );
}

function returnToBase() {
    stopTimerLoop();

    state.phase = "input";
    state.endTime = null;
    state.remainingMs = SESSION_DURATION;
    state.lastRenderedSecond = null;

    saveSession();

    resetFocusVisuals();
    showInputPhase(true);

    window.setTimeout(() => {
        elements.bigGoal.focus();
    }, 350);
}

function resetFocusVisuals() {
    elements.timerValue.textContent = "05:00";

    elements.ringProgress.style.strokeDashoffset = "0";
    elements.ringProgressGlow.style.strokeDashoffset = "0";

    elements.focusGoal.textContent = "";
    elements.activeAction.textContent = "";
    elements.completedAction.textContent = "";
}

function handleVisibilityChange() {
    if (document.hidden) {
        saveSession();
        return;
    }

    if (
        state.phase === "focus" &&
        state.endTime
    ) {
        updateTimer();
    }
}

function saveSession() {
    try {
        const data = {
            bigGoal: state.bigGoal,
            microAction: state.microAction,
            phase: state.phase,
            endTime: state.endTime,
            remainingMs: state.remainingMs
        };

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data)
        );
    } catch (error) {
        console.warn(
            "TaskForge-Core: Unable to save session.",
            error
        );
    }
}

function restoreSession() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return;
        }

        const parsed = JSON.parse(stored);

        state.bigGoal =
            typeof parsed.bigGoal === "string"
                ? parsed.bigGoal.slice(0, 300)
                : "";

        state.microAction =
            typeof parsed.microAction === "string"
                ? parsed.microAction.slice(0, 160)
                : "";

        state.phase =
            isValidPhase(parsed.phase)
                ? parsed.phase
                : "input";

        state.endTime =
            Number.isFinite(Number(parsed.endTime))
                ? Number(parsed.endTime)
                : null;

        state.remainingMs =
            Number.isFinite(Number(parsed.remainingMs))
                ? Math.max(0, Number(parsed.remainingMs))
                : SESSION_DURATION;

        elements.bigGoal.value = state.bigGoal;
        elements.microAction.value = state.microAction;
    } catch (error) {
        console.warn(
            "TaskForge-Core: Unable to restore session.",
            error
        );

        clearStoredSession();
    }
}

function isValidPhase(phase) {
    return [
        "input",
        "focus",
        "success"
    ].includes(phase);
}

function clearStoredSession() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn(
            "TaskForge-Core: Unable to clear stored session.",
            error
        );
    }
}

function showToast(message) {
    elements.toastMessage.textContent = message;

    elements.toast.classList.add("visible");
    elements.toast.setAttribute("aria-hidden", "false");

    window.clearTimeout(toastTimeoutId);

    toastTimeoutId = window.setTimeout(() => {
        elements.toast.classList.remove("visible");
        elements.toast.setAttribute("aria-hidden", "true");
    }, 3200);
}