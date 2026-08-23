"use strict";

/*
 * TASKFORGE-CORE
 * QUANTUM ASCENSION & GACHA VAULT
 *
 * Storage:
 * - taskforge_quantum_keys
 * - taskforge_inventory
 * - taskforge_focus_progress
 * - taskforge_recent_drops
 *
 * No external libraries are required.
 */

const STORAGE_KEYS = {
    keys: "taskforge_quantum_keys",
    inventory: "taskforge_quantum_inventory",
    focusProgress: "taskforge_focus_progress",
    recentDrops: "taskforge_recent_drops"
};

const STARTING_KEYS = 5;

const DROP_TABLE = [
    {
        rarity: "COMMON",
        chance: 60,
        className: "common",
        icon: "C"
    },
    {
        rarity: "RARE",
        chance: 25,
        className: "rare",
        icon: "R"
    },
    {
        rarity: "EPIC",
        chance: 12,
        className: "epic",
        icon: "E"
    },
    {
        rarity: "LEGENDARY",
        chance: 3,
        className: "legendary",
        icon: "L"
    }
];

const REWARD_POOL = {
    COMMON: [
        {
            name: "Forge Initiate",
            description: "A clean starter cosmetic for your TaskForge identity.",
            icon: "C"
        },
        {
            name: "Neon Operator",
            description: "Basic cyber-interface identity cosmetic.",
            icon: "◈"
        },
        {
            name: "Signal Runner",
            description: "A standard digital title from the Quantum network.",
            icon: "⌁"
        },
        {
            name: "Core Access",
            description: "A minimal badge representing consistent focus.",
            icon: "◇"
        }
    ],

    RARE: [
        {
            name: "Quantum Scout",
            description: "A rare cosmetic title for focused operators.",
            icon: "R"
        },
        {
            name: "Chrome Vanguard",
            description: "Enhanced visual identity cosmetic.",
            icon: "◆"
        },
        {
            name: "Pulse Architect",
            description: "Rare title from the productivity matrix.",
            icon: "✧"
        }
    ],

    EPIC: [
        {
            name: "Void Navigator",
            description: "Epic identity cosmetic from the deep-work network.",
            icon: "E"
        },
        {
            name: "Neural Architect",
            description: "An elite-grade productivity title.",
            icon: "Ψ"
        },
        {
            name: "Quantum Warden",
            description: "Epic cosmetic reserved for dedicated operators.",
            icon: "◉"
        }
    ],

    LEGENDARY: [
        {
            name: "Void Sovereign",
            description: "Legendary title representing mastery of the Quantum Core.",
            icon: "✦"
        },
        {
            name: "Quantum Ascendant",
            description: "Legendary identity cosmetic from the highest reward tier.",
            icon: "★"
        },
        {
            name: "Eternal Forge",
            description: "A legendary cosmetic symbolizing long-term consistency.",
            icon: "⬢"
        }
    ]
};

const state = {
    keys: STARTING_KEYS,
    inventory: [],
    focusProgress: 0,
    recentDrops: [],
    isOpening: false
};

const elements = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
    cacheElements();
    loadState();
    normalizeState();
    bindEvents();
    renderAll();
}

function cacheElements() {
    elements.keyBalance = document.getElementById("keyBalance");
    elements.inventoryCount = document.getElementById("inventoryCount");
    elements.inventoryTier = document.getElementById("inventoryTier");

    elements.openOne = document.getElementById("openOne");
    elements.openTen = document.getElementById("openTen");

    elements.earnKeyButton = document.getElementById("earnKeyButton");
    elements.focusProgress = document.getElementById("focusProgress");
    elements.focusProgressText = document.getElementById("focusProgressText");

    elements.inventoryButton = document.getElementById("inventoryButton");
    elements.closeInventory = document.getElementById("closeInventory");
    elements.inventoryDrawer = document.getElementById("inventoryDrawer");
    elements.drawerOverlay = document.getElementById("drawerOverlay");

    elements.inventoryList = document.getElementById("inventoryList");
    elements.drawerItemCount = document.getElementById("drawerItemCount");
    elements.drawerTier = document.getElementById("drawerTier");

    elements.recentDrops = document.getElementById("recentDrops");

    elements.revealOverlay = document.getElementById("revealOverlay");
    elements.revealCard = document.getElementById("revealCard");
    elements.revealRarity = document.getElementById("revealRarity");
    elements.revealIcon = document.getElementById("revealIcon");
    elements.revealName = document.getElementById("revealName");
    elements.revealDescription = document.getElementById("revealDescription");
    elements.revealContinue = document.getElementById("revealContinue");

    elements.toast = document.getElementById("toast");
    elements.toastIcon = document.getElementById("toastIcon");
    elements.toastText = document.getElementById("toastText");

    elements.vaultStage = document.getElementById("vaultStage");
    elements.particleContainer = document.getElementById("particleContainer");
}

