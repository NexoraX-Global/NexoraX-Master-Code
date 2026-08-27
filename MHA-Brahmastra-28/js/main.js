"use strict";

/*
 * TASKFORGE-CORE
 * Accountability Pod Engine
 *
 * Three primary states:
 * 1. IDLE_LOBBY
 * 2. SECURE_LOCKDOWN
 * 3. BREACH_PENALTY
 *
 * Audio is synthesized entirely through Web Audio API.
 * No external audio files are required.
 */

(() => {
    /* ============================================================
       CONFIGURATION
    ============================================================ */

    const CONFIG = Object.freeze({
        initialCredits: 1000,
        breachPenalty: 50,
        initialVault: 1250000,
        initialPods: 14290,

        verification:
            "I accept the penalty for breaking my team's focus",

        heartbeatInterval: 1000,
        telemetryInterval: 4200,
        clockInterval: 1000,

        maxTelemetryEntries: 9,

        storageKey: "taskforge_accountability_state"
    });

    const STATES = Object.freeze({
        IDLE: "IDLE_LOBBY",
        SECURE: "SECURE_LOCKDOWN",
        BREACH: "BREACH_PENALTY"
    });

    /* ============================================================
       DOM CACHE
    ============================================================ */

    const DOM = {};

    function cacheDOM() {
        DOM.body = document.body;

        DOM.globalPods = document.getElementById("globalPods");
        DOM.vaultBalance = document.getElementById("vaultBalance");
        DOM.connectionState = document.getElementById("connectionState");

        DOM.systemState = document.getElementById("systemState");
        DOM.stateIcon = document.getElementById("stateIcon");
        DOM.stateTitle = document.getElementById("stateTitle");
        DOM.stateDescription = document.getElementById("stateDescription");

        DOM.memberCount = document.getElementById("memberCount");
        DOM.selfMember = document.getElementById("selfMember");
        DOM.yourStatus = document.getElementById("yourStatus");

        DOM.creditBalance = document.getElementById("creditBalance");

        DOM.sessionStatus = document.getElementById("sessionStatus");
        DOM.syncStatus = document.getElementById("syncStatus");
        DOM.integrityStatus = document.getElementById("integrityStatus");
        DOM.elapsedTime = document.getElementById("elapsedTime");

        DOM.engageButton = document.getElementById("engageButton");
        DOM.emergencyButton = document.getElementById("emergencyButton");

        DOM.eventFeed = document.getElementById("eventFeed");
        DOM.footerClock = document.getElementById("footerClock");

        DOM.penaltyModal = document.getElementById("penaltyModal");
        DOM.breachSource = document.getElementById("breachSource");
        DOM.verificationPrompt =
            document.getElementById("verificationPrompt");
        DOM.verificationInput =
            document.getElementById("verificationInput");
        DOM.verificationError =
            document.getElementById("verificationError");

        DOM.copyPromptButton =
            document.getElementById("copyPromptButton");
        DOM.confirmPenaltyButton =
            document.getElementById("confirmPenaltyButton");
        DOM.cancelPenaltyButton =
            document.getElementById("cancelPenaltyButton");

        DOM.toastContainer =
            document.getElementById("toastContainer");
    }

    /* ============================================================
       UTILITY FUNCTIONS
    ============================================================ */

    const Utils = {
        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },

        formatNumber(value) {
            return Number(value).toLocaleString("en-US");
        },

        pad(value) {
            return String(value).padStart(2, "0");
        },

        formatDuration(milliseconds) {
            const totalSeconds = Math.max(
                0,
                Math.floor(milliseconds / 1000)
            );

            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            return [
                Utils.pad(hours),
                Utils.pad(minutes),
                Utils.pad(seconds)
            ].join(":");
        },

        nowTime() {
            return new Intl.DateTimeFormat("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            }).format(new Date());
        },

        randomInt(min, max) {
            return Math.floor(
                Math.random() * (max - min + 1)
            ) + min;
        }
    };

    /* ============================================================
       WEB AUDIO ENGINE
    ============================================================ */

    class AudioEngine {
        constructor() {
            this.context = null;
            this.masterGain = null;
            this.initialized = false;
            this.enabled = true;
            this.activeNodes = new Set();
        }

        async initialize() {
            if (this.initialized && this.context) {
                if (this.context.state === "suspended") {
                    await this.context.resume();
                }

                return true;
            }

            try {
                const AudioContextClass =
                    window.AudioContext ||
                    window.webkitAudioContext;

                if (!AudioContextClass) {
                    console.warn(
                        "Web Audio API is unavailable in this browser."
                    );

                    return false;
                }

                this.context = new AudioContextClass();

                this.masterGain =
                    this.context.createGain();

                this.masterGain.gain.setValueAtTime(
                    0.18,
                    this.context.currentTime
                );

                this.masterGain.connect(
                    this.context.destination
                );

                await this.context.resume();

                this.initialized = true;

                return true;
            } catch (error) {
                console.warn(
                    "Audio initialization failed:",
                    error
                );

                return false;
            }
        }

        async ensureReady() {
            if (!this.initialized) {
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

        createOscillator({
            type = "sine",
            frequency = 440,
            gain = 0.06,
            duration = 0.12,
            attack = 0.005,
            release = 0.08,
            detune = 0
        } = {}) {
            if (
                !this.enabled ||
                !this.initialized ||
                !this.context ||
                !this.masterGain
            ) {
                return null;
            }

            const now = this.context.currentTime;

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
                now + Math.max(duration, attack + release)
            );

            oscillator.connect(envelope);
            envelope.connect(this.masterGain);

            this.activeNodes.add(oscillator);

            oscillator.onended = () => {
                try {
                    oscillator.disconnect();
                    envelope.disconnect();
                } catch (_) {}

                this.activeNodes.delete(oscillator);
            };

            oscillator.start(now);
            oscillator.stop(
                now + Math.max(duration, attack + release) + 0.02
            );

            return oscillator;
        }

        async ping() {
            await this.ensureReady();

            if (!this.initialized) {
                return;
            }

            this.createOscillator({
                type: "sine",
                frequency: 660,
                gain: 0.045,
                duration: 0.11
            });

            window.setTimeout(() => {
                this.createOscillator({
                    type: "sine",
                    frequency: 880,
                    gain: 0.03,
                    duration: 0.1
                });
            }, 80);
        }

        async engage() {
            await this.ensureReady();

            if (!this.initialized) {
                return;
            }

            this.createOscillator({
                type: "sine",
                frequency: 330,
                gain: 0.05,
                duration: 0.1
            });

            window.setTimeout(() => {
                this.createOscillator({
                    type: "sine",
                    frequency: 495,
                    gain: 0.055,
                    duration: 0.14
                });
            }, 90);

            window.setTimeout(() => {
                this.createOscillator({
                    type: "sine",
                    frequency: 660,
                    gain: 0.04,
                    duration: 0.18
                });
            }, 190);
        }

        async success() {
            await this.ensureReady();

            if (!this.initialized) {
                return;
            }

            [523, 659, 784].forEach((frequency, index) => {
                window.setTimeout(() => {
                    this.createOscillator({
                        type: "sine",
                        frequency,
                        gain: 0.045,
                        duration: 0.16
                    });
                }, index * 75);
            });
        }

        async alert() {
            await this.ensureReady();

            if (!this.initialized) {
                return;
            }

            this.createOscillator({
                type: "sawtooth",
                frequency: 115,
                gain: 0.08,
                duration: 0.19,
                attack: 0.008
            });

            window.setTimeout(() => {
                this.createOscillator({
                    type: "sawtooth",
                    frequency: 82,
                    gain: 0.065,
                    duration: 0.23,
                    attack: 0.008
                });
            }, 180);

            window.setTimeout(() => {
                this.createOscillator({
                    type: "sawtooth",
                    frequency: 115,
                    gain: 0.07,
                    duration: 0.19,
                    attack: 0.008
                });
            }, 400);
        }

        async error() {
            await this.ensureReady();

            if (!this.initialized) {
                return;
            }

            this.createOscillator({
                type: "square",
                frequency: 150,
                gain: 0.04,
                duration: 0.1
            });
        }

        stopAll() {
            for (const node of this.activeNodes) {
                try {
                    node.stop();
                } catch (_) {}
            }

            this.activeNodes.clear();
        }
    }

    const audio = new AudioEngine();

    /* ============================================================
       APPLICATION STATE
    ============================================================ */

    const app = {
        state: STATES.IDLE,

        credits: CONFIG.initialCredits,
        vault: CONFIG.initialVault,
        pods: CONFIG.initialPods,

        sessionStartedAt: null,
        lastBreachAt: null,
        breachSource: null,

        sessionElapsed: 0,
        integrity: 100,

        telemetryTimer: null,
        heartbeatTimer: null,
        clockTimer: null,

        breachModalOpen: false,
        visibilityGuard: false,

        initialized: false
    };

    /* ============================================================
       PERSISTENCE
    ============================================================ */

    const Persistence = {
        load() {
            try {
                const raw =
                    localStorage.getItem(
                        CONFIG.storageKey
                    );

                if (!raw) {
                    return;
                }

                const saved = JSON.parse(raw);

                if (
                    typeof saved.credits === "number" &&
                    Number.isFinite(saved.credits)
                ) {
                    app.credits = Utils.clamp(
                        saved.credits,
                        0,
                        999999
                    );
                }

                if (
                    typeof saved.vault === "number" &&
                    Number.isFinite(saved.vault)
                ) {
                    app.vault = Math.max(
                        0,
                        saved.vault
                    );
                }

                if (
                    typeof saved.pods === "number" &&
                    Number.isFinite(saved.pods)
                ) {
                    app.pods = Math.max(
                        0,
                        saved.pods
                    );
                }
            } catch (error) {
                console.warn(
                    "State restoration unavailable:",
                    error
                );
            }
        },

        save() {
            try {
                localStorage.setItem(
                    CONFIG.storageKey,
                    JSON.stringify({
                        credits: app.credits,
                        vault: app.vault,
                        pods: app.pods
                    })
                );
            } catch (error) {
                console.warn(
                    "State persistence unavailable:",
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
            DOM.creditBalance.textContent =
                Utils.formatNumber(app.credits);

            DOM.vaultBalance.textContent =
                Utils.formatNumber(app.vault);

            DOM.globalPods.textContent =
                Utils.formatNumber(app.pods);
        },

        renderState() {
            DOM.systemState.classList.remove(
                "secure-state",
                "breach-state"
            );

            DOM.body.classList.remove(
                "secure-mode",
                "breach-mode"
            );

            if (app.state === STATES.IDLE) {
                DOM.stateIcon.textContent = "○";
                DOM.stateTitle.textContent = "IDLE LOBBY";
                DOM.stateDescription.textContent =
                    "Awaiting pod synchronization.";

                DOM.sessionStatus.textContent =
                    "NOT ACTIVE";

                DOM.syncStatus.textContent =
                    "STANDBY";

                DOM.integrityStatus.textContent =
                    `${app.integrity}%`;

                DOM.yourStatus.textContent =
                    "LOBBY";

                DOM.engageButton.classList.remove(
                    "secure-button"
                );

                DOM.engageButton.querySelector(
                    ".button-text"
                ).textContent =
                    "SYNC & ENGAGE POD LOCKDOWN";

                return;
            }

            if (app.state === STATES.SECURE) {
                DOM.systemState.classList.add(
                    "secure-state"
                );

                DOM.body.classList.add(
                    "secure-mode"
                );

                DOM.stateIcon.textContent = "✓";
                DOM.stateTitle.textContent =
                    "SECURE POD LOCKDOWN";

                DOM.stateDescription.textContent =
                    "Focus channel synchronized.";

                DOM.sessionStatus.textContent =
                    "ACTIVE";

                DOM.syncStatus.textContent =
                    "SYNCHRONIZED";

                DOM.integrityStatus.textContent =
                    `${app.integrity}%`;

                DOM.yourStatus.textContent =
                    "DEEP WORK";

                DOM.engageButton.classList.add(
                    "secure-button"
                );

                DOM.engageButton.querySelector(
                    ".button-text"
                ).textContent =
                    "POD LOCKDOWN ACTIVE";

                DOM.connectionState.querySelector(
                    "span:last-child"
                ).textContent =
                    "FOCUS CHANNEL SECURE";

                return;
            }

            if (app.state === STATES.BREACH) {
                DOM.systemState.classList.add(
                    "breach-state"
                );

                DOM.body.classList.add(
                    "breach-mode"
                );

                DOM.stateIcon.textContent = "!";
                DOM.stateTitle.textContent =
                    "BREACH PENALTY";

                DOM.stateDescription.textContent =
                    "Accountability verification required.";

                DOM.sessionStatus.textContent =
                    "INTERRUPTED";

                DOM.syncStatus.textContent =
                    "BREACHED";

                DOM.integrityStatus.textContent =
                    `${app.integrity}%`;

                DOM.yourStatus.textContent =
                    "VERIFICATION";

                DOM.engageButton.classList.add(
                    "secure-button"
                );

                DOM.engageButton.querySelector(
                    ".button-text"
                ).textContent =
                    "VERIFICATION REQUIRED";

                DOM.connectionState.querySelector(
                    "span:last-child"
                ).textContent =
                    "BREACH DETECTED";
            }
        },

        renderElapsed() {
            if (!app.sessionStartedAt) {
                DOM.elapsedTime.textContent =
                    "00:00:00";

                return;
            }

            if (
                app.state !== STATES.SECURE &&
                app.state !== STATES.BREACH
            ) {
                return;
            }

            app.sessionElapsed =
                Date.now() -
                app.sessionStartedAt;

            DOM.elapsedTime.textContent =
                Utils.formatDuration(
                    app.sessionElapsed
                );
        },

        renderClock() {
            DOM.footerClock.textContent =
                Utils.nowTime();
        },

        addEvent(message, type = "normal") {
            const row =
                document.createElement("div");

            row.className =
                `event-row ${
                    type === "breach"
                        ? "breach-event"
                        : ""
                }`;

            const time =
                document.createElement("time");

            time.textContent =
                Utils.nowTime();

            const dot =
                document.createElement("span");

            dot.className = "event-dot";

            const text =
                document.createElement("p");

            text.textContent = message;

            row.append(
                time,
                dot,
                text
            );

            DOM.eventFeed.prepend(row);

            while (
                DOM.eventFeed.children.length >
                CONFIG.maxTelemetryEntries
            ) {
                DOM.eventFeed.lastElementChild.remove();
            }
        },

        showToast(message, type = "normal") {
            const toast =
                document.createElement("div");

            toast.className =
                `toast ${type === "error" ? "error" : ""}`;

            toast.textContent = message;

            DOM.toastContainer.appendChild(toast);

            window.setTimeout(() => {
                toast.classList.add("out");

                window.setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 3000);
        },

        openPenaltyModal(source) {
            app.breachModalOpen = true;

            DOM.breachSource.textContent =
                source === "visibility"
                    ? "SESSION VISIBILITY INTERRUPTED"
                    : "ACCOUNTABILITY EVENT DETECTED";

            DOM.verificationInput.value = "";

            DOM.verificationError.classList.remove(
                "visible"
            );

            DOM.verificationInput.classList.remove(
                "input-error"
            );

            DOM.penaltyModal.classList.add(
                "visible"
            );

            DOM.penaltyModal.setAttribute(
                "aria-hidden",
                "false"
            );

            window.setTimeout(() => {
                DOM.verificationInput.focus();
            }, 80);
        },

        closePenaltyModal() {
            app.breachModalOpen = false;

            DOM.penaltyModal.classList.remove(
                "visible"
            );

            DOM.penaltyModal.setAttribute(
                "aria-hidden",
                "true"
            );
        },

        setVerificationError(message) {
            DOM.verificationError.textContent =
                message;

            DOM.verificationError.classList.add(
                "visible"
            );

            DOM.verificationInput.classList.add(
                "input-error"
            );

            window.setTimeout(() => {
                DOM.verificationInput.classList.remove(
                    "input-error"
                );
            }, 450);
        },

        setButtonDisabled(disabled) {
            DOM.engageButton.disabled = disabled;

            DOM.engageButton.style.opacity =
                disabled ? "0.5" : "";

            DOM.engageButton.style.cursor =
                disabled ? "not-allowed" : "";
        }
    };

    /* ============================================================
       STATE MACHINE
    ============================================================ */

    const StateMachine = {
        transition(nextState, metadata = {}) {
            const current = app.state;

            if (current === nextState) {
                return false;
            }

            const allowed = {
                [STATES.IDLE]: [
                    STATES.SECURE
                ],

                [STATES.SECURE]: [
                    STATES.IDLE,
                    STATES.BREACH
                ],

                [STATES.BREACH]: [
                    STATES.SECURE,
                    STATES.IDLE
                ]
            };

            if (
                !allowed[current] ||
                !allowed[current].includes(nextState)
            ) {
                console.warn(
                    `Invalid transition: ${current} → ${nextState}`
                );

                return false;
            }

            app.state = nextState;

            this.onEnter(
                nextState,
                metadata
            );

            return true;
        },

        onEnter(state, metadata) {
            switch (state) {
                case STATES.IDLE:
                    this.enterIdle();
                    break;

                case STATES.SECURE:
                    this.enterSecure();
                    break;

                case STATES.BREACH:
                    this.enterBreach(metadata);
                    break;
            }

            UI.renderState();
        },

        enterIdle() {
            app.visibilityGuard = false;

            app.sessionStartedAt = null;
            app.sessionElapsed = 0;
            app.integrity = 100;

            UI.renderElapsed();

            UI.addEvent(
                "Local focus session returned to lobby."
            );

            UI.setButtonDisabled(false);

            UI.renderBalances();

            Persistence.save();
        },

        enterSecure() {
            app.visibilityGuard = true;

            if (!app.sessionStartedAt) {
                app.sessionStartedAt =
                    Date.now();
            }

            app.integrity = 100;

            UI.addEvent(
                "Pod #7712 synchronization confirmed."
            );

            UI.addEvent(
                "Focus channel locked to current session."
            );

            UI.renderElapsed();

            UI.setButtonDisabled(false);

            audio.engage();

            UI.showToast(
                "Pod synchronized. Focus channel secure."
            );

            this.startSecureLoops();
        },

        enterBreach(metadata) {
            app.visibilityGuard = false;

            app.lastBreachAt = Date.now();

            app.breachSource =
                metadata.source || "system";

            app.integrity =
                Utils.clamp(
                    app.integrity - 10,
                    0,
                    100
                );

            UI.addEvent(
                "Focus breach detected. Verification required.",
                "breach"
            );

            UI.addEvent(
                `Integrity adjusted to ${app.integrity}%.`,
                "breach"
            );

            UI.setButtonDisabled(true);

            audio.alert();

            UI.openPenaltyModal(
                app.breachSource
            );
        },

        startSecureLoops() {
            this.stopSecureLoops();

            app.heartbeatTimer =
                window.setInterval(() => {
                    if (
                        app.state !==
                        STATES.SECURE
                    ) {
                        return;
                    }

                    UI.renderElapsed();
                }, CONFIG.heartbeatInterval);

            app.telemetryTimer =
                window.setInterval(() => {
                    if (
                        app.state !==
                        STATES.SECURE
                    ) {
                        return;
                    }

                    Telemetry.emit();
                }, CONFIG.telemetryInterval);
        },

        stopSecureLoops() {
            if (app.heartbeatTimer) {
                clearInterval(
                    app.heartbeatTimer
                );

                app.heartbeatTimer = null;
            }

            if (app.telemetryTimer) {
                clearInterval(
                    app.telemetryTimer
                );

                app.telemetryTimer = null;
            }
        }
    };

    /* ============================================================
       TELEMETRY ENGINE
    ============================================================ */

    const Telemetry = {
        messages: [
            "Pod heartbeat acknowledged.",
            "Peer focus states remain synchronized.",
            "Network integrity check passed.",
            "Peer activity channel refreshed.",
            "Focus synchronization remains stable.",
            "Accountability heartbeat received.",
            "Pod #7712 remains operational.",
            "Global focus network telemetry refreshed."
        ],

        emit() {
            const index =
                Utils.randomInt(
                    0,
                    this.messages.length - 1
                );

            UI.addEvent(
                this.messages[index]
            );

            audio.ping();
        }
    };

    /* ============================================================
       SESSION ACTIONS
    ============================================================ */

    async function engagePod() {
        await audio.ensureReady();

        if (app.state === STATES.BREACH) {
            UI.showToast(
                "Resolve the accountability event first.",
                "error"
            );

            audio.error();

            return;
        }

        if (app.state === STATES.SECURE) {
            UI.showToast(
                "Pod lockdown is already active."
            );

            audio.ping();

            return;
        }

        StateMachine.transition(
            STATES.SECURE
        );
    }

    function emergencyExit() {
        if (app.state === STATES.IDLE) {
            UI.showToast(
                "No active focus session."
            );

            return;
        }

        if (app.state === STATES.BREACH) {
            UI.showToast(
                "Resolve verification before exiting.",
                "error"
            );

            audio.error();

            return;
        }

        const confirmed =
            window.confirm(
                "End the current local focus session?"
            );

        if (!confirmed) {
            return;
        }

        StateMachine.transition(
            STATES.IDLE
        );

        audio.ping();

        UI.showToast(
            "Focus session ended locally."
        );
    }

    /* ============================================================
       BREACH / PENALTY LOGIC
    ============================================================ */

    function triggerBreach(source) {
        if (
            app.state !== STATES.SECURE ||
            app.breachModalOpen
        ) {
            return;
        }

        StateMachine.transition(
            STATES.BREACH,
            {
                source
            }
        );
    }

    function validateVerification() {
        const entered =
            DOM.verificationInput.value;

        if (entered === CONFIG.verification) {
            return true;
        }

        return false;
    }

    async function acknowledgePenalty() {
        await audio.ensureReady();

        if (app.state !== STATES.BREACH) {
            return;
        }

        if (!validateVerification()) {
            UI.setVerificationError(
                "Exact verification required before restoration."
            );

            audio.error();

            return;
        }

        const penalty =
            Math.min(
                CONFIG.breachPenalty,
                app.credits
            );

        app.credits -= penalty;
        app.vault += penalty;

        Persistence.save();

        UI.renderBalances();

        UI.addEvent(
            `${Utils.formatNumber(penalty)} FC accountability cost recorded.`,
            "breach"
        );

        UI.addEvent(
            "Verification accepted. Focus channel restoring."
        );

        UI.closePenaltyModal();

        app.breachModalOpen = false;

        app.integrity = 100;

        StateMachine.transition(
            STATES.SECURE
        );

        await audio.success();

        UI.showToast(
            `${Utils.formatNumber(penalty)} FC recorded. Focus channel restored.`
        );
    }

    function remainInBreach() {
        UI.showToast(
            "Verification remains required.",
            "error"
        );

        DOM.verificationInput.focus();

        audio.error();
    }

    /* ============================================================
       DOCUMENT VISIBILITY GUARD
    ============================================================ */

    function handleVisibilityChange() {
        /*
         * Important:
         * The browser does not expose whether a visibility change
         * was caused by a deliberate tab switch, app switch,
         * browser minimization, or another OS-level transition.
         *
         * Therefore this handler treats a hidden document during an
         * active pod session as an interruption event.
         */

        if (
            document.visibilityState === "hidden" &&
            app.state === STATES.SECURE &&
            app.visibilityGuard
        ) {
            app.visibilityGuard = false;

            triggerBreach("visibility");

            return;
        }

        if (
            document.visibilityState === "visible" &&
            app.state === STATES.SECURE
        ) {
            app.visibilityGuard = true;

            UI.addEvent(
                "Visibility heartbeat restored."
            );
        }
    }

    /* ============================================================
       ANTI-PASTE / VERIFICATION INPUT
    ============================================================ */

    function preventPaste(event) {
        event.preventDefault();

        UI.setVerificationError(
            "Paste is disabled. Type the verification string manually."
        );

        audio.error();
    }

    function preventDrop(event) {
        event.preventDefault();

        UI.setVerificationError(
            "Manual typing is required."
        );

        audio.error();
    }

    function handleVerificationKeydown(event) {
        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();

            acknowledgePenalty();
        }
    }

    /* ============================================================
       COPY PROMPT
    ============================================================ */

    async function copyPrompt() {
        /*
         * Clipboard access is intentionally limited to the prompt
         * itself. Verification still requires manual entry.
         */

        try {
            if (
                navigator.clipboard &&
                navigator.clipboard.writeText
            ) {
                await navigator.clipboard.writeText(
                    CONFIG.verification
                );

                UI.showToast(
                    "Prompt copied for reference. Manual entry is still required."
                );

                return;
            }

            UI.showToast(
                "Clipboard unavailable on this browser.",
                "error"
            );
        } catch (error) {
            UI.showToast(
                "Clipboard permission was unavailable.",
                "error"
            );
        }
    }

    /* ============================================================
       GLOBAL CLOCK
    ============================================================ */

    function startClock() {
        UI.renderClock();

        if (app.clockTimer) {
            clearInterval(
                app.clockTimer
            );
        }

        app.clockTimer =
            window.setInterval(() => {
                UI.renderClock();
                UI.renderElapsed();
            }, CONFIG.clockInterval);
    }

    /* ============================================================
       AUDIO BOOTSTRAP
    ============================================================ */

    function initializeAudioOnInteraction() {
        audio.ensureReady();

        document.removeEventListener(
            "pointerdown",
            initializeAudioOnInteraction
        );

        document.removeEventListener(
            "keydown",
            initializeAudioOnInteraction
        );

        document.removeEventListener(
            "touchstart",
            initializeAudioOnInteraction
        );
    }

    /* ============================================================
       EVENT BINDINGS
    ============================================================ */

    function bindEvents() {
        DOM.engageButton.addEventListener(
            "click",
            engagePod
        );

        DOM.emergencyButton.addEventListener(
            "click",
            emergencyExit
        );

        DOM.confirmPenaltyButton.addEventListener(
            "click",
            acknowledgePenalty
        );

        DOM.cancelPenaltyButton.addEventListener(
            "click",
            remainInBreach
        );

        DOM.copyPromptButton.addEventListener(
            "click",
            copyPrompt
        );

        DOM.verificationInput.addEventListener(
            "paste",
            preventPaste
        );

        DOM.verificationInput.addEventListener(
            "drop",
            preventDrop
        );

        DOM.verificationInput.addEventListener(
            "keydown",
            handleVerificationKeydown
        );

        DOM.verificationInput.addEventListener(
            "input",
            () => {
                DOM.verificationError.classList.remove(
                    "visible"
                );
            }
        );

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        document.addEventListener(
            "pointerdown",
            initializeAudioOnInteraction,
            {
                once: false,
                passive: true
            }
        );

        document.addEventListener(
            "keydown",
            initializeAudioOnInteraction,
            {
                once: false
            }
        );

        document.addEventListener(
            "touchstart",
            initializeAudioOnInteraction,
            {
                once: false,
                passive: true
            }
        );

        window.addEventListener(
            "pagehide",
            () => {
                if (
                    app.state === STATES.SECURE
                ) {
                    /*
                     * pagehide is intentionally not used to modify
                     * localStorage or deduct credits automatically.
                     * The visible-state guard handles active
                     * accountability transitions.
                     */
                    app.visibilityGuard = false;
                }
            }
        );

        window.addEventListener(
            "beforeunload",
            () => {
                Persistence.save();
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

        Persistence.load();

        DOM.verificationPrompt.textContent =
            CONFIG.verification;

        UI.renderBalances();
        UI.renderState();
        UI.renderElapsed();

        startClock();
        bindEvents();

        app.initialized = true;

        UI.addEvent(
            "Accountability Pod interface initialized."
        );

        UI.addEvent(
            "Network telemetry channel online."
        );

        /*
         * We deliberately do not initialize AudioContext here.
         * Browsers commonly block autoplay audio.
         * It starts after the user's first interaction.
         */
    }

    /* ============================================================
       START
    ============================================================ */

    if (
        document.readyState === "loading"
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