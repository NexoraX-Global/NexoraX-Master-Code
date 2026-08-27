"use strict";

/*
 * TASKFORGE-CORE
 * Proof-of-Execution Feed Engine
 *
 * Architecture:
 *  - Local application state
 *  - Web Audio feedback controller
 *  - Dynamic execution-feed generator
 *  - Virtual Focus Coin economy
 *  - DOM event delegation
 *  - Animation lifecycle management
 *  - Defensive storage handling
 */

(() => {
    const CONFIG = Object.freeze({
        BOOST_COST: 10,
        PLATFORM_TAX: 1,
        INITIAL_WALLET: 500,
        INITIAL_VAULT: 4250500,

        FEED_INTERVAL_MIN: 10000,
        FEED_INTERVAL_MAX: 15000,

        MAX_FEED_ITEMS: 12,
        TOAST_DURATION: 3000,

        AUDIO_MASTER_VOLUME: 0.045
    });

    const PEERS = Object.freeze([
        "Rival_X",
        "Atlas_Node",
        "VectorPrime",
        "NovaGrid",
        "CipherUnit",
        "FocusCore",
        "DeltaForge",
        "Axiom_One",
        "QuantumDesk",
        "NorthStar",
        "ZeroDrift",
        "OrbitMind"
    ]);

    const TASKS = Object.freeze([
        "Deep Work Block",
        "Research Sprint",
        "Coding Session",
        "Study Block",
        "Design Session",
        "Writing Sprint",
        "Planning Session",
        "Problem-Solving Block"
    ]);

    const AVATAR_CHARS = [
        "RX",
        "AN",
        "VP",
        "NG",
        "CU",
        "FC",
        "DF",
        "AX",
        "QD",
        "NS",
        "ZD",
        "OM"
    ];

    class AudioController {
        constructor() {
            this.context = null;
            this.master = null;
            this.initialized = false;
            this.initializing = false;
        }

        async initialize() {
            if (this.initialized) {
                return true;
            }

            if (this.initializing) {
                return false;
            }

            this.initializing = true;

            try {
                const AudioContextClass =
                    window.AudioContext ||
                    window.webkitAudioContext;

                if (!AudioContextClass) {
                    this.initializing = false;
                    return false;
                }

                this.context = new AudioContextClass();

                this.master = this.context.createGain();
                this.master.gain.value =
                    CONFIG.AUDIO_MASTER_VOLUME;

                this.master.connect(this.context.destination);

                if (this.context.state === "suspended") {
                    await this.context.resume();
                }

                this.initialized = true;
                this.initializing = false;

                this.updateAudioStatus("READY");

                return true;
            } catch (error) {
                console.warn(
                    "Audio initialization failed:",
                    error
                );

                this.initializing = false;
                this.updateAudioStatus("UNAVAILABLE");

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
                try {
                    await this.context.resume();
                } catch (error) {
                    console.warn(
                        "Audio resume failed:",
                        error
                    );
                }
            }

            return true;
        }

        updateAudioStatus(status) {
            const element =
                document.getElementById("audioStatus");

            if (element) {
                element.textContent = status;
            }
        }

        createVoice({
            type = "sine",
            frequency = 440,
            startTime = 0,
            duration = 0.15,
            volume = 0.5,
            endFrequency = null
        }) {
            if (
                !this.initialized ||
                !this.context ||
                !this.master
            ) {
                return;
            }

            const now = this.context.currentTime;
            const start = now + startTime;

            const oscillator =
                this.context.createOscillator();

            const gain =
                this.context.createGain();

            oscillator.type = type;

            oscillator.frequency.setValueAtTime(
                frequency,
                start
            );

            if (endFrequency !== null) {
                oscillator.frequency.exponentialRampToValueAtTime(
                    Math.max(20, endFrequency),
                    start + duration
                );
            }

            gain.gain.setValueAtTime(
                0.0001,
                start
            );

            gain.gain.exponentialRampToValueAtTime(
                Math.max(0.0001, volume),
                start + 0.012
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                start + duration
            );

            oscillator.connect(gain);
            gain.connect(this.master);

            oscillator.start(start);
            oscillator.stop(start + duration + 0.025);
        }

        playBoostSuccess() {
            if (!this.initialized) {
                return;
            }

            this.createVoice({
                type: "sine",
                frequency: 620,
                duration: 0.11,
                volume: 0.35,
                endFrequency: 780
            });

            this.createVoice({
                type: "sine",
                frequency: 880,
                startTime: 0.075,
                duration: 0.17,
                volume: 0.28,
                endFrequency: 1040
            });
        }

        playNewEntry() {
            if (!this.initialized) {
                return;
            }

            this.createVoice({
                type: "sawtooth",
                frequency: 115,
                duration: 0.12,
                volume: 0.22,
                endFrequency: 75
            });

            this.createVoice({
                type: "sine",
                frequency: 330,
                startTime: 0.08,
                duration: 0.09,
                volume: 0.12,
                endFrequency: 440
            });
        }

        playError() {
            if (!this.initialized) {
                return;
            }

            this.createVoice({
                type: "square",
                frequency: 145,
                duration: 0.13,
                volume: 0.24,
                endFrequency: 105
            });

            this.createVoice({
                type: "square",
                frequency: 95,
                startTime: 0.11,
                duration: 0.14,
                volume: 0.18,
                endFrequency: 70
            });
        }

        playInterfacePing() {
            if (!this.initialized) {
                return;
            }

            this.createVoice({
                type: "sine",
                frequency: 520,
                duration: 0.08,
                volume: 0.12,
                endFrequency: 600
            });
        }
    }

    class EconomyEngine {
        constructor(audioController) {
            this.audio = audioController;

            this.wallet =
                this.loadNumber(
                    "taskforge_wallet",
                    CONFIG.INITIAL_WALLET
                );

            this.vault =
                this.loadNumber(
                    "taskforge_vault",
                    CONFIG.INITIAL_VAULT
                );

            this.boostedCards = new Set();

            this.walletElement =
                document.getElementById("walletBalance");

            this.vaultElement =
                document.getElementById("vaultBalance");

            this.walletStatus =
                document.getElementById("walletStatus");

            this.render();
        }

        loadNumber(key, fallback) {
            try {
                const stored =
                    window.localStorage.getItem(key);

                if (stored === null) {
                    return fallback;
                }

                const value = Number(stored);

                if (!Number.isFinite(value)) {
                    return fallback;
                }

                return Math.max(0, Math.floor(value));
            } catch {
                return fallback;
            }
        }

        save() {
            try {
                window.localStorage.setItem(
                    "taskforge_wallet",
                    String(this.wallet)
                );

                window.localStorage.setItem(
                    "taskforge_vault",
                    String(this.vault)
                );
            } catch {
                /*
                 * Storage can be unavailable in
                 * private browsing or restricted
                 * environments. The application
                 * continues using in-memory state.
                 */
            }
        }

        format(value) {
            return Math.max(
                0,
                Math.floor(value)
            ).toLocaleString("en-US");
        }

        render() {
            if (this.walletElement) {
                this.walletElement.textContent =
                    this.format(this.wallet);
            }

            if (this.vaultElement) {
                this.vaultElement.textContent =
                    this.format(this.vault);
            }

            if (this.walletStatus) {
                this.walletStatus.textContent =
                    this.wallet >= CONFIG.BOOST_COST
                        ? "READY"
                        : "LOW BALANCE";

                this.walletStatus.classList.toggle(
                    "green",
                    this.wallet >= CONFIG.BOOST_COST
                );
            }
        }

        animate(element, className) {
            if (!element) {
                return;
            }

            element.classList.remove(className);

            void element.offsetWidth;

            element.classList.add(className);

            window.setTimeout(() => {
                element.classList.remove(className);
            }, 550);
        }

        canBoost(cardId) {
            if (this.boostedCards.has(cardId)) {
                return {
                    allowed: false,
                    reason: "already-boosted"
                };
            }

            if (this.wallet < CONFIG.BOOST_COST) {
                return {
                    allowed: false,
                    reason: "insufficient-funds"
                };
            }

            return {
                allowed: true,
                reason: null
            };
        }

        boost(card, cardId) {
            const result = this.canBoost(cardId);

            if (!result.allowed) {
                if (result.reason === "already-boosted") {
                    showToast(
                        "This execution has already been boosted.",
                        "INFO"
                    );

                    this.audio.playInterfacePing();

                    return false;
                }

                this.audio.playError();

                flashCardError(card);

                showToast(
                    `You need ${CONFIG.BOOST_COST} FC to boost this execution.`,
                    "INSUFFICIENT BALANCE"
                );

                return false;
            }

            this.wallet -= CONFIG.BOOST_COST;
            this.vault += CONFIG.PLATFORM_TAX;

            this.boostedCards.add(cardId);

            this.save();
            this.render();

            this.animate(
                this.walletElement,
                "wallet-flash"
            );

            this.animate(
                this.vaultElement,
                "vault-flash"
            );

            card.classList.add("boosted");

            const button =
                card.querySelector("[data-boost]");

            const status =
                card.querySelector(".boost-status");

            if (button) {
                button.disabled = true;
                button.innerHTML =
                    "<span>✓</span> BOOSTED";
            }

            if (status) {
                status.textContent = "BOOSTED";
            }

            this.audio.playBoostSuccess();

            showToast(
                `Execution boosted. ${CONFIG.BOOST_COST} FC used.`,
                "BOOST CONFIRMED"
            );

            return true;
        }
    }

    class FeedEngine {
        constructor(audioController) {
            this.audio = audioController;

            this.container =
                document.getElementById("feedContainer");

            this.counter =
                document.getElementById("entryCounter");

            this.generatedEntries = 0;

            this.timer = null;

            this.isRunning = false;
        }

        start() {
            if (this.isRunning) {
                return;
            }

            this.isRunning = true;

            this.scheduleNext();
        }

        stop() {
            this.isRunning = false;

            if (this.timer !== null) {
                window.clearTimeout(this.timer);
                this.timer = null;
            }
        }

        scheduleNext() {
            if (!this.isRunning) {
                return;
            }

            const delay =
                randomInteger(
                    CONFIG.FEED_INTERVAL_MIN,
                    CONFIG.FEED_INTERVAL_MAX
                );

            this.timer = window.setTimeout(() => {
                this.generateEntry();
                this.scheduleNext();
            }, delay);
        }

        generateEntry() {
            if (!this.container) {
                return;
            }

            const peerIndex =
                randomInteger(
                    0,
                    PEERS.length - 1
                );

            const taskIndex =
                randomInteger(
                    0,
                    TASKS.length - 1
                );

            const peer =
                PEERS[peerIndex];

            const task =
                TASKS[taskIndex];

            const duration =
                this.generateDuration();

            const avatar =
                AVATAR_CHARS[
                    peerIndex % AVATAR_CHARS.length
                ];

            const card =
                this.createCard({
                    peer,
                    task,
                    duration,
                    avatar
                });

            this.container.prepend(card);

            this.generatedEntries++;

            this.trimFeed();

            this.updateCounter();

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    card.classList.remove("entering");
                    card.classList.add("entered");
                });
            });

            this.audio.playNewEntry();
        }

        generateDuration() {
            const minutes =
                randomInteger(45, 240);

            const hours =
                Math.floor(minutes / 60);

            const remainder =
                minutes % 60;

            return {
                totalMinutes: minutes,
                display:
                    `${String(hours).padStart(2, "0")}:` +
                    `${String(remainder).padStart(2, "0")}:00`
            };
        }

        createCard(data) {
            const card =
                document.createElement("article");

            const cardId =
                `execution-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`;

            card.dataset.cardId = cardId;
            card.className =
                "execution-card entering";

            const age =
                this.generatedEntries === 0
                    ? "JUST NOW"
                    : "JUST NOW";

            card.innerHTML = `
                <div class="card-topline">
                    <span class="proof-badge">
                        ✓ PROOF VERIFIED
                    </span>

                    <time>${age}</time>
                </div>

                <div class="execution-main">
                    <div class="avatar">
                        ${escapeHTML(data.avatar)}
                    </div>

                    <div class="execution-copy">
                        <h3>
                            ${escapeHTML(data.peer)}
                        </h3>

                        <p>
                            completed a
                            <strong>
                                ${escapeHTML(data.durationText || `${data.duration.display} Focus Session`)}
                            </strong>
                        </p>
                    </div>
                </div>

                <div class="session-stats">
                    <div>
                        <span>DURATION</span>
                        <strong>
                            ${escapeHTML(data.duration.display)}
                        </strong>
                    </div>

                    <div>
                        <span>STATUS</span>
                        <strong class="green">
                            COMPLETED
                        </strong>
                    </div>

                    <div>
                        <span>PROOF</span>
                        <strong>
                            SYNCED
                        </strong>
                    </div>
                </div>

                <div class="card-action">
                    <button
                        class="boost-button"
                        type="button"
                        data-boost
                        aria-label="Boost this execution for 10 Focus Coins"
                    >
                        <span>⚡</span>
                        BOOST
                        <small>
                            (STAKE 10 FC)
                        </small>
                    </button>

                    <span class="boost-status">
                        UNBOOSTED
                    </span>
                </div>
            `;

            return card;
        }

        trimFeed() {
            const cards =
                this.container.querySelectorAll(
                    ".execution-card"
                );

            if (
                cards.length <=
                CONFIG.MAX_FEED_ITEMS
            ) {
                return;
            }

            for (
                let index =
                    CONFIG.MAX_FEED_ITEMS;
                index < cards.length;
                index++
            ) {
                cards[index].remove();
            }
        }

        updateCounter() {
            const cards =
                this.container.querySelectorAll(
                    ".execution-card"
                );

            if (this.counter) {
                this.counter.textContent =
                    String(cards.length)
                        .padStart(2, "0");
            }
        }
    }

    function randomInteger(min, max) {
        return Math.floor(
            Math.random() * (max - min + 1)
        ) + min;
    }

    function escapeHTML(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function flashCardError(card) {
        if (!card) {
            return;
        }

        card.animate(
            [
                {
                    transform: "translateX(0)",
                    borderColor:
                        "rgba(255,255,255,0.09)"
                },
                {
                    transform: "translateX(-5px)",
                    borderColor:
                        "rgba(255,51,0,0.55)"
                },
                {
                    transform: "translateX(5px)",
                    borderColor:
                        "rgba(255,51,0,0.55)"
                },
                {
                    transform: "translateX(-3px)",
                    borderColor:
                        "rgba(255,51,0,0.55)"
                },
                {
                    transform: "translateX(0)",
                    borderColor:
                        "rgba(255,255,255,0.09)"
                }
            ],
            {
                duration: 360,
                easing: "cubic-bezier(.4,0,.2,1)"
            }
        );
    }

    function showToast(message, title = "SYSTEM") {
        const container =
            document.getElementById("toastContainer");

        if (!container) {
            return;
        }

        const toast =
            document.createElement("div");

        toast.className =
            title === "INSUFFICIENT BALANCE"
                ? "toast error"
                : "toast";

        toast.innerHTML = `
            <strong>
                ${escapeHTML(title)}
            </strong>
            <br>
            ${escapeHTML(message)}
        `;

        container.appendChild(toast);

        window.setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform =
                "translateY(10px)";

            window.setTimeout(() => {
                toast.remove();
            }, 300);
        }, CONFIG.TOAST_DURATION);
    }

    function setupAudioPrompt(audio) {
        const prompt =
            document.getElementById("audioPrompt");

        const button =
            document.getElementById("enableAudio");

        if (!prompt || !button) {
            return;
        }

        button.addEventListener(
            "click",
            async () => {
                const ready =
                    await audio.initialize();

                if (ready) {
                    prompt.classList.add("hidden");
                    audio.playInterfacePing();
                }
            },
            {
                once: true
            }
        );

        const autoInitialize =
            async () => {
                const ready =
                    await audio.initialize();

                if (ready) {
                    prompt.classList.add("hidden");
                }
            };

        /*
         * Browsers require audio initialization to
         * happen after a user gesture. We therefore
         * use the first pointer/keyboard interaction
         * as the initialization point.
         */
        const interactionHandler =
            async () => {
                await autoInitialize();

                document.removeEventListener(
                    "pointerdown",
                    interactionHandler
                );

                document.removeEventListener(
                    "keydown",
                    interactionHandler
                );
            };

        document.addEventListener(
            "pointerdown",
            interactionHandler,
            {
                passive: true
            }
        );

        document.addEventListener(
            "keydown",
            interactionHandler,
            {
                passive: true
            }
        );
    }

    function setupFeedInteractions(economy) {
        const feed =
            document.getElementById(
                "feedContainer"
            );

        if (!feed) {
            return;
        }

        feed.addEventListener(
            "click",
            async (event) => {
                const button =
                    event.target.closest(
                        "[data-boost]"
                    );

                if (!button) {
                    return;
                }

                await audioController.ensureReady();

                const card =
                    button.closest(
                        ".execution-card"
                    );

                if (!card) {
                    return;
                }

                const cardId =
                    card.dataset.cardId ||
                    createStaticCardId(card);

                card.dataset.cardId = cardId;

                economy.boost(
                    card,
                    cardId
                );
            }
        );
    }

    function createStaticCardId(card) {
        const text =
            card.querySelector("h3")
                ?.textContent
                ?.trim() || "static";

        const duration =
            card.querySelector(
                ".session-stats strong"
            )
                ?.textContent
                ?.trim() || "unknown";

        return `static-${text}-${duration}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
    }

    function assignStaticCardIds() {
        const cards =
            document.querySelectorAll(
                ".execution-card"
            );

        cards.forEach((card) => {
            if (!card.dataset.cardId) {
                card.dataset.cardId =
                    createStaticCardId(card);
            }
        });
    }

    function updateStaticCounter() {
        const counter =
            document.getElementById(
                "entryCounter"
            );

        const feed =
            document.getElementById(
                "feedContainer"
            );

        if (!counter || !feed) {
            return;
        }

        const count =
            feed.querySelectorAll(
                ".execution-card"
            ).length;

        counter.textContent =
            String(count).padStart(2, "0");
    }

    function installVisibilityProtection(audio) {
        /*
         * Visibility changes are informational only.
         * The feed is not a focus-lock mechanism and
         * does not punish users for switching tabs.
         */
        document.addEventListener(
            "visibilitychange",
            () => {
                if (document.visibilityState === "visible") {
                    audio.playInterfacePing();
                }
            }
        );
    }

    function installGlobalInteractionAudio(audio) {
        const handler = async () => {
            await audio.ensureReady();
        };

        document.addEventListener(
            "click",
            handler,
            {
                passive: true
            }
        );
    }

    let audioController = null;

    function initializeApplication() {
        audioController =
            new AudioController();

        const economy =
            new EconomyEngine(
                audioController
            );

        const feed =
            new FeedEngine(
                audioController
            );

        assignStaticCardIds();
        updateStaticCounter();

        setupAudioPrompt(
            audioController
        );

        setupFeedInteractions(
            economy
        );

        installVisibilityProtection(
            audioController
        );

        installGlobalInteractionAudio(
            audioController
        );

        feed.start();

        window.TaskForgeCore = Object.freeze({
            audio: audioController,
            economy,
            feed
        });

        console.info(
            "TaskForge-Core execution feed initialized."
        );
    }

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeApplication,
            {
                once: true
            }
        );
    } else {
        initializeApplication();
    }
})();