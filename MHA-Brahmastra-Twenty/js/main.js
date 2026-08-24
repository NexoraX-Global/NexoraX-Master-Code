"use strict";

const STORAGE_KEY = "taskforge_apex_raid_v1";

const RAID_CONFIG = {
    maxHours: 100,
    durationSeconds: 48 * 60 * 60,
    reward: 500000,
    simulatedOperators: [
        "NEXUS_07",
        "VOIDRUNNER",
        "FOCUSWRAITH",
        "APEX_MIND",
        "DEEPFORGE",
        "CYBER_MONK",
        "QUANTUM_ACE"
    ]
};

const elements = {
    timer: document.getElementById("raidTimer"),
    bossHpText: document.getElementById("bossHpText"),
    bossHealth: document.getElementById("bossHealth"),
    damageText: document.getElementById("damageText"),
    percentText: document.getElementById("percentText"),
    bossStatus: document.getElementById("bossStatus"),
    personalDamage: document.getElementById("personalDamage"),
    rewardAmount: document.getElementById("rewardAmount"),
    memberCount: document.getElementById("memberCount"),
    raidFeed: document.getElementById("raidFeed"),
    attackButton: document.getElementById("attackButton"),
    teamGrid: document.getElementById("teamGrid"),
    resetRaidButton: document.getElementById("resetRaidButton")
};

let state = loadState();
let timerInterval = null;
let multiplayerInterval = null;

function createDefaultState() {
    return {
        bossHoursRemaining: RAID_CONFIG.maxHours,
        personalDamage: 0,
        totalDamage: 0,
        endTime: Date.now() + RAID_CONFIG.durationSeconds * 1000,
        completed: false,
        operators: RAID_CONFIG.simulatedOperators.map(name => ({
            name,
            hours: 0
        })),
        feed: []
    };
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return createDefaultState();
        }

        const parsed = JSON.parse(saved);

        return {
            ...createDefaultState(),
            ...parsed,
            operators: Array.isArray(parsed.operators)
                ? parsed.operators
                : createDefaultState().operators,
            feed: Array.isArray(parsed.feed)
                ? parsed.feed
                : []
        };
    } catch (error) {
        return createDefaultState();
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));

    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0")
    ].join(":");
}

function formatHours(hours) {
    return `${hours.toFixed(1)}h`;
}

function getPercentRemaining() {
    return Math.max(
        0,
        Math.min(
            100,
            (state.bossHoursRemaining / RAID_CONFIG.maxHours) * 100
        )
    );
}

function updateTimer() {
    if (state.completed) {
        elements.timer.textContent = "00:00:00";
        return;
    }

    const remaining = Math.max(
        0,
        Math.floor((state.endTime - Date.now()) / 1000)
    );

    elements.timer.textContent = formatTime(remaining);

    if (remaining <= 60 * 60) {
        document.body.classList.add("warning");
    }

    if (remaining <= 0) {
        handleRaidTimeout();
    }
}

function renderBoss() {
    const percent = getPercentRemaining();
    const damage = RAID_CONFIG.maxHours - state.bossHoursRemaining;

    elements.bossHealth.style.width = `${percent}%`;

    elements.bossHpText.textContent =
        `${state.bossHoursRemaining.toFixed(1)} HRS`;

    elements.damageText.textContent =
        `${damage.toFixed(1)} HOURS DEALT`;

    elements.percentText.textContent =
        `${percent.toFixed(1)}% HP`;

    elements.personalDamage.textContent =
        formatHours(state.personalDamage);

    elements.rewardAmount.textContent =
        RAID_CONFIG.reward.toLocaleString();

    elements.memberCount.textContent =
        state.operators.length + 1;

    if (state.completed) {
        elements.bossStatus.textContent = "DEFEATED";
        elements.bossStatus.classList.add("complete");
    } else {
        elements.bossStatus.textContent = "ACTIVE";
        elements.bossStatus.classList.remove("complete");
    }
}

function renderTeam() {
    const player = {
        name: "YOU",
        hours: state.personalDamage
    };

    const allOperators = [player, ...state.operators];

    elements.teamGrid.innerHTML = allOperators.map((operator, index) => {
        const progress = Math.min(
            100,
            (operator.hours / 10) * 100
        );

        const isPlayer = index === 0;

        return `
            <article class="operator">
                <div class="operator-top">
                    <span class="operator-name">
                        ${escapeHtml(operator.name)}
                    </span>

                    <span class="operator-state">
                        ${isPlayer ? "YOU" : "SYNCED"}
                    </span>
                </div>

                <div class="operator-bar">
                    <div
                        class="operator-progress"
                        style="width:${progress}%"
                    ></div>
                </div>

                <small style="
                    display:block;
                    margin-top:7px;
                    color:#53666d;
                    font-size:7px;
                ">
                    ${operator.hours.toFixed(1)} HRS CONTRIBUTED
                </small>
            </article>
        `;
    }).join("");
}

