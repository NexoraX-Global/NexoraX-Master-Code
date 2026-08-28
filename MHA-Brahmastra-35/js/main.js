"use strict";

/*
    NEURAL SENTINEL
    Zero-Trust Visual Verification Engine
    Client-side prototype

    Features:
    - Front/rear camera switching
    - Live camera capture
    - Recent-image timestamp validation
    - requestAnimationFrame scanner
    - Terminal verification sequence
    - Web Audio error buzz
    - Web Audio scanning hum
    - Web Audio success chime
    - Local verification state
*/


/* =========================================
   DOM REFERENCES
========================================= */

const liveModeBtn = document.getElementById("liveModeBtn");
const uploadModeBtn = document.getElementById("uploadModeBtn");

const startCameraBtn = document.getElementById("startCameraBtn");
const flipCameraBtn = document.getElementById("flipCameraBtn");
const captureBtn = document.getElementById("captureBtn");

const uploadControls = document.getElementById("uploadControls");
const uploadDropzone = document.getElementById("uploadDropzone");
const imageInput = document.getElementById("imageInput");

const cameraVideo = document.getElementById("cameraVideo");
const uploadedImage = document.getElementById("uploadedImage");
const captureCanvas = document.getElementById("captureCanvas");

const capturePlaceholder = document.getElementById("capturePlaceholder");
const scannerOverlay = document.getElementById("scannerOverlay");

const captureStage = document.getElementById("captureStage");
const captureTime = document.getElementById("captureTime");

const scanStatusText = document.getElementById("scanStatusText");

const verifyBtn = document.getElementById("verifyBtn");
const resetBtn = document.getElementById("resetBtn");

const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");

const terminalBody = document.getElementById("terminalBody");

const successPanel = document.getElementById("successPanel");
const successFlash = document.getElementById("successFlash");
const claimBtn = document.getElementById("claimBtn");

const toastContainer = document.getElementById("toastContainer");

const verificationCard =
    document.querySelector(".verification-card");


/* =========================================
   APPLICATION STATE
========================================= */

const state = {
    mode: "live",

    stream: null,

    cameraFacing: "user",

    cameraRunning: false,

    proofReady: false,

    proofType: null,

    proofTimestamp: null,

    proofSource: null,

    verificationRunning: false,

    verified: false,

    scanFrameId: null,

    terminalInterval: null,

    verificationTimeout: null,

    audioContext: null,

    scannerHum: null,

    scannerHumGain: null,

    objectUrl: null
};


/* =========================================
   INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    initializeInterface();
});


function initializeInterface() {
    setMode("live");

    addTerminalLog(
        "Awaiting visual proof. Select a verification method.",
        "SYS",
        "system-line"
    );

    updateProgress(0);

    window.addEventListener(
        "beforeunload",
        stopCamera
    );

    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );
}


/* =========================================
   MODE SWITCHING
========================================= */

liveModeBtn.addEventListener("click", () => {
    if (state.verificationRunning) {
        showToast("Verification is currently running.");
        return;
    }

    setMode("live");
});


uploadModeBtn.addEventListener("click", () => {
    if (state.verificationRunning) {
        showToast("Verification is currently running.");
        return;
    }

    setMode("upload");
});


function setMode(mode) {
    state.mode = mode;

    if (mode === "live") {
        liveModeBtn.classList.add("active");
        uploadModeBtn.classList.remove("active");

        uploadControls.classList.remove("active");

        startCameraBtn.style.display = "block";
        flipCameraBtn.style.display = "block";
        captureBtn.style.display = "flex";

        stopUploadedPreview();

        addTerminalLog(
            "Live Action selected. Camera protocol ready.",
            "MODE"
        );

    } else {
        uploadModeBtn.classList.add("active");
        liveModeBtn.classList.remove("active");

        uploadControls.classList.add("active");

        startCameraBtn.style.display = "none";
        flipCameraBtn.style.display = "none";
        captureBtn.style.display = "none";

        stopCamera();

        resetVisualStage();

        addTerminalLog(
            "Upload Screenshot selected. Timestamp gate armed.",
            "MODE"
        );
    }

    updateActionAvailability();
}


