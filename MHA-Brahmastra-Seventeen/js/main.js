"use strict";

/*
    TASKFORGE CORE
    MHA-17
    SYMBIOTIC NEURAL-PACT

    All stakes in this module are virtual $FORGE simulation values.
    State is persisted locally in the browser.
*/

const STORAGE_KEY = "taskforge_neural_pact_v1";

const DEFAULT_STATE = {
    pactActive: false,
    pactState: "UNINITIALIZED",
    selectedStake: 5000,

    userProgress: 0,
    partnerProgress: 0,

    userSecured: false,
    partnerSecured: false,

    syncLevel: 0,

    missionStartedAt: null,
    missionDuration: 25 * 60,

    completedPacts: 0,
    brokenPacts: 0,

    virtualVault: 50000,

    eventLog: [
        {
            type: "system",
            time: "SYSTEM",
            text: "Neural-Pact Matrix initialized."
        },
        {
            type: "system",
            time: "SYSTEM",
            text: "Awaiting operator synchronization..."
        }
    ]
};

let state = loadState();

const elements = {
    sharedStake: document.getElementById("sharedStake"),
    pactState: document.getElementById("pactState"),
    syncLevel: document.getElementById("syncLevel"),

    systemDot: document.getElementById("systemDot"),
    systemStatus: document.getElementById("systemStatus"),

    userStatus: document.getElementById("userStatus"),
    partnerStatus: document.getElementById("partnerStatus"),

    userProgress: document.getElementById("userProgress"),
    partnerProgress: document.getElementById("partnerProgress"),

    userProgressText: document.getElementById("userProgressText"),
    partnerProgressText: document.getElementById("partnerProgressText"),

    initiationPanel: document.getElementById("initiationPanel"),
    executionPanel: document.getElementById("executionPanel"),

    initiateBtn: document.getElementById("initiateBtn"),
    secureWorkBtn: document.getElementById("secureWorkBtn"),
    partnerFailBtn: document.getElementById("partnerFailBtn"),

    terminalState: document.getElementById("terminalState"),

    userNodeState: document.getElementById("userNodeState"),
    partnerNodeState: document.getElementById("partnerNodeState"),
    integrityState: document.getElementById("integrityState"),

    missionTimer: document.getElementById("missionTimer"),

    eventLog: document.getElementById("eventLog"),

    rewardValue: document.getElementById("rewardValue"),

    failureOverlay: document.getElementById("failureOverlay"),
    resetFailureBtn: document.getElementById("resetFailureBtn"),

    userOperator: document.getElementById("userOperator"),
    partnerOperator: document.getElementById("partnerOperator"),

    syncCore: document.querySelector(".sync-core")
};

let timerInterval = null;
let partnerSimulationTimer = null;


/* ---------------------------------------------------------
   STORAGE
--------------------------------------------------------- */

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return structuredClone(DEFAULT_STATE);
        }

        const parsed = JSON.parse(raw);

        return {
            ...structuredClone(DEFAULT_STATE),
            ...parsed
        };
    } catch (error) {
        console.warn("TaskForge state recovery:", error);
        return structuredClone(DEFAULT_STATE);
    }
}

function saveState() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );
    } catch (error) {
        console.warn("TaskForge localStorage unavailable:", error);
    }
}


/* ---------------------------------------------------------
   UTILITY
--------------------------------------------------------- */

function formatNumber(value) {
    return Number(value).toLocaleString("en-US");
}

function clamp(value, minimum, maximum) {
    return Math.min(
        Math.max(value, minimum),
        maximum
    );
}

function getClockTime() {
    const date = new Date();

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}


/* ---------------------------------------------------------
   EVENT TERMINAL
--------------------------------------------------------- */

function addLog(type, text) {
    const entry = {
        type: type,
        time: getClockTime(),
        text: text
    };

    state.eventLog.push(entry);

    if (state.eventLog.length > 40) {
        state.eventLog.shift();
    }

    saveState();
    renderLog();
}

function renderLog() {
    elements.eventLog.innerHTML = "";

    state.eventLog.forEach(entry => {

        const row = document.createElement("div");

        row.className = "log-entry";

        if (entry.type === "success") {
            row.classList.add("success");
        }

        if (entry.type === "danger") {
            row.classList.add("danger");
        }

        const time = document.createElement("span");

        time.className = "log-time";
        time.textContent = `[${entry.time}]`;

        const text = document.createElement("span");

        text.className = "log-text";
        text.textContent = entry.text;

        row.appendChild(time);
        row.appendChild(text);

        elements.eventLog.appendChild(row);
    });

    elements.eventLog.scrollTop =
        elements.eventLog.scrollHeight;
}


