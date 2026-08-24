"use strict";

/*
 * TASKFORGE-CORE
 * Neural Syndicate: Corporate Territory Warfare
 *
 * Exactly one JavaScript file.
 * All persistence uses localStorage.
 * No external libraries required.
 */

const STORAGE_KEY =
    "taskforge_neural_syndicate_v13";


const DEFAULT_STATE = {

    syndicate: {
        name: "NEXUS SYNDICATE",
        title: "SENIOR EXECUTIVE DIRECTOR",
        valuation: 12.84,
        valuationChange: 4.7,

        playerShare: 54,
        enemyShare: 46,

        productivityPower: 18420,
        controlledSectors: 13,
        totalSectors: 24,

        warScore: 72850,

        dividends: 8240,
        totalDividends: 0,

        sessions: 0
    },

    enemy: {
        name: "VOID INDUSTRIES"
    },

    logs: [
        {
            type: "alert",
            message:
                "VOID INDUSTRIES attempted a sector expansion."
        },
        {
            type: "success",
            message:
                "NEXUS SYNDICATE secured productivity sector 17."
        },
        {
            type: "gold",
            message:
                "Treasury forecast updated: +1,620 $FORGE/day."
        },
        {
            type: "alert",
            message:
                "Apex Corp detected near the eastern market."
        },
        {
            type: "success",
            message:
                "Executive focus protocol increased war score."
        }
    ],

    sectors: [
        true, true, false, true, true, false,
        true, false, true, true, false, true,
        true, false, false, true, true, false,
        false, true, false, true, false, true
    ]
};


let state = loadState();


const el = {

    syndicateName:
        document.getElementById("syndicateName"),

    corporateTitle:
        document.getElementById("corporateTitle"),

    companyValuation:
        document.getElementById("companyValuation"),

    valuationChange:
        document.getElementById("valuationChange"),

    warStatus:
        document.getElementById("warStatus"),

    playerFactionName:
        document.getElementById("playerFactionName"),

    enemyFactionName:
        document.getElementById("enemyFactionName"),

    playerShare:
        document.getElementById("playerShare"),

    enemyShare:
        document.getElementById("enemyShare"),

    playerTerritoryBar:
        document.getElementById("playerTerritoryBar"),

    dominanceText:
        document.getElementById("dominanceText"),

    sectorCount:
        document.getElementById("sectorCount"),

    productivityPower:
        document.getElementById("productivityPower"),

    controlledSectors:
        document.getElementById("controlledSectors"),

    warScore:
        document.getElementById("warScore"),

    focusMinutes:
        document.getElementById("focusMinutes"),

    injectionButton:
        document.getElementById("injectionButton"),

    injectionResult:
        document.getElementById("injectionResult"),

    tickerTrack:
        document.getElementById("tickerTrack"),

    takeoverLog:
        document.getElementById("takeoverLog"),

    dividendBalance:
        document.getElementById("dividendBalance"),

    dailyDividend:
        document.getElementById("dailyDividend"),

    collectDividend:
        document.getElementById("collectDividend"),

    sectorGrid:
        document.getElementById("sectorGrid"),

    screenFlash:
        document.getElementById("screenFlash"),

    particleLayer:
        document.getElementById("particleLayer"),

    warAlert:
        document.getElementById("warAlert"),

    alertMessage:
        document.getElementById("alertMessage"),

    closeAlert:
        document.getElementById("closeAlert"),

    clock:
        document.getElementById("clock")
};


function cloneDefaultState() {

    return JSON.parse(
        JSON.stringify(DEFAULT_STATE)
    );
}


function loadState() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!saved) {

            const fresh =
                cloneDefaultState();

            saveState(fresh);

            return fresh;
        }

        const parsed =
            JSON.parse(saved);

        if (
            !parsed ||
            !parsed.syndicate ||
            !parsed.enemy ||
            !Array.isArray(parsed.logs) ||
            !Array.isArray(parsed.sectors)
        ) {

            const fresh =
                cloneDefaultState();

            saveState(fresh);

            return fresh;
        }

        return parsed;

    } catch (error) {

        const fresh =
            cloneDefaultState();

        return fresh;
    }
}


function saveState() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

    } catch (error) {

        console.warn(
            "TaskForge storage unavailable."
        );
    }
}


function number(value) {

    return Math.round(
        Number(value) || 0
    ).toLocaleString("en-US");
}


function percentage(value) {

    return `${Number(value).toFixed(1)}%`;
}


function moneyBillions(value) {

    return `$${Number(value).toFixed(2)}B`;
}


