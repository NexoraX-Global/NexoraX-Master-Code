"use strict";

/*
 * TASKFORGE-CORE
 * CHRONO-LOCK SOVEREIGN BOUNTY MATRIX
 *
 * This module is a local, virtual-economy simulation.
 * No real-money transactions are performed.
 */

const STORAGE_KEY = "taskforge_chronolock_v1";

const CONTRACT_DURATION = 25 * 60;
const DEFAULT_WALLET = 50000;
const MIN_STAKE = 100;

const state = {
    wallet: DEFAULT_WALLET,
    activeStake: 0,
    contractStartedAt: null,
    contractEndsAt: null,
    contractDuration: CONTRACT_DURATION,
    contractActive: false,
    history: []
};

const elements = {};

let timerInterval = null;
let toastTimeout = null;

document.addEventListener("DOMContentLoaded", init);

function init() {
    cacheElements();
    loadState();
    bindEvents();
    validatePersistedContract();
    render();
    startClock();
}

function cacheElements() {
    elements.walletBalance = document.getElementById("walletBalance");
    elements.activeStake = document.getElementById("activeStake");
    elements.potentialPayout = document.getElementById("potentialPayout");
    elements.riskLevel = document.getElementById("riskLevel");
    elements.riskDescription = document.getElementById("riskDescription");

    elements.stakeInput = document.getElementById("stakeInput");
    elements.startContractBtn = document.getElementById("startContractBtn");

    elements.doomTimer = document.getElementById("doomTimer");
    elements.timerProgressBar = document.getElementById("timerProgressBar");
    elements.timerCard = document.getElementById("timerCard");
    elements.contractStatus = document.getElementById("contractStatus");
    elements.timerMode = document.getElementById("timerMode");

    elements.securityStatus = document.getElementById("securityStatus");

    elements.terminal = document.getElementById("terminal");

    elements.completeBtn = document.getElementById("completeBtn");
    elements.failBtn = document.getElementById("failBtn");

    elements.historyList = document.getElementById("historyList");

    elements.resultModal = document.getElementById("resultModal");
    elements.resultModalCard = document.getElementById("resultModalCard");
    elements.resultSymbol = document.getElementById("resultSymbol");
    elements.resultKicker = document.getElementById("resultKicker");
    elements.resultTitle = document.getElementById("resultTitle");
    elements.resultMessage = document.getElementById("resultMessage");
    elements.resultAmountLabel = document.getElementById("resultAmountLabel");
    elements.resultAmount = document.getElementById("resultAmount");
    elements.closeModalBtn = document.getElementById("closeModalBtn");

    elements.toast = document.getElementById("toast");
    elements.toastIcon = document.getElementById("toastIcon");
    elements.toastMessage = document.getElementById("toastMessage");

    elements.quickButtons = document.querySelectorAll(".quick-btn");
}

function bindEvents() {
    elements.startContractBtn.addEventListener(
        "click",
        initiateContract
    );

    elements.completeBtn.addEventListener(
        "click",
        completeContract
    );

    elements.failBtn.addEventListener(
        "click",
        simulateFailure
    );

    elements.closeModalBtn.addEventListener(
        "click",
        closeModal
    );

    elements.quickButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const amount = Number(button.dataset.stake);

            if (!Number.isFinite(amount)) {
                return;
            }

            elements.stakeInput.value = amount;

            elements.quickButtons.forEach((item) => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");

            updateStakePreview();
        });
    });

    elements.stakeInput.addEventListener(
        "input",
        updateStakePreview
    );

    document.addEventListener("keydown", handleKeyboard);
}

function handleKeyboard(event) {
    if (event.key === "Escape") {
        closeModal();
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return;
        }

        const parsed = JSON.parse(saved);

        if (!parsed || typeof parsed !== "object") {
            return;
        }

        if (
            Number.isFinite(parsed.wallet) &&
            parsed.wallet >= 0
        ) {
            state.wallet = Math.floor(parsed.wallet);
        }

        if (
            Number.isFinite(parsed.activeStake) &&
            parsed.activeStake >= 0
        ) {
            state.activeStake = Math.floor(parsed.activeStake);
        }

        if (
            typeof parsed.contractStartedAt === "number"
        ) {
            state.contractStartedAt = parsed.contractStartedAt;
        }

        if (
            typeof parsed.contractEndsAt === "number"
        ) {
            state.contractEndsAt = parsed.contractEndsAt;
        }

        state.contractActive =
            parsed.contractActive === true;

        if (Array.isArray(parsed.history)) {
            state.history = parsed.history
                .filter(isValidHistoryEntry)
                .slice(0, 20);
        }
    } catch (error) {
        console.warn(
            "Chrono-Lock state recovery failed.",
            error
        );

        resetContractOnly();
        saveState();
    }
}