/* ---------------------------------------------------------
   UI RENDER
--------------------------------------------------------- */

function render() {

    elements.sharedStake.textContent =
        formatNumber(state.selectedStake);

    elements.pactState.textContent =
        state.pactState;

    elements.syncLevel.textContent =
        `${state.syncLevel}%`;

    elements.userProgress.style.width =
        `${state.userProgress}%`;

    elements.partnerProgress.style.width =
        `${state.partnerProgress}%`;

    elements.userProgressText.textContent =
        `${state.userProgress}%`;

    elements.partnerProgressText.textContent =
        `${state.partnerProgress}%`;

    elements.rewardValue.textContent =
        `${formatNumber(state.selectedStake * 2)} $FORGE`;

    updateOperatorStates();

    updateSystemState();

    renderPanels();

    renderLog();
}

function updateOperatorStates() {

    elements.userOperator.classList.remove(
        "secured",
        "failed"
    );

    elements.partnerOperator.classList.remove(
        "secured",
        "failed"
    );

    elements.userStatus.className =
        "operator-state";

    elements.partnerStatus.className =
        "operator-state";

    if (state.pactActive) {

        if (state.userSecured) {
            elements.userStatus.textContent = "SECURED";
            elements.userStatus.classList.add("online");
            elements.userOperator.classList.add("secured");
        } else {
            elements.userStatus.textContent = "ACTIVE";
            elements.userStatus.classList.add("online");
        }

        if (state.partnerSecured) {
            elements.partnerStatus.textContent = "SECURED";
            elements.partnerStatus.classList.add("online");
            elements.partnerOperator.classList.add("secured");
        } else {
            elements.partnerStatus.textContent = "ACTIVE";
            elements.partnerStatus.classList.add("online");
        }

    } else if (state.pactState === "BROKEN") {

        elements.userStatus.textContent =
            state.userSecured ? "SECURED" : "COMPROMISED";

        elements.partnerStatus.textContent =
            "FAILED";

        elements.partnerStatus.classList.add("failed");

        elements.partnerOperator.classList.add("failed");

        if (state.userSecured) {
            elements.userOperator.classList.add("secured");
        }

    } else if (state.pactState === "SECURED") {

        elements.userStatus.textContent = "SECURED";
        elements.partnerStatus.textContent = "SECURED";

        elements.userStatus.classList.add("online");
        elements.partnerStatus.classList.add("online");

        elements.userOperator.classList.add("secured");
        elements.partnerOperator.classList.add("secured");

    } else {

        elements.userStatus.textContent = "OFFLINE";
        elements.partnerStatus.textContent = "OFFLINE";
    }
}

function updateSystemState() {

    elements.systemDot.className = "status-dot";

    if (state.pactState === "ACTIVE") {

        elements.systemDot.classList.add("active");
        elements.systemStatus.textContent = "LINK ACTIVE";

    } else if (state.pactState === "BROKEN") {

        elements.systemDot.classList.add("danger");
        elements.systemStatus.textContent = "CRITICAL";

    } else if (state.pactState === "SECURED") {

        elements.systemDot.classList.add("active");
        elements.systemStatus.textContent = "SECURED";

    } else {

        elements.systemStatus.textContent = "STANDBY";
    }
}

function renderPanels() {

    if (state.pactActive) {

        elements.initiationPanel.classList.add("hidden");
        elements.executionPanel.classList.remove("hidden");

    } else {

        elements.initiationPanel.classList.remove("hidden");
        elements.executionPanel.classList.add("hidden");
    }

    if (state.pactState === "ACTIVE") {

        elements.terminalState.textContent =
            "LINK ACTIVE";

        elements.terminalState.classList.add("live");

    } else if (state.pactState === "BROKEN") {

        elements.terminalState.textContent =
            "LINK BROKEN";

        elements.terminalState.classList.remove("live");

    } else if (state.pactState === "SECURED") {

        elements.terminalState.textContent =
            "SECURED";

        elements.terminalState.classList.add("live");
    }

    elements.userNodeState.textContent =
        state.userSecured ? "SECURED" : "WAITING";

    elements.partnerNodeState.textContent =
        state.partnerSecured ? "SECURED" : "WAITING";

    elements.integrityState.textContent =
        `${state.syncLevel}%`;
}


/* ---------------------------------------------------------
   STAKE SELECTION
--------------------------------------------------------- */