/* =========================================
   CAMERA START
========================================= */

startCameraBtn.addEventListener(
    "click",
    async () => {
        await startCamera();
    }
);


async function startCamera() {
    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {

        showToast(
            "Camera access is unavailable in this browser."
        );

        addTerminalLog(
            "getUserMedia unavailable.",
            "ERR",
            "error-terminal"
        );

        playErrorBuzz();

        return;
    }

    stopCamera();

    clearProofState();

    try {
        addTerminalLog(
            "Requesting secure camera permission...",
            "CAM"
        );

        const constraints = {
            audio: false,
            video: {
                facingMode: {
                    ideal: state.cameraFacing
                },
                width: {
                    ideal: 1280
                },
                height: {
                    ideal: 720
                }
            }
        };

        const stream =
            await navigator.mediaDevices.getUserMedia(
                constraints
            );

        state.stream = stream;
        state.cameraRunning = true;

        cameraVideo.srcObject = stream;

        cameraVideo.classList.add("active");
        uploadedImage.classList.remove("active");

        capturePlaceholder.classList.add("hidden");

        await cameraVideo.play();

        flipCameraBtn.disabled = false;
        captureBtn.disabled = false;

        startCameraBtn.innerHTML =
            '<span class="btn-icon">●</span> Camera Active';

        captureTime.textContent =
            state.cameraFacing === "user"
                ? "FRONT CAMERA"
                : "REAR CAMERA";

        addTerminalLog(
            state.cameraFacing === "user"
                ? "Front camera stream established."
                : "Rear camera stream established.",
            "CAM"
        );

        addTerminalLog(
            "Live visual capture ready.",
            "CAM"
        );

        updateActionAvailability();

    } catch (error) {
        console.error(
            "Camera initialization error:",
            error
        );

        state.cameraRunning = false;

        flipCameraBtn.disabled = true;
        captureBtn.disabled = true;

        addTerminalLog(
            getCameraErrorMessage(error),
            "ERR",
            "error-terminal"
        );

        showToast(
            getCameraErrorMessage(error)
        );

        playErrorBuzz();
    }
}


function getCameraErrorMessage(error) {
    if (!error) {
        return "Unable to initialize camera.";
    }

    switch (error.name) {
        case "NotAllowedError":
            return "Camera permission denied.";

        case "NotFoundError":
            return "No compatible camera detected.";

        case "NotReadableError":
            return "Camera is busy or unavailable.";

        case "SecurityError":
            return "Camera requires a secure browser context.";

        case "OverconstrainedError":
            return "Requested camera configuration unavailable.";

        default:
            return "Unable to initialize camera.";
    }
}


/* =========================================
   CAMERA FLIP
========================================= */

flipCameraBtn.addEventListener(
    "click",
    async () => {
        if (!state.cameraRunning) {
            return;
        }

        state.cameraFacing =
            state.cameraFacing === "user"
                ? "environment"
                : "user";

        addTerminalLog(
            state.cameraFacing === "user"
                ? "Switching to front camera..."
                : "Switching to rear camera...",
            "CAM"
        );

        await restartCameraSafely();
    }
);