function isValidHistoryEntry(entry) {
    return (
        entry &&
        typeof entry === "object" &&
        (entry.result === "win" || entry.result === "loss") &&
        Number.isFinite(entry.stake) &&
        Number.isFinite(entry.net) &&
        typeof entry.timestamp === "number"
    );
}

function saveState() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                wallet: state.wallet,
                activeStake: state.activeStake,
                contractStartedAt: state.contractStartedAt,
                contractEndsAt: state.contractEndsAt,
                contractDuration: state.contractDuration,
                contractActive: state.contractActive,
                history: state.history
            })
        );
    } catch (error) {
        console.warn(
            "Chrono-Lock state could not be saved.",
            error
        );
    }
}

function validatePersistedContract() {
    if (!state.contractActive) {
        return;
    }

    if (
        !Number.isFinite(state.contractEndsAt) ||
        !Number.isFinite(state.contractStartedAt) ||
        state.activeStake <= 0
    ) {
        resetContractOnly();
        saveState();
        return;
    }

    if (Date.now() >= state.contractEndsAt) {
        addTerminalLine(
            "[AUTO]",
            "Contract duration elapsed. Resolving session.",
            "warning"
        );

        resolveContract("loss", true);
    }
}

function getStake() {
    const value = Number(elements.stakeInput.value);

    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.floor(value);
}

function updateStakePreview() {
    const stake = getStake();

    if (stake <= 0) {
        elements.potentialPayout.textContent = "0";
        return;
    }

    elements.potentialPayout.textContent =
        formatNumber(stake * 2);

    elements.quickButtons.forEach((button) => {
        const amount = Number(button.dataset.stake);

        button.classList.toggle(
            "selected",
            amount === stake
        );
    });
}

function initiateContract() {
    if (state.contractActive) {
        showToast(
            "A contract is already active.",
            "!"
        );
        return;
    }

    const stake = getStake();

    if (!Number.isInteger(stake)) {
        showToast(
            "Enter a whole-number stake.",
            "!"
        );
        return;
    }

    if (stake < MIN_STAKE) {
        showToast(
            `Minimum virtual stake is ${formatNumber(MIN_STAKE)} $FORGE.`,
            "!"
        );
        return;
    }

    if (stake > state.wallet) {
        showToast(
            "Insufficient virtual $FORGE balance.",
            "!"
        );
        return;
    }

    state.wallet -= stake;
    state.activeStake = stake;

    state.contractStartedAt = Date.now();
    state.contractEndsAt =
        state.contractStartedAt +
        state.contractDuration * 1000;

    state.contractActive = true;

    saveState();
    render();

    addTerminalLine(
        "[LOCK]",
        `${formatNumber(stake)} $FORGE secured in Chrono-Lock.`,
        "warning"
    );

    addTerminalLine(
        "[TIMER]",
        "25-minute productivity contract activated.",
        "system"
    );

    addTerminalLine(
        "[RISK]",
        `Potential virtual payout: ${formatNumber(stake * 2)} $FORGE.`,
        "warning"
    );

    impact("impact");

    showToast(
        "Contract locked. Focus session started.",
        "◆"
    );
}

function completeContract() {
    if (!state.contractActive) {
        showToast(
            "No active contract.",
            "!"
        );
        return;
    }

    resolveContract("win", false);
}

function simulateFailure() {
    if (!state.contractActive) {
        showToast(
            "No active contract.",
            "!"
        );
        return;
    }

    resolveContract("loss", false);
}

