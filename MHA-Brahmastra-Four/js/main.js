document.addEventListener('DOMContentLoaded', () => {

  const STORAGE_KEY = 'taskforge_focus_state_v1';
  const RING_CIRCUMFERENCE = 2 * Math.PI * 88;      // focus ring r=88
  const SHIELD_CIRCUMFERENCE = 2 * Math.PI * 68;    // shield ring r=68
  const BREACH_INTEGRITY_LOSS = 15;
  const COMPLETE_INTEGRITY_GAIN = 4;
  const XP_PER_MINUTE = 8;

  /* ============================================================
     STATE
  ============================================================ */
  function defaultState(){
    return {
      xp: 0,
      streak: 0,
      bestStreak: 0,
      sessionsCompleted: 0,
      breaches: 0,
      shieldIntegrity: 100,
      activeSession: null,   // { taskName, durationSec, startedAt, endsAt }
      telemetry: []
    };
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return defaultState();
      return Object.assign(defaultState(), parsed);
    }catch(err){
      return defaultState();
    }
  }

  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(err){ /* storage unavailable — continue in-memory */ }
  }

  let state = loadState();
  let countdownInterval = null;

  /* ============================================================
     BACKGROUND TACTICAL GRID
  ============================================================ */
  const gridCanvas = document.getElementById('grid-bg');
  const gctx = gridCanvas.getContext('2d');
  let gw, gh, motes = [];

  function resizeGrid(){
    gw = gridCanvas.width = window.innerWidth;
    gh = gridCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeGrid);
  resizeGrid();

  for (let i = 0; i < 36; i++){
    motes.push({
      x: Math.random() * gw, y: Math.random() * gh,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      color: Math.random() > 0.5 ? '0,255,102' : '0,243,255'
    });
  }

  function drawGrid(){
    gctx.clearRect(0, 0, gw, gh);
    const gap = 58;
    gctx.strokeStyle = 'rgba(0,255,102,0.04)';
    gctx.lineWidth = 1;
    for (let x = 0; x < gw; x += gap){ gctx.beginPath(); gctx.moveTo(x,0); gctx.lineTo(x,gh); gctx.stroke(); }
    for (let y = 0; y < gh; y += gap){ gctx.beginPath(); gctx.moveTo(0,y); gctx.lineTo(gw,y); gctx.stroke(); }
    motes.forEach(m => {
      m.x += m.vx; m.y += m.vy;
      if (m.x < 0 || m.x > gw) m.vx *= -1;
      if (m.y < 0 || m.y > gh) m.vy *= -1;
      gctx.beginPath(); gctx.arc(m.x, m.y, 1.5, 0, Math.PI*2);
      gctx.fillStyle = `rgba(${m.color},0.5)`; gctx.fill();
    });
    requestAnimationFrame(drawGrid);
  }
  drawGrid();

  /* ============================================================
     DOM REFS
  ============================================================ */
  const el = {
    hudStreak: document.getElementById('hud-streak'),
    hudXp: document.getElementById('hud-xp'),

    focusStatusBadge: document.getElementById('focus-status-badge'),
    stageSetup: document.getElementById('focus-stage-setup'),
    stageActive: document.getElementById('focus-stage-active'),
    taskName: document.getElementById('focus-task-name'),
    minutesInput: document.getElementById('focus-minutes'),
    setupError: document.getElementById('focus-setup-error'),
    btnActivate: document.getElementById('btn-activate-shield'),

    ringProgress: document.getElementById('ring-progress'),
    ringTime: document.getElementById('ring-time'),
    ringTaskName: document.getElementById('ring-task-name'),
    focusLiveText: document.getElementById('focus-live-text'),
    btnAbort: document.getElementById('btn-abort-shield'),

    shieldRingFill: document.getElementById('shield-ring-fill'),
    shieldIntegrityPct: document.getElementById('shield-integrity-pct'),
    statBestStreak: document.getElementById('stat-best-streak'),
    statCompleted: document.getElementById('stat-completed'),
    statBreaches: document.getElementById('stat-breaches'),

    telemetryFeed: document.getElementById('telemetry-feed'),

    breachOverlay: document.getElementById('breach-overlay'),
    breachSubText: document.getElementById('breach-sub-text'),
    breachIntegrityLoss: document.getElementById('breach-integrity-loss'),
    btnBreachAck: document.getElementById('btn-breach-ack'),

    completeOverlay: document.getElementById('complete-overlay'),
    completeTaskText: document.getElementById('complete-task-text'),
    completeXpText: document.getElementById('complete-xp-text'),
    btnCompleteAck: document.getElementById('btn-complete-ack'),
    completeBurstCanvas: document.getElementById('complete-burst')
  };

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ============================================================
     RENDER: HUD + SHIELD RING
  ============================================================ */
  function renderHud(){
    el.hudStreak.textContent = state.streak;
    el.hudXp.textContent = Math.round(state.xp).toLocaleString();
  }

  function renderShield(){
    const pct = Math.max(0, Math.min(100, state.shieldIntegrity));
    el.shieldIntegrityPct.textContent = pct + '%';
    const offset = SHIELD_CIRCUMFERENCE * (1 - pct / 100);
    el.shieldRingFill.style.strokeDasharray = SHIELD_CIRCUMFERENCE;
    el.shieldRingFill.style.strokeDashoffset = offset;
    el.shieldRingFill.classList.toggle('low-integrity', pct <= 30);

    el.statBestStreak.textContent = state.bestStreak;
    el.statCompleted.textContent = state.sessionsCompleted;
    el.statBreaches.textContent = state.breaches;
  }

  /* ============================================================
     TELEMETRY TERMINAL
  ============================================================ */
  function buildFeedLine(entry){
    const line = document.createElement('div');
    line.className = 'feed-line ' + entry.type;
    line.innerHTML = `<span class="feed-time">[${entry.time}]</span>${entry.message}`;
    return line;
  }

  function renderTelemetryFull(){
    el.telemetryFeed.innerHTML = '';
    state.telemetry.forEach(entry => el.telemetryFeed.appendChild(buildFeedLine(entry)));
  }

  function addTelemetry(type, message){
    const entry = { time: new Date().toLocaleTimeString([], { hour12:false }), type, message };
    state.telemetry.unshift(entry);
    if (state.telemetry.length > 60) state.telemetry.length = 60;
    saveState();
    el.telemetryFeed.prepend(buildFeedLine(entry));
    while (el.telemetryFeed.children.length > 60) el.telemetryFeed.removeChild(el.telemetryFeed.lastChild);
  }

  /* ============================================================
     FORMAT TIME
  ============================================================ */
  function formatMMSS(totalSeconds){
    const s = Math.max(0, Math.round(totalSeconds));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  /* ============================================================
     ACTIVATE SHIELD (START SESSION)
  ============================================================ */
  el.btnActivate.addEventListener('click', () => {
    el.setupError.textContent = '';
    const name = el.taskName.value.trim();
    const minutes = parseInt(el.minutesInput.value, 10);

    if (!name){
      el.setupError.textContent = 'TASK DESIGNATION REQUIRED.';
      return;
    }
    if (!Number.isFinite(minutes) || minutes < 1){
      el.setupError.textContent = 'DURATION MUST BE AT LEAST 1 MINUTE.';
      return;
    }
    if (minutes > 180){
      el.setupError.textContent = 'DURATION CANNOT EXCEED 180 MINUTES.';
      return;
    }

    const durationSec = minutes * 60;
    const startedAt = Date.now();
    state.activeSession = {
      taskName: name,
      durationSec: durationSec,
      startedAt: startedAt,
      endsAt: startedAt + durationSec * 1000
    };
    saveState();

    addTelemetry('info', `SHIELD ACTIVATED — task locked: "${escapeHtml(name)}" for ${minutes}m`);
    enterActiveStage();
  });

  /* ============================================================
     ENTER ACTIVE STAGE / RESUME
  ============================================================ */
  function enterActiveStage(){
    const session = state.activeSession;
    if (!session) return;

    el.stageSetup.classList.add('hidden');
    el.stageActive.classList.remove('hidden');
    el.focusStatusBadge.textContent = 'SHIELD ACTIVE';
    el.ringTaskName.textContent = session.taskName;
    el.ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;

    if (countdownInterval) clearInterval(countdownInterval);
    tickCountdown();
    countdownInterval = setInterval(tickCountdown, 1000);
  }

  /* ============================================================
     COUNTDOWN TICK (timestamp-based — reload safe)
  ============================================================ */
  function tickCountdown(){
    const session = state.activeSession;
    if (!session) return;

    const remainingMs = session.endsAt - Date.now();

    if (remainingMs <= 0){
      clearInterval(countdownInterval);
      countdownInterval = null;
      completeSession();
      return;
    }

    const remainingSec = remainingMs / 1000;
    const pctRemaining = remainingSec / session.durationSec;
    const offset = RING_CIRCUMFERENCE * (1 - pctRemaining);

    el.ringProgress.style.strokeDashoffset = offset;
    el.ringTime.textContent = formatMMSS(remainingSec);

    el.ringProgress.classList.remove('warning-state', 'critical-state');
    if (pctRemaining <= 0.1){
      el.ringProgress.classList.add('critical-state');
      el.focusLiveText.textContent = 'FINAL STRETCH — HOLD THE LINE';
    } else if (pctRemaining <= 0.3){
      el.ringProgress.classList.add('warning-state');
      el.focusLiveText.textContent = 'SHIELD ACTIVE — INTEGRITY NOMINAL';
    } else {
      el.focusLiveText.textContent = 'SHIELD ACTIVE — FOCUS LOCKED';
    }
  }

  /* ============================================================
     COMPLETE SESSION
  ============================================================ */
  function completeSession(){
    const session = state.activeSession;
    if (!session) return;

    const minutes = Math.round(session.durationSec / 60);
    const xpGain = minutes * XP_PER_MINUTE;

    state.xp += xpGain;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.sessionsCompleted += 1;
    state.shieldIntegrity = Math.min(100, state.shieldIntegrity + COMPLETE_INTEGRITY_GAIN);
    state.activeSession = null;
    saveState();

    renderHud();
    renderShield();

    addTelemetry('gain', `SESSION SECURED: "${escapeHtml(session.taskName)}" — ${minutes}m completed — +${xpGain} XP — streak now ${state.streak}`);

    el.completeTaskText.textContent = `"${session.taskName}"`;
    el.completeXpText.textContent = `+${xpGain} XP`;
    el.completeOverlay.classList.add('active');
    runCompleteBurst();

    resetToSetup();
  }

  el.btnCompleteAck.addEventListener('click', () => {
    el.completeOverlay.classList.remove('active');
  });

  /* ============================================================
     ABORT SESSION (BREACH)
  ============================================================ */
  el.btnAbort.addEventListener('click', () => {
    const session = state.activeSession;
    if (!session) return;

    if (countdownInterval){
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    const priorStreak = state.streak;
    state.breaches += 1;
    state.streak = 0;
    state.shieldIntegrity = Math.max(0, state.shieldIntegrity - BREACH_INTEGRITY_LOSS);
    state.activeSession = null;
    saveState();

    renderHud();
    renderShield();

    const streakNote = priorStreak > 0 ? ` (${priorStreak}-session streak reset)` : '';
    addTelemetry('breach', `SHIELD BREACH: "${escapeHtml(session.taskName)}" aborted before completion${streakNote} — integrity -${BREACH_INTEGRITY_LOSS}%`);

    el.breachSubText.textContent = `"${session.taskName}" was aborted before the timer completed.`;
    el.breachIntegrityLoss.textContent = `INTEGRITY -${BREACH_INTEGRITY_LOSS}%`;
    el.breachOverlay.classList.add('active');

    resetToSetup();
  });

  el.btnBreachAck.addEventListener('click', () => {
    el.breachOverlay.classList.remove('active');
  });

  /* ============================================================
     RESET TO SETUP STAGE
  ============================================================ */
  function resetToSetup(){
    el.stageActive.classList.add('hidden');
    el.stageSetup.classList.remove('hidden');
    el.focusStatusBadge.textContent = 'STANDBY';
    el.taskName.value = '';
    el.minutesInput.value = 25;
    el.setupError.textContent = '';
  }

  /* ============================================================
     COMPLETION PARTICLE BURST
  ============================================================ */
  let burstFrame = null;

  function runCompleteBurst(){
    const canvas = el.completeBurstCanvas;
    const bctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const particles = [];

    for (let i = 0; i < 50; i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 3 + Math.random() * 4,
        life: 1,
        color: Math.random() > 0.5 ? '0,255,102' : '0,243,255'
      });
    }

    const start = performance.now();
    function frame(now){
      const elapsed = now - start;
      bctx.clearRect(0, 0, canvas.width, canvas.height);
      let anyAlive = false;
      particles.forEach(p => {
        p.vy += 0.12;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.012;
        if (p.life > 0){
          anyAlive = true;
          bctx.beginPath();
          bctx.arc(p.x, p.y, p.size * Math.max(p.life, 0), 0, Math.PI * 2);
          bctx.fillStyle = `rgba(${p.color},${Math.max(p.life,0)})`;
          bctx.fill();
        }
      });
      if (anyAlive && elapsed < 3500){
        burstFrame = requestAnimationFrame(frame);
      } else {
        bctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    burstFrame = requestAnimationFrame(frame);
  }

  /* ============================================================
     RECONCILE ON LOAD (resume active session or resolve if it
     finished/expired while the page was closed)
  ============================================================ */
  function reconcileOnLoad(){
    if (state.telemetry.length === 0){
      addTelemetry('info', 'NEURAL LINK ESTABLISHED. CYBER-SHIELD MATRIX ONLINE.');
    } else {
      renderTelemetryFull();
    }

    if (state.activeSession){
      const remaining = state.activeSession.endsAt - Date.now();
      if (remaining <= 0){
        // Session finished while app was closed — honor the completion.
        completeSession();
      } else {
        enterActiveStage();
      }
    }
  }

  /* ============================================================
     INIT
  ============================================================ */
  renderHud();
  renderShield();
  reconcileOnLoad();

});