function loadState() {
    const savedKeys = localStorage.getItem(STORAGE_KEYS.keys);
    const savedInventory = localStorage.getItem(STORAGE_KEYS.inventory);
    const savedFocus = localStorage.getItem(STORAGE_KEYS.focusProgress);
    const savedDrops = localStorage.getItem(STORAGE_KEYS.recentDrops);

    if (savedKeys !== null) {
        const parsedKeys = Number(savedKeys);

        if (Number.isFinite(parsedKeys) && parsedKeys >= 0) {
            state.keys = Math.floor(parsedKeys);
        }
    }

    if (savedInventory !== null) {
        try {
            const parsedInventory = JSON.parse(savedInventory);

            if (Array.isArray(parsedInventory)) {
                state.inventory = parsedInventory;
            }
        } catch (error) {
            state.inventory = [];
        }
    }

    if (savedFocus !== null) {
        const parsedFocus = Number(savedFocus);

        if (Number.isFinite(parsedFocus) && parsedFocus >= 0) {
            state.focusProgress = Math.min(100, parsedFocus);
        }
    }

    if (savedDrops !== null) {
        try {
            const parsedDrops = JSON.parse(savedDrops);

            if (Array.isArray(parsedDrops)) {
                state.recentDrops = parsedDrops;
            }
        } catch (error) {
            state.recentDrops = [];
        }
    }
}

function normalizeState() {
    state.keys = Math.max(0, Math.floor(Number(state.keys) || 0));

    state.focusProgress = Math.min(
        100,
        Math.max(0, Number(state.focusProgress) || 0)
    );

    if (!Array.isArray(state.inventory)) {
        state.inventory = [];
    }

    if (!Array.isArray(state.recentDrops)) {
        state.recentDrops = [];
    }

    state.inventory = state.inventory
        .filter(isValidReward)
        .slice(-100);

    state.recentDrops = state.recentDrops
        .filter(isValidReward)
        .slice(0, 8);

    saveState();
}

function isValidReward(item) {
    return Boolean(
        item &&
        typeof item.name === "string" &&
        typeof item.rarity === "string" &&
        typeof item.description === "string" &&
        typeof item.icon === "string"
    );
}

function saveState() {
    localStorage.setItem(
        STORAGE_KEYS.keys,
        String(state.keys)
    );

    localStorage.setItem(
        STORAGE_KEYS.inventory,
        JSON.stringify(state.inventory)
    );

    localStorage.setItem(
        STORAGE_KEYS.focusProgress,
        String(state.focusProgress)
    );

    localStorage.setItem(
        STORAGE_KEYS.recentDrops,
        JSON.stringify(state.recentDrops)
    );
}

function bindEvents() {
    elements.openOne.addEventListener("click", () => {
        openBoxes(1);
    });

    elements.openTen.addEventListener("click", () => {
        openBoxes(10);
    });

    elements.earnKeyButton.addEventListener("click", earnQuantumKey);

    elements.inventoryButton.addEventListener(
        "click",
        openInventory
    );

    elements.closeInventory.addEventListener(
        "click",
        closeInventory
    );

    elements.drawerOverlay.addEventListener(
        "click",
        closeInventory
    );

    elements.revealContinue.addEventListener(
        "click",
        closeReveal
    );

    document.addEventListener("keydown", handleKeyboard);
}

function handleKeyboard(event) {
    if (event.key === "Escape") {
        closeInventory();
        closeReveal();
    }
}

function renderAll() {
    renderKeys();
    renderFocus();
    renderInventory();
    renderRecentDrops();
    updateButtons();
}

function renderKeys() {
    elements.keyBalance.textContent = formatNumber(state.keys);
}

function renderFocus() {
    const progress = Math.round(state.focusProgress);

    elements.focusProgress.style.width = `${progress}%`;
    elements.focusProgressText.textContent = `${progress}%`;
}

function renderInventory() {
    const count = state.inventory.length;
    const tier = calculateTier(count);

    elements.inventoryCount.textContent = count;
    elements.drawerItemCount.textContent = count;

    elements.inventoryTier.textContent = tier;
    elements.drawerTier.textContent = tier;

    if (count === 0) {
        elements.inventoryList.innerHTML = `
            <div class="empty-inventory">
                YOUR COLLECTION IS EMPTY.<br>
                COMPLETE FOCUS WORK TO EARN KEYS.
            </div>
        `;
        return;
    }

    const reversedInventory = [...state.inventory].reverse();

    elements.inventoryList.innerHTML = reversedInventory
        .map(createInventoryItemHTML)
        .join("");
}

