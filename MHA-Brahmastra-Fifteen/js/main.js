"use strict";

const STORAGE_KEY = "taskforge_cognitive_ascension_v1";

const DEFAULT_STATE = {
    sparks: 0,
    focusHours: 0,
    sessions: 0,
    skills: {
        focus: 1,
        execution: 1,
        discipline: 1
    }
};

const SKILL_DATA = {
    focus: {
        name: "DEEP FOCUS",
        description:
            "Build sustained attention and reduce unnecessary context switching.",
        baseCost: 100,
        color: "cyan"
    },

    execution: {
        name: "EXECUTION SPEED",
        description:
            "Improve the ability to turn decisions into deliberate action.",
        baseCost: 100,
        color: "gold"
    },

    discipline: {
        name: "STRATEGIC DISCIPLINE",
        description:
            "Strengthen planning, prioritization and consistent follow-through.",
        baseCost: 100,
        color: "purple"
    }
};

let state = loadState();
let selectedSkill = null;

const elements = {
    focusHours: document.getElementById("focusHours"),
    sparkBalance: document.getElementById("sparkBalance"),
    sessionCount: document.getElementById("sessionCount"),
    overallLevel: document.getElementById("overallLevel"),

    focusLevel: document.getElementById("focusLevel"),
    executionLevel: document.getElementById("executionLevel"),
    disciplineLevel: document.getElementById("disciplineLevel"),

    focusProgress: document.getElementById("focusProgress"),
    executionProgress: document.getElementById("executionProgress"),
    disciplineProgress: document.getElementById("disciplineProgress"),

    focusCost: document.getElementById("focusCost"),
    executionCost: document.getElementById("executionCost"),
    disciplineCost: document.getElementById("disciplineCost"),

    metricFocus: document.getElementById("metricFocus"),
    metricExecution: document.getElementById("metricExecution"),
    metricDiscipline: document.getElementById("metricDiscipline"),

    metricFocusBar: document.getElementById("metricFocusBar"),
    metricExecutionBar: document.getElementById("metricExecutionBar"),
    metricDisciplineBar: document.getElementById("metricDisciplineBar"),

    logWorkBtn: document.getElementById("logWorkBtn"),

    modal: document.getElementById("upgradeModal"),
    modalTitle: document.getElementById("modalTitle"),
    modalDescription: document.getElementById("modalDescription"),
    modalCurrent: document.getElementById("modalCurrent"),
    modalNext: document.getElementById("modalNext"),
    modalCost: document.getElementById("modalCost"),
    confirmUpgrade: document.getElementById("confirmUpgrade"),
    closeModal: document.getElementById("closeModal"),

    toastContainer: document.getElementById("toastContainer")
};


function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return cloneDefaultState();
        }

        const parsed = JSON.parse(saved);

        return {
            sparks: validNumber(parsed.sparks, 0),
            focusHours: validNumber(parsed.focusHours, 0),
            sessions: validNumber(parsed.sessions, 0),
            skills: {
                focus: clampLevel(parsed.skills?.focus),
                execution: clampLevel(parsed.skills?.execution),
                discipline: clampLevel(parsed.skills?.discipline)
            }
        };
    } catch (error) {
        console.warn("TaskForge state recovery:", error);
        return cloneDefaultState();
    }
}


function cloneDefaultState() {
    return {
        sparks: DEFAULT_STATE.sparks,
        focusHours: DEFAULT_STATE.focusHours,
        sessions: DEFAULT_STATE.sessions,
        skills: {
            focus: DEFAULT_STATE.skills.focus,
            execution: DEFAULT_STATE.skills.execution,
            discipline: DEFAULT_STATE.skills.discipline
        }
    };
}


function validNumber(value, fallback) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
        return fallback;
    }

    return number;
}


function clampLevel(value) {
    const number = Math.floor(Number(value));

    if (!Number.isFinite(number)) {
        return 1;
    }

    return Math.max(1, Math.min(50, number));
}


function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.warn("TaskForge storage unavailable:", error);
    }
}