async function restartCameraSafely() {
    const oldStream = state.stream;

    if (oldStream) {
        oldStream.getTracks().forEach(
            track => track.stop()
        );
    }

    state.stream = null;
    state.cameraRunning = false;

    cameraVideo.srcObject = null;

    captureBtn.disabled = true;
    flipCameraBtn.disabled = true;

    await new Promise(
        resolve => setTimeout(resolve, 120)
    );

    try {
        const constraints = {
            audio: false,
            video: {
                facingMode: {
                    exact: state.cameraFacing
                },
                width: {
                    ideal: 1280
                },
                height: {
                    ideal: 720
                }
            }
        };

        let newStream;

        try {
            newStream =
                await navigator.mediaDevices
                    .getUserMedia(constraints);

        } catch (exactError) {

            addTerminalLog(
                "Exact camera mode unavailable; retrying compatible mode.",
                "CAM",
                "warning-terminal"
            );

            newStream =
                await navigator.mediaDevices
                    .getUserMedia({
                        audio: false,
                        video: {
                            facingMode: {
                                ideal: state.cameraFacing
                            },
                            width: {
                                ideal: 1280
                            },
                            height: {
                                ideal: 720
                            }
                        }
                    });
        }

        state.stream = newStream;
        state.cameraRunning = true;

        cameraVideo.srcObject = newStream;

        cameraVideo.classList.add("active");
        uploadedImage.classList.remove("active");
        capturePlaceholder.classList.add("hidden");

        await cameraVideo.play();

        flipCameraBtn.disabled = false;
        captureBtn.disabled = false;

        captureTime.textContent =
            state.cameraFacing === "user"
                ? "FRONT CAMERA"
                : "REAR CAMERA";

        addTerminalLog(
            state.cameraFacing === "user"
                ? "Front camera active."
                : "Rear camera active.",
            "CAM"
        );

    } catch (error) {
        state.cameraRunning = false;
        state.stream = null;

        captureBtn.disabled = true;
        flipCameraBtn.disabled = true;

        addTerminalLog(
            "Camera switch failed safely.",
            "ERR",
            "error-terminal"
        );

        showToast(
            "Unable to switch camera."
        );

        playErrorBuzz();
    }
}


/* =========================================
   CAPTURE LIVE FRAME
========================================= */

captureBtn.addEventListener(
    "click",
    () => {
        captureLiveFrame();
    }
);


function captureLiveFrame() {
    if (!state.cameraRunning ||
        !cameraVideo.videoWidth ||
        !cameraVideo.videoHeight) {

        showToast(
            "Camera frame is not ready."
        );

        playErrorBuzz();

        return;
    }

    ensureAudioContext();

    const width = cameraVideo.videoWidth;
    const height = cameraVideo.videoHeight;

    captureCanvas.width = width;
    captureCanvas.height = height;

    const ctx =
        captureCanvas.getContext("2d", {
            alpha: false
        });

    if (!ctx) {
        showToast(
            "Capture engine unavailable."
        );

        return;
    }

    ctx.drawImage(
        cameraVideo,
        0,
        0,
        width,
        height
    );

    const dataUrl =
        captureCanvas.toDataURL(
            "image/jpeg",
            0.92
        );

    uploadedImage.src = dataUrl;
    uploadedImage.classList.add("active");
    cameraVideo.classList.remove("active");

    state.proofReady = true;
    state.proofType = "live";
    state.proofTimestamp = Date.now();
    state.proofSource = dataUrl;

    captureTime.textContent =
        "CAPTURED " +
        new Date().toLocaleTimeString();

    scannerOverlay.classList.add("active");

    scanStatusText.textContent =
        "FRAME CAPTURED";

    startScanner();

    addTerminalLog(
        "Live visual frame captured.",
        "CAP"
    );

    addTerminalLog(
        "Frame timestamp locally recorded.",
        "TIME"
    );

    showToast(
        "Visual proof captured. Ready for verification.",
        "success"
    );

    updateActionAvailability();
}


/* =========================================
   FILE UPLOAD
========================================= */

imageInput.addEventListener(
    "change",
    handleImageUpload
);


