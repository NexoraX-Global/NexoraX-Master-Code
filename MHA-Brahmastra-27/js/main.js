"use strict";

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       TASKFORGE — GENESIS PROTOCOL
       Identity & Commitment Experience
    ========================================================= */

    const state = {
        phase: 1,
        mission: "",
        holding: false,
        holdStartTime: 0,
        holdAnimationFrame: null,
        holdCompleted: false,
        success: false
    };

    const HOLD_DURATION = 3000;

    /* =========================================================
       INTERNATIONALIZATION
    ========================================================= */

    const translations = {
        en: {
            secureEnvironment: "SECURE ENVIRONMENT",
            genesisProtocol: "GENESIS PROTOCOL",

            defineTitle: "Define what",
            mattersTitle: "matters most.",

            defineDescription:
                "Put your most meaningful objective into words. Make it clear, personal, and genuinely yours.",

            identityDirection: "IDENTITY & DIRECTION",
            live: "LIVE",

            missionLabel:
                "Define your ultimate mission in life.",

            missionPlaceholder:
                "e.g., Crack UPSC, Build a Startup",

            missionGuidance:
                "Choose something meaningful to you.",

            generateProtocol:
                "Generate Protocol",

            privateNote:
                "Your statement stays on this device until you choose to continue.",

            digitalContract:
                "DIGITAL CONTRACT",

            contractTitle:
                "A commitment to your direction.",

            yourMission:
                "YOUR MISSION",

            contractPrinciple:
                "Progress begins with clarity. This commitment is a reminder of the direction you chose today.",

            readyToCommit:
                "Ready to commit?",

            holdToCommit:
                "HOLD TO COMMIT",

            holdSubtitle:
                "Keep holding for 3 seconds",

            releaseHint:
                "Release early and the commitment resets.",

            editMission:
                "Edit mission",

            commitmentVerified:
                "COMMITMENT VERIFIED",

            identityLocked:
                "Identity Locked.",

            welcomePercent:
                "Welcome to the 1%.",

            successDescription:
                "Your direction has been defined. Let your daily actions give it momentum.",

            committedDirection:
                "COMMITTED DIRECTION",

            enterTaskForge:
                "Enter TaskForge",

            successFootnote:
                "One clear direction. One step at a time.",

            footerText:
                "Built for focused progress.",

            emptyMission:
                "Give your mission a little more clarity before continuing.",

            missionSaved:
                "Your direction has been prepared.",

            commitmentComplete:
                "Commitment confirmed."
        },

        hi: {
            secureEnvironment: "सुरक्षित वातावरण",
            genesisProtocol: "जेनिसिस प्रोटोकॉल",

            defineTitle: "परिभाषित करें",
            mattersTitle: "जो सबसे महत्वपूर्ण है।",

            defineDescription:
                "अपने सबसे महत्वपूर्ण उद्देश्य को शब्दों में रखें। इसे स्पष्ट, व्यक्तिगत और पूरी तरह अपना बनाएँ।",

            identityDirection: "पहचान और दिशा",
            live: "सक्रिय",

            missionLabel:
                "अपने जीवन के अंतिम लक्ष्य को परिभाषित करें।",

            missionPlaceholder:
                "जैसे, UPSC पास करना, स्टार्टअप बनाना",

            missionGuidance:
                "ऐसा लक्ष्य चुनें जो आपके लिए वास्तव में महत्वपूर्ण हो।",

            generateProtocol:
                "प्रोटोकॉल बनाएँ",

            privateNote:
                "आगे बढ़ने तक आपका कथन इसी डिवाइस पर रहता है।",

            digitalContract:
                "डिजिटल कॉन्ट्रैक्ट",

            contractTitle:
                "आपकी दिशा के प्रति एक प्रतिबद्धता।",

            yourMission:
                "आपका लक्ष्य",

            contractPrinciple:
                "प्रगति स्पष्टता से शुरू होती है। यह प्रतिबद्धता आज चुनी गई आपकी दिशा की याद दिलाती है।",

            readyToCommit:
                "प्रतिबद्ध होने के लिए तैयार हैं?",

            holdToCommit:
                "प्रतिबद्ध होने के लिए दबाए रखें",

            holdSubtitle:
                "3 सेकंड तक दबाए रखें",

            releaseHint:
                "जल्दी छोड़ने पर प्रतिबद्धता फिर से शुरू होगी।",

            editMission:
                "लक्ष्य बदलें",

            commitmentVerified:
                "प्रतिबद्धता सत्यापित",

            identityLocked:
                "पहचान लॉक हो गई।",

            welcomePercent:
                "1% में आपका स्वागत है।",

            successDescription:
                "आपकी दिशा तय हो गई है। अब आपके रोज़ के कदम इसे गति देंगे।",

            committedDirection:
                "प्रतिबद्ध दिशा",

            enterTaskForge:
                "TaskForge में प्रवेश करें",

            successFootnote:
                "एक स्पष्ट दिशा। एक समय में एक कदम।",

            footerText:
                "केंद्रित प्रगति के लिए बनाया गया।",

            emptyMission:
                "आगे बढ़ने से पहले अपने लक्ष्य को थोड़ा और स्पष्ट करें।",

            missionSaved:
                "आपकी दिशा तैयार है।",

            commitmentComplete:
                "प्रतिबद्धता पूरी हुई।"
        }
    };

    let language = "en";

    /* =========================================================
       DOM REFERENCES
    ========================================================= */

    const elements = {
        phaseOne: document.getElementById("phaseOne"),
        phaseTwo: document.getElementById("phaseTwo"),
        phaseThree: document.getElementById("phaseThree"),

        missionInput: document.getElementById("missionInput"),
        missionDisplay: document.getElementById("missionDisplay"),
        successMission: document.getElementById("successMission"),

        generateButton: document.getElementById("generateButton"),
        backButton: document.getElementById("backButton"),

        holdButton: document.getElementById("holdButton"),
        holdProgress: document.querySelector(".hold-progress"),
        holdProgressBar: document.getElementById("holdProgressBar"),
        holdTimer: document.getElementById("holdTimer"),
        releaseMessage: document.getElementById("releaseMessage"),

        characterCount: document.getElementById("characterCount"),
        validationMessage: document.getElementById("validationMessage"),

        continueButton: document.getElementById("continueButton"),

        stepOne: document.getElementById("stepOne"),
        stepTwo: document.getElementById("stepTwo"),
        stepThree: document.getElementById("stepThree"),

        introCopy: document.getElementById("introCopy"),

        toast: document.getElementById("toast"),
        toastText: document.getElementById("toastText"),

        currentYear: document.getElementById("currentYear")
    };

    /* =========================================================
       TRANSLATION HELPERS
    ========================================================= */

    function t(key) {
        return translations[language][key] || key;
    }

    function applyTranslations() {
        document.documentElement.lang = language;

        document.querySelectorAll("[data-i18n]").forEach((element) => {
            const key = element.dataset.i18n;

            if (translations[language][key]) {
                element.textContent = translations[language][key];
            }
        });

        document
            .querySelectorAll("[data-i18n-placeholder]")
            .forEach((element) => {
                const key = element.dataset.i18nPlaceholder;

                if (translations[language][key]) {
                    element.placeholder = translations[language][key];
                }
            });
    }

    /* =========================================================
       CHARACTER COUNTER
    ========================================================= */

    function updateCharacterCount() {
        const length = elements.missionInput.value.length;

        elements.characterCount.textContent = length;

        if (length >= 160) {
            elements.characterCount.style.color = "#e5c765";
        } else {
            elements.characterCount.style.color = "";
        }
    }

    /* =========================================================
       VALIDATION
    ========================================================= */

    function clearValidation() {
        elements.validationMessage.textContent = "";
    }

    function validateMission() {
        const value = elements.missionInput.value.trim();

        if (value.length < 3) {
            elements.validationMessage.textContent = t("emptyMission");

            elements.missionInput.focus();

            return false;
        }

        clearValidation();

        return true;
    }

    /* =========================================================
       TOAST
    ========================================================= */

    let toastTimer = null;

    function showToast(message) {
        window.clearTimeout(toastTimer);

        elements.toastText.textContent = message;
        elements.toast.classList.add("visible");

        toastTimer = window.setTimeout(() => {
            elements.toast.classList.remove("visible");
        }, 2600);
    }

    /* =========================================================
       STEP INDICATOR
    ========================================================= */

    function updateSteps(currentPhase) {
        const steps = [
            elements.stepOne,
            elements.stepTwo,
            elements.stepThree
        ];

        steps.forEach((step, index) => {
            step.classList.remove("active", "completed");

            const stepNumber = index + 1;

            if (stepNumber < currentPhase) {
                step.classList.add("completed");
            }

            if (stepNumber === currentPhase) {
                step.classList.add("active");
            }
        });
    }

    /* =========================================================
       PHASE TRANSITION ENGINE
    ========================================================= */

    function showPhase(targetPhase) {
        const currentElement =
            state.phase === 1
                ? elements.phaseOne
                : state.phase === 2
                    ? elements.phaseTwo
                    : elements.phaseThree;

        const targetElement =
            targetPhase === 1
                ? elements.phaseOne
                : targetPhase === 2
                    ? elements.phaseTwo
                    : elements.phaseThree;

        if (currentElement === targetElement) {
            return;
        }

        currentElement.classList.add("fade-out");

        window.setTimeout(() => {
            currentElement.classList.remove("active", "fade-out");

            targetElement.classList.add("active");

            state.phase = targetPhase;

            updateSteps(targetPhase);

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }, 240);
    }

    /* =========================================================
       PHASE 1 — GENERATE CONTRACT
    ========================================================= */

    function generateProtocol() {
        if (!validateMission()) {
            return;
        }

        state.mission = elements.missionInput.value.trim();

        elements.missionDisplay.textContent = state.mission;
        elements.successMission.textContent = state.mission;

        showToast(t("missionSaved"));

        window.setTimeout(() => {
            showPhase(2);
        }, 350);
    }

    /* =========================================================
       RETURN TO EDIT
    ========================================================= */

    function editMission() {
        cancelHold();

        state.holdCompleted = false;

        showPhase(1);

        window.setTimeout(() => {
            elements.missionInput.focus();
            elements.missionInput.setSelectionRange(
                elements.missionInput.value.length,
                elements.missionInput.value.length
            );
        }, 320);
    }

    /* =========================================================
       HOLD INTERACTION
       EXACTLY 3 SECONDS
    ========================================================= */

    function startHold(event) {
        if (state.phase !== 2) {
            return;
        }

        if (state.holdCompleted || state.holding) {
            return;
        }

        if (event && event.type === "mousedown" && event.button !== 0) {
            return;
        }

        if (event) {
            event.preventDefault();
        }

        state.holding = true;
        state.holdStartTime = performance.now();

        elements.holdButton.classList.add("is-holding");
        elements.releaseMessage.classList.add("active");

        cancelAnimationFrame(state.holdAnimationFrame);

        state.holdAnimationFrame = requestAnimationFrame(updateHoldProgress);
    }

    function updateHoldProgress(currentTime) {
        if (!state.holding) {
            return;
        }

        const elapsed = currentTime - state.holdStartTime;

        const progress = Math.min(
            elapsed / HOLD_DURATION,
            1
        );

        const percentage = progress * 100;

        elements.holdProgress.style.transform =
            `scaleX(${progress})`;

        elements.holdProgressBar.style.width =
            `${percentage}%`;

        elements.holdTimer.textContent =
            `${(progress * 3).toFixed(1)}s`;

        if (progress >= 1) {
            completeHold();
            return;
        }

        state.holdAnimationFrame =
            requestAnimationFrame(updateHoldProgress);
    }

    function releaseHold(event) {
        if (event) {
            event.preventDefault();
        }

        if (!state.holding) {
            return;
        }

        if (state.holdCompleted) {
            return;
        }

        cancelHold();

        elements.holdTimer.textContent = "0.0s";

        elements.releaseMessage.classList.remove("active");

        elements.holdProgress.style.transform =
            "scaleX(0)";

        elements.holdProgressBar.style.width =
            "0%";
    }

    function cancelHold() {
        state.holding = false;

        cancelAnimationFrame(state.holdAnimationFrame);

        state.holdAnimationFrame = null;

        elements.holdButton.classList.remove("is-holding");

        elements.holdProgress.style.transform =
            "scaleX(0)";

        elements.holdProgressBar.style.width =
            "0%";

        elements.holdTimer.textContent = "0.0s";
    }

    function completeHold() {
        if (!state.holding) {
            return;
        }

        state.holding = false;
        state.holdCompleted = true;

        cancelAnimationFrame(state.holdAnimationFrame);

        state.holdAnimationFrame = null;

        elements.holdProgress.style.transform =
            "scaleX(1)";

        elements.holdProgressBar.style.width =
            "100%";

        elements.holdTimer.textContent = "3.0s";

        elements.holdButton.classList.remove("is-holding");

        elements.releaseMessage.classList.remove("active");

        showToast(t("commitmentComplete"));

        window.setTimeout(() => {
            state.success = true;
            showPhase(3);
        }, 500);
    }

    /* =========================================================
       POINTER SAFETY
       If the user drags outside the button while holding,
       release the interaction naturally.
    ========================================================= */

    function handlePointerLeave(event) {
        if (!state.holding) {
            return;
        }

        if (event.pointerType === "mouse") {
            releaseHold(event);
        }
    }

    /* =========================================================
       CONTINUE BUTTON
    ========================================================= */

    function continueToTaskForge() {
        /*
         * This gateway intentionally does not fabricate navigation
         * to a non-existent destination. The mission remains available
         * in memory for the next application layer.
         */

        showToast(
            language === "hi"
                ? "TaskForge आपका अगला कदम तैयार करने के लिए तैयार है।"
                : "TaskForge is ready for your next step."
        );
    }

    /* =========================================================
       INPUT EVENTS
    ========================================================= */

    elements.missionInput.addEventListener("input", () => {
        updateCharacterCount();
        clearValidation();
    });

    elements.missionInput.addEventListener("keydown", (event) => {
        if (
            event.key === "Enter" &&
            (event.ctrlKey || event.metaKey)
        ) {
            event.preventDefault();
            generateProtocol();
        }
    });

    /* =========================================================
       GENERATE / BACK
    ========================================================= */

    elements.generateButton.addEventListener(
        "click",
        generateProtocol
    );

    elements.backButton.addEventListener(
        "click",
        editMission
    );

    /* =========================================================
       HOLD EVENTS
       Mouse + Touch + Pointer coverage
    ========================================================= */

    elements.holdButton.addEventListener(
        "mousedown",
        startHold
    );

    elements.holdButton.addEventListener(
        "mouseup",
        releaseHold
    );

    elements.holdButton.addEventListener(
        "mouseleave",
        handlePointerLeave
    );

    elements.holdButton.addEventListener(
        "touchstart",
        startHold,
        { passive: false }
    );

    elements.holdButton.addEventListener(
        "touchend",
        releaseHold,
        { passive: false }
    );

    elements.holdButton.addEventListener(
        "touchcancel",
        releaseHold,
        { passive: false }
    );

    elements.holdButton.addEventListener(
        "pointerdown",
        (event) => {
            if (
                event.pointerType === "pen"
            ) {
                startHold(event);
            }
        }
    );

    elements.holdButton.addEventListener(
        "pointerup",
        (event) => {
            if (
                event.pointerType === "pen"
            ) {
                releaseHold(event);
            }
        }
    );

    elements.holdButton.addEventListener(
        "contextmenu",
        (event) => {
            event.preventDefault();
        }
    );

    /* =========================================================
       GLOBAL RELEASE SAFETY
       Handles releasing the mouse outside the button.
    ========================================================= */

    document.addEventListener("mouseup", (event) => {
        if (!state.holding) {
            return;
        }

        if (event.target !== elements.holdButton) {
            releaseHold(event);
        }
    });

    document.addEventListener("touchend", (event) => {
        if (!state.holding) {
            return;
        }

        releaseHold(event);
    }, { passive: false });

    window.addEventListener("blur", () => {
        if (state.holding) {
            cancelHold();
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden && state.holding) {
            cancelHold();
        }
    });

    /* =========================================================
       CONTINUE
    ========================================================= */

    elements.continueButton.addEventListener(
        "click",
        continueToTaskForge
    );

    /* =========================================================
       KEYBOARD ACCESSIBILITY
       Holding Space/Enter for the required duration.
    ========================================================= */

    let keyboardHolding = false;

    elements.holdButton.addEventListener("keydown", (event) => {
        if (
            (event.key === " " || event.key === "Enter") &&
            !keyboardHolding
        ) {
            event.preventDefault();

            keyboardHolding = true;

            startHold(event);
        }
    });

    elements.holdButton.addEventListener("keyup", (event) => {
        if (
            (event.key === " " || event.key === "Enter") &&
            keyboardHolding
        ) {
            event.preventDefault();

            keyboardHolding = false;

            releaseHold(event);
        }
    });

    /* =========================================================
       INITIALIZE
    ========================================================= */

    elements.currentYear.textContent =
        new Date().getFullYear();

    applyTranslations();

    updateCharacterCount();

    updateSteps(1);

    elements.missionInput.focus();

});