function getDailyDividend() {

    /*
     * Dividend calculation is intentionally transparent:
     * 3% of productivity power, capped for the prototype.
     */

    const base =
        state.syndicate.productivityPower * 0.03;

    const territoryBonus =
        state.syndicate.playerShare * 12;

    return Math.max(
        100,
        Math.round(
            base + territoryBonus
        )
    );
}


function renderHUD() {

    const syndicate =
        state.syndicate;

    el.syndicateName.textContent =
        syndicate.name;

    el.corporateTitle.textContent =
        syndicate.title;

    el.companyValuation.textContent =
        moneyBillions(
            syndicate.valuation
        );

    el.valuationChange.textContent =
        `${syndicate.valuationChange >= 0 ? "+" : ""}${syndicate.valuationChange.toFixed(1)}%`;

    el.playerFactionName.textContent =
        syndicate.name;

    el.enemyFactionName.textContent =
        state.enemy.name;

    el.playerShare.textContent =
        percentage(
            syndicate.playerShare
        );

    el.enemyShare.textContent =
        percentage(
            syndicate.enemyShare
        );

    el.playerTerritoryBar.style.width =
        `${syndicate.playerShare}%`;

    const difference =
        syndicate.playerShare -
        syndicate.enemyShare;

    const sign =
        difference >= 0 ? "+" : "";

    el.dominanceText.textContent =
        `DOMINANCE ${sign}${difference.toFixed(1)}%`;

    el.sectorCount.textContent =
        syndicate.totalSectors;

    el.productivityPower.textContent =
        number(
            syndicate.productivityPower
        );

    el.controlledSectors.textContent =
        `${syndicate.controlledSectors} / ${syndicate.totalSectors}`;

    el.warScore.textContent =
        number(
            syndicate.warScore
        );

    if (difference < 0) {

        el.warStatus.textContent =
            "UNDER PRESSURE";

        el.warStatus.className =
            "war-status warning";

    } else if (difference < 5) {

        el.warStatus.textContent =
            "CONTESTED";

        el.warStatus.className =
            "war-status warning";

    } else {

        el.warStatus.textContent =
            "STABLE";

        el.warStatus.className =
            "war-status safe";
    }
}


function renderDividendVault() {

    const daily =
        getDailyDividend();

    el.dividendBalance.textContent =
        `${number(state.syndicate.dividends)} $FORGE`;

    el.dailyDividend.textContent =
        `+${number(daily)} $FORGE / DAY`;

    el.collectDividend.disabled =
        state.syndicate.dividends <= 0;
}


function renderSectors() {

    el.sectorGrid.innerHTML = "";

    state.sectors.forEach(
        (controlled, index) => {

            const sector =
                document.createElement("div");

            sector.className =
                controlled
                    ? "sector controlled"
                    : "sector enemy";

            sector.textContent =
                String(index + 1)
                    .padStart(2, "0");

            sector.title =
                controlled
                    ? `Sector ${index + 1}: Nexus controlled`
                    : `Sector ${index + 1}: Opposing control`;

            el.sectorGrid.appendChild(
                sector
            );
        }
    );
}


function getTimeString() {

    const now = new Date();

    return now.toLocaleTimeString(
        "en-US",
        {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );
}


function renderLogs() {

    el.takeoverLog.innerHTML = "";

    state.logs
        .slice(-20)
        .reverse()
        .forEach(log => {

            const line =
                document.createElement("div");

            line.className =
                `log-line ${log.type || ""}`;

            const time =
                document.createElement("span");

            time.className = "time";

            time.textContent =
                `[${log.time || getTimeString()}] `;

            const message =
                document.createElement("span");

            message.textContent =
                log.message;

            line.appendChild(time);
            line.appendChild(message);

            el.takeoverLog.appendChild(
                line
            );
        });
}


function addLog(
    message,
    type = ""
) {

    state.logs.push({
        message,
        type,
        time: getTimeString()
    });

    if (state.logs.length > 40) {

        state.logs =
            state.logs.slice(-40);
    }

    renderLogs();
    saveState();
}


function renderTicker() {

    const tickerMessages = [

        "NEXUS SYNDICATE increased productivity output.",

        "VOID INDUSTRIES opened a simulated market sector.",

        "NEXUS executive session generated +PRODUCTIVITY POWER.",

        "Sector 09 is currently contested.",

        "Treasury forecast recalculated.",

        "Corporate network latency nominal.",

        "New productivity signal detected.",

        "NEXUS SYNDICATE maintains majority territory.",

        "VOID INDUSTRIES is attempting strategic expansion.",

        "Executive focus protocol online."

    ];


    const repeated =
        tickerMessages.concat(
            tickerMessages
        );


    el.tickerTrack.innerHTML =
        repeated
            .map(message => {

                const item =
                    document.createElement("span");

                item.className =
                    "ticker-item";

                const hostile =
                    message.includes("VOID");

                if (hostile) {

                    item.innerHTML =
                        `<strong>HOSTILE:</strong> ${escapeHTML(message)}`;

                } else {

                    item.textContent =
                        message;
                }

                return item.outerHTML;

            })
            .join("");
}


function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value;

    return div.innerHTML;
}


