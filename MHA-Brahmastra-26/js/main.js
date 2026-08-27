"use strict";

/*
 * TaskForge Authentication Gateway
 * ---------------------------------
 * Front-end authentication experience,
 * dynamic language engine, form-state engine,
 * validation, password visibility and UI state.
 *
 * This file intentionally contains no external dependencies.
 */

document.addEventListener("DOMContentLoaded", () => {
    /* =========================================================
       APPLICATION STATE
    ========================================================= */

    const state = {
        language: localStorage.getItem("taskforge_language") || "en",
        authMode: localStorage.getItem("taskforge_auth_mode") || "signup",
        passwordVisible: false,
        toastTimer: null
    };

    /* =========================================================
       INTERNATIONALIZATION DICTIONARY
    ========================================================= */

    const translations = {
        en: {
            documentTitle: "TaskForge — Enter the Ecosystem",

            eyebrow: "PRODUCTIVITY ECOSYSTEM",
            heroLineOne: "Build momentum.",
            heroLineTwo: "Own your progress.",
            heroDescription:
                "A focused digital environment designed to help you organize priorities, build consistency, and turn intention into meaningful progress.",

            trustOne: "Private by design",
            trustTwo: "Built for focus",
            trustThree: "Simple to start",

            secure: "SECURE ACCESS",

            signupTitle: "Create your account",
            signupSubtitle: "Start building a more focused workflow.",

            loginTitle: "Welcome back",
            loginSubtitle: "Continue where your progress left off.",

            signup: "Sign Up",
            login: "Log In",

            nameLabel: "Full name",
            emailLabel: "Email address",
            passwordLabel: "Password",

            passwordHint: "Use at least 8 characters",

            remember: "Keep me signed in",
            forgot: "Forgot password?",

            signupCta: "Create my account",
            loginCta: "Enter TaskForge",

            legalBefore: "By continuing, you agree to our",
            terms: "Terms",
            legalAnd: "and",
            privacy: "Privacy Policy",

            securityNote:
                "Your information is protected with secure account practices.",

            footerText: "Designed for meaningful progress.",

            validationName: "Please enter your name.",
            validationEmail: "Please enter a valid email address.",
            validationPassword: "Password must contain at least 8 characters.",

            signupSuccess:
                "Account setup is ready. Connect your authentication service to continue.",
            loginSuccess:
                "Login interface is ready. Connect your authentication service to continue.",

            forgotMessage:
                "Password recovery will be available once authentication is connected.",

            termsMessage:
                "Terms content can be connected to your public legal page.",
            privacyMessage:
                "Privacy content can be connected to your public privacy page.",

            showPassword: "Show password",
            hidePassword: "Hide password"
        },

        hi: {
            documentTitle: "TaskForge — इकोसिस्टम में प्रवेश करें",

            eyebrow: "प्रोडक्टिविटी इकोसिस्टम",
            heroLineOne: "गति बनाएँ।",
            heroLineTwo: "अपनी प्रगति पर अधिकार रखें।",
            heroDescription:
                "एक केंद्रित डिजिटल वातावरण जो प्राथमिकताओं को व्यवस्थित करने, निरंतरता बनाने और इरादे को सार्थक प्रगति में बदलने में आपकी मदद करता है।",

            trustOne: "गोपनीयता को प्राथमिकता",
            trustTwo: "फोकस के लिए बनाया गया",
            trustThree: "शुरुआत आसान है",

            secure: "सुरक्षित प्रवेश",

            signupTitle: "अपना अकाउंट बनाएँ",
            signupSubtitle: "एक अधिक केंद्रित वर्कफ़्लो बनाना शुरू करें।",

            loginTitle: "वापसी पर स्वागत है",
            loginSubtitle: "जहाँ आपकी प्रगति रुकी थी, वहीं से आगे बढ़ें।",

            signup: "साइन अप",
            login: "लॉग इन",

            nameLabel: "पूरा नाम",
            emailLabel: "ईमेल पता",
            passwordLabel: "पासवर्ड",

            passwordHint: "कम से कम 8 अक्षर इस्तेमाल करें",

            remember: "मुझे साइन इन रखें",
            forgot: "पासवर्ड भूल गए?",

            signupCta: "मेरा अकाउंट बनाएँ",
            loginCta: "TaskForge में प्रवेश करें",

            legalBefore: "आगे बढ़कर आप हमारी",
            terms: "शर्तों",
            legalAnd: "और",
            privacy: "गोपनीयता नीति",
            
            securityNote:
                "आपकी जानकारी सुरक्षित अकाउंट प्रथाओं के साथ संरक्षित है।",

            footerText: "सार्थक प्रगति के लिए बनाया गया।",

            validationName: "कृपया अपना नाम दर्ज करें।",
            validationEmail: "कृपया सही ईमेल पता दर्ज करें।",
            validationPassword: "पासवर्ड में कम से कम 8 अक्षर होने चाहिए।",

            signupSuccess:
                "अकाउंट सेटअप तैयार है। आगे बढ़ने के लिए अपनी ऑथेंटिकेशन सेवा कनेक्ट करें।",
            loginSuccess:
                "लॉगिन इंटरफ़ेस तैयार है। आगे बढ़ने के लिए अपनी ऑथेंटिकेशन सेवा कनेक्ट करें।",

            forgotMessage:
                "ऑथेंटिकेशन कनेक्ट होने के बाद पासवर्ड रिकवरी उपलब्ध होगी।",

            termsMessage:
                "शर्तों की सामग्री को आपके सार्वजनिक कानूनी पेज से जोड़ा जा सकता है।",
            privacyMessage:
                "गोपनीयता की सामग्री को आपके सार्वजनिक प्राइवेसी पेज से जोड़ा जा सकता है।",

            showPassword: "पासवर्ड दिखाएँ",
            hidePassword: "पासवर्ड छिपाएँ"
        }
    };

    /* =========================================================
       DOM REFERENCES
    ========================================================= */

    const elements = {
        html: document.documentElement,
        languageToggle: document.getElementById("languageToggle"),
        languageLabel: document.getElementById("languageLabel"),

        authTitle: document.getElementById("authTitle"),
        authSubtitle: document.getElementById("authSubtitle"),

        signupMode: document.getElementById("signupMode"),
        loginMode: document.getElementById("loginMode"),
        authSwitch: document.querySelector(".auth-switch"),

        nameField: document.getElementById("nameField"),
        nameInput: document.getElementById("name"),
        emailInput: document.getElementById("email"),
        passwordInput: document.getElementById("password"),

        passwordToggle: document.getElementById("passwordToggle"),
        passwordStrength: document.getElementById("passwordStrength"),
        strengthFill: document.querySelector(".strength-fill"),

        rememberOption: document.getElementById("rememberOption"),
        forgotButton: document.getElementById("forgotButton"),

        authForm: document.getElementById("authForm"),
        submitButton: document.getElementById("submitButton"),
        formMessage: document.getElementById("formMessage"),

        nameError: document.getElementById("nameError"),
        emailError: document.getElementById("emailError"),
        passwordError: document.getElementById("passwordError"),

        toast: document.getElementById("toast"),
        toastText: document.getElementById("toastText"),

        currentYear: document.getElementById("currentYear")
    };

    /* =========================================================
       UTILITY FUNCTIONS
    ========================================================= */

    function getText(key) {
        return translations[state.language][key] || key;
    }

    function getI18nElements() {
        return document.querySelectorAll("[data-i18n]");
    }

    function addLanguageAnimation(element) {
        if (!element) {
            return;
        }

        element.classList.remove("lang-fade");

        void element.offsetWidth;

        element.classList.add("lang-fade");
    }

    /* =========================================================
       I18N ENGINE
    ========================================================= */

    function applyTranslations(animate = true) {
        const dictionary = translations[state.language];

        elements.html.lang = state.language === "hi" ? "hi" : "en";
        document.title = dictionary.documentTitle;

        getI18nElements().forEach((element) => {
            const key = element.dataset.i18n;

            if (!dictionary[key]) {
                return;
            }

            element.textContent = dictionary[key];

            if (animate) {
                addLanguageAnimation(element);
            }
        });

        elements.languageLabel.textContent =
            state.language === "en" ? "हिन्दी" : "English";

        elements.languageToggle.setAttribute(
            "aria-pressed",
            state.language === "hi" ? "true" : "false"
        );

        updateAuthInterface(false);

        if (state.passwordVisible) {
            elements.passwordToggle.setAttribute(
                "aria-label",
                getText("hidePassword")
            );
        } else {
            elements.passwordToggle.setAttribute(
                "aria-label",
                getText("showPassword")
            );
        }
    }

    function toggleLanguage() {
        state.language = state.language === "en" ? "hi" : "en";

        localStorage.setItem("taskforge_language", state.language);

        applyTranslations(true);
    }

    /* =========================================================
       AUTHENTICATION MODE ENGINE
    ========================================================= */

    function updateAuthInterface(animate = true) {
        const isSignup = state.authMode === "signup";

        if (animate) {
            elements.authForm.classList.add("switching");

            window.setTimeout(() => {
                updateAuthDOM(isSignup);
                elements.authForm.classList.remove("switching");
            }, 160);
        } else {
            updateAuthDOM(isSignup);
        }
    }

    function updateAuthDOM(isSignup) {
        elements.signupMode.classList.toggle("active", isSignup);
        elements.loginMode.classList.toggle("active", !isSignup);

        elements.signupMode.setAttribute(
            "aria-selected",
            isSignup ? "true" : "false"
        );

        elements.loginMode.setAttribute(
            "aria-selected",
            isSignup ? "false" : "true"
        );

        elements.authSwitch.classList.toggle("login-active", !isSignup);

        if (isSignup) {
            elements.nameField.classList.remove("hidden");

            elements.nameInput.setAttribute("autocomplete", "name");
            elements.passwordInput.setAttribute(
                "autocomplete",
                "new-password"
            );

            elements.authTitle.textContent = getText("signupTitle");
            elements.authSubtitle.textContent = getText("signupSubtitle");

            elements.submitButton.querySelector(".cta-text").textContent =
                getText("signupCta");

            elements.rememberOption.style.display = "none";
            elements.forgotButton.style.display = "none";

            elements.passwordStrength.classList.add("visible");
        } else {
            elements.nameField.classList.add("hidden");

            elements.nameInput.setAttribute("autocomplete", "name");
            elements.passwordInput.setAttribute(
                "autocomplete",
                "current-password"
            );

            elements.authTitle.textContent = getText("loginTitle");
            elements.authSubtitle.textContent = getText("loginSubtitle");

            elements.submitButton.querySelector(".cta-text").textContent =
                getText("loginCta");

            elements.rememberOption.style.display = "inline-flex";
            elements.forgotButton.style.display = "block";

            elements.passwordStrength.classList.remove("visible");
        }

        clearValidation();
        clearFormMessage();
    }

    function setAuthMode(mode) {
        if (mode !== "signup" && mode !== "login") {
            return;
        }

        if (state.authMode === mode) {
            return;
        }

        state.authMode = mode;

        localStorage.setItem("taskforge_auth_mode", mode);

        updateAuthInterface(true);
    }

    /* =========================================================
       FORM VALIDATION
    ========================================================= */

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setFieldError(input, errorElement, message) {
        const group = input.closest(".field-group");

        if (message) {
            group.classList.add("invalid");
            errorElement.textContent = message;
        } else {
            group.classList.remove("invalid");
            errorElement.textContent = "";
        }
    }

    function clearValidation() {
        setFieldError(elements.nameInput, elements.nameError, "");
        setFieldError(elements.emailInput, elements.emailError, "");
        setFieldError(elements.passwordInput, elements.passwordError, "");
    }

    function validateForm() {
        clearValidation();

        let valid = true;

        if (state.authMode === "signup") {
            const name = elements.nameInput.value.trim();

            if (name.length < 2) {
                setFieldError(
                    elements.nameInput,
                    elements.nameError,
                    getText("validationName")
                );

                valid = false;
            }
        }

        const email = elements.emailInput.value.trim();

        if (!isValidEmail(email)) {
            setFieldError(
                elements.emailInput,
                elements.emailError,
                getText("validationEmail")
            );

            valid = false;
        }

        const password = elements.passwordInput.value;

        if (password.length < 8) {
            setFieldError(
                elements.passwordInput,
                elements.passwordError,
                getText("validationPassword")
            );

            valid = false;
        }

        return valid;
    }

    /* =========================================================
       PASSWORD STRENGTH ENGINE
    ========================================================= */

    function calculatePasswordStrength(password) {
        if (!password) {
            return 0;
        }

        let score = 0;

        if (password.length >= 8) {
            score++;
        }

        if (password.length >= 12) {
            score++;
        }

        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
            score++;
        }

        if (/\d/.test(password)) {
            score++;
        }

        if (/[^A-Za-z0-9]/.test(password)) {
            score++;
        }

        return Math.min(score, 5);
    }

    function updatePasswordStrength() {
        const password = elements.passwordInput.value;

        if (!password) {
            elements.passwordStrength.classList.remove("visible");
            elements.strengthFill.style.width = "0%";
            return;
        }

        if (state.authMode === "login") {
            elements.passwordStrength.classList.remove("visible");
            return;
        }

        elements.passwordStrength.classList.add("visible");

        const strength = calculatePasswordStrength(password);

        const widthMap = {
            0: 0,
            1: 20,
            2: 40,
            3: 60,
            4: 80,
            5: 100
        };

        elements.strengthFill.style.width = `${widthMap[strength]}%`;

        if (strength <= 2) {
            elements.strengthFill.style.background = "#ff7373";
        } else if (strength === 3) {
            elements.strengthFill.style.background = "#e5c765";
        } else {
            elements.strengthFill.style.background = "#56e3a4";
        }
    }

    /* =========================================================
       PASSWORD VISIBILITY
    ========================================================= */

    function togglePasswordVisibility() {
        state.passwordVisible = !state.passwordVisible;

        elements.passwordInput.type = state.passwordVisible
            ? "text"
            : "password";

        elements.passwordToggle.classList.toggle(
            "visible",
            state.passwordVisible
        );

        elements.passwordToggle.setAttribute(
            "aria-label",
            state.passwordVisible
                ? getText("hidePassword")
                : getText("showPassword")
        );

        elements.passwordInput.focus();
    }

    /* =========================================================
       FORM MESSAGE / TOAST SYSTEM
    ========================================================= */

    function showFormMessage(message) {
        elements.formMessage.textContent = message;
        elements.formMessage.classList.add("visible");
    }

    function clearFormMessage() {
        elements.formMessage.textContent = "";
        elements.formMessage.classList.remove("visible");
    }

    function showToast(message) {
        window.clearTimeout(state.toastTimer);

        elements.toastText.textContent = message;
        elements.toast.classList.add("visible");

        state.toastTimer = window.setTimeout(() => {
            elements.toast.classList.remove("visible");
        }, 3200);
    }

    /* =========================================================
       FORM SUBMISSION
    ========================================================= */

    function handleSubmit(event) {
        event.preventDefault();

        clearFormMessage();

        if (!validateForm()) {
            const firstInvalid = document.querySelector(
                ".field-group.invalid input"
            );

            if (firstInvalid) {
                firstInvalid.focus();
            }

            return;
        }

        const submitText = elements.submitButton.querySelector(".cta-text");
        const originalText = submitText.textContent;

        elements.submitButton.disabled = true;
        elements.submitButton.style.opacity = "0.75";
        submitText.textContent = state.language === "hi"
            ? "तैयार हो रहा है..."
            : "Preparing...";

        window.setTimeout(() => {
            elements.submitButton.disabled = false;
            elements.submitButton.style.opacity = "1";
            submitText.textContent = originalText;

            if (state.authMode === "signup") {
                showFormMessage(getText("signupSuccess"));
                showToast(getText("signupSuccess"));
            } else {
                showFormMessage(getText("loginSuccess"));
                showToast(getText("loginSuccess"));
            }
        }, 700);
    }

    /* =========================================================
       PASSWORD RECOVERY
    ========================================================= */

    function handleForgotPassword() {
        const email = elements.emailInput.value.trim();

        if (email && isValidEmail(email)) {
            showToast(getText("forgotMessage"));
            showFormMessage(getText("forgotMessage"));
            return;
        }

        setFieldError(
            elements.emailInput,
            elements.emailError,
            getText("validationEmail")
        );

        elements.emailInput.focus();
    }

    /* =========================================================
       LEGAL UI
    ========================================================= */

    function handleTerms() {
        showToast(getText("termsMessage"));
    }

    function handlePrivacy() {
        showToast(getText("privacyMessage"));
    }

    /* =========================================================
       INPUT INTERACTIONS
    ========================================================= */

    function handleInput() {
        const fieldGroup = this.closest(".field-group");

        if (fieldGroup) {
            fieldGroup.classList.remove("invalid");
        }

        if (this === elements.passwordInput) {
            updatePasswordStrength();
        }

        clearFormMessage();
    }

    function handleBlur() {
        const input = this;

        if (input === elements.emailInput) {
            const email = input.value.trim();

            if (email && !isValidEmail(email)) {
                setFieldError(
                    elements.emailInput,
                    elements.emailError,
                    getText("validationEmail")
                );
            }
        }

        if (
            input === elements.passwordInput &&
            input.value &&
            input.value.length < 8
        ) {
            setFieldError(
                elements.passwordInput,
                elements.passwordError,
                getText("validationPassword")
            );
        }

        if (
            input === elements.nameInput &&
            state.authMode === "signup" &&
            input.value.trim() &&
            input.value.trim().length < 2
        ) {
            setFieldError(
                elements.nameInput,
                elements.nameError,
                getText("validationName")
            );
        }
    }

    /* =========================================================
       EVENT LISTENERS
    ========================================================= */

    elements.languageToggle.addEventListener("click", toggleLanguage);

    elements.signupMode.addEventListener("click", () => {
        setAuthMode("signup");
    });

    elements.loginMode.addEventListener("click", () => {
        setAuthMode("login");
    });

    elements.passwordToggle.addEventListener(
        "click",
        togglePasswordVisibility
    );

    elements.authForm.addEventListener("submit", handleSubmit);

    elements.forgotButton.addEventListener(
        "click",
        handleForgotPassword
    );

    elements.nameInput.addEventListener("input", handleInput);
    elements.emailInput.addEventListener("input", handleInput);
    elements.passwordInput.addEventListener("input", handleInput);

    elements.nameInput.addEventListener("blur", handleBlur);
    elements.emailInput.addEventListener("blur", handleBlur);
    elements.passwordInput.addEventListener("blur", handleBlur);

    document
        .querySelector('[data-i18n="terms"]')
        .addEventListener("click", handleTerms);

    document
        .querySelector('[data-i18n="privacy"]')
        .addEventListener("click", handlePrivacy);

    /* =========================================================
       KEYBOARD SHORTCUTS
    ========================================================= */

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            clearFormMessage();
            elements.toast.classList.remove("visible");
        }
    });

    /* =========================================================
       INITIAL APPLICATION BOOT
    ========================================================= */

    elements.currentYear.textContent = new Date().getFullYear();

    applyTranslations(false);

    updatePasswordStrength();

    /*
     * The gateway is intentionally front-end only at this stage.
     * No fake account is created and no credentials are stored.
     * A real authentication provider/backend can be connected
     * to handleSubmit() later.
     */
});