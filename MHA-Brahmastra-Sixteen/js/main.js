"use strict";

/* =========================================================
   TASKFORGE-CORE
   PROOF-OF-EXECUTION ORACLE
   MHA BRAHMASTRA 16
   ========================================================= */

const STORAGE_KEY = "taskforge_poe_core_v1";

const DEFAULT_STATE = {
    totalSeconds: 0,
    verifiedSessions: 0,
    oracleScore: 100,
    history: [],
    pendingSessionSeconds: 0,
    selectedMinutes: 25
};

let state = loadState();

let timerInterval = null;
let timerEndTimestamp = null;
let scanInterval = null;
let notificationTimeout = null;

const elements = {
    totalHours: document.getElementById("totalHours"),
    verifiedSessions: document.getElementById("verifiedSessions"),
    oracleScore: document.getElementById("oracleScore"),

    systemMessage: document.getElementById("systemMessageText"),

    protocolScreen: document.getElementById("protocolScreen"),
    voidScreen: document.getElementById("voidScreen"),
    debriefScreen: document.getElementById("debriefScreen"),
    scanScreen: document.getElementById("scanScreen"),
    resultScreen: document.getElementById("resultScreen"),

    startVoidBtn: document.getElementById("startVoidBtn"),
    abortBtn: document.getElementById("abortBtn"),
    submitProofBtn: document.getElementById("submitProofBtn"),
    continueBtn: document.getElementById("continueBtn"),

    timerDisplay: document.getElementById("timerDisplay"),
    timerSession: document.getElementById("timerSession"),

    proofInput: document.getElementById("proofInput"),
    characterCount: document.getElementById("characterCount"),
    characterStatus: document.getElementById("characterStatus"),
    proofHint: document.getElementById("proofHint"),

    scanLine1: document.getElementById("scanLine1"),
    scanLine2: document.getElementById("scanLine2"),
    scanLine3: document.getElementById("scanLine3"),
    scanLine4: document.getElementById("scanLine4"),
    scanProgressBar: document.getElementById("scanProgressBar"),
    scanPercent: document.getElementById("scanPercent"),

    resultIcon: document.getElementById("resultIcon"),
    resultEyebrow: document.getElementById("resultEyebrow"),
    resultTitle: document.getElementById("resultTitle"),
    resultText: document.getElementById("resultText"),
    rewardBox: document.getElementById("rewardBox"),
    rewardAmount: document.getElementById("rewardAmount"),

    historyList: document.getElementById("historyList"),
    historyCount: document.getElementById("historyCount"),

    flashOverlay: document.getElementById("flashOverlay"),
    notification: document.getElementById("notification")
};

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", initialize);

function initialize() {
    bindDurationButtons();
    bindControls();
    updateDashboard();
    renderHistory();
    updateCharacterCounter();
    restoreInterruptedSession();

    setSystemMessage(
        "System ready. Genuine work is the only valid input."
    );
}

/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function loadState() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (!stored) {
            return { ...DEFAULT_STATE };
        }

        const parsed = JSON.parse(stored);

        return {
            ...DEFAULT_STATE,
            ...parsed,
            history: Array.isArray(parsed.history) ? parsed.history : []
        };
    } catch (error) {
        return { ...DEFAULT_STATE };
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        showNotification(
            "LOCAL STORAGE UNAVAILABLE. SESSION DATA MAY NOT PERSIST.",
            "error"
        );
    }
}

/* =========================================================
   EVENT BINDING
   ========================================================= */

function bindDurationButtons() {
    const buttons = document.querySelectorAll(".duration-btn");

    buttons.forEach(function(button) {
        button.addEventListener("click", function() {
            if (timerInterval !== null) {
                return;
            }

            buttons.forEach(function(item) {
                item.classList.remove("active");
            });

            button.classList.add("active");

            const minutes = Number(button.dataset.minutes);

            if (minutes === 25 || minutes === 60) {
                state.selectedMinutes = minutes;
                saveState();

                setSystemMessage(
                    minutes + " minute focus protocol selected."
                );
            }
        });
    });
}

