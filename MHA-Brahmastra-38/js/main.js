/* ============================================
   VOCAL ECHO PROTOCOL — MAIN ENGINE
   ============================================ */

// --- MANDATORY OMNI-MATCH DICTIONARY (do not change) ---
const WORD_BANK = {
    English: [
        { display: "Apple", matches: ["apple"] }, { display: "Tiger", matches: ["tiger"] },
        { display: "Water", matches: ["water"] }, { display: "Rocket", matches: ["rocket"] }, { display: "Eagle", matches: ["eagle"] }
    ],
    Hindi: [
        { display: "Paani", matches: ["paani", "पानी", "pani"] }, { display: "Sher", matches: ["sher", "शेर", "share"] },
        { display: "Aag", matches: ["aag", "आग", "आज", "ag"] }, { display: "Hawa", matches: ["hawa", "हवा"] },
        { display: "Aasmaan", matches: ["aasmaan", "आसमान", "asman"] }
    ]
};

// ============================================
// DOM REFERENCES
// ============================================
const setupScreen = document.getElementById('setup-screen');
const standbyScreen = document.getElementById('standby-screen');
const defeatScreen = document.getElementById('defeat-screen');

const languageSelect = document.getElementById('language-select');
const intervalSelect = document.getElementById('interval-select');
const responseSelect = document.getElementById('response-select');
const setupError = document.getElementById('setup-error');
const startBtn = document.getElementById('start-btn');

const standbyStatus = document.getElementById('standby-status');
const countdownDisplay = document.getElementById('countdown-display');
const stopBtn = document.getElementById('stop-btn');

const expectedWordEl = document.getElementById('expected-word');
const heardTranscriptEl = document.getElementById('heard-transcript');
const restartBtn = document.getElementById('restart-btn');

// ============================================
// STATE
// ============================================
let audioCtx = null;
let selectedLanguage = 'English';
let intervalMaxMs = 30 * 60000;
let responseTimeMs = 15 * 1000;

let sessionActive = false;
let currentWordObj = null;
let accumulatedTranscript = '';

let recognition = null;
let recognitionShouldRun = false;

let countdownTimer = null;
let failTimeout = null;
let nextCheckTimeout = null;

let sirenOsc = null;
let sirenGain = null;
let sirenSweepInterval = null;

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

// ============================================
// SCREEN MANAGEMENT
// ============================================
function showScreen(target) {
    [setupScreen, standbyScreen, defeatScreen].forEach((s) => s.classList.remove('active'));
    target.classList.add('active');
}

function enterAlertMode() {
    standbyScreen.classList.add('alert-mode');
    standbyStatus.textContent = 'STAY ALERT';
    countdownDisplay.textContent = '';
}

function exitAlertMode() {
    standbyScreen.classList.remove('alert-mode');
    standbyStatus.textContent = 'LISTENING FOR SILENCE...';
    countdownDisplay.textContent = '';
}

// ============================================
// AUDIO ENGINE (Web Audio API)
// ============================================
function initAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Android/Chrome autoplay unlock: a near-silent 0.1s tone fired on the user gesture.
function playSilentUnlock() {
    const ctx = initAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
}

function playSiren() {
    const ctx = initAudioContext();
    stopSiren();

    sirenOsc = ctx.createOscillator();
    sirenGain = ctx.createGain();
    sirenOsc.type = 'sawtooth';
    sirenGain.gain.value = 0.14;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(ctx.destination);
    sirenOsc.start();

    let freq = 440;
    let rising = true;
    sirenSweepInterval = setInterval(() => {
        if (rising) {
            freq += 45;
            if (freq >= 1000) rising = false;
        } else {
            freq -= 45;
            if (freq <= 400) rising = true;
        }
        if (sirenOsc) {
            sirenOsc.frequency.setValueAtTime(freq, ctx.currentTime);
        }
    }, 45);
}

function stopSiren() {
    if (sirenSweepInterval) {
        clearInterval(sirenSweepInterval);
        sirenSweepInterval = null;
    }
    if (sirenOsc) {
        try {
            sirenOsc.stop();
        } catch (e) {
            /* already stopped */
        }
        sirenOsc.disconnect();
        sirenOsc = null;
    }
    if (sirenGain) {
        sirenGain.disconnect();
        sirenGain = null;
    }
}

function playSuccessChime() {
    const ctx = initAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = now + i * 0.12;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.34);
    });
}

function playHeavyBuzz() {
    const ctx = initAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 85;
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.3);
}

// ============================================
// SPEECH SYNTHESIS (TTS)
// ============================================
function speakWord(word) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = selectedLanguage === 'Hindi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

// ============================================
// TIME HELPERS
// ============================================
function minutesToMs(min) {
    return min * 60000;
}

function secondsToMs(sec) {
    return sec * 1000;
}

// ============================================
// TRIGGER LOOP
// ============================================
function scheduleNextCheck() {
    clearTimeout(nextCheckTimeout);
    const MIN_DELAY = 60000; // 1 minute floor
    const maxDelay = Math.max(intervalMaxMs, MIN_DELAY + 1000);
    const delay = Math.floor(Math.random() * (maxDelay - MIN_DELAY)) + MIN_DELAY;
    nextCheckTimeout = setTimeout(triggerCheck, delay);
}