function getUpgradeCost(skillKey) {
    const level = state.skills[skillKey];

    if (level >= 50) {
        return Infinity;
    }

    /*
     * Cost increases gradually with level.
     * This keeps progression meaningful without requiring
     * extreme resource accumulation.
     */
    return Math.round(
        SKILL_DATA[skillKey].baseCost * (1 + (level - 1) * 0.25)
    );
}


function formatNumber(number) {
    return Math.floor(number).toLocaleString("en-US");
}


function updateDashboard() {
    elements.focusHours.textContent = state.focusHours.toFixed(1);
    elements.sparkBalance.textContent = formatNumber(state.sparks);
    elements.sessionCount.textContent = formatNumber(state.sessions);

    const totalLevels =
        state.skills.focus +
        state.skills.execution +
        state.skills.discipline;

    const averageLevel = Math.floor(totalLevels / 3);

    elements.overallLevel.textContent = `LVL ${averageLevel}`;
}


function updateSkill(skillKey) {
    const level = state.skills[skillKey];
    const progress = (level / 50) * 100;
    const cost = getUpgradeCost(skillKey);

    const levelElement = elements[`${skillKey}Level`];
    const progressElement = elements[`${skillKey}Progress`];
    const costElement = elements[`${skillKey}Cost`];

    if (levelElement) {
        levelElement.textContent = `${level} / 50`;
    }

    if (progressElement) {
        progressElement.style.width = `${progress}%`;
    }

    if (costElement) {
        if (level >= 50) {
            costElement.textContent = "MAX";
        } else {
            costElement.textContent = `${formatNumber(cost)} NS`;
        }
    }
}


function updateMetrics() {
    const focusPercent = Math.round((state.skills.focus / 50) * 100);
    const executionPercent = Math.round((state.skills.execution / 50) * 100);
    const disciplinePercent = Math.round((state.skills.discipline / 50) * 100);

    elements.metricFocus.textContent = `${focusPercent}%`;
    elements.metricExecution.textContent = `${executionPercent}%`;
    elements.metricDiscipline.textContent = `${disciplinePercent}%`;

    elements.metricFocusBar.style.width = `${Math.max(2, focusPercent)}%`;
    elements.metricExecutionBar.style.width = `${Math.max(2, executionPercent)}%`;
    elements.metricDisciplineBar.style.width = `${Math.max(2, disciplinePercent)}%`;
}


function updateUpgradeButtons() {
    document.querySelectorAll(".upgrade-button").forEach(button => {
        const skillKey = button.dataset.upgrade;

        if (!skillKey || !state.skills[skillKey]) {
            return;
        }

        const level = state.skills[skillKey];
        const cost = getUpgradeCost(skillKey);

        if (level >= 50) {
            button.disabled = true;
            button.innerHTML = "MAX LEVEL <span>✓</span>";
            return;
        }

        button.disabled = state.sparks < cost;

        button.innerHTML =
            `UPGRADE <span>${formatNumber(cost)} NS</span>`;
    });
}


function render() {
    updateDashboard();

    updateSkill("focus");
    updateSkill("execution");
    updateSkill("discipline");

    updateMetrics();
    updateUpgradeButtons();
}


function showToast(title, message, type = "default") {
    const toast = document.createElement("div");

    toast.className = `toast ${type}`;

    const titleElement = document.createElement("strong");
    titleElement.textContent = title;

    const messageElement = document.createElement("span");
    messageElement.textContent = message;

    toast.appendChild(titleElement);
    toast.appendChild(messageElement);

    elements.toastContainer.appendChild(toast);

    window.setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(30px)";

        window.setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}


function createNumberPop(text, x, y) {
    const pop = document.createElement("div");

    pop.className = "number-pop";
    pop.textContent = text;

    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;

    document.body.appendChild(pop);

    window.setTimeout(() => {
        pop.remove();
    }, 1000);
}


function triggerVisualSuccess(element) {
    document.body.classList.remove("flash");

    void document.body.offsetWidth;

    document.body.classList.add("flash");

    if (element) {
        element.classList.remove("node-success");

        void element.offsetWidth;

        element.classList.add("node-success");

        window.setTimeout(() => {
            element.classList.remove("node-success");
        }, 700);
    }
}