function bindControls() {
    elements.startVoidBtn.addEventListener("click", startVoidProtocol);
    elements.abortBtn.addEventListener("click", abortSession);
    elements.submitProofBtn.addEventListener("click", submitProofToOracle);
    elements.continueBtn.addEventListener("click", returnToProtocol);

    elements.proofInput.addEventListener("input", updateCharacterCounter);
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {
    const hours = state.totalSeconds / 3600;

    elements.totalHours.textContent = hours.toFixed(2);
    elements.verifiedSessions.textContent = String(state.verifiedSessions);
    elements.oracleScore.textContent = String(state.oracleScore);
}

/* =========================================================
   SCREEN MANAGEMENT
   ========================================================= */

function hideAllScreens() {
    elements.protocolScreen.classList.add("hidden");
    elements.voidScreen.classList.add("hidden");
    elements.debriefScreen.classList.add("hidden");
    elements.scanScreen.classList.add("hidden");
    elements.resultScreen.classList.add("hidden");
}

function showScreen(screen) {
    hideAllScreens();
    screen.classList.remove("hidden");
}

function returnToProtocol() {
    elements.proofInput.value = "";
    updateCharacterCounter();

    elements.resultScreen.classList.remove("success", "failure");

    showScreen(elements.protocolScreen);

    setSystemMessage(
        "Protocol ready. Select duration and initiate genuine work."
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================================================
   SYSTEM MESSAGES
   ========================================================= */

function setSystemMessage(message) {
    elements.systemMessage.textContent = message;
}

/* =========================================================
   VOID TIMER
   ========================================================= */

function startVoidProtocol() {
    if (timerInterval !== null) {
        return;
    }

    const minutes = state.selectedMinutes === 60 ? 60 : 25;
    const durationSeconds = minutes * 60;

    state.pendingSessionSeconds = durationSeconds;
    saveState();

    timerEndTimestamp = Date.now() + durationSeconds * 1000;

    elements.timerSession.textContent =
        minutes + " MIN PROTOCOL";

    elements.timerDisplay.textContent =
        formatTime(durationSeconds);

    showScreen(elements.voidScreen);

    setSystemMessage(
        "VOID PROTOCOL ACTIVE. EXECUTION WINDOW LOCKED."
    );

    timerInterval = window.setInterval(updateTimer, 250);

    updateTimer();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function updateTimer() {
    if (!timerEndTimestamp) {
        return;
    }

    const remainingMilliseconds =
        timerEndTimestamp - Date.now();

    const remainingSeconds =
        Math.max(0, Math.ceil(remainingMilliseconds / 1000));

    elements.timerDisplay.textContent =
        formatTime(remainingSeconds);

    if (remainingSeconds <= 60 && remainingSeconds > 0) {
        elements.timerDisplay.style.color = "#ff3030";
        elements.timerDisplay.style.textShadow =
            "0 0 25px rgba(255,48,48,0.7)";
    } else {
        elements.timerDisplay.style.color = "";
        elements.timerDisplay.style.textShadow = "";
    }

    if (remainingSeconds <= 0) {
        finishVoidTimer();
    }
}

function finishVoidTimer() {
    clearTimer();

    state.pendingSessionSeconds =
        state.selectedMinutes * 60;

    saveState();

    elements.timerDisplay.textContent = "00:00";

    triggerFlash("success");

    setSystemMessage(
        "TEMPORAL LOCK RELEASED. PROOF-OF-EXECUTION IS NOW REQUIRED."
    );

    showScreen(elements.debriefScreen);

    elements.proofInput.focus();

    showNotification(
        "FOCUS COMPLETE. SUBMIT YOUR PROOF OF EXECUTION.",
        "success"
    );
}

function clearTimer() {
    if (timerInterval !== null) {
        window.clearInterval(timerInterval);
        timerInterval = null;
    }

    timerEndTimestamp = null;
}

function abortSession() {
    if (timerInterval === null) {
        return;
    }

    const confirmed =
        window.confirm(
            "Abort the active focus protocol?\n\nNo reward will be issued and the session will not be counted."
        );

    if (!confirmed) {
        return;
    }

    clearTimer();

    state.pendingSessionSeconds = 0;
    saveState();

    elements.timerDisplay.style.color = "";
    elements.timerDisplay.style.textShadow = "";

    setSystemMessage(
        "SESSION ABORTED. NO EXECUTION CREDIT ISSUED."
    );

    showNotification(
        "VOID SESSION ABORTED. NO REWARD.",
        "error"
    );

    showScreen(elements.protocolScreen);
}

/* =========================================================
   TIMER RESTORATION
   ========================================================= */

function restoreInterruptedSession() {
    const savedPending =
        Number(state.pendingSessionSeconds) || 0;

    if (savedPending <= 0) {
        return;
    }

    state.pendingSessionSeconds = 0;
    saveState();

    showNotification(
        "A previous focus protocol was interrupted. No credit was awarded.",
        "error"
    );

    setSystemMessage(
        "Previous protocol interrupted. Execution credit remains zero."
    );
}

/* =========================================================
   TIME FORMATTING
   ========================================================= */

function formatTime(totalSeconds) {
    const seconds = Math.max(0, Number(totalSeconds) || 0);

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return (
            String(hours).padStart(2, "0") +
            ":" +
            String(minutes).padStart(2, "0") +
            ":" +
            String(remainingSeconds).padStart(2, "0")
        );
    }

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}

/* =========================================================
   PROOF CHARACTER COUNTER
   ========================================================= */

function updateCharacterCounter() {
    const rawText = elements.proofInput.value;
    const characterCount = rawText.length;

    elements.characterCount.textContent =
        characterCount + " characters";

    elements.characterStatus.textContent =
        characterCount + " / 30 MINIMUM";

    if (characterCount >= 30) {
        elements.characterStatus.style.color = "var(--green)";
        elements.proofHint.classList.remove("invalid");
        elements.proofHint.classList.add("valid");

        elements.proofHint.textContent =
            "Proof density acceptable. Oracle submission available.";
    } else {
        elements.characterStatus.style.color = "var(--amber)";
        elements.proofHint.classList.remove("valid");
        elements.proofHint.classList.add("invalid");

        const remaining = 30 - characterCount;

        elements.proofHint.textContent =
            "Insufficient proof density. " +
            remaining +
            " more character" +
            (remaining === 1 ? "" : "s") +
            " required.";
    }
}

/* =========================================================
   PROOF-OF-EXECUTION ORACLE
   ========================================================= */

function submitProofToOracle() {
    const proof = elements.proofInput.value.trim();

    if (timerInterval !== null) {
        showNotification(
            "THE FOCUS TIMER IS STILL ACTIVE.",
            "error"
        );
        return;
    }

    if (state.pendingSessionSeconds <= 0) {
        showNotification(
            "NO COMPLETED SESSION IS AVAILABLE FOR VERIFICATION.",
            "error"
        );
        return;
    }

    if (proof.length < 30) {
        rejectProof(
            "INSUFFICIENT PROOF OF WORK. MINIMUM 30 CHARACTERS REQUIRED."
        );
        return;
    }

    startOracleScan(proof);
}

/* =========================================================
   ORACLE SCAN
   ========================================================= */

function startOracleScan(proof) {
    showScreen(elements.scanScreen);

    elements.scanProgressBar.style.width = "0%";
    elements.scanPercent.textContent = "0%";

    resetScanLines();

    setSystemMessage(
        "ORACLE SCANNER ACTIVE. ANALYZING EXECUTION PROOF."
    );

    elements.submitProofBtn.disabled = true;

    let progress = 0;

    const scanSteps = [
        {
            at: 8,
            text: "> Input received. Parsing execution record..."
        },
        {
            at: 28,
            text: "> Verifying work-density threshold..."
        },
        {
            at: 50,
            text: "> Cross-checking temporal execution window..."
        },
        {
            at: 73,
            text: "> Evaluating proof specificity..."
        },
        {
            at: 90,
            text: "> Oracle consensus reached. Finalizing..."
        }
    ];

    scanInterval = window.setInterval(function() {
        progress += 2;

        if (progress > 100) {
            progress = 100;
        }

        elements.scanProgressBar.style.width =
            progress + "%";

        elements.scanPercent.textContent =
            progress + "%";

        scanSteps.forEach(function(step, index) {
            if (progress >= step.at) {
                const line =
                    document.getElementById(
                        "scanLine" + (index + 1)
                    );

                if (line) {
                    line.textContent = step.text;
                    line.classList.add("active");
                }
            }
        });

        if (progress >= 100) {
            window.clearInterval(scanInterval);
            scanInterval = null;

            window.setTimeout(function() {
                evaluateProof(proof);
            }, 450);
        }
    }, 65);
}

function resetScanLines() {
    elements.scanLine1.textContent =
        "> Initializing verification engine...";

    elements.scanLine2.textContent =
        "> Awaiting analysis...";

    elements.scanLine3.textContent =
        "> Awaiting analysis...";

    elements.scanLine4.textContent =
        "> Awaiting analysis...";

    [
        elements.scanLine1,
        elements.scanLine2,
        elements.scanLine3,
        elements.scanLine4
    ].forEach(function(line) {
        line.classList.remove("active");
    });
}

/* =========================================================
   ORACLE DECISION
   ========================================================= */

function evaluateProof(proof) {
    const normalized =
        proof.replace(/\s+/g, " ").trim();

    const characterCount = normalized.length;

    /*
       The local Oracle intentionally uses a transparent
       minimum-density rule rather than pretending it can
       objectively prove whether the real-world work happened.
    */

    if (characterCount < 30) {
        rejectProof(
            "INSUFFICIENT PROOF OF WORK. REWARDS DENIED."
        );
        return;
    }

    approveProof(normalized);
}

function approveProof(proof) {
    const sessionSeconds =
        Math.max(
            0,
            Number(state.pendingSessionSeconds) || 0
        );

    const sessionMinutes =
        Math.max(
            1,
            Math.round(sessionSeconds / 60)
        );

    const reward =
        calculateReward(sessionMinutes, proof.length);

    state.totalSeconds += sessionSeconds;
    state.verifiedSessions += 1;

    /*
       Successful verification slightly improves the
       execution-integrity score, capped at 100.
    */

    state.oracleScore =
        Math.min(
            100,
            state.oracleScore + 1
        );

    const record = {
        id:
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 7),

        timestamp:
            new Date().toISOString(),

        minutes: sessionMinutes,

        characters: proof.length,

        reward: reward,

        proofPreview:
            proof.length > 100
                ? proof.slice(0, 100) + "..."
                : proof
    };

    state.history.unshift(record);

    if (state.history.length > 30) {
        state.history =
            state.history.slice(0, 30);
    }

    state.pendingSessionSeconds = 0;

    saveState();

    updateDashboard();
    renderHistory();

    elements.resultScreen.classList.remove(
        "failure"
    );

    elements.resultScreen.classList.add(
        "success"
    );

    elements.resultIcon.textContent = "✓";

    elements.resultEyebrow.textContent =
        "EXECUTION VERIFIED";

    elements.resultTitle.textContent =
        "ORACLE VERIFIED";

    elements.resultText.textContent =
        "Proof density passed the Oracle threshold. " +
        sessionMinutes +
        " minutes of genuine focus have been added to your permanent execution ledger.";

    elements.rewardBox.style.display = "block";

    elements.rewardAmount.textContent =
        "+" + reward + " $FORGE";

    showScreen(elements.resultScreen);

    triggerFlash("success");
    shakeScreen();

    setSystemMessage(
        "VERIFICATION SUCCESSFUL. EXECUTION CREDIT COMMITTED."
    );

    showNotification(
        "ORACLE VERIFIED • +" + reward + " $FORGE",
        "success"
    );
}

function rejectProof(reason) {
    state.oracleScore =
        Math.max(
            0,
            state.oracleScore - 3
        );

    saveState();
    updateDashboard();

    elements.resultScreen.classList.remove(
        "success"
    );

    elements.resultScreen.classList.add(
        "failure"
    );

    elements.resultIcon.textContent = "×";

    elements.resultEyebrow.textContent =
        "SECURITY REJECTION";

    elements.resultTitle.textContent =
        "ORACLE REJECTED";

    elements.resultText.textContent =
        reason;

    elements.rewardBox.style.display = "block";

    elements.rewardAmount.textContent =
        "0 $FORGE";

    showScreen(elements.resultScreen);

    triggerFlash("failure");
    shakeScreen();

    setSystemMessage(
        "VERIFICATION FAILED. NO EXECUTION CREDIT ISSUED."
    );

    showNotification(
        "ORACLE REJECTED • REWARDS DENIED",
        "error"
    );
}

/* =========================================================
   REWARD CALCULATION
   ========================================================= */

function calculateReward(minutes, proofLength) {
    const baseReward =
        minutes >= 60
            ? 600
            : 250;

    const densityBonus =
        proofLength >= 250
            ? 100
            : proofLength >= 150
                ? 50
                : 0;

    return baseReward + densityBonus;
}

/* =========================================================
   HISTORY
   ========================================================= */

function renderHistory() {
    const history =
        Array.isArray(state.history)
            ? state.history
            : [];

    elements.historyCount.textContent =
        history.length + " RECORD" +
        (history.length === 1 ? "" : "S");

    if (history.length === 0) {
        elements.historyList.innerHTML = `
            <div class="empty-history">
                <span>◌</span>
                <p>No verified execution records yet.</p>
            </div>
        `;

        return;
    }

    elements.historyList.innerHTML =
        history.map(function(record) {
            const date =
                new Date(record.timestamp);

            const readableDate =
                isNaN(date.getTime())
                    ? "UNKNOWN TIME"
                    : date.toLocaleString();

            return `
                <article class="history-item">
                    <span class="history-marker"></span>

                    <div class="history-main">
                        <strong>
                            ${escapeHtml(
                                record.minutes + " MIN VERIFIED SESSION"
                            )}
                        </strong>

                        <p>
                            ${escapeHtml(
                                readableDate
                            )}
                            •
                            ${escapeHtml(
                                String(record.characters)
                            )}
                            characters
                        </p>

                        <p>
                            ${escapeHtml(
                                record.proofPreview
                            )}
                        </p>
                    </div>

                    <span class="history-reward">
                        +${escapeHtml(
                            String(record.reward)
                        )} $FORGE
                    </span>
                </article>
            `;
        }).join("");
}

/* =========================================================
   SECURITY / DISPLAY HELPERS
   ========================================================= */

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function triggerFlash(type) {
    elements.flashOverlay.classList.remove(
        "flash-success",
        "flash-failure"
    );

    void elements.flashOverlay.offsetWidth;

    if (type === "success") {
        elements.flashOverlay.classList.add(
            "flash-success"
        );
    } else {
        elements.flashOverlay.classList.add(
            "flash-failure"
        );
    }
}

function shakeScreen() {
    document.body.classList.remove("shake");

    void document.body.offsetWidth;

    document.body.classList.add("shake");

    window.setTimeout(function() {
        document.body.classList.remove("shake");
    }, 500);
}

function showNotification(message, type) {
    window.clearTimeout(notificationTimeout);

    elements.notification.textContent =
        message;

    elements.notification.className =
        "notification show " +
        (type || "");

    notificationTimeout =
        window.setTimeout(function() {
            elements.notification.classList.remove(
                "show"
            );
        }, 3500);
}

/* =========================================================
   PAGE SAFETY
   ========================================================= */

window.addEventListener("beforeunload", function() {
    if (timerInterval !== null) {
        saveState();
    }
});

window.addEventListener("visibilitychange", function() {
    if (
        document.visibilityState === "visible" &&
        timerInterval !== null
    ) {
        updateTimer();
    }
});