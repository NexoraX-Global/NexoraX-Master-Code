document.addEventListener('DOMContentLoaded', () => {

  const STORAGE_KEY = 'taskforge_vault_state_v1';
  const MIN_REPORT_LENGTH = 15;
  const DECODE_ANIM_MS = 900;
  const MIN_VERIFY_HOLD_MS = 3000;
  const MAX_ATTEMPTS = 3;

  const RANKS = [
    { name: 'RECRUIT', threshold: 0 },
    { name: 'OPERATIVE', threshold: 2000 },
    { name: 'VANGUARD', threshold: 8000 },
    { name: 'WARLORD', threshold: 20000 },
    { name: 'LEGEND', threshold: 50000 }
  ];

  const ITEM_POOL = [
    { name: 'Scrap Data Fragment', rarity: 'COMMON', weight: 50 },
    { name: 'Encrypted Access Key', rarity: 'COMMON', weight: 50 },
    { name: 'Signal Booster Core', rarity: 'RARE', weight: 25 },
    { name: 'Void-Forged Circuit', rarity: 'RARE', weight: 25 },
    { name: 'Prism Reactor Shard', rarity: 'EPIC', weight: 10 },
    { name: 'Neon Sovereign Emblem', rarity: 'EPIC', weight: 10 },
    { name: 'Genesis Core Fragment', rarity: 'LEGENDARY', weight: 3 }
  ];

  /* ============================================================
     STATE
  ============================================================ */
  function defaultState(){
    return {
      balance: 500,
      lifetimeEarned: 0,
      ledger: []
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

  /* ============================================================
     BACKGROUND GRID
  ============================================================ */
  const gridCanvas = document.getElementById('vault-grid');
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
      color: Math.random() > 0.5 ? '255,183,0' : '176,0,255'
    });
  }

  function drawGrid(){
    gctx.clearRect(0, 0, gw, gh);
    const gap = 58;
    gctx.strokeStyle = 'rgba(255,183,0,0.04)';
    gctx.lineWidth = 1;
    for (let x = 0; x < gw; x += gap){ gctx.beginPath(); gctx.moveTo(x,0); gctx.lineTo(x,gh); gctx.stroke(); }
    for (let y = 0; y < gh; y += gap){ gctx.beginPath(); gctx.moveTo(0,y); gctx.lineTo(gw,y); gctx.stroke(); }
    motes.forEach(m => {
      m.x += m.vx; m.y += m.vy;
      if (m.x < 0 || m.x > gw) m.vx *= -1;
      if (m.y < 0 || m.y > gh) m.vy *= -1;
      gctx.beginPath(); gctx.arc(m.x, m.y, 1.5, 0, Math.PI*2);
      gctx.fillStyle = `rgba(${m.color},0.55)`; gctx.fill();
    });
    requestAnimationFrame(drawGrid);
  }
  drawGrid();

  /* ============================================================
     DOM REFS
  ============================================================ */
  const el = {
    rankLabel: document.getElementById('rank-label'),
    rankSub: document.getElementById('rank-sub'),
    balance: document.getElementById('vault-balance'),

    powStatusBadge: document.getElementById('pow-status-badge'),
    stageSetup: document.getElementById('pow-stage-setup'),
    stageVerify: document.getElementById('pow-stage-verify'),
    taskName: document.getElementById('pow-task-name'),
    taskAmount: document.getElementById('pow-task-amount'),
    setupError: document.getElementById('pow-setup-error'),
    btnGenerate: document.getElementById('btn-generate-code'),

    codeDisplay: document.getElementById('code-display'),
    codeInput: document.getElementById('pow-code-input'),
    report: document.getElementById('pow-report'),
    reportCharCount: document.getElementById('report-char-count'),
    verifyError: document.getElementById('pow-verify-error'),
    attemptsNote: document.getElementById('attempts-note'),
    btnSubmitVerification: document.getElementById('btn-submit-verification'),
    btnCancelVerification: document.getElementById('btn-cancel-verification'),

    rewardEmpty: document.getElementById('reward-empty'),
    rewardDisplay: document.getElementById('reward-display'),
    rewardRarityBadge: document.getElementById('reward-rarity-badge'),
    rewardAmountDisplay: document.getElementById('reward-amount-display'),
    rewardItemDisplay: document.getElementById('reward-item-display'),
    rewardTaskDisplay: document.getElementById('reward-task-display'),

    ledgerFeed: document.getElementById('ledger-feed'),

    rewardOverlay: document.getElementById('reward-overlay'),
    overlayRarityTitle: document.getElementById('overlay-rarity-title'),
    overlayAmount: document.getElementById('overlay-amount'),
    overlayItem: document.getElementById('overlay-item'),
    btnClaimClose: document.getElementById('btn-claim-close'),
    coinBurstCanvas: document.getElementById('coin-burst'),

    rankupOverlay: document.getElementById('rankup-overlay'),
    rankupName: document.getElementById('rankup-name'),
    btnRankupClose: document.getElementById('btn-rankup-close')
  };

  /* ============================================================
     VERIFICATION SESSION STATE (in-memory, per attempt)
  ============================================================ */
  let session = null;
  // { taskName, amount, code, attemptsLeft, decodeComplete, holdComplete }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ============================================================
     RENDER: HUD
  ============================================================ */
  function currentRankIndex(){
    let idx = 0;
    for (let i = 0; i < RANKS.length; i++){
      if (state.lifetimeEarned >= RANKS[i].threshold) idx = i;
    }
    return idx;
  }

  function renderRank(){
    const idx = currentRankIndex();
    const rank = RANKS[idx];
    const next = RANKS[idx + 1];
    el.rankLabel.textContent = rank.name;
    if (next){
      el.rankSub.textContent = `${Math.round(state.lifetimeEarned).toLocaleString()} / ${next.threshold.toLocaleString()} to next rank`;
    } else {
      el.rankSub.textContent = `${Math.round(state.lifetimeEarned).toLocaleString()} lifetime — MAX RANK`;
    }
    return idx;
  }

  function renderBalance(){
    el.balance.textContent = Math.max(0, Math.round(state.balance)).toLocaleString();
  }

  /* ============================================================
     LEDGER
  ============================================================ */
  function buildFeedLine(entry){
    const line = document.createElement('div');
    line.className = 'feed-line ' + entry.type;
    line.innerHTML = `<span class="feed-time">[${entry.time}]</span>${entry.message}`;
    return line;
  }

  function renderLedgerFull(){
    el.ledgerFeed.innerHTML = '';
    state.ledger.forEach(entry => el.ledgerFeed.appendChild(buildFeedLine(entry)));
  }

  function addLedger(type, message){
    const entry = { time: new Date().toLocaleTimeString([], { hour12:false }), type, message };
    state.ledger.unshift(entry);
    if (state.ledger.length > 60) state.ledger.length = 60;
    saveState();
    el.ledgerFeed.prepend(buildFeedLine(entry));
    while (el.ledgerFeed.children.length > 60) el.ledgerFeed.removeChild(el.ledgerFeed.lastChild);
  }

  /* ============================================================
     PoW MATRIX — SETUP STAGE
  ============================================================ */
  function generateSixDigitCode(){
    let code = '';
    for (let i = 0; i < 6; i++) code += Math.floor(Math.random() * 10).toString();
    return code;
  }

  el.btnGenerate.addEventListener('click', () => {
    el.setupError.textContent = '';
    const name = el.taskName.value.trim();
    const amount = parseInt(el.taskAmount.value, 10);

    if (!name){
      el.setupError.textContent = 'TASK DESCRIPTION REQUIRED.';
      return;
    }
    if (!Number.isFinite(amount) || amount < 10){
      el.setupError.textContent = 'CLAIM AMOUNT MUST BE AT LEAST 10.';
      return;
    }
    if (amount > 5000){
      el.setupError.textContent = 'CLAIM AMOUNT CANNOT EXCEED 5,000 PER VERIFICATION.';
      return;
    }

    session = {
      taskName: name,
      amount: amount,
      code: generateSixDigitCode(),
      attemptsLeft: MAX_ATTEMPTS,
      decodeComplete: false,
      holdComplete: false
    };

    el.stageSetup.classList.add('hidden');
    el.stageVerify.classList.remove('hidden');
    el.powStatusBadge.textContent = 'DECODING';
    el.codeInput.value = '';
    el.report.value = '';
    el.reportCharCount.textContent = `0 / ${MIN_REPORT_LENGTH} min`;
    el.reportCharCount.classList.remove('ok');
    el.verifyError.textContent = '';
    el.attemptsNote.textContent = '';
    el.btnSubmitVerification.disabled = true;
    el.btnSubmitVerification.textContent = 'SUBMIT FOR VERIFICATION';

    runDecodeAnimation(session.code);
    startHoldTimer();
  });

  /* ============================================================
     DECODE (SCRAMBLE) ANIMATION
  ============================================================ */
  function runDecodeAnimation(finalCode){
    const digitEls = el.codeDisplay.querySelectorAll('.code-digit');
    digitEls.forEach(d => d.classList.remove('settled'));

    const startTime = performance.now();
    const settleOffsets = Array.from({length: 6}, (_, i) => (i / 6) * (DECODE_ANIM_MS * 0.5));

    function frame(now){
      const elapsed = now - startTime;
      let allSettled = true;

      digitEls.forEach((digitEl, i) => {
        const settleAt = DECODE_ANIM_MS - settleOffsets[5 - i];
        if (elapsed >= settleAt){
          digitEl.textContent = finalCode[i];
          digitEl.classList.add('settled');
        } else {
          digitEl.textContent = Math.floor(Math.random() * 10).toString();
          allSettled = false;
        }
      });

      if (!allSettled){
        requestAnimationFrame(frame);
      } else {
        session.decodeComplete = true;
        el.powStatusBadge.textContent = 'AWAITING INPUT';
        evaluateSubmitEnabled();
      }
    }
    requestAnimationFrame(frame);
  }

  /* ============================================================
     MINIMUM HOLD TIMER (prevents instant-claim reflex clicking)
  ============================================================ */
  function startHoldTimer(){
    const holdStart = Date.now();
    function checkHold(){
      const remaining = MIN_VERIFY_HOLD_MS - (Date.now() - holdStart);
      if (remaining <= 0){
        session.holdComplete = true;
        evaluateSubmitEnabled();
        return;
      }
      setTimeout(checkHold, 200);
    }
    checkHold();
  }

  /* ============================================================
     REPORT CHAR COUNT + SUBMIT GATE
  ============================================================ */
  el.report.addEventListener('input', () => {
    const len = el.report.value.trim().length;
    el.reportCharCount.textContent = `${len} / ${MIN_REPORT_LENGTH} min`;
    el.reportCharCount.classList.toggle('ok', len >= MIN_REPORT_LENGTH);
    evaluateSubmitEnabled();
  });

  el.codeInput.addEventListener('input', () => {
    el.codeInput.value = el.codeInput.value.replace(/\D/g, '').slice(0, 6);
    evaluateSubmitEnabled();
  });

  function evaluateSubmitEnabled(){
    if (!session) return;
    const codeReady = el.codeInput.value.length === 6;
    const reportReady = el.report.value.trim().length >= MIN_REPORT_LENGTH;
    const ready = session.decodeComplete && session.holdComplete && codeReady && reportReady;
    el.btnSubmitVerification.disabled = !ready;
    if (!session.holdComplete){
      el.btnSubmitVerification.textContent = 'VERIFICATION WINDOW OPENING…';
    } else {
      el.btnSubmitVerification.textContent = 'SUBMIT FOR VERIFICATION';
    }
  }

  /* ============================================================
     SUBMIT VERIFICATION
  ============================================================ */
  el.btnSubmitVerification.addEventListener('click', () => {
    if (!session) return;
    el.verifyError.textContent = '';

    const enteredCode = el.codeInput.value.trim();
    const reportText = el.report.value.trim();

    if (reportText.length < MIN_REPORT_LENGTH){
      el.verifyError.textContent = `WORK PROOF TOO SHORT (${reportText.length}/${MIN_REPORT_LENGTH}).`;
      return;
    }

    if (enteredCode !== session.code){
      session.attemptsLeft -= 1;
      if (session.attemptsLeft <= 0){
        addLedger('fail', `VERIFICATION FAILED: "${escapeHtml(session.taskName)}" — sequence mismatch, attempts exhausted, claim voided`);
        resetToSetup();
        return;
      }
      el.verifyError.textContent = 'SEQUENCE MISMATCH. CHECK THE CODE AND RETRY.';
      el.attemptsNote.textContent = `${session.attemptsLeft} ATTEMPT${session.attemptsLeft === 1 ? '' : 'S'} REMAINING`;
      return;
    }

    completeVerification();
  });

  el.btnCancelVerification.addEventListener('click', () => {
    if (session){
      addLedger('info', `Verification cancelled for "${escapeHtml(session.taskName)}" — no reward issued`);
    }
    resetToSetup();
  });

  function resetToSetup(){
    session = null;
    el.stageVerify.classList.add('hidden');
    el.stageSetup.classList.remove('hidden');
    el.powStatusBadge.textContent = 'AWAITING TASK';
    el.taskName.value = '';
    el.taskAmount.value = 150;
    el.setupError.textContent = '';
  }

  /* ============================================================
     REWARD ROLL
  ============================================================ */
  function rollItem(){
    const totalWeight = ITEM_POOL.reduce((sum, it) => sum + it.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const item of ITEM_POOL){
      if (roll < item.weight) return item;
      roll -= item.weight;
    }
    return ITEM_POOL[0];
  }

  function completeVerification(){
    const { taskName, amount } = session;
    const item = rollItem();

    const beforeRankIdx = currentRankIndex();

    state.balance += amount;
    state.lifetimeEarned += amount;
    saveState();

    renderBalance();
    const afterRankIdx = renderRank();

    el.rewardEmpty.classList.add('hidden');
    el.rewardDisplay.classList.remove('hidden');
    el.rewardRarityBadge.textContent = item.rarity;
    el.rewardAmountDisplay.textContent = `+${amount.toLocaleString()} $FORGE`;
    el.rewardItemDisplay.textContent = item.name;
    el.rewardTaskDisplay.textContent = `Verified: "${taskName}"`;

    addLedger('gain', `VERIFIED: "${escapeHtml(taskName)}" — sequence confirmed, proof logged — +${amount.toLocaleString()} $FORGE, item: ${item.name} [${item.rarity}]`);

    showRewardOverlay(amount, item);

    resetToSetup();

    if (afterRankIdx > beforeRankIdx){
      setTimeout(() => showRankUpOverlay(RANKS[afterRankIdx].name), 600);
    }
  }

  /* ============================================================
     REWARD OVERLAY + COIN BURST
  ============================================================ */
  let burstAnimationFrame = null;

  function showRewardOverlay(amount, item){
    el.overlayRarityTitle.textContent = item.rarity + ' DROP';
    el.overlayAmount.textContent = `+${amount.toLocaleString()} $FORGE`;
    el.overlayItem.textContent = item.name;
    el.rewardOverlay.classList.add('active');
    runCoinBurst();
  }

  el.btnClaimClose.addEventListener('click', () => {
    el.rewardOverlay.classList.remove('active');
    if (burstAnimationFrame) cancelAnimationFrame(burstAnimationFrame);
  });

  function runCoinBurst(){
    const canvas = el.coinBurstCanvas;
    const bctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const particles = [];

    for (let i = 0; i < 60; i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 4 + Math.random() * 5,
        life: 1,
        color: Math.random() > 0.5 ? '255,183,0' : '176,0,255'
      });
    }

    const start = performance.now();
    function frame(now){
      const elapsed = now - start;
      bctx.clearRect(0, 0, canvas.width, canvas.height);

      let anyAlive = false;
      particles.forEach(p => {
        p.vy += 0.15;
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

      if (anyAlive && elapsed < 4000){
        burstAnimationFrame = requestAnimationFrame(frame);
      } else {
        bctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    burstAnimationFrame = requestAnimationFrame(frame);
  }

  /* ============================================================
     RANK UP OVERLAY
  ============================================================ */
  function showRankUpOverlay(rankName){
    el.rankupName.textContent = rankName;
    el.rankupOverlay.classList.add('active');
    addLedger('info', `RANK ADVANCED — new designation: ${rankName}`);
  }

  el.btnRankupClose.addEventListener('click', () => {
    el.rankupOverlay.classList.remove('active');
  });

  /* ============================================================
     INIT
  ============================================================ */
  if (state.ledger.length === 0){
    addLedger('info', 'VAULT UPLINK ESTABLISHED. LOCAL VERIFICATION LOG INITIALIZED.');
  } else {
    renderLedgerFull();
  }
  renderBalance();
  renderRank();

});