function renderRecentDrops() {
    if (state.recentDrops.length === 0) {
        elements.recentDrops.innerHTML = `
            <div class="empty-drops">
                NO REWARDS DISCOVERED YET
            </div>
        `;

        return;
    }

    elements.recentDrops.innerHTML = state.recentDrops
        .map(createDropEntryHTML)
        .join("");
}

function updateButtons() {
    const busy = state.isOpening;

    elements.openOne.disabled = busy || state.keys < 1;
    elements.openTen.disabled = busy || state.keys < 10;
}

function calculateTier(count) {
    if (count >= 30) {
        return "ASCENDANT";
    }

    if (count >= 15) {
        return "ELITE";
    }

    if (count >= 7) {
        return "OPERATIVE";
    }

    if (count >= 3) {
        return "SCOUT";
    }

    return "INITIATE";
}

function formatNumber(value) {
    return new Intl.NumberFormat("en-IN").format(value);
}

function earnQuantumKey() {
    if (state.isOpening) {
        return;
    }

    /*
     * A focus session is represented by a simple 5-step interaction.
     * Each click advances 20%. Completing it grants exactly one key.
     */
    state.focusProgress += 20;

    if (state.focusProgress < 100) {
        saveState();
        renderFocus();

        const remaining = Math.ceil(
            (100 - state.focusProgress) / 20
        );

        showToast(
            "⌁",
            `FOCUS PROGRESS +20% · ${remaining} STEP${remaining === 1 ? "" : "S"} LEFT`
        );

        pulseElement(elements.earnKeyButton);
        return;
    }

    state.focusProgress = 0;
    state.keys += 1;

    saveState();
    renderAll();

    createParticleBurst();
    flashBody();

    showToast(
        "◆",
        "FOCUS COMPLETE · +1 QUANTUM KEY"
    );
}

function openBoxes(amount) {
    if (state.isOpening) {
        return;
    }

    if (state.keys < amount) {
        showToast(
            "!",
            `NOT ENOUGH KEYS · ${amount} REQUIRED`
        );

        pulseElement(elements.keyBalance);
        return;
    }

    state.isOpening = true;
    state.keys -= amount;

    saveState();
    renderAll();

    document.body.classList.add("vault-open");

    setTimeout(() => {
        document.body.classList.remove("vault-open");
    }, 750);

    createParticleBurst();

    if (amount === 1) {
        const reward = rollReward();
        addReward(reward);

        setTimeout(() => {
            revealReward(reward);
            state.isOpening = false;
            updateButtons();
        }, 650);

        return;
    }

    openTenSequence();
}

function openTenSequence() {
    const rewards = [];

    for (let i = 0; i < 10; i += 1) {
        const reward = rollReward();
        rewards.push(reward);
        addReward(reward);
    }

    setTimeout(() => {
        showBatchSummary(rewards);

        state.isOpening = false;
        updateButtons();
    }, 700);
}

function rollReward() {
    const randomValue = Math.random() * 100;
    let cumulative = 0;

    for (const tier of DROP_TABLE) {
        cumulative += tier.chance;

        if (randomValue < cumulative) {
            return createRandomReward(tier);
        }
    }

    return createRandomReward(DROP_TABLE[0]);
}

function createRandomReward(tier) {
    const pool = REWARD_POOL[tier.rarity];

    const selected =
        pool[Math.floor(Math.random() * pool.length)];

    return {
        id: createUniqueId(),
        name: selected.name,
        description: selected.description,
        icon: selected.icon,
        rarity: tier.rarity,
        className: tier.className,
        timestamp: Date.now()
    };
}

function createUniqueId() {
    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
}

function addReward(reward) {
    state.inventory.push(reward);

    state.recentDrops.unshift(reward);

    state.inventory = state.inventory.slice(-100);
    state.recentDrops = state.recentDrops.slice(0, 8);

    saveState();

    renderInventory();
    renderRecentDrops();
    renderKeys();
}

function revealReward(reward) {
    elements.revealCard.className =
        `reveal-card ${reward.className}`;

    elements.revealRarity.textContent =
        reward.rarity;

    elements.revealIcon.textContent =
        reward.icon;

    elements.revealName.textContent =
        reward.name;

    elements.revealDescription.textContent =
        reward.description;

    elements.revealOverlay.classList.add("active");

    createParticleBurst(45);

    if (reward.rarity === "LEGENDARY") {
        createParticleBurst(70);
        flashBody();

        showToast(
            "★",
            "LEGENDARY REWARD DISCOVERED"
        );
    } else if (reward.rarity === "EPIC") {
        showToast(
            "✦",
            "EPIC REWARD DISCOVERED"
        );
    }
}

function closeReveal() {
    elements.revealOverlay.classList.remove("active");
}

