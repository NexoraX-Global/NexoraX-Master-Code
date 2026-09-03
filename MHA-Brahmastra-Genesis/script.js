// script.js
"use strict";

const GATEWAY_TARGET = "../MHA-Brahmastra-Nexus/index.html";

const redirectToGenesisNexus = () => {
  window.location.href = GATEWAY_TARGET;
};

document.getElementById("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  redirectToGenesisNexus();
});

document.getElementById("googleButton").addEventListener("click", () => {
  redirectToGenesisNexus();
});

document.getElementById("phoneButton").addEventListener("click", () => {
  redirectToGenesisNexus();
});

document.getElementById("guestButton").addEventListener("click", () => {
  redirectToGenesisNexus();
});