async function handleImageUpload(event) {
    const file =
        event.target.files &&
        event.target.files[0];

    if (!file) {
        return;
    }

    ensureAudioContext();

    clearProofState();

    addTerminalLog(
        "Reading uploaded image metadata...",
        "FILE"
    );

    /*
        Timestamp anti-cheat rule:
        Reject images older than 120 seconds.
    */

    const age =
        Date.now() - file.lastModified;

    const maxAge =
        120000;

    if (
        !Number.isFinite(file.lastModified) ||
        age > maxAge
    ) {
        addTerminalLog(
            "CHEAT DETECTED: Image too old.",
            "BLOCK",
            "error-terminal"
        );

        showToast(
            "CHEAT DETECTED: Image too old."
        );

        playErrorBuzz();

        clearProofState();

        imageInput.value = "";

        return;
    }

    if (age < -30000) {
        addTerminalLog(
            "Invalid future timestamp detected.",
            "BLOCK",
            "error-terminal"
        );

        showToast(
            "CHEAT DETECTED: Invalid image timestamp."
        );

        playErrorBuzz();

        clearProofState();

        imageInput.value = "";

        return;
    }

    if (
        !file.type ||
        !file.type.startsWith("image/")
    ) {
        addTerminalLog(
            "File type rejected.",
            "BLOCK",
            "error-terminal"
        );

        showToast(
            "Please select a valid image file."
        );

        playErrorBuzz();

        imageInput.value = "";

        return;
    }

    addTerminalLog(
        "Timestamp accepted. Image is recent.",
        "TIME"
    );

    const reader =
        new FileReader();

    reader.onload = function(readerEvent) {

        const result =
            readerEvent.target.result;

        uploadedImage.onload = () => {

            uploadedImage.classList.add("active");
            cameraVideo.classList.remove("active");

            capturePlaceholder.classList.add("hidden");

            uploadedImage.style.transform =
                "scaleX(1)";

            state.proofReady = true;
            state.proofType = "upload";
            state.proofTimestamp =
                file.lastModified;
            state.proofSource = result;

            captureTime.textContent =
                "IMAGE AGE " +
                formatAge(age);

            scannerOverlay.classList.add("active");

            scanStatusText.textContent =
                "UPLOAD READY";

            startScanner();

            addTerminalLog(
                "Recent screenshot loaded into scanner.",
                "FILE"
            );

            addTerminalLog(
                "Metadata security lock passed.",
                "LOCK"
            );

            showToast(
                "Recent image accepted.",
                "success"
            );

            updateActionAvailability();
        };

        uploadedImage.onerror = () => {

            addTerminalLog(
                "Image decoding failed.",
                "ERR",
                "error-terminal"
            );

            showToast(
                "Unable to read this image."
            );

            playErrorBuzz();

            clearProofState();
        };

        uploadedImage.src = result;
    };

    reader.onerror = () => {

        addTerminalLog(
            "File reading failed.",
            "ERR",
            "error-terminal"
        );

        showToast(
            "Unable to read selected file."
        );

        playErrorBuzz();
    };

    reader.readAsDataURL(file);
}


function formatAge(age) {
    if (age < 1000) {
        return "0S";
    }

    const seconds =
        Math.floor(age / 1000);

    if (seconds < 60) {
        return seconds + "S";
    }

    return Math.floor(seconds / 60) + "M";
}


/* =========================================
   SCANNER - requestAnimationFrame
========================================= */

function startScanner() {
    stopScanner();

    scannerOverlay.classList.add("active");

    let startTime =
        performance.now();

    const duration =
        4500;

    function scanFrame(now) {

        if (!state.proofReady) {
            return;
        }

        const elapsed =
            now - startTime;

        const progress =
            Math.min(
                elapsed / duration,
                1
            );

        const percentage =
            Math.round(progress * 100);

        updateProgress(percentage);

        if (percentage < 20) {
            scanStatusText.textContent =
                "INITIALIZING OPTICS";
        } else if (percentage < 42) {
            scanStatusText.textContent =
                "MAPPING FRAME";
        } else if (percentage < 65) {
            scanStatusText.textContent =
                "VALIDATING TIMESTAMP";
        } else if (percentage < 86) {
            scanStatusText.textContent =
                "ANALYZING GESTURE";
        } else {
            scanStatusText.textContent =
                "FINALIZING PROOF";
        }

        if (elapsed < duration) {
            state.scanFrameId =
                requestAnimationFrame(
                    scanFrame
                );
        } else {
            state.scanFrameId = null;

            updateProgress(100);

            scanStatusText.textContent =
                "FRAME READY";

            stopScannerHum();

            addTerminalLog(
                "Scanner sequence complete.",
                "SCAN"
            );
        }
    }

    startScannerHum();

    state.scanFrameId =
        requestAnimationFrame(scanFrame);
}


function stopScanner() {
    if (state.scanFrameId !== null) {
        cancelAnimationFrame(
            state.scanFrameId
        );

        state.scanFrameId = null;
    }

    stopScannerHum();
}


