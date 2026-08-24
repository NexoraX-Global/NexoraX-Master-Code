(() => {
    "use strict";

    const STORAGE_KEY = "taskforge_micro_reactor_v1";

    const DEFAULT_STATE = {
        tasks: [],
        focusPoints: 0,
        coreLevel: 1,
        comboMultiplier: 1,
        comboExpiresAt: 0
    };

    let state = loadState();
    let comboInterval = null;
    let toastTimeout = null;

    const elements = {};

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        cacheElements();
        bindEvents();
        render();
        startComboClock();
    }

    function cacheElements() {
        elements.taskForm = document.getElementById("taskForm");
        elements.taskInput = document.getElementById("taskInput");
        elements.addTaskButton = document.getElementById("addTaskButton");
        elements.taskList = document.getElementById("taskList");
        elements.emptyState = document.getElementById("emptyState");
        elements.taskCount = document.getElementById("taskCount");
        elements.focusPoints = document.getElementById("focusPoints");
        elements.coreLevel = document.getElementById("coreLevel");
        elements.reactorCore = document.getElementById("reactorCore");
        elements.reactorStage = document.getElementById("reactorStage");
        elements.shockwave = document.getElementById("shockwave");
        elements.multiplier = document.getElementById("multiplier");
        elements.momentumProgress = document.getElementById("momentumProgress");
        elements.momentumText = document.getElementById("momentumText");
        elements.comboTimer = document.getElementById("comboTimer");
        elements.systemStatus = document.getElementById("systemStatus");
        elements.activityLog = document.getElementById("activityLog");
        elements.impactOverlay = document.getElementById("impactOverlay");
        elements.impactMultiplier = document.getElementById("impactMultiplier");
        elements.impactMessage = document.getElementById("impactMessage");
        elements.toast = document.getElementById("toast");
        elements.resetButton = document.getElementById("resetButton");
    }

    function bindEvents() {
        elements.taskForm.addEventListener("submit", handleAddTask);

        document.querySelectorAll(".suggestion").forEach(button => {
            button.addEventListener("click", () => {
                elements.taskInput.value = button.dataset.task || "";
                elements.taskInput.focus();
            });
        });

        elements.resetButton.addEventListener("click", resetTasks);

        elements.taskList.addEventListener("click", handleTaskListClick);
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return structuredClone(DEFAULT_STATE);
            }

            const parsed = JSON.parse(saved);

            return {
                ...DEFAULT_STATE,
                ...parsed,
                tasks: Array.isArray(parsed.tasks) ? parsed.tasks : []
            };
        } catch (error) {
            return structuredClone(DEFAULT_STATE);
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            showToast("LOCAL STORAGE UNAVAILABLE");
        }
    }

    function handleAddTask(event) {
        event.preventDefault();

        const text = elements.taskInput.value.trim();

        if (!text) {
            showToast("ENTER A SMALL ACTION FIRST");
            return;
        }

        if (text.length > 80) {
            showToast("KEEP THE ACTION SMALL");
            return;
        }

        if (state.tasks.length >= 3) {
            showToast("MAXIMUM 3 MICRO-TASKS ACTIVE");
            return;
        }

        const duplicate = state.tasks.some(
            task => task.text.toLowerCase() === text.toLowerCase()
        );

        if (duplicate) {
            showToast("THAT TASK ALREADY EXISTS");
            return;
        }

        state.tasks.push({
            id: createId(),
            text,
            completed: false,
            createdAt: Date.now()
        });

        elements.taskInput.value = "";

        saveState();
        render();

        addLog(`Task added: ${text}`);
        showToast("MICRO-TASK READY");
    }

    function handleTaskListClick(event) {
        const checkButton = event.target.closest("[data-action='complete']");
        const deleteButton = event.target.closest("[data-action='delete']");

        if (checkButton) {
            completeTask(checkButton.dataset.id);
            return;
        }

        if (deleteButton) {
            deleteTask(deleteButton.dataset.id);
        }
    }

    function completeTask(id) {
        const task = state.tasks.find(item => item.id === id);

        if (!task || task.completed) {
            return;
        }

        task.completed = true;

        const now = Date.now();
        const comboWasActive = state.comboExpiresAt > now;

        if (comboWasActive) {
            state.comboMultiplier = Math.min(3, state.comboMultiplier + 1);
        } else {
            state.comboMultiplier = 1;
        }

        state.comboExpiresAt = now + (15 * 60 * 1000);

        const reward = 10 * state.comboMultiplier;

        state.focusPoints += reward;
        state.coreLevel = Math.min(3, state.coreLevel + 1);

        saveState();
        render();
        triggerImpact(reward, state.comboMultiplier);
        addLog(`Completed "${task.text}" • +${reward} Focus Points`);

        if (state.comboMultiplier === 3) {
            showToast("FOCUS MOMENTUM: 3×");
        } else if (state.comboMultiplier === 2) {
            showToast("FOCUS MOMENTUM: 2×");
        } else {
            showToast("MICRO-WIN RECORDED");
        }
    }

    function deleteTask(id) {
        const index = state.tasks.findIndex(task => task.id === id);

        if (index === -1) {
            return;
        }

        const removed = state.tasks[index];

        state.tasks.splice(index, 1);

        saveState();
        render();

        addLog(`Task removed: ${removed.text}`);
    }

    function resetTasks() {
        const completedCount = state.tasks.filter(task => task.completed).length;

        if (state.tasks.length === 0) {
            showToast("NOTHING TO RESET");
            return;
        }

        state.tasks = [];
        state.comboMultiplier = 1;
        state.comboExpiresAt = 0;
        state.coreLevel = 1;

        saveState();
        render();

        addLog(`Task list reset • ${completedCount} completed`);
        showToast("TODAY'S TASKS RESET");
    }

    function render() {
        renderTasks();
        renderStats();
        renderReactor();
        renderMomentum();
    }

    function renderTasks() {
        elements.taskList.innerHTML = "";

        const completed = state.tasks.filter(task => task.completed).length;

        elements.taskCount.textContent = `${completed} / ${state.tasks.length}`;

        elements.emptyState.style.display =
            state.tasks.length === 0 ? "block" : "none";

        state.tasks.forEach(task => {
            const item = document.createElement("div");

            item.className = "task-item";

            if (task.completed) {
                item.classList.add("completed");
            }

            item.innerHTML = `
                <button
                    class="task-check"
                    type="button"
                    data-action="complete"
                    data-id="${escapeAttribute(task.id)}"
                    aria-label="${task.completed ? "Completed" : "Complete"} task">
                </button>

                <span class="task-name">${escapeHTML(task.text)}</span>

                <button
                    class="delete-task"
                    type="button"
                    data-action="delete"
                    data-id="${escapeAttribute(task.id)}"
                    aria-label="Delete task">
                    ×
                </button>
            `;

            elements.taskList.appendChild(item);
        });
    }

    function renderStats() {
        elements.focusPoints.textContent = state.focusPoints.toLocaleString();
    }

    function renderReactor() {
        elements.reactorCore.classList.remove(
            "state-1",
            "state-2",
            "state-3"
        );

        const completedCount = state.tasks.filter(
            task => task.completed
        ).length;

        let visualLevel = state.coreLevel;

        if (completedCount === 0) {
            visualLevel = 1;
        } else if (completedCount === 1) {
            visualLevel = 2;
        } else {
            visualLevel = 3;
        }

        elements.reactorCore.classList.add(`state-${visualLevel}`);
        elements.coreLevel.textContent = visualLevel;

        elements.systemStatus.textContent =
            completedCount === state.tasks.length && state.tasks.length > 0
                ? "MICRO-WIN SET COMPLETE"
                : "SYSTEM READY";
    }

    function renderMomentum() {
        const remaining = Math.max(0, state.comboExpiresAt - Date.now());

        if (remaining <= 0) {
            state.comboMultiplier = 1;

            elements.multiplier.textContent = "1×";
            elements.comboTimer.textContent = "--:--";
            elements.momentumText.textContent =
                "Complete a task to begin";
            elements.momentumProgress.style.width = "0%";

            return;
        }

        const total = 15 * 60 * 1000;
        const percent = Math.max(0, Math.min(100, (remaining / total) * 100));

        elements.multiplier.textContent =
            `${state.comboMultiplier}×`;

        elements.comboTimer.textContent =
            formatTime(remaining);

        elements.momentumText.textContent =
            "Momentum window active";

        elements.momentumProgress.style.width =
            `${percent}%`;
    }

    function startComboClock() {
        if (comboInterval) {
            clearInterval(comboInterval);
        }

        comboInterval = setInterval(() => {
            const wasActive = state.comboExpiresAt > Date.now();

            renderMomentum();

            if (wasActive && state.comboExpiresAt <= Date.now()) {
                state.comboMultiplier = 1;
                state.comboExpiresAt = 0;
                saveState();
                renderMomentum();
                showToast("MOMENTUM WINDOW ENDED");
            }
        }, 1000);
    }

    function triggerImpact(reward, multiplier) {
        elements.impactMultiplier.textContent =
            `+${reward}`;

        elements.impactMessage.textContent =
            multiplier > 1
                ? `${multiplier}× MOMENTUM`
                : "MICRO-WIN COMPLETE";

        elements.impactOverlay.classList.remove("active");

        void elements.impactOverlay.offsetWidth;

        elements.impactOverlay.classList.add("active");

        elements.reactorStage.classList.remove("screen-impact");

        void elements.reactorStage.offsetWidth;

        elements.reactorStage.classList.add("screen-impact");

        setTimeout(() => {
            elements.impactOverlay.classList.remove("active");
            elements.reactorStage.classList.remove("screen-impact");
        }, 900);
    }

    function addLog(message) {
        const entry = document.createElement("div");

        entry.className = "log-entry";

        const time = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

        entry.innerHTML = `
            <span class="log-time">${escapeHTML(time)}</span>
            <span>${escapeHTML(message)}</span>
        `;

        elements.activityLog.prepend(entry);

        while (elements.activityLog.children.length > 15) {
            elements.activityLog.lastElementChild.remove();
        }
    }

    function showToast(message) {
        clearTimeout(toastTimeout);

        elements.toast.textContent = message;
        elements.toast.classList.add("show");

        toastTimeout = setTimeout(() => {
            elements.toast.classList.remove("show");
        }, 1800);
    }

    function formatTime(milliseconds) {
        const totalSeconds = Math.ceil(milliseconds / 1000);

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function createId() {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function escapeHTML(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHTML(value);
    }
})();