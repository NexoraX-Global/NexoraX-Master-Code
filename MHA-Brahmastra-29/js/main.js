"use strict";

/*
 * TASKFORGE-CORE
 * Focus Duel & Challenge Arena
 *
 * All economy values are local virtual Focus Coins.
 * No real-money transaction or payment mechanism exists.
 */

(() => {

    /* ============================================================
       CONFIGURATION
    ============================================================ */

    const CONFIG = Object.freeze({
        startingBalance: 1000,
        duelStake: 50,

        startingActiveDuels: 3420,
        startingVault: 2890000,

        duelDurationMs: 30 * 60 * 1000,

        telemetryInterval: 3600,
        clockInterval: 1000,

        storageKey: "taskforge_focus_duel_state",

        maxTelemetry: 10
    });

    const STATE = Object.freeze({
        LOBBY: "LOBBY",
        ARMED: "ARMED",
        LIVE: "LIVE",
        FORFEITED: "FORFEITED",
        VICTORY: "VICTORY"
    });

    /* ============================================================
       DOM CACHE
    ============================================================ */

    const DOM = {};

    function cacheDOM() {
        DOM.body = document.body;

        DOM.activeDuels =
            document.getElementById("activeDuels");

        DOM.vaultBalance =
            document.getElementById("vaultBalance");

        DOM.networkText =
            document.getElementById("networkText");

        DOM.modeIndicator =
            document.getElementById("modeIndicator");

        DOM.modeSymbol =
            document.getElementById("modeSymbol");

        DOM.modeTitle =
            document.getElementById("modeTitle");

        DOM.modeDescription =
            document.getElementById("modeDescription");

        DOM.arenaCard =
            document.getElementById("arenaCard");

        DOM.matchState =
            document.getElementById("matchState");

        DOM.userFocusStatus =
            document.getElementById("userFocusStatus");

        DOM.opponentFocusStatus =
            document.getElementById("opponentFocusStatus");

        DOM.stakeAmount =
            document.getElementById("stakeAmount");

        DOM.stakeLock =
            document.getElementById("stakeLock");

        DOM.duelTimer =
            document.getElementById("duelTimer");

        DOM.timerState =
            document.getElementById("timerState");

        DOM.initiateButton =
            document.getElementById("initiateButton");

        DOM.lockButton =
            document.getElementById("lockButton");

        DOM.forfeitButton =
            document.getElementById("forfeitButton");

        DOM.userBalance =
            document.getElementById("userBalance");

        DOM.availableBalance =
            document.getElementById("availableBalance");

        DOM.lockedBalance =
            document.getElementById("lockedBalance");

        DOM.integrityPercent =
            document.getElementById("integrityPercent");

        DOM.integrityBar =
            document.getElementById("integrityBar");

        DOM.integrityText =
            document.getElementById("integrityText");

        DOM.telemetryFeed =
            document.getElementById("telemetryFeed");

        DOM.footerClock =
            document.getElementById("footerClock");

        DOM.resultModal =
            document.getElementById("resultModal");

        DOM.resultCard =
            document.getElementById("resultCard");

        DOM.resultIcon =
            document.getElementById("resultIcon");

        DOM.resultLabel =
            document.getElementById("resultLabel");

        DOM.resultTitle =
            document.getElementById("resultTitle");

        DOM.resultMessage =
            document.getElementById("resultMessage");

        DOM.resultAmount =
            document.getElementById("resultAmount");

        DOM.resultCloseButton =
            document.getElementById("resultCloseButton");

        DOM.toastContainer =
            document.getElementById("toastContainer");
    }

    /* ============================================================
       UTILS
    ============================================================ */

    const Utils = {

        clamp(value, min, max) {
            return Math.min(
                Math.max(value, min),
                max
            );
        },

        formatNumber(value) {
            return Number(value).toLocaleString("en-US");
        },

        pad(value) {
            return String(value).padStart(2, "0");
        },

        formatTime(milliseconds) {

            const totalSeconds =
                Math.max(
                    0,
                    Math.floor(milliseconds / 1000)
                );

            const hours =
                Math.floor(totalSeconds / 3600);

            const minutes =
                Math.floor(
                    (totalSeconds % 3600) / 60
                );

            const seconds =
                totalSeconds % 60;

            return [
                Utils.pad(hours),
                Utils.pad(minutes),
                Utils.pad(seconds)
            ].join(":");
        },

        currentTime() {

            return new Intl.DateTimeFormat(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false
                }
            ).format(new Date());
        },

        random(min, max) {

            return Math.floor(
                Math.random() *
                (max - min + 1)
            ) + min;
        }
    };

    /* ============================================================
       WEB AUDIO ENGINE
    ============================================================ */

    class AudioEngine {

        constructor() {

            this.context = null;
            this.master = null;
            this.ready = false;

            this.nodes = new Set();
        }

        async initialize() {

            if (this.ready) {

                if (
                    this.context &&
                    this.context.state === "suspended"
                ) {
                    await this.context.resume();
                }

                return true;
            }

            try {

                const AudioContext =
                    window.AudioContext ||
                    window.webkitAudioContext;

                if (!AudioContext) {
                    return false;
                }

                this.context =
                    new AudioContext();

                this.master =
                    this.context.createGain();

                this.master.gain.setValueAtTime(
                    0.17,
                    this.context.currentTime
                );

                this.master.connect(
                    this.context.destination
                );

                await this.context.resume();

                this.ready = true;

                return true;

            } catch (error) {

                console.warn(
                    "Audio initialization failed.",
                    error
                );

                return false;
            }
        }

        async ensureReady() {

            if (!this.ready) {
                return this.initialize();
            }

            if (
                this.context &&
                this.context.state === "suspended"
            ) {
                await this.context.resume();
            }

            return true;
        }

        tone(options = {}) {

            if (
                !this.ready ||
                !this.context ||
                !this.master
            ) {
                return;
            }

            const {
                type = "sine",
                frequency = 440,
                gain = 0.04,
                duration = 0.12,
                attack = 0.005,
                detune = 0
            } = options;

            const now =
                this.context.currentTime;

            const oscillator =
                this.context.createOscillator();

            const envelope =
                this.context.createGain();

            oscillator.type = type;

            oscillator.frequency.setValueAtTime(
                frequency,
                now
            );

            oscillator.detune.setValueAtTime(
                detune,
                now
            );

            envelope.gain.setValueAtTime(
                0.0001,
                now
            );

            envelope.gain.exponentialRampToValueAtTime(
                Math.max(gain, 0.0001),
                now + attack
            );

            envelope.gain.exponentialRampToValueAtTime(
                0.0001,
                now + duration
            );

            oscillator.connect(envelope);
            envelope.connect(this.master);

            this.nodes.add(oscillator);

            oscillator.onended = () => {

                try {
                    oscillator.disconnect();
                    envelope.disconnect();
                } catch (_) {}

                this.nodes.delete(
                    oscillator
                );
            };

            oscillator.start(now);

            oscillator.stop(
                now + duration + 0.025
            );
        }

        async lobby() {

            await this.ensureReady();

            this.tone({
                type: "sine",
                frequency: 440,
                gain: 0.035,
                duration: 0.1
            });
        }

        async deploy() {

            await this.ensureReady();

            this.tone({
                type: "sawtooth",
                frequency: 130,
                gain: 0.055,
                duration: 0.13
            });

            setTimeout(() => {

                this.tone({
                    type: "sawtooth",
                    frequency: 180,
                    gain: 0.045,
                    duration: 0.13
                });

            }, 110);

            setTimeout(() => {

                this.tone({
                    type: "sawtooth",
                    frequency: 240,
                    gain: 0.04,
                    duration: 0.16
                });

            }, 220);
        }

        async victory() {

            await this.ensureReady();

            const notes =
                [523, 659, 784];

            notes.forEach(
                (frequency, index) => {

                    setTimeout(() => {

                        this.tone({
                            type: "sine",
                            frequency,
                            gain: 0.045,
                            duration: 0.18
                        });

                    }, index * 90);
                }
            );
        }

        async breach() {

            await this.ensureReady();

            this.tone({
                type: "sawtooth",
                frequency: 95,
                gain: 0.075,
                duration: 0.22
            });

            setTimeout(() => {

                this.tone({
                    type: "sawtooth",
                    frequency: 68,
                    gain: 0.06,
                    duration: 0.27
                });

            }, 180);
        }

        async ping() {

            await this.ensureReady();

            this.tone({
                type: "sine",
                frequency: 720,
                gain: 0.025,
                duration: 0.08
            });
        }

        async error() {

            await this.ensureReady();

            this.tone({
                type: "square",
                frequency: 150,
                gain: 0.035,
                duration: 0.1
            });
        }

        stopAll() {

            for (const node of this.nodes) {

                try {
                    node.stop();
                } catch (_) {}
            }

            this.nodes.clear();
        }
    }

    const audio =
        new AudioEngine();

    /* ============================================================
       APPLICATION STATE
    ============================================================ */

    const app = {

        state: STATE.LOBBY,

        userBalance:
            CONFIG.startingBalance,

        lockedBalance: 0,

        vault:
            CONFIG.startingVault,

        activeDuels:
            CONFIG.startingActiveDuels,

        integrity: 100,

        duelStartedAt: null,

        telemetryTimer: null,

        clockTimer: null,

        visibilityGuard: false,

        resultVisible: false,

        initialized: false
    };

    /* ============================================================
       PERSISTENCE
    ============================================================ */

    const Storage = {

        load() {

            try {

                const raw =
                    localStorage.getItem(
                        CONFIG.storageKey
                    );

                if (!raw) {
                    return;
                }

                const saved =
                    JSON.parse(raw);

                if (
                    typeof saved.userBalance ===
                    "number"
                ) {
                    app.userBalance =
                        Utils.clamp(
                            saved.userBalance,
                            0,
                            999999
                        );
                }

                if (
                    typeof saved.vault ===
                    "number"
                ) {
                    app.vault =
                        Math.max(
                            0,
                            saved.vault
                        );
                }

            } catch (error) {

                console.warn(
                    "Could not restore local state.",
                    error
                );
            }
        },

        save() {

            try {

                localStorage.setItem(
                    CONFIG.storageKey,
                    JSON.stringify({
                        userBalance:
                            app.userBalance,

                        vault:
                            app.vault
                    })
                );

            } catch (error) {

                console.warn(
                    "Could not save local state.",
                    error
                );
            }
        }
    };

    /* ============================================================
       UI ENGINE
    ============================================================ */

    const UI = {

        renderBalances() {

            DOM.userBalance.textContent =
                Utils.formatNumber(
                    app.userBalance
                );

            DOM.availableBalance.textContent =
                `${Utils.formatNumber(
                    app.userBalance
                )} FC`;

            DOM.lockedBalance.textContent =
                `${Utils.formatNumber(
                    app.lockedBalance
                )} FC`;

            DOM.vaultBalance.textContent =
                Utils.formatNumber(
                    app.vault
                );
        },

        renderIntegrity() {

            const value =
                Utils.clamp(
                    app.integrity,
                    0,
                    100
                );

            DOM.integrityPercent.textContent =
                `${value}%`;

            DOM.integrityBar.style.width =
                `${value}%`;

            if (value >= 80) {

                DOM.integrityText.textContent =
                    "Focus channel operating normally.";

            } else if (value >= 50) {

                DOM.integrityText.textContent =
                    "Focus channel degraded.";

            } else {

                DOM.integrityText.textContent =
                    "Focus channel integrity critically low.";
            }
        },

        renderState() {

            DOM.modeIndicator.classList.remove(
                "combat",
                "breach"
            );

            DOM.arenaCard.classList.remove(
                "combat",
                "breach"
            );

            DOM.body.classList.remove(
                "combat",
                "breach"
            );

            DOM.matchState.classList.remove(
                "live",
                "breach"
            );

            switch (app.state) {

                case STATE.LOBBY:

                    DOM.modeSymbol.textContent =
                        "○";

                    DOM.modeTitle.textContent =
                        "LOBBY READY";

                    DOM.modeDescription.textContent =
                        "Waiting for duel deployment.";

                    DOM.matchState.innerHTML =
                        "<span></span> LOBBY";

                    DOM.userFocusStatus.textContent =
                        "READY";

                    DOM.opponentFocusStatus.textContent =
                        "READY";

                    DOM.stakeLock.classList.remove(
                        "locked"
                    );

                    DOM.stakeLock.innerHTML =
                        "<span>◈</span> STAKE UNLOCKED";

                    DOM.initiateButton.disabled =
                        false;

                    DOM.lockButton.disabled =
                        true;

                    DOM.forfeitButton.disabled =
                        true;

                    break;

                case STATE.ARMED:

                    DOM.modeIndicator.classList.add(
                        "combat"
                    );

                    DOM.arenaCard.classList.add(
                        "combat"
                    );

                    DOM.body.classList.add(
                        "combat"
                    );

                    DOM.modeSymbol.textContent =
                        "◈";

                    DOM.modeTitle.textContent =
                        "DUEL ARMED";

                    DOM.modeDescription.textContent =
                        "Opponent connection established.";

                    DOM.matchState.classList.add(
                        "live"
                    );

                    DOM.matchState.innerHTML =
                        "<span></span> ARMED";

                    DOM.initiateButton.disabled =
                        true;

                    DOM.lockButton.disabled =
                        false;

                    DOM.forfeitButton.disabled =
                        true;

                    break;

                case STATE.LIVE:

                    DOM.modeIndicator.classList.add(
                        "combat"
                    );

                    DOM.arenaCard.classList.add(
                        "combat"
                    );

                    DOM.body.classList.add(
                        "combat"
                    );

                    DOM.modeSymbol.textContent =
                        "⚡";

                    DOM.modeTitle.textContent =
                        "LIVE FOCUS DUEL";

                    DOM.modeDescription.textContent =
                        "Shield deployed. Focus channel active.";

                    DOM.matchState.classList.add(
                        "live"
                    );

                    DOM.matchState.innerHTML =
                        "<span></span> LIVE";

                    DOM.userFocusStatus.textContent =
                        "FOCUS LOCKED";

                    DOM.opponentFocusStatus.textContent =
                        "FOCUS LOCKED";

                    DOM.stakeLock.classList.add(
                        "locked"
                    );

                    DOM.stakeLock.innerHTML =
                        "<span>◆</span> STAKE LOCKED";

                    DOM.initiateButton.disabled =
                        true;

                    DOM.lockButton.disabled =
                        true;

                    DOM.forfeitButton.disabled =
                        false;

                    DOM.timerState.textContent =
                        "LIVE";

                    DOM.duelTimer.parentElement.classList.add(
                        "live"
                    );

                    break;

                case STATE.FORFEITED:

                    DOM.modeIndicator.classList.add(
                        "breach"
                    );

                    DOM.arenaCard.classList.add(
                        "breach"
                    );

                    DOM.body.classList.add(
                        "breach"
                    );

                    DOM.modeSymbol.textContent =
                        "!";

                    DOM.modeTitle.textContent =
                        "DUEL FORFEITED";

                    DOM.modeDescription.textContent =
                        "Focus session ended after an interruption.";

                    DOM.matchState.classList.add(
                        "breach"
                    );

                    DOM.matchState.innerHTML =
                        "<span></span> FORFEITED";

                    DOM.userFocusStatus.textContent =
                        "FORFEITED";

                    DOM.opponentFocusStatus.textContent =
                        "SESSION ENDED";

                    DOM.timerState.textContent =
                        "ENDED";

                    DOM.initiateButton.disabled =
                        true;

                    DOM.lockButton.disabled =
                        true;

                    DOM.forfeitButton.disabled =
                        true;

                    break;

                case STATE.VICTORY:

                    DOM.modeIndicator.classList.remove(
                        "combat"
                    );

                    DOM.modeSymbol.textContent =
                        "✓";

                    DOM.modeTitle.textContent =
                        "DUEL COMPLETE";

                    DOM.modeDescription.textContent =
                        "Focus session completed successfully.";

                    DOM.matchState.innerHTML =
                        "<span></span> COMPLETE";

                    DOM.userFocusStatus.textContent =
                        "COMPLETE";

                    DOM.opponentFocusStatus.textContent =
                        "COMPLETE";

                    DOM.initiateButton.disabled =
                        false;

                    DOM.lockButton.disabled =
                        true;

                    DOM.forfeitButton.disabled =
                        true;

                    DOM.timerState.textContent =
                        "COMPLETE";

                    break;
            }

            UI.renderIntegrity();
        },

        renderTimer() {

            if (!app.duelStartedAt) {

                DOM.duelTimer.textContent =
                    "00:00:00";

                return;
            }

            const elapsed =
                Date.now() -
                app.duelStartedAt;

            DOM.duelTimer.textContent =
                Utils.formatTime(
                    elapsed
                );

            if (
                app.state === STATE.LIVE &&
                elapsed >= CONFIG.duelDurationMs
            ) {
                Arena.completeDuel();
            }
        },

        addEvent(message, type = "normal") {

            const row =
                document.createElement("div");

            row.className =
                `event ${
                    type === "combat"
                        ? "combat-event"
                        : type === "breach"
                            ? "breach-event"
                            : ""
                }`;

            const time =
                document.createElement("time");

            time.textContent =
                Utils.currentTime();

            const dot =
                document.createElement("span");

            const text =
                document.createElement("p");

            text.textContent =
                message;

            row.append(
                time,
                dot,
                text
            );

            DOM.telemetryFeed.prepend(
                row
            );

            while (
                DOM.telemetryFeed.children.length >
                CONFIG.maxTelemetry
            ) {

                DOM.telemetryFeed.lastElementChild.remove();
            }
        },

        toast(message, type = "normal") {

            const toast =
                document.createElement("div");

            toast.className =
                `toast ${
                    type === "error"
                        ? "error"
                        : ""
                }`;

            toast.textContent =
                message;

            DOM.toastContainer.appendChild(
                toast
            );

            setTimeout(() => {
                toast.remove();
            }, 3300);
        },

        showResult({
            breach = false,
            title,
            message,
            amount
        }) {

            app.resultVisible = true;

            DOM.resultCard.classList.toggle(
                "breach",
                breach
            );

            DOM.resultIcon.textContent =
                breach ? "!" : "✓";

            DOM.resultLabel.textContent =
                breach
                    ? "DUEL FORFEITED"
                    : "DUEL COMPLETE";

            DOM.resultTitle.textContent =
                title;

            DOM.resultMessage.textContent =
                message;

            DOM.resultAmount.textContent =
                amount;

            DOM.resultModal.classList.add(
                "visible"
            );

            DOM.resultModal.setAttribute(
                "aria-hidden",
                "false"
            );
        },

        hideResult() {

            app.resultVisible = false;

            DOM.resultModal.classList.remove(
                "visible"
            );

            DOM.resultModal.setAttribute(
                "aria-hidden",
                "true"
            );
        }
    };

    /* ============================================================
       STATE MACHINE
    ============================================================ */

    const StateMachine = {

        transition(next, meta = {}) {

            const current =
                app.state;

            const transitions = {

                [STATE.LOBBY]: [
                    STATE.ARMED
                ],

                [STATE.ARMED]: [
                    STATE.LIVE,
                    STATE.LOBBY
                ],

                [STATE.LIVE]: [
                    STATE.FORFEITED,
                    STATE.VICTORY
                ],

                [STATE.FORFEITED]: [
                    STATE.LOBBY
                ],

                [STATE.VICTORY]: [
                    STATE.LOBBY
                ]
            };

            if (
                current === next ||
                !transitions[current]?.includes(next)
            ) {

                return false;
            }

            app.state = next;

            StateMachine.enter(
                next,
                meta
            );

            return true;
        },

        enter(state, meta) {

            switch (state) {

                case STATE.LOBBY:
                    Arena.enterLobby();
                    break;

                case STATE.ARMED:
                    Arena.enterArmed();
                    break;

                case STATE.LIVE:
                    Arena.enterLive();
                    break;

                case STATE.FORFEITED:
                    Arena.enterForfeited(
                        meta
                    );
                    break;

                case STATE.VICTORY:
                    Arena.enterVictory();
                    break;
            }

            UI.renderState();
        }
    };

    /* ============================================================
       ARENA ENGINE
    ============================================================ */

    const Arena = {

        initiate() {

            audio.ensureReady();

            if (
                app.state !== STATE.LOBBY &&
                app.state !== STATE.VICTORY
            ) {
                return;
            }

            if (
                app.userBalance <
                CONFIG.duelStake
            ) {

                UI.toast(
                    "Not enough virtual Focus Coins to lock this duel stake.",
                    "error"
                );

                audio.error();

                return;
            }

            UI.addEvent(
                "Opponent connection request accepted.",
                "combat"
            );

            UI.addEvent(
                "Duel parameters synchronized.",
                "combat"
            );

            StateMachine.transition(
                STATE.ARMED
            );

            audio.deploy();
        },

        lockStake() {

            if (
                app.state !== STATE.ARMED
            ) {
                return;
            }

            if (
                app.userBalance <
                CONFIG.duelStake
            ) {

                UI.toast(
                    "Virtual balance is insufficient.",
                    "error"
                );

                audio.error();

                return;
            }

            app.userBalance -=
                CONFIG.duelStake;

            app.lockedBalance =
                CONFIG.duelStake;

            Storage.save();

            UI.renderBalances();

            UI.addEvent(
                "Virtual stake locked locally.",
                "combat"
            );

            UI.addEvent(
                "Shield deployment acknowledged.",
                "combat"
            );

            StateMachine.transition(
                STATE.LIVE
            );

            audio.deploy();
        },

        enterLobby() {

            app.duelStartedAt = null;

            app.lockedBalance = 0;

            app.integrity = 100;

            app.visibilityGuard = false;

            UI.renderBalances();
            UI.renderIntegrity();
            UI.renderTimer();

            UI.addEvent(
                "Arena returned to lobby."
            );
        },

        enterArmed() {

            UI.addEvent(
                "Focus duel armed. Awaiting shield deployment.",
                "combat"
            );

            UI.toast(
                "Duel armed. Lock the virtual stake to deploy the shield."
            );
        },

        enterLive() {

            app.duelStartedAt =
                Date.now();

            app.visibilityGuard =
                true;

            app.integrity = 100;

            UI.addEvent(
                "Focus shield deployed successfully.",
                "combat"
            );

            UI.addEvent(
                "Live duel synchronization established.",
                "combat"
            );

            UI.toast(
                "Focus duel is live."
            );

            Arena.startTelemetry();

            audio.deploy();
        },

        enterForfeited(meta) {

            app.visibilityGuard =
                false;

            const locked =
                app.lockedBalance;

            app.lockedBalance = 0;

            app.vault += locked;

            app.integrity =
                Utils.clamp(
                    app.integrity - 25,
                    0,
                    100
                );

            Storage.save();

            UI.renderBalances();
            UI.renderIntegrity();

            UI.addEvent(
                `Duel forfeited. ${Utils.formatNumber(
                    locked
                )} virtual Focus Coins transferred to the escrow simulation.`,
                "breach"
            );

            UI.showResult({
                breach: true,
                title: "DUEL FORFEITED",
                message:
                    meta.reason ||
                    "The active focus session ended after a visibility interruption.",
                amount:
                    `+${Utils.formatNumber(
                        locked
                    )} FC`
            });

            Arena.stopTelemetry();

            audio.breach();
        },

        enterVictory() {

            app.visibilityGuard =
                false;

            const locked =
                app.lockedBalance;

            app.lockedBalance = 0;

            /*
             * This is a local virtual reward:
             * the player's locked virtual stake is returned,
             * plus an equal virtual reward for completing the
             * session. No real-money value is created.
             */

            const reward =
                locked * 2;

            app.userBalance +=
                reward;

            app.integrity = 100;

            Storage.save();

            UI.renderBalances();
            UI.renderIntegrity();

            UI.addEvent(
                "Focus duel completed successfully."
            );

            UI.addEvent(
                `${Utils.formatNumber(
                    reward
                )} virtual Focus Coins returned as session reward.`
            );

            UI.showResult({
                breach: false,
                title: "FOCUS DUEL COMPLETE",
                message:
                    "The virtual focus session reached its completion window.",
                amount:
                    `+${Utils.formatNumber(
                        reward
                    )} FC`
            });

            Arena.stopTelemetry();

            audio.victory();
        },

        completeDuel() {

            if (
                app.state !== STATE.LIVE
            ) {
                return;
            }

            StateMachine.transition(
                STATE.VICTORY
            );
        },

        forfeit(reason) {

            if (
                app.state !== STATE.LIVE
            ) {
                return;
            }

            StateMachine.transition(
                STATE.FORFEITED,
                {
                    reason
                }
            );
        },

        startTelemetry() {

            Arena.stopTelemetry();

            app.telemetryTimer =
                setInterval(() => {

                    if (
                        app.state !== STATE.LIVE
                    ) {
                        return;
                    }

                    const messages = [
                        "Peer heartbeat acknowledged.",
                        "Opponent focus state synchronized.",
                        "Shield integrity check passed.",
                        "Duel synchronization remains stable.",
                        "Focus channel heartbeat received.",
                        "Peer execution state refreshed.",
                        "Arena latency check passed.",
                        "Distraction shield remains active."
                    ];

                    const message =
                        messages[
                            Utils.random(
                                0,
                                messages.length - 1
                            )
                        ];

                    UI.addEvent(
                        message,
                        "combat"
                    );

                    audio.ping();

                }, CONFIG.telemetryInterval);
        },

        stopTelemetry() {

            if (
                app.telemetryTimer
            ) {

                clearInterval(
                    app.telemetryTimer
                );

                app.telemetryTimer =
                    null;
            }
        }
    };

    /* ============================================================
       VISIBILITY ACCOUNTABILITY
    ============================================================ */

    function handleVisibilityChange() {

        if (
            document.visibilityState ===
            "hidden"
        ) {

            if (
                app.state === STATE.LIVE &&
                app.visibilityGuard
            ) {

                app.visibilityGuard =
                    false;

                UI.addEvent(
                    "Visibility interruption detected.",
                    "breach"
                );

                Arena.forfeit(
                    "The duel was automatically forfeited because the active session lost browser visibility."
                );
            }

            return;
        }

        if (
            document.visibilityState ===
            "visible"
        ) {

            if (
                app.state === STATE.LIVE
            ) {

                /*
                 * Do not silently restore a live duel.
                 * The state remains forfeited once the
                 * browser visibility guard has fired.
                 */

                UI.addEvent(
                    "Arena visibility restored."
                );
            }
        }
    }

    /* ============================================================
       BUTTON HANDLERS
    ============================================================ */

    async function handleInitiate() {

        await audio.ensureReady();

        Arena.initiate();
    }

    async function handleLock() {

        await audio.ensureReady();

        Arena.lockStake();
    }

    async function handleForfeit() {

        await audio.ensureReady();

        if (
            app.state !== STATE.LIVE
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                "End this virtual focus duel and transfer the locked virtual stake to the platform escrow simulation?"
            );

        if (!confirmed) {
            return;
        }

        Arena.forfeit(
            "The duel was voluntarily forfeited from the local arena."
        );
    }

    function closeResult() {

        UI.hideResult();

        if (
            app.state === STATE.VICTORY ||
            app.state === STATE.FORFEITED
        ) {

            StateMachine.transition(
                STATE.LOBBY
            );
        }
    }

    /* ============================================================
       GLOBAL CLOCK
    ============================================================ */

    function startClock() {

        UI.renderTimer();

        UI.footerClock.textContent =
            Utils.currentTime();

        app.clockTimer =
            setInterval(() => {

                DOM.footerClock.textContent =
                    Utils.currentTime();

                if (
                    app.state === STATE.LIVE
                ) {

                    UI.renderTimer();
                }

            }, CONFIG.clockInterval);
    }

    /* ============================================================
       AUDIO USER-GESTURE BOOTSTRAP
    ============================================================ */

    function audioBootstrap() {

        audio.ensureReady();
    }

    /* ============================================================
       EVENT BINDINGS
    ============================================================ */

    function bindEvents() {

        DOM.initiateButton.addEventListener(
            "click",
            handleInitiate
        );

        DOM.lockButton.addEventListener(
            "click",
            handleLock
        );

        DOM.forfeitButton.addEventListener(
            "click",
            handleForfeit
        );

        DOM.resultCloseButton.addEventListener(
            "click",
            closeResult
        );

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        document.addEventListener(
            "pointerdown",
            audioBootstrap,
            {
                passive: true
            }
        );

        document.addEventListener(
            "keydown",
            audioBootstrap
        );

        window.addEventListener(
            "beforeunload",
            () => {
                Storage.save();
                Arena.stopTelemetry();
                audio.stopAll();
            }
        );
    }

    /* ============================================================
       INITIALIZATION
    ============================================================ */

    function initialize() {

        if (app.initialized) {
            return;
        }

        cacheDOM();

        Storage.load();

        DOM.stakeAmount.textContent =
            CONFIG.duelStake;

        UI.renderBalances();
        UI.renderIntegrity();
        UI.renderState();
        UI.renderTimer();

        bindEvents();
        startClock();

        app.initialized = true;

        UI.addEvent(
            "Focus Arena engine initialized."
        );

        UI.addEvent(
            "Virtual economy ledger synchronized."
        );
    }

    /* ============================================================
       BOOT
    ============================================================ */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );

    } else {

        initialize();
    }

})();