/* =========================================
   BEGIN VERIFICATION
========================================= */

verifyBtn.addEventListener(
    "click",
    () => {
        beginVerification();
    }
);


function beginVerification() {
    if (!state.proofReady) {
        showToast(
            "Capture or upload visual proof first."
        );

        playErrorBuzz();

        return;
    }

    if (state.verificationRunning) {
        return;
    }

    ensureAudioContext();

    state.verificationRunning = true;
    state.verified = false;

    verifyBtn.disabled = true;

    startCameraBtn.disabled = true;
    flipCameraBtn.disabled = true;
    captureBtn.disabled = true;

    liveModeBtn.disabled = true;
    uploadModeBtn.disabled = true;

    successPanel.classList.remove("visible");
    verificationCard.classList.remove("verified");

    updateProgress(0);

    addTerminalLog(
        "Verification sequence initiated.",
        "AUTH"
    );

    startTerminalSequence();

    startScanner();

    /*
        Local prototype verification duration:
        4.5 seconds.
    */

    state.verificationTimeout =
        setTimeout(
            completeVerification,
            4500
        );
}


/* =========================================
   TERMINAL LOG SEQUENCE
========================================= */

function startTerminalSequence() {
    stopTerminalSequence();

    const logs = [
        "Establishing secure connection...",
        "Validating timestamp...",
        "Analyzing gesture...",
        "Ready for backend auth."
    ];

    let index = 0;

    addTerminalLog(
        logs[index],
        "SEC"
    );

    index++;

    state.terminalInterval =
        setInterval(() => {

            if (index >= logs.length) {
                stopTerminalSequence();
                return;
            }

            const message =
                logs[index];

            const prefix =
                message.includes("Ready")
                    ? "AUTH"
                    : message.includes("timestamp")
                        ? "TIME"
                        : message.includes("gesture")
                            ? "ML"
                            : "SEC";

            addTerminalLog(
                message,
                prefix
            );

            index++;

        }, 800);
}


function stopTerminalSequence() {
    if (state.terminalInterval !== null) {
        clearInterval(
            state.terminalInterval
        );

        state.terminalInterval = null;
    }
}


/* =========================================
   COMPLETE VERIFICATION
========================================= */

function completeVerification() {
    if (!state.verificationRunning) {
        return;
    }

    state.verificationRunning = false;
    state.verified = true;

    stopTerminalSequence();
    stopScannerHum();

    updateProgress(100);

    addTerminalLog(
        "Ready for backend auth.",
        "AUTH"
    );

    addTerminalLog(
        "Visual proof accepted.",
        "PASS",
        "success-terminal"
    );

    addTerminalLog(
        "VERIFIED",
        "PASS",
        "success-terminal"
    );

    scanStatusText.textContent =
        "VERIFIED";

    verificationCard.classList.add(
        "verified"
    );

    successFlash.classList.remove(
        "active"
    );

    void successFlash.offsetWidth;

    successFlash.classList.add(
        "active"
    );

    successPanel.classList.add(
        "visible"
    );

    startCameraBtn.disabled = false;

    liveModeBtn.disabled = false;
    uploadModeBtn.disabled = false;

    verifyBtn.disabled = true;

    playSuccessChime();

    showToast(
        "Verification successful.",
        "success"
    );

    state.verificationTimeout = null;
}


/* =========================================
   RESET
========================================= */

resetBtn.addEventListener(
    "click",
    () => {
        resetSession();
    }
);


function resetSession() {
    if (state.verificationTimeout !== null) {
        clearTimeout(
            state.verificationTimeout
        );

        state.verificationTimeout = null;
    }

    stopTerminalSequence();
    stopScanner();
    stopCamera();

    clearUploadedObjectUrl();

    state.proofReady = false;
    state.proofType = null;
    state.proofTimestamp = null;
    state.proofSource = null;
    state.verificationRunning = false;
    state.verified = false;

    state.cameraFacing = "user";

    imageInput.value = "";

    resetVisualStage();

    verificationCard.classList.remove(
        "verified"
    );

    successPanel.classList.remove(
        "visible"
    );

    startCameraBtn.disabled = false;
    flipCameraBtn.disabled = true;
    captureBtn.disabled = true;

    liveModeBtn.disabled = false;
    uploadModeBtn.disabled = false;

    verifyBtn.disabled = true;

    startCameraBtn.innerHTML =
        '<span class="btn-icon">◉</span> Start Camera';

    updateProgress(0);

    terminalBody.innerHTML = "";

    addTerminalLog(
        "Session reset. Awaiting visual proof.",
        "SYS",
        "system-line"
    );

    showToast(
        "Verification session reset.",
        "success"
    );
}