function createParticles(amount = 35) {

    el.particleLayer.innerHTML = "";

    const buttonRect =
        el.injectionButton
            .getBoundingClientRect();

    const originX =
        buttonRect.left +
        buttonRect.width / 2;

    const originY =
        buttonRect.top +
        buttonRect.height / 2;


    for (let i = 0; i < amount; i++) {

        const particle =
            document.createElement("span");

        particle.className =
            "particle";

        particle.style.left =
            `${originX}px`;

        particle.style.top =
            `${originY}px`;

        particle.style.setProperty(
            "--px",
            Math.random() * 100
        );

        particle.style.setProperty(
            "--py",
            Math.random() * 100
        );

        const size =
            Math.floor(
                Math.random() * 5
            ) + 3;

        particle.style.width =
            `${size}px`;

        particle.style.height =
            `${size}px`;

        el.particleLayer.appendChild(
            particle
        );
    }


    window.setTimeout(
        () => {
            el.particleLayer.innerHTML = "";
        },
        1000
    );
}


function flashScreen() {

    el.screenFlash.classList.remove(
        "active"
    );

    void el.screenFlash.offsetWidth;

    el.screenFlash.classList.add(
        "active"
    );
}


function impactAnimation() {

    document.body.classList.remove(
        "impact"
    );

    void document.body.offsetWidth;

    document.body.classList.add(
        "impact"
    );

    flashScreen();

    createParticles();
}


function clamp(
    value,
    minimum,
    maximum
) {

    return Math.min(
        maximum,
        Math.max(
            minimum,
            value
        )
    );
}


function updateTerritoryAfterWork(
    minutes
) {

    /*
     * Transparent productivity calculation:
     * every focus minute creates 12 productivity power.
     */

    const productivityGain =
        minutes * 12;

    state.syndicate.productivityPower +=
        productivityGain;

    state.syndicate.warScore +=
        productivityGain * 3;

    /*
     * Territory movement remains intentionally bounded
     * between 5% and 95%.
     */

    const shareGain =
        Math.min(
            2.5,
            0.15 +
            (minutes / 240)
        );

    state.syndicate.playerShare =
        clamp(
            state.syndicate.playerShare +
            shareGain,
            5,
            95
        );

    state.syndicate.enemyShare =
        100 -
        state.syndicate.playerShare;


    const oldControlled =
        state.syndicate.controlledSectors;

    const estimatedSectors =
        Math.round(
            state.syndicate.playerShare /
            100 *
            state.syndicate.totalSectors
        );

    state.syndicate.controlledSectors =
        clamp(
            estimatedSectors,
            1,
            state.syndicate.totalSectors - 1
        );


    if (
        state.syndicate.controlledSectors >
        oldControlled
    ) {

        const gained =
            state.syndicate.controlledSectors -
            oldControlled;

        captureRandomSectors(gained);
    }


    const valuationGain =
        minutes * 0.0015;

    state.syndicate.valuation +=
        valuationGain;

    state.syndicate.valuationChange =
        clamp(
            state.syndicate.valuationChange +
            0.15,
            -20,
            25
        );

    state.syndicate.sessions += 1;

    return productivityGain;
}


function captureRandomSectors(amount) {

    let remaining =
        amount;

    const candidates =
        state.sectors
            .map(
                (controlled, index) =>
                    controlled
                        ? null
                        : index
            )
            .filter(
                index => index !== null
            );

    while (
        remaining > 0 &&
        candidates.length > 0
    ) {

        const randomIndex =
            Math.floor(
                Math.random() *
                candidates.length
            );

        const sectorIndex =
            candidates.splice(
                randomIndex,
                1
            )[0];

        state.sectors[
            sectorIndex
        ] = true;

        remaining--;
    }
}


