"use strict";

document.addEventListener("DOMContentLoaded", () => {

    const STORAGE_KEY = "taskforge_gladiator_arena_v1";

    const DUEL_DURATION = 60 * 60;

    const MIN_COMMITMENT = 100;
    const MAX_COMMITMENT = 5000;

    const COMPLETION_MULTIPLIER = 2;
    const FAILURE_PENALTY_RATE = 0.25;

    const app = document.getElementById("app");

    const lobby = document.getElementById("lobby");
    const arena = document.getElementById("arena");

    const forgeBalance = document.getElementById("forgeBalance");
    const pledgeInput = document.getElementById("pledgeInput");

    const findRivalBtn = document.getElementById("findRivalBtn");
    const yieldBtn = document.getElementById("yieldBtn");

    const matchmaking = document.getElementById("matchmaking");
    const matchStatus = document.getElementById("matchStatus");
    const matchSubstatus = document.getElementById("matchSubstatus");

    const lobbyMessage = document.getElementById("lobbyMessage");

    const timerElement = document.getElementById("timer");
    const timerProgress = document.getElementById("timerProgress");

    const playerStatus = document.getElementById("playerStatus");
    const rivalStatus = document.getElementById("rivalStatus");

    const playerMeter = document.getElementById("playerMeter");
    const rivalMeter = document.getElementById("rivalMeter");

    const rivalName = document.getElementById("rivalName");

    const sessionXP = document.getElementById("sessionXP");
    const arenaFeed = document.getElementById("arenaFeed");

    const resultOverlay = document.getElementById("resultOverlay");
    const resultIcon = document.getElementById("resultIcon");
    const resultCode = document.getElementById("resultCode");
    const resultTitle = document.getElementById("resultTitle");
    const resultDescription = document.getElementById("resultDescription");
    const resultXP = document.getElementById("resultXP");
    const returnBtn = document.getElementById("returnBtn");

    const impactFlash = document.getElementById("impactFlash");

    let state = loadState();

    let duel = {
        active: false,
        completed: false,
        commitment: 0,
        remaining: DUEL_DURATION,
        timerId: null,
        rivalIntervalId: null,
        startedAt: null,
        rivalProgress: 100,
        playerProgress: 100,
        rivalName: ""
    };

    const rivalNames = [
        "VOID OPERATIVE",
        "NEON DISCIPLINE",
        "FOCUS TITAN",
        "QUANTUM SCHOLAR",
        "SILENT EXECUTOR",
        "NIGHT SHIFT",
        "DEEP WORKER",
        "IRON MIND"
    ];

    function defaultState() {
        return {
            forge: 10000,
            completedDuels: 0,
            failedDuels: 0,
            totalFocusSeconds: 0,
            bestStreak: 0,
            currentStreak: 0
        };
    }

    function loadState() {

        try {

            const raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return defaultState();
            }

            const parsed = JSON.parse(raw);

            return {
                ...defaultState(),
                ...parsed
            };

        } catch (error) {

            console.warn("TaskForge state reset:", error);

            return defaultState();
        }
    }

    function saveState() {

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state)
            );
        } catch (error) {
            console.warn("Unable to save TaskForge state.");
        }
    }

    function updateForgeDisplay() {

        forgeBalance.textContent =
            Math.max(0, Math.floor(state.forge)).toLocaleString();
    }

    function setMessage(message, type = "normal") {

        lobbyMessage.textContent = message;

        lobbyMessage.className = "message";

        if (type === "error") {
            lobbyMessage.style.color = "var(--red)";
        } else if (type === "success") {
            lobbyMessage.style.color = "#00ff66";
        } else {
            lobbyMessage.style.color = "var(--muted)";
        }
    }

    function getCommitment() {

        const value = Number(pledgeInput.value);

        if (!Number.isFinite(value)) {
            return null;
        }

        return Math.floor(value);
    }

    function validateCommitment() {

        const value = getCommitment();

        if (value === null) {
            setMessage(
                "INVALID COMMITMENT VALUE.",
                "error"
            );

            return false;
        }

        if (value < MIN_COMMITMENT) {

            setMessage(
                `COMMITMENT MUST BE AT LEAST ${MIN_COMMITMENT} XP.`,
                "error"
            );

            return false;
        }

        if (value > MAX_COMMITMENT) {

            setMessage(
                `COMMITMENT CANNOT EXCEED ${MAX_COMMITMENT} XP.`,
                "error"
            );

            return false;
        }

        if (value > state.forge) {

            setMessage(
                "INSUFFICIENT FOCUS XP FOR THIS COMMITMENT.",
                "error"
            );

            return false;
        }

        return true;
    }

    function selectRival() {

        const index =
            Math.floor(Math.random() * rivalNames.length);

        duel.rivalName = rivalNames[index];

        rivalName.textContent = duel.rivalName;
    }

    function startMatchmaking() {

        if (!validateCommitment()) {
            return;
        }

        findRivalBtn.disabled = true;

        matchmaking.classList.remove("hidden");

        matchStatus.textContent =
            "SEARCHING FOR RIVAL...";

        matchSubstatus.textContent =
            "Scanning active operators";

        setMessage("");

        let step = 0;

        const searchSteps = [
            [
                "SEARCHING FOR RIVAL...",
                "Scanning active operators"
            ],
            [
                "SIGNAL ACQUIRED",
                "Synchronizing focus protocols"
            ],
            [
                "RIVAL FOUND",
                "Establishing neural link"
            ],
            [
                "MATCH LOCKED",
                "Preparing 60-minute session"
            ]
        ];

        const searchTimer = setInterval(() => {

            if (step >= searchSteps.length) {

                clearInterval(searchTimer);

                beginDuel();

                return;
            }

            matchStatus.textContent =
                searchSteps[step][0];

            matchSubstatus.textContent =
                searchSteps[step][1];

            step++;

        }, 850);
    }

    function beginDuel() {

        selectRival();

        duel.active = true;
        duel.completed = false;

        duel.commitment = getCommitment();
        duel.remaining = DUEL_DURATION;
        duel.startedAt = Date.now();

        duel.playerProgress = 100;
        duel.rivalProgress = 100;

        /*
         * The commitment is reserved for the session.
         * It is not a wager and cannot be transferred to another user.
         */
        state.forge -= duel.commitment;

        saveState();
        updateForgeDisplay();

        sessionXP.textContent =
            `COMMITMENT: ${duel.commitment.toLocaleString()} XP`;

        matchmaking.classList.add("hidden");

        lobby.classList.remove("active");
        arena.classList.add("active");

        document.body.classList.add("duel-active");

        playerStatus.textContent = "LOCKED IN";
        rivalStatus.textContent = "LOCKED IN";

        addFeed(
            "[SYSTEM]",
            `DUEL INITIALIZED // ${duel.commitment.toLocaleString()} XP COMMITTED`
        );

        addFeed(
            "[RIVAL]",
            `${duel.rivalName} has entered focus mode.`
        );

        updateArena();

        duel.timerId = setInterval(
            tickDuel,
            1000
        );

        duel.rivalIntervalId = setInterval(
            simulateRival,
            8000
        );
    }

    function tickDuel() {

        if (!duel.active) {
            return;
        }

        duel.remaining--;

        state.totalFocusSeconds++;

        updateArena();

        if (duel.remaining <= 0) {

            completeDuel();

            return;
        }

        if (duel.remaining <= 60) {

            timerElement.style.color =
                "var(--red)";

            timerElement.style.textShadow =
                "0 0 20px rgba(255,51,51,0.7)";
        }
    }

    function updateArena() {

        const minutes =
            Math.floor(duel.remaining / 60);

        const seconds =
            duel.remaining % 60;

        timerElement.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

        const percent =
            (duel.remaining / DUEL_DURATION) * 100;

        timerProgress.style.width =
            `${percent}%`;

        playerMeter.style.width =
            `${duel.playerProgress}%`;

        rivalMeter.style.width =
            `${duel.rivalProgress}%`;
    }

    function simulateRival() {

        if (!duel.active) {
            return;
        }

        const eventRoll = Math.random();

        if (eventRoll < 0.18) {

            duel.rivalProgress =
                Math.max(
                    45,
                    duel.rivalProgress -
                    (2 + Math.random() * 5)
                );

            rivalStatus.textContent =
                "UNDER PRESSURE";

            addFeed(
                "[RIVAL]",
                `${duel.rivalName} is fighting distraction.`
            );

        } else {

            duel.rivalProgress =
                Math.min(
                    100,
                    duel.rivalProgress +
                    (1 + Math.random() * 2)
                );

            rivalStatus.textContent =
                "LOCKED IN";

            addFeed(
                "[RIVAL]",
                `${duel.rivalName} maintained focus.`
            );
        }

        updateArena();
    }

    function addFeed(prefix, message) {

        const line =
            document.createElement("div");

        const prefixElement =
            document.createElement("span");

        prefixElement.textContent =
            prefix + " ";

        line.appendChild(prefixElement);

        line.appendChild(
            document.createTextNode(message)
        );

        arenaFeed.prepend(line);

        while (arenaFeed.children.length > 7) {
            arenaFeed.removeChild(
                arenaFeed.lastElementChild
            );
        }
    }

    function triggerImpact(type) {

        impactFlash.className =
            "impact-flash";

        app.classList.remove(
            "shake",
            "success-shock"
        );

        void app.offsetWidth;

        if (type === "failure") {

            impactFlash.classList.add("failure");
            app.classList.add("shake");

        } else {

            impactFlash.classList.add("success");
            app.classList.add("success-shock");
        }
    }

    function clearDuelTimers() {

        if (duel.timerId !== null) {

            clearInterval(
                duel.timerId
            );

            duel.timerId = null;
        }

        if (duel.rivalIntervalId !== null) {

            clearInterval(
                duel.rivalIntervalId
            );

            duel.rivalIntervalId = null;
        }
    }

    function completeDuel() {

        if (!duel.active) {
            return;
        }

        duel.active = false;
        duel.completed = true;

        clearDuelTimers();

        document.body.classList.remove(
            "duel-active"
        );

        const reward =
            duel.commitment * COMPLETION_MULTIPLIER;

        state.forge += reward;

        state.completedDuels++;
        state.currentStreak++;

        if (
            state.currentStreak >
            state.bestStreak
        ) {
            state.bestStreak =
                state.currentStreak;
        }

        saveState();
        updateForgeDisplay();

        triggerImpact("success");

        showResult(
            "victory",
            reward
        );
    }

    function failDuel(reason) {

        if (!duel.active) {
            return;
        }

        duel.active = false;

        clearDuelTimers();

        document.body.classList.remove(
            "duel-active"
        );

        const penalty =
            Math.floor(
                duel.commitment *
                FAILURE_PENALTY_RATE
            );

        /*
         * The reserved commitment is consumed according
         * to the productivity penalty. It is never transferred
         * to another user.
         */
        const remainingCommitment =
            Math.max(
                0,
                duel.commitment - penalty
            );

        state.forge += remainingCommitment;

        state.failedDuels++;
        state.currentStreak = 0;

        saveState();
        updateForgeDisplay();

        playerStatus.textContent =
            "FOCUS BROKEN";

        triggerImpact("failure");

        addFeed(
            "[SYSTEM]",
            `FOCUS FAILURE // ${reason}`
        );

        showResult(
            "failure",
            -penalty
        );
    }

    function showResult(type, xpAmount) {

        if (type === "victory") {

            resultIcon.textContent = "✓";
            resultCode.textContent =
                "PROTOCOL COMPLETE";

            resultTitle.textContent =
                "VICTORY";

            resultTitle.style.color =
                "var(--gold)";

            resultDescription.textContent =
                "60-minute focus protocol successfully completed. Your commitment has been converted into Focus XP.";

            resultXP.textContent =
                `+${xpAmount.toLocaleString()} $FORGE`;

        } else {

            resultIcon.textContent = "×";
            resultCode.textContent =
                "PROTOCOL BREACHED";

            resultTitle.textContent =
                "FOCUS LOST";

            resultTitle.style.color =
                "var(--red)";

            resultDescription.textContent =
                "The session ended before completion. A productivity penalty was applied.";

            resultXP.textContent =
                `-${Math.abs(xpAmount).toLocaleString()} $FORGE`;

            resultCardFailureStyle();
        }

        resultOverlay.classList.add("show");
    }

    function resultCardFailureStyle() {

        const card =
            resultOverlay.querySelector(".result-card");

        card.style.borderColor =
            "var(--red)";

        card.style.boxShadow =
            "0 0 70px rgba(255,51,51,0.22)";
    }

    function returnToLobby() {

        resultOverlay.classList.remove(
            "show"
        );

        arena.classList.remove("active");
        lobby.classList.add("active");

        document.body.classList.remove(
            "duel-active"
        );

        findRivalBtn.disabled = false;

        matchmaking.classList.add("hidden");

        timerElement.style.color =
            "var(--gold)";

        timerElement.style.textShadow =
            "0 0 15px rgba(255,215,0,0.45)";

        const card =
            resultOverlay.querySelector(".result-card");

        card.style.borderColor =
            "var(--gold)";

        card.style.boxShadow =
            "0 0 70px rgba(255,215,0,0.2)";

        setMessage(
            `ARENA READY // CURRENT FOCUS XP: ${state.forge.toLocaleString()}`,
            "success"
        );
    }

    /*
     * Anti-distraction protocol.
     *
     * If the page becomes hidden while a duel is active,
     * the session is automatically failed.
     */
    function handleVisibilityChange() {

        if (
            document.visibilityState === "hidden" &&
            duel.active
        ) {

            failDuel(
                "APPLICATION / TAB EXIT DETECTED"
            );
        }
    }

    /*
     * Browser/page unload protection.
     * We do not attempt to manipulate the wallet here because
     * browsers do not reliably allow asynchronous storage work
     * during unload.
     */
    function handleBeforeUnload(event) {

        if (duel.active) {

            event.preventDefault();

            event.returnValue =
                "An active Focus Duel is running.";

            return event.returnValue;
        }

        return undefined;
    }

    function initialize() {

        updateForgeDisplay();

        pledgeInput.max =
            String(
                Math.min(
                    MAX_COMMITMENT,
                    state.forge
                )
            );

        findRivalBtn.addEventListener(
            "click",
            startMatchmaking
        );

        yieldBtn.addEventListener(
            "click",
            () => {

                if (!duel.active) {
                    return;
                }

                failDuel(
                    "USER ENDED THE FOCUS SESSION"
                );
            }
        );

        returnBtn.addEventListener(
            "click",
            returnToLobby
        );

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        window.addEventListener(
            "beforeunload",
            handleBeforeUnload
        );

        pledgeInput.addEventListener(
            "input",
            () => {

                const value =
                    getCommitment();

                if (
                    value !== null &&
                    value > state.forge
                ) {

                    setMessage(
                        "COMMITMENT EXCEEDS AVAILABLE FOCUS XP.",
                        "error"
                    );

                } else {

                    setMessage("");
                }
            }
        );

        setMessage(
            `ARENA READY // ${state.forge.toLocaleString()} FOCUS XP AVAILABLE`,
            "success"
        );
    }

    initialize();

});