/* =========================================
   CLEAR PROOF
========================================= */

function clearProofState() {
    state.proofReady = false;
    state.proofType = null;
    state.proofTimestamp = null;
    state.proofSource = null;

    stopScanner();

    scannerOverlay.classList.remove(
        "active"
    );

    verifyBtn.disabled = true;

    updateProgress(0);
}


function resetVisualStage() {
    stopScanner();

    cameraVideo.classList.remove("active");
    uploadedImage.classList.remove("active");

    cameraVideo.srcObject = null;

    capturePlaceholder.classList.remove(
        "hidden"
    );

    scannerOverlay.classList.remove(
        "active"
    );

    captureTime.textContent =
        "WAITING";

    scanStatusText.textContent =
        "SCANNER STANDBY";

    updateProgress(0);
}


function stopUploadedPreview() {
    uploadedImage.classList.remove(
        "active"
    );

    uploadedImage.removeAttribute(
        "src"
    );

    clearUploadedObjectUrl();
}


function clearUploadedObjectUrl() {
    if (state.objectUrl) {
        URL.revokeObjectURL(
            state.objectUrl
        );

        state.objectUrl = null;
    }
}


/* =========================================
   CAMERA STOP
========================================= */

function stopCamera() {
    if (state.stream) {

        state.stream
            .getTracks()
            .forEach(track => {
                track.stop();
            });

        state.stream = null;
    }

    state.cameraRunning = false;

    if (cameraVideo) {
        cameraVideo.pause();

        cameraVideo.srcObject = null;
    }

    if (flipCameraBtn) {
        flipCameraBtn.disabled = true;
    }

    if (
        state.mode === "live" &&
        !state.proofReady
    ) {
        captureBtn.disabled = true;
    }

    if (startCameraBtn) {
        startCameraBtn.innerHTML =
            '<span class="btn-icon">◉</span> Start Camera';
    }
}


/* =========================================
   ACTION AVAILABILITY
========================================= */

function updateActionAvailability() {
    verifyBtn.disabled =
        !state.proofReady ||
        state.verificationRunning;

    if (
        state.mode === "live" &&
        state.cameraRunning
    ) {
        captureBtn.disabled = false;
        flipCameraBtn.disabled = false;
    }
}


/* =========================================
   PROGRESS
========================================= */

function updateProgress(value) {
    const safeValue =
        Math.max(
            0,
            Math.min(
                100,
                Number(value) || 0
            )
        );

    progressFill.style.width =
        safeValue + "%";

    progressPercent.textContent =
        Math.round(safeValue) + "%";
}


/* =========================================
   TERMINAL
========================================= */