function initializeStakeButtons() {

    const buttons =
        document.querySelectorAll(".stake-option");

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            if (state.pactActive) {
                return;
            }

            buttons.forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            const value =
                Number(button.dataset.stake);

            if (
                Number.isFinite(value) &&
                value > 0
            ) {
                state.selectedStake = value;
            }

            saveState();
            render();

            addLog(
                "system",
                `Virtual stake configured: ${formatNumber(value)} $FORGE.`
            );
        });
    });
}


/* ---------------------------------------------------------
   PACT INITIATION
--------------------------------------------------------- */

function initiatePact() {

    if (state.pactActive) {
        return;
    }

    const stake = state.selectedStake;

    if (stake <= 0) {
        addLog(
            "danger",
            "Invalid virtual stake configuration."
        );
        return;
    }

    state.pactActive = true;
    state.pactState = "ACTIVE";

    state.userProgress = 0;
    state.partnerProgress = 0;

    state.userSecured = false;
    state.partnerSecured = false;

    state.syncLevel = 0;

    state.missionStartedAt =
        Date.now();

    saveState();

    document.body.classList.add("pact-active");

    elements.syncCore.classList.add("active");

    addLog(
        "success",
        `NEURAL-PACT established. ${formatNumber(stake)} $FORGE virtual stake synchronized.`
    );

    addLog(
        "system",
        "Operator A connected."
    );

    setTimeout(() => {

        addLog(
            "system",
            "Operator B accountability node connected."
        );

    }, 500);

    startMissionTimer();

    startPartnerSimulation();

    render();
}


/* ---------------------------------------------------------
   USER WORK
--------------------------------------------------------- */

function secureUserWork() {

    if (!state.pactActive) {
        addLog(
            "danger",
            "No active Neural-Pact detected."
        );
        return;
    }

    if (state.userSecured) {
        addLog(
            "system",
            "Operator A is already secured."
        );
        return;
    }

    state.userSecured = true;

    state.userProgress = 100;

    recalculateSync();

    saveState();

    document.body.classList.remove("pact-broken");
    document.body.classList.add("pact-secured");

    setTimeout(() => {
        document.body.classList.remove("pact-secured");
    }, 700);

    addLog(
        "success",
        "OPERATOR A execution proof accepted. Your side is SECURED."
    );

    addLog(
        "system",
        "Awaiting Operator B execution."
    );

    render();

    if (state.partnerSecured) {
        resolveSuccess();
    }
}


/* ---------------------------------------------------------
   PARTNER FAILURE
--------------------------------------------------------- */

function simulatePartnerFailure() {

    if (!state.pactActive) {
        addLog(
            "danger",
            "No active Neural-Pact detected."
        );
        return;
    }

    if (state.pactState !== "ACTIVE") {
        return;
    }

    state.partnerSecured = false;
    state.partnerProgress = 0;

    state.pactState = "BROKEN";
    state.pactActive = false;

    state.syncLevel = 0;

    state.brokenPacts += 1;

    stopMissionTimer();
    stopPartnerSimulation();

    saveState();

    document.body.classList.add("pact-broken");

    elements.partnerOperator.classList.add("failed");

    addLog(
        "danger",
        "CRITICAL: Operator B failed the execution protocol."
    );

    addLog(
        "danger",
        "Neural-Pact broken. Virtual accountability stake forfeited."
    );

    addLog(
        "system",
        "No real-world funds are affected. Simulation state updated."
    );

    render();

    setTimeout(() => {

        elements.failureOverlay.classList.add("active");

    }, 350);
}


/* ---------------------------------------------------------
   SUCCESS RESOLUTION
--------------------------------------------------------- */

function resolveSuccess() {

    if (
        !state.userSecured ||
        !state.partnerSecured ||
        state.pactState !== "ACTIVE"
    ) {
        return;
    }

    state.pactState = "SECURED";
    state.pactActive = false;

    state.syncLevel = 100;

    state.completedPacts += 1;

    stopMissionTimer();
    stopPartnerSimulation();

    saveState();

    document.body.classList.add("pact-secured");

    addLog(
        "success",
        "DUAL EXECUTION VERIFIED."
    );

    setTimeout(() => {

        addLog(
            "success",
            `PACT SECURED. Virtual reward unlocked: ${formatNumber(state.selectedStake * 2)} $FORGE.`
        );

        addLog(
            "system",
            "Both operators successfully completed the accountability protocol."
        );

        render();

    }, 500);

    render();
}


/* ---------------------------------------------------------
   SYNC CALCULATION
--------------------------------------------------------- */

function recalculateSync() {

    const user =
        state.userSecured ? 100 : state.userProgress;

    const partner =
        state.partnerSecured ? 100 : state.partnerProgress;

    const sync =
        Math.round((user + partner) / 2);

    state.syncLevel =
        clamp(sync, 0, 100);
}


