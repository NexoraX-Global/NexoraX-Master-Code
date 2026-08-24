(() => {
    "use strict";

    const STORAGE_KEY = "taskforge_cryptic_vault_v1";

    const DEFAULT_STATE = {
        forgeBalance: 0,
        vaults: [],
        opened: 0,
        extracted: 0,
        nextRewardIndex: 0,
        activity: []
    };

    const REWARDS = [
        {
            id: "standard",
            rarity: "STANDARD",
            title: "+100 $FORGE",
            description: "A standard productivity bonus has been added to your vault.",
            forge: 100,
            shields: 0,
            className: "result-common"
        },
        {
            id: "epic",
            rarity: "EPIC",
            title: "STREAK SHIELD",
            description: "One streak-protection charge has been added to your account.",
            forge: 0,
            shields: 1,
            className: "result-epic"
        },
        {
            id: "legendary",
            rarity: "LEGENDARY",
            title: "+10,000 $FORGE",
            description: "A legendary productivity bonus has been added to your vault.",
            forge: 10000,
            shields: 0,
            className: "result-legendary"
        }
    ];

    let state = loadState();
    let selectedVaultId = null;
    let revealTimeout = null;
    let toastTimeout = null;

    const el = {};

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        cacheDOM();
        bindEvents();
        render();
        writeInitialActivity();
    }

    function cacheDOM() {
        el.forgeBalance = document.getElementById("forgeBalance");
        el.simulateButton = document.getElementById("simulateButton");
        el.collectedCount = document.getElementById("collectedCount");
        el.openedCount = document.getElementById("openedCount");
        el.extractedAmount = document.getElementById("extractedAmount");
        el.vaultGrid = document.getElementById("vaultGrid");
        el.emptyInventory = document.getElementById("emptyInventory");
        el.inventoryStatus = document.getElementById("inventoryStatus");
        el.activityLog = document.getElementById("activityLog");
        el.vaultVisual = document.getElementById("vaultVisual");
        el.vaultStage = document.getElementById("vaultStage");
        el.systemStatus = document.getElementById("systemStatus");

        el.revealOverlay = document.getElementById("revealOverlay");
        el.decryptStatus = document.getElementById("decryptStatus");
        el.resultRarity = document.getElementById("resultRarity");
        el.resultTitle = document.getElementById("resultTitle");
        el.resultDescription = document.getElementById("resultDescription");
        el.claimButton = document.getElementById("claimButton");
    }

    function bindEvents() {
        el.simulateButton.addEventListener(
            "click",
            simulateDeepWork
        );

        el.vaultGrid.addEventListener(
            "click",
            handleInventoryClick
        );

        el.claimButton.addEventListener(
            "click",
            closeReveal
        );
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return cloneDefault();
            }

            const parsed = JSON.parse(saved);

            return {
                ...cloneDefault(),
                ...parsed,
                vaults: Array.isArray(parsed.vaults)
                    ? parsed.vaults
                    : [],
                activity: Array.isArray(parsed.activity)
                    ? parsed.activity
                    : []
            };
        } catch {
            return cloneDefault();
        }
    }

    function cloneDefault() {
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    function saveState() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state)
            );
        } catch {
            showToast("STORAGE ERROR");
        }
    }

    function simulateDeepWork() {
        const vault = {
            id: createId(),
            createdAt: Date.now(),
            status: "ready"
        };

        state.vaults.push(vault);

        saveState();
        render();

        el.vaultVisual.classList.add("ready");
        el.systemStatus.textContent = "NEW VAULT SECURED";

        addActivity(
            "2-hour focus block recorded • Bounty Vault earned."
        );

        showToast("BOUNTY VAULT EARNED");
    }

    function handleInventoryClick(event) {
        const button = event.target.closest(
            "[data-action='open']"
        );

        if (!button) {
            return;
        }

        const id = button.dataset.id;

        openVault(id);
    }

    function openVault(id) {
        const vault = state.vaults.find(
            item => item.id === id
        );

        if (!vault || vault.status !== "ready") {
            return;
        }

        selectedVaultId = id;

        el.revealOverlay.classList.remove(
            "show-result",
            "result-common",
            "result-epic",
            "result-legendary"
        );

        el.revealOverlay.classList.add("active");

        el.decryptStatus.textContent =
            "DECRYPTING VAULT...";

        document.body.classList.add("screen-shake");

        setTimeout(() => {
            document.body.classList.remove("screen-shake");
        }, 400);

        clearTimeout(revealTimeout);

        revealTimeout = setTimeout(() => {
            revealReward();
        }, 1900);
    }

    function revealReward() {
        const vault = state.vaults.find(
            item => item.id === selectedVaultId
        );

        if (!vault || vault.status !== "ready") {
            closeReveal();
            return;
        }

        /*
         * Transparent reward schedule:
         * the user sees all possible rewards and each vault
         * advances through the visible three-step track.
         */
        const reward =
            REWARDS[state.nextRewardIndex];

        vault.status = "opened";
        vault.rewardId = reward.id;
        vault.openedAt = Date.now();

        state.nextRewardIndex =
            (state.nextRewardIndex + 1) %
            REWARDS.length;

        state.opened += 1;
        state.forgeBalance += reward.forge;
        state.extracted += reward.forge;

        saveState();
        render();

        el.resultRarity.textContent =
            reward.rarity;

        el.resultTitle.textContent =
            reward.title;

        el.resultDescription.textContent =
            reward.description;

        el.revealOverlay.classList.add(
            "show-result",
            reward.className
        );

        el.decryptStatus.textContent =
            "DECRYPTION COMPLETE";

        el.systemStatus.textContent =
            `${reward.rarity} REWARD UNLOCKED`;

        addActivity(
            `${reward.rarity} reward extracted • ${reward.title}`
        );
    }

    function closeReveal() {
        clearTimeout(revealTimeout);

        el.revealOverlay.classList.remove(
            "active",
            "show-result",
            "result-common",
            "result-epic",
            "result-legendary"
        );

        selectedVaultId = null;

        el.systemStatus.textContent =
            "VAULT SYSTEM ONLINE";
    }

    function render() {
        renderWallet();
        renderStats();
        renderInventory();
        renderActivity();
        updateHeroVault();
    }

    function renderWallet() {
        el.forgeBalance.textContent =
            state.forgeBalance.toLocaleString();
    }

    function renderStats() {
        el.collectedCount.textContent =
            state.vaults.length.toLocaleString();

        el.openedCount.textContent =
            state.opened.toLocaleString();

        el.extractedAmount.textContent =
            state.extracted.toLocaleString();
    }

    function renderInventory() {
        const readyVaults = state.vaults.filter(
            vault => vault.status === "ready"
        );

        el.inventoryStatus.textContent =
            `${readyVaults.length} READY`;

        el.vaultGrid.innerHTML = "";

        el.emptyInventory.style.display =
            state.vaults.length === 0
                ? "block"
                : "none";

        state.vaults.forEach((vault, index) => {
            const card =
                document.createElement("article");

            card.className =
                `inventory-vault ${vault.status}`;

            const isReady =
                vault.status === "ready";

            const reward =
                REWARDS.find(
                    item => item.id === vault.rewardId
                );

            card.innerHTML = `
                <div class="mini-vault"></div>

                <strong>
                    VAULT #${index + 1}
                </strong>

                <small>
                    ${
                        isReady
                            ? "ENCRYPTED"
                            : reward
                                ? reward.rarity
                                : "OPENED"
                    }
                </small>

                ${
                    isReady
                        ? `
                            <button
                                class="open-vault"
                                type="button"
                                data-action="open"
                                data-id="${escapeHTML(vault.id)}">
                                OPEN VAULT
                            </button>
                        `
                        : ""
                }
            `;

            el.vaultGrid.appendChild(card);
        });
    }

    function renderActivity() {
        el.activityLog.innerHTML = "";

        const entries =
            state.activity.slice(0, 15);

        if (entries.length === 0) {
            el.activityLog.innerHTML = `
                <div class="log-line">
                    <span>--:--</span>
                    <b>No activity recorded.</b>
                </div>
            `;

            return;
        }

        entries.forEach(entry => {
            const row =
                document.createElement("div");

            row.className = "log-line";

            row.innerHTML = `
                <span>${escapeHTML(entry.time)}</span>
                <b>${escapeHTML(entry.message)}</b>
            `;

            el.activityLog.appendChild(row);
        });
    }

    function updateHeroVault() {
        const ready =
            state.vaults.some(
                vault => vault.status === "ready"
            );

        el.vaultVisual.classList.toggle(
            "ready",
            ready
        );

        el.systemStatus.textContent =
            ready
                ? "VAULT READY FOR OPENING"
                : "VAULT SYSTEM ONLINE";
    }

    function addActivity(message) {
        const time =
            new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

        state.activity.unshift({
            time,
            message
        });

        state.activity =
            state.activity.slice(0, 15);

        saveState();
        renderActivity();
    }

    function writeInitialActivity() {
        if (state.activity.length === 0) {
            addActivity(
                "Vault system initialized."
            );
        }
    }

    function showToast(message) {
        clearTimeout(toastTimeout);

        let toast =
            document.getElementById("toast");

        toast.textContent = message;
        toast.classList.add("show");

        toastTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 1800);
    }

    function createId() {
        return (
            Date.now().toString(36) +
            Math.random()
                .toString(36)
                .slice(2, 9)
        );
    }

    function escapeHTML(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
})();