function addTerminalLog(
    message,
    prefix = "SYS",
    className = ""
) {
    if (!terminalBody) {
        return;
    }

    const now =
        new Date();

    const time =
        now.toLocaleTimeString(
            [],
            {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

    const line =
        document.createElement("div");

    line.className =
        "terminal-line " +
        className;

    const timeEl =
        document.createElement("span");

    timeEl.className =
        "terminal-time";

    timeEl.textContent =
        time;

    const prefixEl =
        document.createElement("span");

    prefixEl.className =
        "terminal-prefix";

    prefixEl.textContent =
        prefix;

    const messageEl =
        document.createElement("span");

    messageEl.textContent =
        message;

    line.appendChild(timeEl);
    line.appendChild(prefixEl);
    line.appendChild(messageEl);

    terminalBody.appendChild(line);

    while (
        terminalBody.children.length > 12
    ) {
        terminalBody.removeChild(
            terminalBody.firstElementChild
        );
    }

    terminalBody.scrollTop =
        terminalBody.scrollHeight;
}


/* =========================================
   TOASTS
========================================= */

function showToast(
    message,
    type = "error"
) {
    const toast =
        document.createElement("div");

    toast.className =
        "toast";

    if (type === "success") {
        toast.style.borderColor =
            "rgba(0, 255, 157, 0.5)";

        toast.style.borderLeftColor =
            "#00ff9d";

        toast.style.background =
            "rgba(0, 16, 10, 0.95)";

        toast.style.color =
            "#d7fff0";
    }

    toast.textContent =
        message;

    toastContainer.appendChild(
        toast
    );

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3900);
}


/* =========================================
   WEB AUDIO
========================================= */

function ensureAudioContext() {
    if (state.audioContext) {
        if (
            state.audioContext.state ===
            "suspended"
        ) {
            state.audioContext.resume()
                .catch(() => {});
        }

        return state.audioContext;
    }

    try {
        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContext) {
            return null;
        }

        state.audioContext =
            new AudioContext();

        return state.audioContext;

    } catch (error) {
        console.warn(
            "Web Audio unavailable:",
            error
        );

        return null;
    }
}


/* =========================================
   ERROR BUZZ
========================================= */

function playErrorBuzz() {
    const ctx =
        ensureAudioContext();

    if (!ctx) {
        return;
    }

    const now =
        ctx.currentTime;

    const oscillator =
        ctx.createOscillator();

    const gain =
        ctx.createGain();

    oscillator.type =
        "sawtooth";

    oscillator.frequency.setValueAtTime(
        125,
        now
    );

    oscillator.frequency.exponentialRampToValueAtTime(
        62,
        now + 0.28
    );

    gain.gain.setValueAtTime(
        0.0001,
        now
    );

    gain.gain.exponentialRampToValueAtTime(
        0.18,
        now + 0.025
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.32
    );

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.35);
}


/* =========================================
   SCANNING MECHANICAL HUM
========================================= */

function startScannerHum() {
    const ctx =
        ensureAudioContext();

    if (!ctx) {
        return;
    }

    stopScannerHum();

    const oscillator =
        ctx.createOscillator();

    const gain =
        ctx.createGain();

    const filter =
        ctx.createBiquadFilter();

    oscillator.type =
        "sawtooth";

    oscillator.frequency.value =
        72;

    filter.type =
        "lowpass";

    filter.frequency.value =
        180;

    gain.gain.value =
        0.0001;

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();

    const now =
        ctx.currentTime;

    gain.gain.exponentialRampToValueAtTime(
        0.045,
        now + 0.25
    );

    state.scannerHum =
        oscillator;

    state.scannerHumGain =
        gain;
}


function stopScannerHum() {
    if (
        !state.scannerHum ||
        !state.scannerHumGain
    ) {
        return;
    }

    const ctx =
        state.audioContext;

    if (!ctx) {
        state.scannerHum = null;
        state.scannerHumGain = null;
        return;
    }

    try {
        const now =
            ctx.currentTime;

        state.scannerHumGain.gain.cancelScheduledValues(
            now
        );

        state.scannerHumGain.gain.setValueAtTime(
            Math.max(
                state.scannerHumGain.gain.value,
                0.0001
            ),
            now
        );

        state.scannerHumGain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + 0.18
        );

        const oscillator =
            state.scannerHum;

        setTimeout(() => {
            try {
                oscillator.stop();
            } catch (error) {
                // Already stopped.
            }
        }, 230);

    } catch (error) {
        console.warn(
            "Unable to stop scanner hum:",
            error
        );
    }

    state.scannerHum = null;
    state.scannerHumGain = null;
}


/* =========================================
   SUCCESS CHIME
========================================= */