/* ---------------------------------------------------------
   PARTNER SIMULATION
--------------------------------------------------------- */

function startPartnerSimulation() {

    stopPartnerSimulation();

    partnerSimulationTimer =
        setInterval(() => {

            if (!state.pactActive) {
                return;
            }

            if (state.partnerSecured) {
                return;
            }

            /*
                The simulated partner progresses gradually.
                This keeps the module interactive without pretending
                that another real user is connected.
            */

            const randomProgress =
                Math.floor(
                    Math.random() * 8
                ) + 3;

            state.partnerProgress =
                clamp(
                    state.partnerProgress + randomProgress,
                    0,
                    100
                );

            recalculateSync();

            saveState();
            render();

            if (state.partnerProgress >= 100) {

                state.partnerSecured = true;
                state.partnerProgress = 100;

                recalculateSync();

                addLog(
                    "success",
                    "Operator B completed the simulated execution protocol."
                );

                saveState();
                render();

                if (state.userSecured) {
                    resolveSuccess();
                }
            }

        }, 4500);
}

function stopPartnerSimulation() {

    if (partnerSimulationTimer !== null) {

        clearInterval(
            partnerSimulationTimer
        );

        partnerSimulationTimer = null;
    }
}


/* ---------------------------------------------------------
   TIMER
--------------------------------------------------------- */

function startMissionTimer() {

    stopMissionTimer();

    updateMissionTimer();

    timerInterval =
        setInterval(
            updateMissionTimer,
            1000
        );
}

function stopMissionTimer() {

    if (timerInterval !== null) {

        clearInterval(
            timerInterval
        );

        timerInterval = null;
    }
}

function updateMissionTimer() {

    if (!state.pactActive) {

        elements.missionTimer.textContent =
            "25:00";

        return;
    }

    const elapsed =
        Math.floor(
            (Date.now() - state.missionStartedAt) / 1000
        );

    const remaining =
        Math.max(
            state.missionDuration - elapsed,
            0
        );

    const minutes =
        Math.floor(
            remaining / 60
        );

    const seconds =
        remaining % 60;

    elements.missionTimer.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    if (remaining <= 0) {

        stopMissionTimer();

        addLog(
            "danger",
            "Mission timer expired. Manual resolution required."
        );
    }
}


/* ---------------------------------------------------------
   RESTORE MATRIX
--------------------------------------------------------- */

function restoreMatrix() {

    elements.failureOverlay.classList.remove(
        "active"
    );

    document.body.classList.remove(
        "pact-broken"
    );

    state.pactActive = false;
    state.pactState = "UNINITIALIZED";

    state.userProgress = 0;
    state.partnerProgress = 0;

    state.userSecured = false;
    state.partnerSecured = false;

    state.syncLevel = 0;

    state.missionStartedAt = null;

    saveState();

    addLog(
        "system",
        "Matrix restored. Ready for a new accountability pact."
    );

    render();
}


/* ---------------------------------------------------------
   EVENT LISTENERS
--------------------------------------------------------- */

function initializeEvents() {

    elements.initiateBtn.addEventListener(
        "click",
        initiatePact
    );

    elements.secureWorkBtn.addEventListener(
        "click",
        secureUserWork
    );

    elements.partnerFailBtn.addEventListener(
        "click",
        simulatePartnerFailure
    );

    elements.resetFailureBtn.addEventListener(
        "click",
        restoreMatrix
    );
}


/* ---------------------------------------------------------
   RECOVERY
--------------------------------------------------------- */

function recoverActiveSession() {

    if (
        !state.pactActive ||
        !state.missionStartedAt
    ) {
        return;
    }

    const elapsed =
        Math.floor(
            (Date.now() - state.missionStartedAt) / 1000
        );

    if (elapsed >= state.missionDuration) {

        state.missionStartedAt =
            Date.now();

        saveState();

        addLog(
            "system",
            "Previous mission window expired. New local simulation window initialized."
        );
    }

    document.body.classList.add(
        "pact-active"
    );

    elements.syncCore.classList.add(
        "active"
    );

    startMissionTimer();
    startPartnerSimulation();
}


/* ---------------------------------------------------------
   INITIALIZATION
--------------------------------------------------------- */

function initializeApplication() {

    initializeStakeButtons();

    initializeEvents();

    render();

    recoverActiveSession();

    /*
        Make sure the currently selected stake button
        matches persisted localStorage state.
    */

    document
        .querySelectorAll(".stake-option")
        .forEach(button => {

            button.classList.toggle(
                "active",
                Number(button.dataset.stake) ===
                state.selectedStake
            );
        });
}

document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
);