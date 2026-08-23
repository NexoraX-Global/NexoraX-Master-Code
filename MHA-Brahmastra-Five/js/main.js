document.addEventListener('DOMContentLoaded', () => {

  const STORAGE_KEY = 'taskforge_guild_state_v1';
  const CONTRIBUTE_AMOUNT = 250;
  const RIVAL_DRIFT_MIN_MS = 6000;
  const RIVAL_DRIFT_MAX_MS = 14000;

  const TIERS = [
    { name: 'Tier I — Outpost Empire', threshold: 0 },
    { name: 'Tier II — Frontier Dominion', threshold: 2000 },
    { name: 'Tier III — Sector Hegemony', threshold: 6000 },
    { name: 'Tier IV — Continental Syndicate', threshold: 15000 },
    { name: 'Tier V — Sovereign Ascendancy', threshold: 35000 }
  ];

  const RIVAL_NAMES = ['Cyber-Titans', 'Void Reapers', 'Crimson Directorate', 'Ashborn Collective'];

  const WAR_EVENTS = [
    'captured a new sector',
    'launched a coordinated raid',
    'fortified their home territory',
    'won a tactical skirmish',
    'deployed a war chest bonus'
  ];

  /* ============================================================
     STATE
  ============================================================ */
  function defaultState(){
    return {
      xp: 0,
      guildName: null,
      warPower: 0,
      rivals: RIVAL_NAMES.slice(0, 3).map((name, i) => ({
        name,
        score: 1400 + i * 650 + Math.floor(Math.random() * 300)
      })),
      feed: []
    };
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return defaultState();
      const merged = Object.assign(defaultState(), parsed);
      if (!Array.isArray(merged.rivals) || merged.rivals.length === 0){
        merged.rivals = defaultState().rivals;
      }
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
      color: Math.random() > 0.5 ? '255,183,0' : '255,0,85'
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

    guildStatusBadge: document.getElementById('guild-status-badge'),
    stageSetup: document.getElementById('guild-stage-setup'),
    stageActive: document.getElementById('guild-stage-active'),
    guildNameInput: document.getElementById('guild-name-input'),
    setupError: document.getElementById('guild-setup-error'),
    btnFoundGuild: document.getElementById('btn-found-guild'),

    guildBadgeRank: document.getElementById('guild-badge-rank'),
    guildNameDisplay: document.getElementById('guild-name-display'),
    guildRankTitle: document.getElementById('guild-rank-title'),
    warpowerValue: document.getElementById('warpower-value'),
    rankProgressCurrent: document.getElementById('rank-progress-current'),
    rankProgressNext: document.getElementById('rank-progress-next'),
    rankProgressFill: document.getElementById('rank-progress-fill'),
    btnRenameGuild: document.getElementById('btn-rename-guild'),

    leaderboardList: document.getElementById('leaderboard-list'),
    btnContributeXp: document.getElementById('btn-contribute-xp'),

    warFeed: document.getElementById('war-feed'),

    contributeOverlay: document.getElementById('contribute-overlay'),
    contributeAmountText: document.getElementById('contribute-amount-text'),
    contributeSubText: document.getElementById('contribute-sub-text'),
    btnContributeClose: document.getElementById('btn-contribute-close'),
    contributeBurstCanvas: document.getElementById('contribute-burst'),

    rankupOverlay: document.getElementById('rankup-overlay'),
    rankupName: document.getElementById('rankup-name'),
    btnRankupClose: document.getElementById('btn-rankup-close')
  };

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ============================================================
     TIER LOGIC
  ============================================================ */
  function currentTierIndex(){
    let idx = 0;
    for (let i = 0; i < TIERS.length; i++){
      if (state.warPower >= TIERS[i].threshold) idx = i;
    }
    return idx;
  }

  function renderGuildIdentity(){
    const idx = currentTierIndex();
    const tier = TIERS[idx];
    const next = TIERS[idx + 1];

    el.guildBadgeRank.textContent = ['I','II','III','IV','V'][idx];
    el.guildNameDisplay.textContent = state.guildName;
    el.guildRankTitle.textContent = tier.name;
    el.warpowerValue.textContent = Math.round(state.warPower).toLocaleString();

    el.rankProgressCurrent.textContent = tier.name.split(' — ')[0];
    if (next){
      el.rankProgressNext.textContent = `${next.name.split(' — ')[0]} at ${next.threshold.toLocaleString()}`;
      const span = next.threshold - tier.threshold;
      const progressed = state.warPower - tier.threshold;
      const pct = Math.max(0, Math.min(100, (progressed / span) * 100));
      el.rankProgressFill.style.width = pct + '%';
    } else {
      el.rankProgressNext.textContent = 'MAX TIER REACHED';
      el.rankProgressFill.style.width = '100%';
    }
    return idx;
  }

  function renderHud(){
    el.hudXp.textContent = Math.round(state.xp).toLocaleString();
  }

  /* ============================================================
     FOUND / RENAME GUILD
  ============================================================ */
  el.btnFoundGuild.addEventListener('click', () => {
    el.setupError.textContent = '';
    const name = el.guildNameInput.value.trim();
    if (!name){
      el.setupError.textContent = 'EMPIRE NAME REQUIRED.';
      return;
    }
    if (name.length < 3){
      el.setupError.textContent = 'NAME MUST BE AT LEAST 3 CHARACTERS.';
      return;
    }

    state.guildName = name;
    saveState();

    addFeed('info', `Empire founded: "${escapeHtml(name)}" has entered the war`);
    enterGuildActiveStage();
  });

  el.btnRenameGuild.addEventListener('click', () => {
    const confirmed = window.confirm('Disband your empire? Your war power resets to 0 but your total XP is kept.');
    if (!confirmed) return;

    addFeed('war', `Empire "${escapeHtml(state.guildName)}" disbanded by its own commander`);
    state.guildName = null;
    state.warPower = 0;
    saveState();

    el.stageActive.classList.add('hidden');
    el.stageSetup.classList.remove('hidden');
    el.guildStatusBadge.textContent = 'UNREGISTERED';
    el.guildNameInput.value = '';
  });

  function enterGuildActiveStage(){
    el.stageSetup.classList.add('hidden');
    el.stageActive.classList.remove('hidden');
    el.guildStatusBadge.textContent = 'ACTIVE';
    renderGuildIdentity();
    renderLeaderboard(false);
  }

  /* ============================================================
     LEADERBOARD RENDER
  ============================================================ */
  function getLeaderboardEntries(){
    const you = { name: state.guildName || 'Your Empire', score: state.warPower, isYou: true };
    const all = [...state.rivals.map(r => ({ ...r, isYou: false })), you];
    all.sort((a, b) => b.score - a.score);
    return all.slice(0, 3).concat(
      all.slice(3).some(e => e.isYou) ? [all.find(e => e.isYou)] : []
    ).filter((entry, idx, arr) => arr.findIndex(e => e.name === entry.name) === idx);
  }

  function renderLeaderboard(animateBump){
    if (!state.guildName){
      // Show rivals only, no "you" row, before founding
      const rivalsSorted = [...state.rivals].sort((a, b) => b.score - a.score).slice(0, 3);
      el.leaderboardList.innerHTML = '';
      rivalsSorted.forEach((entry, i) => {
        el.leaderboardList.appendChild(buildLeaderboardRow(entry, i + 1, false, false));
      });
      return;
    }

    const entries = getLeaderboardEntries();
    el.leaderboardList.innerHTML = '';
    entries.forEach((entry, i) => {
      el.leaderboardList.appendChild(buildLeaderboardRow(entry, i + 1, entry.isYou, animateBump && entry.isYou));
    });
  }

  function buildLeaderboardRow(entry, rank, isYou, bump){
    const row = document.createElement('div');
    row.className = 'leaderboard-row' + (isYou ? ' is-you' : '');
    row.innerHTML = `
      <span class="leaderboard-rank">#${rank}</span>
      <div class="leaderboard-info">
        <span class="leaderboard-name">${escapeHtml(entry.name)}${isYou ? '<span class="you-tag">YOU</span>' : ''}</span>
      </div>
      <span class="leaderboard-score${bump ? ' bump' : ''}">${Math.round(entry.score).toLocaleString()}</span>
    `;
    return row;
  }

  /* ============================================================
     WAR FEED TERMINAL
  ============================================================ */
  function buildFeedLine(entry){
    const line = document.createElement('div');
    line.className = 'feed-line ' + entry.type;
    line.innerHTML = `<span class="feed-time">[${entry.time}]</span>${entry.message}`;
    return line;
  }

  function renderFeedFull(){
    el.warFeed.innerHTML = '';
    state.feed.forEach(entry => el.warFeed.appendChild(buildFeedLine(entry)));
  }

  function addFeed(type, message){
    const entry = { time: new Date().toLocaleTimeString([], { hour12:false }), type, message };
    state.feed.unshift(entry);
    if (state.feed.length > 60) state.feed.length = 60;
    saveState();
    el.warFeed.prepend(buildFeedLine(entry));
    while (el.warFeed.children.length > 60) el.warFeed.removeChild(el.warFeed.lastChild);
  }

  /* ============================================================
     CONTRIBUTE XP
  ============================================================ */
  el.btnContributeXp.addEventListener('click', () => {
    if (!state.guildName) return;

    const beforeTier = currentTierIndex();

    state.xp += CONTRIBUTE_AMOUNT;
    state.warPower += CONTRIBUTE_AMOUNT;
    saveState();

    renderHud();
    const afterTier = renderGuildIdentity();
    renderLeaderboard(true);

    addFeed('you', `You contributed +${CONTRIBUTE_AMOUNT} XP to "${escapeHtml(state.guildName)}"`);

    el.contributeAmountText.textContent = `+${CONTRIBUTE_AMOUNT}`;
    el.contributeSubText.textContent = `Contributed to "${state.guildName}"`;
    el.contributeOverlay.classList.add('active');
    runContributeBurst();

    if (afterTier > beforeTier){
      setTimeout(() => showRankUp(TIERS[afterTier].name), 600);
    }
  });

  el.btnContributeClose.addEventListener('click', () => {
    el.contributeOverlay.classList.remove('active');
  });

  function showRankUp(tierName){
    el.rankupName.textContent = tierName.split(' — ')[0];
    el.rankupOverlay.classList.add('active');
    addFeed('info', `EMPIRE TIER ADVANCED — "${escapeHtml(state.guildName)}" reached ${tierName}`);
  }

  el.btnRankupClose.addEventListener('click', () => {
    el.rankupOverlay.classList.remove('active');
  });

  /* ============================================================
     CONTRIBUTE PARTICLE BURST
  ============================================================ */
  let burstFrame = null;

  function runContributeBurst(){
    const canvas = el.contributeBurstCanvas;
    const bctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const particles = [];

    for (let i = 0; i < 55; i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5.5;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.8,
        size: 3 + Math.random() * 5,
        life: 1,
        color: Math.random() > 0.5 ? '255,183,0' : '255,0,85'
      });
    }

    const start = performance.now();
    function frame(now){
      const elapsed = now - start;
      bctx.clearRect(0, 0, canvas.width, canvas.height);
      let anyAlive = false;
      particles.forEach(p => {
        p.vy += 0.13;
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
      if (anyAlive && elapsed < 3800){
        burstFrame = requestAnimationFrame(frame);
      } else {
        bctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    burstFrame = requestAnimationFrame(frame);
  }

  /* ============================================================
     SIMULATED RIVAL DRIFT (background "activity")
  ============================================================ */
  function scheduleRivalDrift(){
    const delay = RIVAL_DRIFT_MIN_MS + Math.random() * (RIVAL_DRIFT_MAX_MS - RIVAL_DRIFT_MIN_MS);
    setTimeout(() => {
      const rival = state.rivals[Math.floor(Math.random() * state.rivals.length)];
      const gain = 40 + Math.floor(Math.random() * 180);
      rival.score += gain;
      saveState();

      const event = WAR_EVENTS[Math.floor(Math.random() * WAR_EVENTS.length)];
      addFeed('war', `${escapeHtml(rival.name)} ${event} (simulated) — +${gain} score`);

      renderLeaderboard(false);
      scheduleRivalDrift();
    }, delay);
  }

  /* ============================================================
     INIT
  ============================================================ */
  if (state.feed.length === 0){
    addFeed('info', 'SOCIAL UPLINK ESTABLISHED. GLOBAL WAR FEED ONLINE (SIMULATED).');
  } else {
    renderFeedFull();
  }

  renderHud();

  if (state.guildName){
    enterGuildActiveStage();
  } else {
    renderLeaderboard(false);
  }

  scheduleRivalDrift();

});