function playSuccessChime() {
    const ctx =
        ensureAudioContext();

    if (!ctx) {
        return;
    }

    const now =
        ctx.currentTime;

    const masterGain =
        ctx.createGain();

    masterGain.gain.setValueAtTime(
        0.0001,
        now
    );

    masterGain.gain.exponentialRampToValueAtTime(
        0.18,
        now + 0.035
    );

    masterGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 1.7
    );

    masterGain.connect(
        ctx.destination
    );

    const notes = [
        {
            frequency: 392.00,
            start: 0,
            duration: 0.45
        },
        {
            frequency: 523.25,
            start: 0.12,
            duration: 0.55
        },
        {
            frequency: 659.25,
            start: 0.25,
            duration: 0.7
        },
        {
            frequency: 783.99,
            start: 0.48,
            duration: 0.95
        }
    ];

    notes.forEach(note => {

        const oscillator =
            ctx.createOscillator();

        const gain =
            ctx.createGain();

        oscillator.type =
            "sine";

        oscillator.frequency.setValueAtTime(
            note.frequency,
            now + note.start
        );

        gain.gain.setValueAtTime(
            0.0001,
            now + note.start
        );

        gain.gain.exponentialRampToValueAtTime(
            0.7,
            now + note.start + 0.025
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now +
            note.start +
            note.duration
        );

        oscillator.connect(gain);
        gain.connect(masterGain);

        oscillator.start(
            now + note.start
        );

        oscillator.stop(
            now +
            note.start +
            note.duration +
            0.05
        );
    });

    const subOscillator =
        ctx.createOscillator();

    const subGain =
        ctx.createGain();

    subOscillator.type =
        "triangle";

    subOscillator.frequency.value =
        98;

    subGain.gain.setValueAtTime(
        0.0001,
        now
    );

    subGain.gain.exponentialRampToValueAtTime(
        0.18,
        now + 0.04
    );

    subGain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 1.2
    );

    subOscillator.connect(subGain);
    subGain.connect(masterGain);

    subOscillator.start(now);
    subOscillator.stop(
        now + 1.25
    );
}


/* =========================================
   VISIBILITY SAFETY
========================================= */

function handleVisibilityChange() {
    if (
        document.visibilityState ===
        "hidden"
    ) {
        /*
            The prototype does not classify a background
            event as cheating. It simply pauses active
            local audio when the page is hidden.
        */

        stopScannerHum();

    } else {

        if (
            state.verificationRunning &&
            state.proofReady
        ) {
            startScannerHum();
        }
    }
}


/* =========================================
   CLAIM BOUNTY
========================================= */

claimBtn.addEventListener(
    "click",
    () => {

        addTerminalLog(
            "Bounty claim interface opened.",
            "CLAIM",
            "success-terminal"
        );

        showToast(
            "Bounty claim recorded locally.",
            "success"
        );
    }
);


/* =========================================
   UPLOAD DROPZONE FEEDBACK
========================================= */

uploadDropzone.addEventListener(
    "dragover",
    event => {
        event.preventDefault();

        uploadDropzone.style.borderColor =
            "rgba(0, 229, 255, 0.75)";
    }
);

uploadDropzone.addEventListener(
    "dragleave",
    () => {
        uploadDropzone.style.borderColor =
            "";
    }
);

uploadDropzone.addEventListener(
    "drop",
    event => {
        event.preventDefault();

        uploadDropzone.style.borderColor =
            "";

        const files =
            event.dataTransfer.files;

        if (
            files &&
            files.length > 0
        ) {
            imageInput.files =
                files;

            imageInput.dispatchEvent(
                new Event("change", {
                    bubbles: true
                })
            );
        }
    }
);


/* =========================================
   KEYBOARD ACCESSIBILITY
========================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            state.verificationRunning
        ) {
            showToast(
                "Verification is currently locked."
            );
        }
    }
);


/* =========================================
   INITIAL AUDIO UNLOCK
========================================= */

document.addEventListener(
    "pointerdown",
    () => {
        ensureAudioContext();
    },
    {
        once: true,
        passive: true
    }
);


/* =========================================
   FINAL SAFETY CLEANUP
========================================= */

window.addEventListener(
    "pagehide",
    () => {
        stopScannerHum();
        stopScanner();
        stopTerminalSequence();
        stopCamera();
        clearUploadedObjectUrl();
    }
);