function renderFeed() {
    elements.raidFeed.innerHTML = "";

    const visibleFeed = state.feed.slice(-30).reverse();

    visibleFeed.forEach(item => {
        const line = document.createElement("div");
        line.className = "feed-line";

        line.innerHTML = `
            <span class="feed-time">[${escapeHtml(item.time)}]</span>
            ${escapeHtml(item.user)}
            <span class="feed-damage">
                ${escapeHtml(item.message)}
            </span>
        `;

        elements.raidFeed.appendChild(line);
    });
}

function addFeed(user, message) {
    const now = new Date();

    const time = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    state.feed.push({
        time,
        user,
        message
    });

    if (state.feed.length > 50) {
        state.feed.shift();
    }

    renderFeed();
    saveState();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function triggerImpact() {
    document.body.classList.remove("impact");

    void document.body.offsetWidth;

    document.body.classList.add("impact");

    window.setTimeout(() => {
        document.body.classList.remove("impact");
    }, 550);
}

function dealPersonalDamage() {
    if (state.completed) {
        return;
    }

    const damage = 2;

    state.bossHoursRemaining = Math.max(
        0,
        state.bossHoursRemaining - damage
    );

    state.personalDamage += damage;
    state.totalDamage += damage;

    addFeed(
        "YOU",
        `dealt ${damage.toFixed(1)} HRS DAMAGE`
    );

    triggerImpact();

    renderBoss();
    renderTeam();
    saveState();

    if (state.bossHoursRemaining <= 0) {
        completeRaid();
    }
}

function simulateOperatorAttack() {
    if (state.completed) {
        return;
    }

    const available = state.operators.filter(() => true);

    if (!available.length) {
        return;
    }

    const operator =
        available[
            Math.floor(Math.random() * available.length)
        ];

    const possibleDamage = [0.5, 1, 1.5, 2];

    const damage =
        possibleDamage[
            Math.floor(Math.random() * possibleDamage.length)
        ];

    state.bossHoursRemaining = Math.max(
        0,
        state.bossHoursRemaining - damage
    );

    state.totalDamage += damage;

    const target = state.operators.find(
        item => item.name === operator.name
    );

    if (target) {
        target.hours += damage;
    }

    addFeed(
        operator.name,
        `dealt ${damage.toFixed(1)} HRS DAMAGE`
    );

    renderBoss();
    renderTeam();
    saveState();

    if (state.bossHoursRemaining <= 0) {
        completeRaid();
    }
}

function startMultiplayerSimulation() {
    if (multiplayerInterval) {
        clearInterval(multiplayerInterval);
    }

    multiplayerInterval = setInterval(() => {
        if (!state.completed) {
            simulateOperatorAttack();
        }
    }, randomInterval());
}

function randomInterval() {
    return 7000 + Math.floor(Math.random() * 9000);
}

function completeRaid() {
    if (state.completed) {
        return;
    }

    state.completed = true;
    state.bossHoursRemaining = 0;

    document.body.classList.remove("warning");
    document.body.classList.add("victory");

    elements.attackButton.disabled = true;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (multiplayerInterval) {
        clearInterval(multiplayerInterval);
        multiplayerInterval = null;
    }

    addFeed(
        "SYSTEM",
        "OBJECTIVE COMPLETE — TITAN DEFEATED"
    );

    renderBoss();
    saveState();
}

function handleRaidTimeout() {
    if (state.completed) {
        return;
    }

    document.body.classList.add("warning");

    elements.timer.textContent = "00:00:00";
    elements.attackButton.disabled = true;

    addFeed(
        "SYSTEM",
        "DEADLINE REACHED — RAID OBJECTIVE NOT COMPLETED"
    );

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (multiplayerInterval) {
        clearInterval(multiplayerInterval);
        multiplayerInterval = null;
    }

    saveState();
}

function resetRaid() {
    state = createDefaultState();

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
    );

    document.body.classList.remove(
        "victory",
        "warning",
        "impact"
    );

    elements.attackButton.disabled = false;

    renderBoss();
    renderTeam();
    renderFeed();
    updateTimer();

    startTimers();
}

function startTimers() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timerInterval = setInterval(updateTimer, 1000);

    startMultiplayerSimulation();
}

function initializeFeed() {
    if (state.feed.length > 0) {
        return;
    }

    const startupMessages = [
        ["SYSTEM", "SYNDICATE LINK ESTABLISHED"],
        ["NEXUS_07", "ready for deep-work deployment"],
        ["APEX_MIND", "focus block initiated"],
        ["VOIDRUNNER", "operator synchronized"],
        ["SYSTEM", "collective objective is now ACTIVE"]
    ];

    startupMessages.forEach(([user, message]) => {
        const now = new Date();

        state.feed.push({
            time: now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }),
            user,
            message
        });
    });

    saveState();
}

function initialize() {
    initializeFeed();

    renderBoss();
    renderTeam();
    renderFeed();
    updateTimer();

    if (state.completed) {
        document.body.classList.add("victory");
        elements.attackButton.disabled = true;
    } else {
        startTimers();
    }
}

elements.attackButton.addEventListener("click", () => {
    dealPersonalDamage();
});

elements.resetRaidButton.addEventListener("click", () => {
    resetRaid();
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        updateTimer();
        renderBoss();
    }
});

initialize();