function resolveContract(result, automatic) {
    if (!state.contractActive) {
        return;
    }

    const stake = state.activeStake;

    if (!Number.isFinite(stake) || stake <= 0) {
        resetContractOnly();
        saveState();
        render();
        return;
    }

    if (result === "win") {
        const payout = stake * 2;

        state.wallet += payout;

        state.history.unshift({
            result: "win",
            stake,
            payout,
            net: stake,
            timestamp: Date.now()
        });

        addTerminalLine(
            "[SUCCESS]",
            `${formatNumber(payout)} $FORGE bounty credited.`,
            "success"
        );

        addTerminalLine(
            "[VAULT]",
            `Wallet balance: ${formatNumber(state.wallet)} $FORGE.`,
            "system"
        );

        resetContractOnly();
        saveState();
        render();

        impact("success-impact");
        showResult(
            true,
            stake,
            payout
        );

        return;
    }

    state.history.unshift({
        result: "loss",
        stake,
        payout: 0,
        net: -stake,
        timestamp: Date.now(),
        automatic: automatic === true
    });

    addTerminalLine(
        "[LIQUIDATION]",
        `${formatNumber(stake)} $FORGE stake removed from virtual contract.`,
        "warning"
    );

    addTerminalLine(
        "[VAULT]",
        `Remaining balance: ${formatNumber(state.wallet)} $FORGE.`,
        "warning"
    );

    resetContractOnly();
    saveState();
    render();

    impact("failure-impact");
    showResult(
        false,
        stake,
        0
    );
}

function resetContractOnly() {
    state.activeStake = 0;
    state.contractStartedAt = null;
    state.contractEndsAt = null;
    state.contractActive = false;
}

function startClock() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
    }

    updateClock();

    timerInterval = window.setInterval(
        updateClock,
        250
    );
}

function updateClock() {
    if (!state.contractActive) {
        renderIdleTimer();
        return;
    }

    const now = Date.now();
    const remainingMs =
        state.contractEndsAt - now;

    if (remainingMs <= 0) {
        resolveContract("loss", true);
        return;
    }

    const remainingSeconds =
        Math.ceil(remainingMs / 1000);

    const minutes =
        Math.floor(remainingSeconds / 60);

    const seconds =
        remainingSeconds % 60;

    elements.doomTimer.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const totalMs =
        state.contractDuration * 1000;

    const elapsedMs =
        totalMs - remainingMs;

    const percentage =
        Math.max(
            0,
            Math.min(
                100,
                (elapsedMs / totalMs) * 100
            )
        );

    elements.timerProgressBar.style.width =
        `${100 - percentage}%`;

    const critical =
        remainingSeconds <= 120;

    if (critical) {
        elements.timerCard.classList.add("critical");
        document.body.classList.add("critical-mode");

        elements.riskLevel.textContent = "CRITICAL";
        elements.riskLevel.style.color = "#ff0033";

        elements.timerMode.textContent =
            "FINAL WINDOW — COMPLETE SESSION";
    } else {
        elements.timerCard.classList.remove("critical");
        document.body.classList.remove("critical-mode");

        elements.riskLevel.textContent = "ACTIVE";
        elements.riskLevel.style.color = "#ff667f";

        elements.timerMode.textContent =
            "PRODUCTIVITY CONTRACT ACTIVE";
    }
}

function renderIdleTimer() {
    elements.doomTimer.textContent = "25:00";
    elements.timerProgressBar.style.width = "100%";

    elements.timerCard.classList.remove(
        "active",
        "critical"
    );

    document.body.classList.remove("critical-mode");

    elements.contractStatus.textContent =
        "NO ACTIVE CONTRACT";

    elements.timerMode.textContent =
        "READY FOR DEPLOYMENT";

    elements.riskLevel.textContent = "LOW";
    elements.riskLevel.style.color = "";

    elements.riskDescription.textContent =
        "NO CONTRACT";
}

function render() {
    elements.walletBalance.textContent =
        formatNumber(state.wallet);

    elements.activeStake.textContent =
        formatNumber(state.activeStake);

    elements.potentialPayout.textContent =
        formatNumber(
            state.activeStake > 0
                ? state.activeStake * 2
                : getStake() * 2
        );

    if (state.contractActive) {
        elements.contractStatus.textContent =
            "CONTRACT ACTIVE";

        elements.timerCard.classList.add("active");

        elements.securityStatus.innerHTML =
            '<span class="security-icon">◆</span><span>VAULT SECURITY: <b style="color:#ff0033">LOCKED</b></span>';

        elements.startContractBtn.disabled = true;

        elements.completeBtn.disabled = false;
        elements.failBtn.disabled = false;

        elements.riskDescription.textContent =
            "STAKE AT RISK";

        elements.riskLevel.textContent =
            "ACTIVE";

        elements.riskLevel.style.color =
            "#ff0033";
    } else {
        elements.contractStatus.textContent =
            "NO ACTIVE CONTRACT";

        elements.startContractBtn.disabled = false;

        elements.completeBtn.disabled = true;
        elements.failBtn.disabled = true;

        elements.securityStatus.innerHTML =
            '<span class="security-icon">◆</span><span>VAULT SECURITY: <b>STANDBY</b></span>';

        elements.riskDescription.textContent =
            "NO CONTRACT";
    }

    renderHistory();
    updateStakePreview();

    if (!state.contractActive) {
        renderIdleTimer();
    }
}

