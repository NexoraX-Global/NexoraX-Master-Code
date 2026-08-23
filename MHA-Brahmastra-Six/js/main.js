document.addEventListener('DOMContentLoaded', () => {

  const STORAGE_KEY = 'taskforge_evolution_state_v1';
  const BASE_XP_COST = 100;
  const XP_GROWTH_EXPONENT = 1.45;
  const MAX_LEVEL = 100;

  const TIER_LABELS = [
    { name: 'I', minAvgLevel: 0 },
    { name: 'II', minAvgLevel: 5 },
    { name: 'III', minAvgLevel: 12 },
    { name: 'IV', minAvgLevel: 22 },
    { name: 'V', minAvgLevel: 35 }
  ];

  const STAT_DISPLAY_NAMES = {
    intelligence: 'INTELLIGENCE',
    discipline: 'DISCIPLINE',
    endurance: 'ENDURANCE'
  };

  /* ============================================================
     STATE
  ============================================================ */
  function defaultState(){
    return {
      xpPool: 500,
      stats: {
        intelligence: { level: 1 },
        discipline: { level: 1 },
        endurance: { level: 1 }
      },
      telemetry: []
    };
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return defaultState();
      const merged = Object.assign(defaultState(), parsed);
      merged.stats = Object.assign(defaultState().stats, parsed.stats || {});
      return merged;
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
      color: Math.random() > 0.5 ? '0,243,255' : '176,0,255'
    });
  }

  function drawGrid(){
    gctx.clearRect(0, 0, gw, gh);
    const gap = 58;
    gctx.strokeStyle = 'rgba(0,243,255,0.04)';
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
    hudXp: document.getElementById('hud-xp'),
    hudTier: document.getElementById('hud-tier'),
    xpPoolBadge: document.getElementById('xp-pool-badge'),

    xpForm: document.getElementById('xp-form'),
    xpActionName: document.getElementById('xp-action-name'),
    xpActionAmount: document.getElementById('xp-action-amount'),
    xpActionStat: document.getElementById('xp-action-stat'),
    xpFormError: document.getElementById('xp-form-error'),

    telemetryFeed: document.getElementById('telemetry-feed'),

    levelupOverlay: document.getElementById('levelup-overlay'),
    levelupStatName: document.getElementById('levelup-stat-name'),
    levelupLevelText: document.getElementById('levelup-level-text'),
    btnLevelupClose: document.getElementById('btn-levelup-close'),
    levelupBurstCanvas: document.getElementById('levelup-burst')
  };

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ============================================================
     XP COST MATH
  ============================================================ */
  function costForLevel(level){
    return Math.round(BASE_XP_COST * Math.pow(level, XP_GROWTH_EXPONENT));
  }

  /* ============================================================
     RENDER: HUD
  ============================================================ */
  function averageLevel(){
    const levels = Object.values(state.stats).map(s => s.level);
    return levels.reduce((a, b) => a + b, 0) / levels.length;
  }

  function currentTierName(){
    const avg = averageLevel();
    let tier = TIER_LABELS[0];
    for (const t of TIER_LABELS){
      if (avg >= t.minAvgLevel) tier = t;
    }
    return tier.name;
  }

  function renderHud(){
    el.hudXp.textContent = Math.round(state.xpPool).toLocaleString();
    el.xpPoolBadge.textContent = `${Math.round(state.xpPool).toLocaleString()} AVAILABLE`;
    el.hudTier.textContent = currentTierName();
  }

  /* ============================================================
     RENDER: STAT CARDS
  ============================================================ */
  function renderStat(statKey){
    const stat = state.stats[statKey];
    const level = stat.level;
    const cost = costForLevel(level);
    const pct = level >= MAX_LEVEL ? 100 : Math.max(0, Math.min(100, (state.xpPool / cost) * 100));

    document.getElementById(`level-${statKey}`).textContent = level >= MAX_LEVEL ? 'MAX LEVEL' : `LEVEL ${level}`;
    document.getElementById(`fill-${statKey}`).style.width = pct + '%';

    const progressText = document.getElementById(`progress-text-${statKey}`);
    const upgradeBtn = document.getElementById(`upgrade-${statKey}`);
    const costSpan = document.getElementById(`cost-${statKey}`);

    if (level >= MAX_LEVEL){
      progressText.textContent = 'MAXIMUM EVOLUTION REACHED';
      upgradeBtn.disabled = true;
      upgradeBtn.innerHTML = 'MAX LEVEL REACHED';
    } else {
      progressText.textContent = `${Math.min(Math.round(state.xpPool), cost).toLocaleString()} / ${cost.toLocaleString()} XP TO NEXT LEVEL`;
      costSpan.textContent = cost.toLocaleString();
      upgradeBtn.disabled = state.xpPool < cost;
      upgradeBtn.innerHTML = `UPGRADE — <span id="cost-${statKey}">${cost.toLocaleString()}</span> XP`;
    }
  }

  function renderAllStats(){
    Object.keys(state.stats).forEach(renderStat);
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
     UPGRADE HANDLER
  ============================================================ */
  document.getElementById('stat-cards').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-upgrade');
    if (!btn || btn.disabled) return;

    const statKey = btn.dataset.stat;
    const stat = state.stats[statKey];
    if (stat.level >= MAX_LEVEL) return;

    const cost = costForLevel(stat.level);
    if (state.xpPool < cost) return;

    state.xpPool -= cost;
    stat.level += 1;
    saveState();

    renderHud();
    renderAllStats();

    const card = document.getElementById(`card-${statKey}`);
    card.classList.add('flash');
    setTimeout(() => card.classList.remove('flash'), 620);

    const displayName = STAT_DISPLAY_NAMES[statKey];
    addTelemetry('levelup', `${displayName} LEVEL ${stat.level} REACHED! Neural pathways upgraded.`);

    showLevelUpOverlay(displayName, stat.level);
  });

  /* ============================================================
     LEVEL UP OVERLAY + BURST
  ============================================================ */
  let burstFrame = null;

  function showLevelUpOverlay(displayName, level){
    el.levelupStatName.textContent = displayName;
    el.levelupLevelText.textContent = `LEVEL ${level}`;
    el.levelupOverlay.classList.add('active');
    runLevelUpBurst();
  }

  el.btnLevelupClose.addEventListener('click', () => {
    el.levelupOverlay.classList.remove('active');
    if (burstFrame) cancelAnimationFrame(burstFrame);
  });

  function runLevelUpBurst(){
    const canvas = el.levelupBurstCanvas;
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
        color: Math.random() > 0.5 ? '0,243,255' : '176,0,255'
      });
    }

    const start = performance.now();
    function frame(now){
      const elapsed = now - start;
      bctx.clearRect(0, 0, canvas.width, canvas.height);
      let anyAlive = false;
      particles.forEach(p => {
        p.vy += 0.14;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.011;
        if (p.life > 0){
          anyAlive = true;
          bctx.beginPath();
          bctx.arc(p.x, p.y, p.size * Math.max(p.life, 0), 0, Math.PI * 2);
          bctx.fillStyle = `rgba(${p.color},${Math.max(p.life,0)})`;
          bctx.fill();
        }
      });
      if (anyAlive && elapsed < 4000){
        burstFrame = requestAnimationFrame(frame);
      } else {
        bctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    burstFrame = requestAnimationFrame(frame);
  }

  /* ============================================================
     XP LOGGING FORM
  ============================================================ */
  el.xpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    el.xpFormError.textContent = '';

    const name = el.xpActionName.value.trim();
    const amount = parseInt(el.xpActionAmount.value, 10);
    const relatedStat = el.xpActionStat.value;

    if (!name){
      el.xpFormError.textContent = 'ACTION DESCRIPTION REQUIRED.';
      return;
    }
    if (!Number.isFinite(amount) || amount < 5){
      el.xpFormError.textContent = 'XP AMOUNT MUST BE AT LEAST 5.';
      return;
    }
    if (amount > 500){
      el.xpFormError.textContent = 'XP AMOUNT CANNOT EXCEED 500 PER LOG.';
      return;
    }

    state.xpPool += amount;
    saveState();

    renderHud();
    renderAllStats();

    const statNote = relatedStat === 'general' ? 'General Pool' : STAT_DISPLAY_NAMES[relatedStat];
    addTelemetry('gain', `Logged: "${escapeHtml(name)}" — +${amount} XP granted (${statNote})`);

    el.xpForm.reset();
    el.xpActionAmount.value = 50;
  });

  /* ============================================================
     INIT
  ============================================================ */
  if (state.telemetry.length === 0){
    addTelemetry('info', 'NEURAL MATRIX ONLINE. AVATAR EVOLUTION SYSTEM INITIALIZED.');
  } else {
    renderTelemetryFull();
  }

  renderHud();
  renderAllStats();

});