function pickRandomWord() {
    const bank = WORD_BANK[selectedLanguage];
    return bank[Math.floor(Math.random() * bank.length)];
}

function triggerCheck() {
    if (!sessionActive) return;

    currentWordObj = pickRandomWord();
    accumulatedTranscript = '';

    enterAlertMode();
    playSiren();

    // Let the siren blare for 1.5s before the word is spoken.
    setTimeout(() => {
        if (!sessionActive) return;
        stopSiren();

        window.speechSynthesis.cancel();
        speakWord(currentWordObj.display);

        // WAIT 2000ms after speaking, then begin listening.
        setTimeout(() => {
            if (!sessionActive) return;
            startListening();
        }, 2000);
    }, 1500);
}

// ============================================
// SPEECH RECOGNITION
// ============================================
function startListening() {
    if (!SpeechRecognitionAPI) {
        handleFailure('Speech recognition is not supported on this device.');
        return;
    }

    standbyStatus.textContent = 'SAY THE WORD NOW';
    recognitionShouldRun = true;

    recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage === 'Hindi' ? 'hi-IN' : 'en-US';

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + ' ';
        }
        accumulatedTranscript = transcript.trim();

        const cleanTranscript = transcript.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '').trim();
        const isMatch = currentWordObj.matches.some((m) => cleanTranscript.includes(m.toLowerCase()));

        if (isMatch) {
            handleSuccess();
        }
    };

    recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error('SpeechRecognition error:', event.error);
        }
    };

    recognition.onend = () => {
        // Android Chrome often auto-stops recognition; restart it while the
        // check is still active so the countdown keeps listening.
        if (recognitionShouldRun && sessionActive) {
            try {
                recognition.start();
            } catch (e) {
                /* ignore duplicate start errors */
            }
        }
    };

    try {
        recognition.start();
    } catch (e) {
        console.error(e);
    }

    startCountdown();
}

function startCountdown() {
    let remainingMs = responseTimeMs;
    let remainingSec = Math.ceil(remainingMs / 1000);
    countdownDisplay.textContent = remainingSec + 's';

    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
        remainingSec -= 1;
        countdownDisplay.textContent = Math.max(remainingSec, 0) + 's';
        if (remainingSec <= 0) {
            clearInterval(countdownTimer);
        }
    }, 1000);

    clearTimeout(failTimeout);
    failTimeout = setTimeout(() => {
        handleFailure(accumulatedTranscript);
    }, responseTimeMs);
}

function stopListening() {
    recognitionShouldRun = false;
    clearInterval(countdownTimer);
    clearTimeout(failTimeout);
    countdownTimer = null;
    failTimeout = null;

    if (recognition) {
        recognition.onend = null;
        recognition.onresult = null;
        recognition.onerror = null;
        try {
            recognition.stop();
        } catch (e) {
            /* already stopped */
        }
        recognition = null;
    }
}

// ============================================
// OUTCOME HANDLERS
// ============================================
function handleSuccess() {
    stopListening();
    stopSiren();
    window.speechSynthesis.cancel();
    playSuccessChime();
    exitAlertMode();

    if (sessionActive) {
        scheduleNextCheck();
    }
}

function handleFailure(transcriptHeard) {
    stopListening();
    stopSiren();
    window.speechSynthesis.cancel();
    playHeavyBuzz();

    sessionActive = false;
    clearTimeout(nextCheckTimeout);

    expectedWordEl.textContent = currentWordObj ? currentWordObj.display : '—';
    const heard = (transcriptHeard || '').trim();
    heardTranscriptEl.textContent = heard.length > 0 ? heard : '(nothing heard)';

    exitAlertMode();
    showScreen(defeatScreen);
}

// ============================================
// SESSION CONTROL
// ============================================
function startSession() {
    if (!SpeechRecognitionAPI) {
        setupError.textContent = 'Speech recognition is not supported in this browser. Please use Chrome on Android or Desktop.';
        return;
    }
    setupError.textContent = '';

    selectedLanguage = languageSelect.value;
    intervalMaxMs = minutesToMs(parseInt(intervalSelect.value, 10));
    responseTimeMs = secondsToMs(parseInt(responseSelect.value, 10));

    // Bypass Chrome/Android autoplay restrictions on this user gesture.
    playSilentUnlock();

    sessionActive = true;
    exitAlertMode();
    showScreen(standbyScreen);
    scheduleNextCheck();
}

function endSession() {
    sessionActive = false;
    clearTimeout(nextCheckTimeout);
    stopListening();
    stopSiren();
    window.speechSynthesis.cancel();
    exitAlertMode();
    showScreen(setupScreen);
}

function restartSession() {
    sessionActive = false;
    showScreen(setupScreen);
}

// ============================================
// EVENT BINDINGS
// ============================================
startBtn.addEventListener('click', startSession);
stopBtn.addEventListener('click', endSession);
restartBtn.addEventListener('click', restartSession);

// ============================================
// INITIAL STATE
// ============================================
showScreen(setupScreen);
