"use strict";

/*
 * GENESIS GATE
 * ---------------------------------------------------------
 * Frontend-only authentication interface.
 *
 * IMPORTANT:
 * This demo performs client-side UX validation only.
 * Real authentication must be performed by a trusted backend.
 * Never place passwords, API secrets, private keys, or other
 * credentials directly inside frontend JavaScript.
 * ---------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("authForm");
  const email = document.getElementById("email");
  const password = document.getElementById("password");

  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");

  const togglePassword = document.getElementById("togglePassword");
  const loginButton = document.getElementById("loginButton");

  const forgotPassword = document.getElementById("forgotPassword");
  const guestButton = document.getElementById("guestButton");
  const signupButton = document.getElementById("signupButton");

  const toast = document.getElementById("toast");
  const authCard = document.querySelector(".auth-card");

  let toastTimer = null;

  /* -------------------------------------------------------
     Small UI notification system
     ------------------------------------------------------- */

  function showToast(message) {
    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  /* -------------------------------------------------------
     Input validation
     ------------------------------------------------------- */

  function setError(input, errorElement, message) {
    const group = input.closest(".field-group");

    group.classList.toggle("invalid", Boolean(message));
    errorElement.textContent = message;

    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validateEmail() {
    const value = email.value.trim();

    if (!value) {
      setError(email, emailError, "Email address is required.");
      return false;
    }

    /*
     * This is intentionally a lightweight UX check.
     * The server must perform authoritative validation.
     */
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailPattern.test(value)) {
      setError(email, emailError, "Enter a valid email address.");
      return false;
    }

    setError(email, emailError, "");
    return true;
  }

  function validatePassword() {
    const value = password.value;

    if (!value) {
      setError(password, passwordError, "Password is required.");
      return false;
    }

    if (value.length < 8) {
      setError(
        password,
        passwordError,
        "Password must contain at least 8 characters."
      );
      return false;
    }

    setError(password, passwordError, "");
    return true;
  }

  /* -------------------------------------------------------
     Password visibility
     ------------------------------------------------------- */

  togglePassword.addEventListener("click", () => {
    const shouldShow = password.type === "password";

    password.type = shouldShow ? "text" : "password";
    togglePassword.textContent = shouldShow ? "Hide" : "Show";

    togglePassword.setAttribute(
      "aria-label",
      shouldShow ? "Hide password" : "Show password"
    );

    togglePassword.setAttribute(
      "aria-pressed",
      String(shouldShow)
    );
  });

  /* -------------------------------------------------------
     Live validation
     ------------------------------------------------------- */

  email.addEventListener("blur", validateEmail);
  password.addEventListener("blur", validatePassword);

  email.addEventListener("input", () => {
    if (email.closest(".field-group").classList.contains("invalid")) {
      validateEmail();
    }
  });

  password.addEventListener("input", () => {
    if (password.closest(".field-group").classList.contains("invalid")) {
      validatePassword();
    }
  });

  /* -------------------------------------------------------
     Premium ripple interaction
     ------------------------------------------------------- */

  function createRipple(event, button) {
    const rect = button.getBoundingClientRect();

    /*
     * Pointer coordinates are translated into coordinates
     * relative to the clicked button.
     */
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ripple = document.createElement("span");

    ripple.className = "ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);

    ripple.addEventListener("animationend", () => {
      ripple.remove();
    });
  }

  document
    .querySelectorAll(".primary-button, .secondary-button")
    .forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        createRipple(event, button);
      });
    });

  /* -------------------------------------------------------
     Form submission
     ------------------------------------------------------- */

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const validEmail = validateEmail();
    const validPassword = validatePassword();

    if (!validEmail || !validPassword) {
      authCard.classList.remove("glitch");

      /*
       * Force reflow so repeated invalid submissions still
       * replay the micro-interaction.
       */
      void authCard.offsetWidth;

      authCard.classList.add("glitch");
      return;
    }

    /*
     * Frontend prototype state.
     * Replace this section with a secure HTTPS API request
     * to your authentication backend.
     */
    loginButton.classList.add("loading");
    loginButton.disabled = true;
    loginButton.setAttribute("aria-busy", "true");

    await new Promise((resolve) => {
      setTimeout(resolve, 900);
    });

    loginButton.classList.remove("loading");
    loginButton.disabled = false;
    loginButton.removeAttribute("aria-busy");

    showToast(
      "Demo mode: authentication backend is not connected."
    );
  });

  /* -------------------------------------------------------
     Secondary actions
     ------------------------------------------------------- */

  forgotPassword.addEventListener("click", () => {
    const value = email.value.trim();

    if (!value) {
      email.focus();
      setError(
        email,
        emailError,
        "Enter your email to continue."
      );
      return;
    }

    if (!validateEmail()) {
      email.focus();
      return;
    }

    showToast(
      "Password recovery would be handled by the secure backend."
    );
  });

  guestButton.addEventListener("click", () => {
    showToast("Guest mode is ready for backend integration.");
  });

  signupButton.addEventListener("click", () => {
    showToast("Account creation is ready for backend integration.");
  });

  /* -------------------------------------------------------
     Keyboard polish
     ------------------------------------------------------- */

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      toast.classList.remove("show");
    }
  });
});