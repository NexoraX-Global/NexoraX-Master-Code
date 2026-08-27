"use strict";

/*
 * TASKFORGE-CORE
 * MHA Brahmastra 25 — The Neural Quarantine
 *
 * Core behavior:
 * 1. Capture a distracting thought.
 * 2. Visually shrink and pull it into the vault.
 * 3. Clear the input immediately after capture.
 * 4. Increment the quarantine counter.
 * 5. Persist the counter with localStorage.
 *
 * No page reloads are used.
 */

const STORAGE_KEY = "taskforge-core-neural-quarantine-v1";
const MAX_THOUGHT_LENGTH = 280;
const ANIMATION_DURATION = 1100;

const state = {
    count: 0,
    isProcessing: false
};

const elements = {
    thoughtInput: document.getElementById("thoughtInput"),
    quarantineButton: document.getElementById("quarantineButton"),
    characterCount: document.getElementById("characterCount"),
    feedbackMessage: document.getElementById("feedbackMessage"),

    vaultStage: document.getElementById("vaultStage"),
    absorbedThought: document.getElementById("absorbedThought"),

    quarantineCount: document.getElementById("quarantineCount"),
    vaultMessage: document.getElementById("vaultMessage"),

    toast: document.getElementById("toast"),
    toastText: document.getElementById("toastText")
};

let toastTimeoutId = null;

initialize();

function initialize() {
    loadCount();
    bindEvents();
    renderCount();
    updateCharacterCount();
}

function bindEvents() {
    elements.quarantineButton.addEventListener(
        "click",
        quarantineThought
    );

    elements.thoughtInput.addEventListener(
        "input",
        handleInput
    );

    elements.thoughtInput.addEventListener(
        "keydown",
        handleInputKeydown
    );

    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );

    window.addEventListener(
        "beforeunload",
        saveCount
    );
}

function handleInput() {
    updateCharacterCount();
    clearFeedback();
}

function handleInputKeydown(event) {
    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {
        event.preventDefault();
        quarantineThought();
    }
}

function updateCharacterCount() {
    const currentLength =
        elements.thoughtInput.value.length;

    elements.characterCount.textContent =
        `${currentLength} / ${MAX_THOUGHT_LENGTH}`;
}

function quarantineThought() {
    if (state.isProcessing) {
        return;
    }

    const thought =
        elements.thoughtInput.value.trim();

    if (!thought) {
        showInputPrompt();
        return;
    }

    if (thought.length > MAX_THOUGHT_LENGTH) {
        showFeedback(
            "That thought is a little too large. Capture the essential idea."
        );
        return;
    }

    state.isProcessing = true;

    const capturedThought = thought;

    prepareAbsorbedThought(capturedThought);
    clearInputImmediately();
    beginVaultAnimation();

    state.count += 1;

    saveCount();
    renderCount();
    showProcessingFeedback();

    window.setTimeout(() => {
        finishQuarantine();
    }, ANIMATION_DURATION);
}

function prepareAbsorbedThought(thought) {
    elements.absorbedThought.textContent =
        thought;

    elements.absorbedThought.classList.remove(
        "sucking"
    );

    void elements.absorbedThought.offsetWidth;

    elements.absorbedThought.classList.add(
        "sucking"
    );
}

function clearInputImmediately() {
    elements.thoughtInput.value = "";
    updateCharacterCount();
    elements.thoughtInput.blur();
}

function beginVaultAnimation() {
    elements.vaultStage.classList.remove(
        "absorbing"
    );

    void elements.vaultStage.offsetWidth;

    elements.vaultStage.classList.add(
        "absorbing"
    );
}

function finishQuarantine() {
    elements.vaultStage.classList.remove(
        "absorbing"
    );

    elements.absorbedThought.classList.remove(
        "sucking"
    );

    elements.absorbedThought.textContent = "";

    state.isProcessing = false;

    elements.vaultMessage.textContent =
        "Thought secured. Your workspace is clear.";

    showToast(
        "Thought quarantined. Return to focus."
    );

    window.setTimeout(() => {
        if (!state.isProcessing) {
            elements.vaultMessage.textContent =
                "Your workspace is clear.";
        }
    }, 3500);
}

function showInputPrompt() {
    elements.feedbackMessage.textContent =
        "Nothing needs to be solved here. Capture a thought only when one appears.";

    elements.thoughtInput.classList.remove(
        "invalid"
    );

    void elements.thoughtInput.offsetWidth;

    elements.thoughtInput.classList.add(
        "invalid"
    );

    elements.thoughtInput.focus();

    window.setTimeout(() => {
        elements.thoughtInput.classList.remove(
            "invalid"
        );
    }, 400);
}

function showFeedback(message) {
    elements.feedbackMessage.textContent =
        message;
}

function clearFeedback() {
    elements.feedbackMessage.textContent = "";
}

function showProcessingFeedback() {
    elements.feedbackMessage.textContent =
        "Captured. You can return to your work.";
}

function loadCount() {
    try {
        const storedCount =
            localStorage.getItem(STORAGE_KEY);

        if (storedCount === null) {
            state.count = 0;
            return;
        }

        const parsedCount =
            Number.parseInt(
                storedCount,
                10
            );

        if (
            Number.isFinite(parsedCount) &&
            parsedCount >= 0
        ) {
            state.count = parsedCount;
        } else {
            state.count = 0;
        }
    } catch (error) {
        console.warn(
            "TaskForge-Core: Could not load quarantine count.",
            error
        );

        state.count = 0;
    }
}

function saveCount() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            String(state.count)
        );
    } catch (error) {
        console.warn(
            "TaskForge-Core: Could not save quarantine count.",
            error
        );
    }
}

function renderCount() {
    elements.quarantineCount.textContent =
        String(state.count);

    elements.quarantineCount.classList.remove(
        "bump"
    );

    void elements.quarantineCount.offsetWidth;

    elements.quarantineCount.classList.add(
        "bump"
    );

    window.setTimeout(() => {
        elements.quarantineCount.classList.remove(
            "bump"
        );
    }, 500);
}

function showToast(message) {
    elements.toastText.textContent = message;

    elements.toast.classList.add(
        "visible"
    );

    elements.toast.setAttribute(
        "aria-hidden",
        "false"
    );

    window.clearTimeout(
        toastTimeoutId
    );

    toastTimeoutId = window.setTimeout(() => {
        elements.toast.classList.remove(
            "visible"
        );

        elements.toast.setAttribute(
            "aria-hidden",
            "true"
        );
    }, 3000);
}

function handleVisibilityChange() {
    if (document.hidden) {
        saveCount();
    }
}