function executeCorporateInjection() {

    const minutes =
        Number(
            el.focusMinutes.value
        );


    if (
        !Number.isFinite(minutes)
    ) {

        showInjectionResult(
            "ENTER A VALID FOCUS SESSION.",
            true
        );

        return;
    }


    const safeMinutes =
        clamp(
            Math.floor(minutes),
            5,
            480
        );

    el.focusMinutes.value =
        safeMinutes;


    const productivityGain =
        updateTerritoryAfterWork(
            safeMinutes
        );


    const dividendGain =
        Math.round(
            safeMinutes * 2
        );


    state.syndicate.dividends +=
        dividendGain;


    renderAll();

    impactAnimation();


    el.injectionButton.disabled =
        true;


    showInjectionResult(
        `INJECTION COMPLETE • +${number(productivityGain)} POWER • +${number(dividendGain)} $FORGE`
    );


    addLog(
        `NEXUS logged ${safeMinutes} min focus session. +${number(productivityGain)} productivity power.`,
        "success"
    );


    window.setTimeout(
        () => {

            el.injectionButton.disabled =
                false;

        },
        800
    );
}


function showInjectionResult(
    message,
    error = false
) {

    el.injectionResult.textContent =
        message;

    el.injectionResult.style.color =
        error
            ? "var(--crimson)"
            : "var(--emerald)";


    window.clearTimeout(
        showInjectionResult.timer
    );


    showInjectionResult.timer =
        window.setTimeout(
            () => {

                el.injectionResult.textContent =
                    "SYSTEM READY";

                el.injectionResult.style.color =
                    "var(--muted)";

            },
            5000
        );
}


function collectDividends() {

    const amount =
        state.syndicate.dividends;

    if (amount <= 0) {
        return;
    }


    state.syndicate.totalDividends +=
        amount;

    state.syndicate.dividends = 0;


    renderDividendVault();

    impactAnimation();


    addLog(
        `Executive treasury collected ${number(amount)} $FORGE dividends.`,
        "gold"
    );


    showInjectionResult(
        `TREASURY COLLECTED • ${number(amount)} $FORGE`
    );
}


function simulateHostileEvent() {

    const events = [

        {
            type: "alert",
            message:
                "VOID INDUSTRIES raided a simulated sector! -0.4% market pressure."
        },

        {
            type: "alert",
            message:
                "Apex Corp detected attempting a hostile expansion."
        },

        {
            type: "success",
            message:
                "NEXUS defensive productivity network activated."
        },

        {
            type: "gold",
            message:
                "Market analysts upgraded NEXUS productivity outlook."
        },

        {
            type: "success",
            message:
                "NEXUS secured a temporary productivity advantage."
        }

    ];


    const event =
        events[
            Math.floor(
                Math.random() *
                events.length
            )
        ];


    if (
        event.type === "alert"
    ) {

        const pressure =
            Math.random() * 0.35;

        state.syndicate.playerShare =
            clamp(
                state.syndicate.playerShare -
                pressure,
                5,
                95
            );

        state.syndicate.enemyShare =
            100 -
            state.syndicate.playerShare;

        addLog(
            event.message,
            "alert"
        );

        renderAll();


        /*
         * Warning appears periodically,
         * but there is no punishment for ignoring it.
         */

        if (
            Math.random() > 0.45
        ) {

            showWarAlert(
                event.message
            );
        }

    } else {

        addLog(
            event.message,
            event.type
        );
    }
}


function showWarAlert(message) {

    el.alertMessage.textContent =
        message;

    el.warAlert.classList.add(
        "visible"
    );
}


function closeWarAlert() {

    el.warAlert.classList.remove(
        "visible"
    );
}


function updateClock() {

    const now =
        new Date();


    el.clock.textContent =
        now.toLocaleTimeString(
            "en-US",
            {
                hour12: false
            }
        );
}


function validateInput() {

    el.focusMinutes.addEventListener(
        "input",
        () => {

            if (
                el.focusMinutes.value === ""
            ) {
                return;
            }

            let value =
                Number(
                    el.focusMinutes.value
                );

            if (
                !Number.isFinite(value)
            ) {
                return;
            }

            value =
                clamp(
                    value,
                    5,
                    480
                );

            el.focusMinutes.value =
                value;
        }
    );
}


function setupEvents() {

    el.injectionButton.addEventListener(
        "click",
        executeCorporateInjection
    );


    el.collectDividend.addEventListener(
        "click",
        collectDividends
    );


    el.closeAlert.addEventListener(
        "click",
        closeWarAlert
    );


    el.warAlert.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                el.warAlert
            ) {

                closeWarAlert();
            }
        }
    );


    el.focusMinutes.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                executeCorporateInjection();
            }
        }
    );


    validateInput();
}


function renderAll() {

    renderHUD();
    renderDividendVault();
    renderSectors();
    renderLogs();

    saveState();
}


function initialize() {

    setupEvents();

    renderTicker();

    renderAll();

    updateClock();


    window.setInterval(
        updateClock,
        1000
    );


    window.setInterval(
        simulateHostileEvent,
        9000
    );


    window.setInterval(
        () => {

            renderHUD();
            renderDividendVault();

        },
        5000
    );
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

} else {

    initialize();
}