function showBatchSummary(rewards) {
    const counts = {
        COMMON: 0,
        RARE: 0,
        EPIC: 0,
        LEGENDARY: 0
    };

    rewards.forEach((reward) => {
        counts[reward.rarity] += 1;
    });

    const legendary = counts.LEGENDARY;
    const epic = counts.EPIC;
    const rare = counts.RARE;
    const common = counts.COMMON;

    const summary = `
        <div class="batch-summary">
            <div class="reveal-topline">10× QUANTUM ACQUISITION</div>
            <div class="reveal-rarity">REWARDS ACQUIRED</div>
            <div class="reveal-icon">✦</div>
            <h2>${legendary > 0 ? "LEGENDARY FOUND" : "VAULT OPENED"}</h2>
            <p>
                COMMON ${common} ·
                RARE ${rare} ·
                EPIC ${epic} ·
                LEGENDARY ${legendary}
            </p>
            <div class="reveal-divider"></div>
            <button id="batchContinue" type="button">
                VIEW COLLECTION
            </button>
        </div>
    `;

    elements.revealCard.className =
        `reveal-card ${legendary > 0 ? "legendary" : epic > 0 ? "epic" : "rare"}`;

    elements.revealCard.innerHTML = summary;

    elements.revealOverlay.classList.add("active");

    const batchButton =
        document.getElementById("batchContinue");

    batchButton.addEventListener("click", () => {
        closeReveal();
        openInventory();
    });

    createParticleBurst(80);

    if (legendary > 0) {
        flashBody();

        showToast(
            "★",
            `${legendary} LEGENDARY DROP${legendary > 1 ? "S" : ""} DISCOVERED`
        );
    } else {
        showToast(
            "◆",
            "10× QUANTUM ACQUISITION COMPLETE"
        );
    }
}

function openInventory() {
    elements.inventoryDrawer.classList.add("open");
    elements.drawerOverlay.classList.add("open");
}

function closeInventory() {
    elements.inventoryDrawer.classList.remove("open");
    elements.drawerOverlay.classList.remove("open");
}

function createInventoryItemHTML(item) {
    const safeName = escapeHTML(item.name);
    const safeDescription = escapeHTML(item.description);
    const safeRarity = escapeHTML(item.rarity);
    const safeIcon = escapeHTML(item.icon);

    return `
        <article class="inventory-item ${item.className}">
            <div class="inventory-item-top">

                <div class="inventory-item-icon">
                    ${safeIcon}
                </div>

                <div class="inventory-item-name">
                    <strong>${safeName}</strong>
                    <span>${safeRarity}</span>
                </div>

            </div>

            <div class="inventory-item-description">
                ${safeDescription}
            </div>
        </article>
    `;
}

function createDropEntryHTML(item) {
    const safeName = escapeHTML(item.name);
    const safeRarity = escapeHTML(item.rarity);
    const safeIcon = escapeHTML(item.icon);

    return `
        <div class="drop-entry ${item.className}">

            <div class="drop-mini-icon">
                ${safeIcon}
            </div>

            <div class="drop-entry-copy">
                <strong>${safeName}</strong>
                <span>QUANTUM VAULT ACQUISITION</span>
            </div>

            <div class="drop-rarity">
                ${safeRarity}
            </div>

        </div>
    `;
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showToast(icon, message) {
    elements.toastIcon.textContent = icon;
    elements.toastText.textContent = message;

    elements.toast.classList.remove("show");

    void elements.toast.offsetWidth;

    elements.toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 2300);
}

function pulseElement(element) {
    element.animate(
        [
            {
                transform: "scale(1)"
            },
            {
                transform: "scale(1.12)"
            },
            {
                transform: "scale(1)"
            }
        ],
        {
            duration: 420,
            easing: "ease-out"
        }
    );
}

function flashBody() {
    document.body.classList.remove("impact");

    void document.body.offsetWidth;

    document.body.classList.add("impact");

    setTimeout(() => {
        document.body.classList.remove("impact");
    }, 450);
}

function createParticleBurst(count = 30) {
    const particleCount = Math.min(
        Math.max(count, 1),
        100
    );

    for (let i = 0; i < particleCount; i += 1) {
        const particle =
            document.createElement("div");

        particle.className = "reward-particle";

        particle.style.left =
            `${40 + Math.random() * 20}%`;

        particle.style.top =
            `${40 + Math.random() * 20}%`;

        particle.style.setProperty(
            "--x",
            Math.random()
        );

        particle.style.setProperty(
            "--y",
            Math.random()
        );

        const size =
            4 + Math.random() * 6;

        particle.style.width =
            `${size}px`;

        particle.style.height =
            `${size}px`;

        if (Math.random() > 0.45) {
            particle.style.background =
                "#bf00ff";

            particle.style.boxShadow =
                "0 0 12px #bf00ff";
        }

        elements.particleContainer.appendChild(
            particle
        );

        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}