function renderHistory() {
    if (
        !Array.isArray(state.history) ||
        state.history.length === 0
    ) {
        elements.historyList.innerHTML =
            '<div class="empty-history">NO CONTRACTS RECORDED</div>';

        return;
    }

    elements.historyList.innerHTML =
        state.history
            .slice(0, 10)
            .map(createHistoryHTML)
            .join("");
}

function createHistoryHTML(entry) {
    const isWin = entry.result === "win";

    const date = new Date(entry.timestamp);

    const formattedDate =
        date.toLocaleString(
            undefined,
            {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    const amountText = isWin
        ? `+${formatNumber(entry.net)}`
        : `${formatNumber(entry.net)}`;

    return `
        <div class="history-item">
            <div class="history-icon ${isWin ? "win" : "loss"}">
                ${isWin ? "✓" : "×"}
            </div>

            <div>
                <div class="history-title">
                    ${isWin ? "BOUNTY CLAIMED" : "STAKE LIQUIDATED"}
                </div>

                <div class="history-date">
                    ${escapeHTML(formattedDate)}
                    · STAKE ${formatNumber(entry.stake)} $FORGE
                </div>
            </div>

            <div class="history-amount ${isWin ? "win" : "loss"}">
                ${amountText}
            </div>
        </div>
    `;
}

function addTerminalLine(label, message, type = "") {
    if (!elements.terminal) {
        return;
    }

    const line = document.createElement("div");

    line.className =
        `terminal-line ${type}`.trim();

    const labelSpan =
        document.createElement("span");

    labelSpan.textContent = label;

    line.appendChild(labelSpan);

    line.appendChild(
        document.createTextNode(` ${message}`)
    );

    elements.terminal.appendChild(line);

    while (
        elements.terminal.children.length > 12
    ) {
        elements.terminal.removeChild(
            elements.terminal.firstElementChild
        );
    }

    elements.terminal.scrollTop =
        elements.terminal.scrollHeight;
}

function showResult(won, stake, amount) {
    elements.resultModalCard.classList.toggle(
        "failure",
        !won
    );

    if (won) {
        elements.resultSymbol.textContent = "✓";
        elements.resultKicker.textContent =
            "CONTRACT SUCCESSFULLY RESOLVED";

        elements.resultTitle.textContent =
            "BOUNTY CLAIMED";

        elements.resultMessage.textContent =
            `Your ${formatNumber(stake)} $FORGE virtual stake completed the focus contract.`;

        elements.resultAmountLabel.textContent =
            "PAYOUT";

        elements.resultAmount.textContent =
            `+${formatNumber(amount)}`;
    } else {
        elements.resultSymbol.textContent = "×";
        elements.resultKicker.textContent =
            "CONTRACT RESOLUTION";

        elements.resultTitle.textContent =
            "STAKE LIQUIDATED";

        elements.resultMessage.textContent =
            `The ${formatNumber(stake)} $FORGE virtual stake was removed from the failed contract.`;

        elements.resultAmountLabel.textContent =
            "LIQUIDATED";

        elements.resultAmount.textContent =
            `-${formatNumber(stake)}`;
    }

    elements.resultModal.classList.add("show");
}

function closeModal() {
    elements.resultModal.classList.remove("show");
    elements.resultModalCard.classList.remove(
        "failure"
    );
}

function showToast(message, icon = "◆") {
    elements.toastMessage.textContent = message;
    elements.toastIcon.textContent = icon;

    elements.toast.classList.add("show");

    if (toastTimeout !== null) {
        clearTimeout(toastTimeout);
    }

    toastTimeout = window.setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 2600);
}

function impact(className) {
    document.body.classList.remove(
        "impact",
        "success-impact",
        "failure-impact"
    );

    void document.body.offsetWidth;

    document.body.classList.add(className);

    window.setTimeout(() => {
        document.body.classList.remove(className);
    }, 600);
}

function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return Math.floor(number).toLocaleString(
        "en-IN"
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