function logDeepWork() {
    /*
     * This button is a logging action.
     * It does not pretend to verify the user's work.
     * The user confirms that the session genuinely happened.
     */
    state.focusHours += 1;
    state.sessions += 1;
    state.sparks += 100;

    saveState();
    render();

    triggerVisualSuccess(document.querySelector(".logger-panel"));

    const rect = elements.logWorkBtn.getBoundingClientRect();

    createNumberPop(
        "+100 NS",
        rect.left + rect.width / 2 - 35,
        rect.top - 5
    );

    showToast(
        "FOCUS SESSION RECORDED",
        "60 minutes added • +100 Neuro-Sparks",
        "gold"
    );
}


function openUpgradeModal(skillKey) {
    if (!SKILL_DATA[skillKey]) {
        return;
    }

    const level = state.skills[skillKey];
    const cost = getUpgradeCost(skillKey);

    if (level >= 50) {
        showToast(
            "MAX LEVEL",
            `${SKILL_DATA[skillKey].name} has reached level 50.`
        );
        return;
    }

    if (state.sparks < cost) {
        const required = cost - state.sparks;

        showToast(
            "MORE WORK REQUIRED",
            `You need ${formatNumber(required)} additional Neuro-Sparks.`
        );

        return;
    }

    selectedSkill = skillKey;

    elements.modalTitle.textContent =
        `UPGRADE ${SKILL_DATA[skillKey].name}`;

    elements.modalDescription.textContent =
        SKILL_DATA[skillKey].description;

    elements.modalCurrent.textContent = level;
    elements.modalNext.textContent = level + 1;
    elements.modalCost.textContent = `${formatNumber(cost)} NS`;

    elements.modal.classList.add("active");
}


function closeUpgradeModal() {
    selectedSkill = null;
    elements.modal.classList.remove("active");
}


function confirmSkillUpgrade() {
    if (!selectedSkill) {
        return;
    }

    const skillKey = selectedSkill;
    const level = state.skills[skillKey];

    if (level >= 50) {
        closeUpgradeModal();

        showToast(
            "MAX LEVEL",
            "This cognitive pillar is already fully upgraded."
        );

        return;
    }

    const cost = getUpgradeCost(skillKey);

    if (state.sparks < cost) {
        closeUpgradeModal();

        showToast(
            "INSUFFICIENT SPARKS",
            "Complete more real work before upgrading."
        );

        return;
    }

    state.sparks -= cost;
    state.skills[skillKey] += 1;

    saveState();
    render();

    const skillNode = document.querySelector(
        `.skill-node[data-skill="${skillKey}"]`
    );

    triggerVisualSuccess(skillNode);

    const rect = skillNode.getBoundingClientRect();

    createNumberPop(
        `LVL ${state.skills[skillKey]}`,
        rect.left + rect.width / 2 - 30,
        rect.top + 50
    );

    closeUpgradeModal();

    showToast(
        "NEURAL UPGRADE COMPLETE",
        `${SKILL_DATA[skillKey].name} reached level ${state.skills[skillKey]}.`,
        "gold"
    );
}


function setupEvents() {
    elements.logWorkBtn.addEventListener("click", logDeepWork);

    document.querySelectorAll(".upgrade-button").forEach(button => {
        button.addEventListener("click", () => {
            const skillKey = button.dataset.upgrade;
            openUpgradeModal(skillKey);
        });
    });

    elements.closeModal.addEventListener(
        "click",
        closeUpgradeModal
    );

    elements.confirmUpgrade.addEventListener(
        "click",
        confirmSkillUpgrade
    );

    elements.modal.addEventListener("click", event => {
        if (event.target === elements.modal) {
            closeUpgradeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeUpgradeModal();
        }
    });
}


function initialize() {
    render();
    setupEvents();

    showToast(
        "COGNITIVE SYSTEM ONLINE",
        "Your progression data is stored locally on this device."
    );
}


initialize();