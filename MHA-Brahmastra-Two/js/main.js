document.addEventListener('DOMContentLoaded', () => {

  const STORAGE_KEY = 'taskforge_arena_state_v1';

  /* ============================================================
     STATE
  ============================================================ */
  function defaultState(){
    return {
      tokens: 2000,
      faction: null,               // 'vanguards' | 'titans' | null
      scores: { vanguards: 5240, titans: 4980 },
      stakes: [],                  // { id, name, amount, durationSec, expiresAt }
      feed: []                     // { time, type, message }
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
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(err){
      /* storage unavailable — continue in-memory */
    }
  }

  function genId(){
    return 'stk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  let state = loadState();

  /* ============================================================
     TACTICAL GRID BACKGROUND
  ============================================================ */
  const canvas = document.getElementById('tactical-grid');
  const ctx = canvas.getContext('2d');
  let w, h, dots = [];

  function resizeCanvas(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  for (let i = 0; i < 40; i++){
    dots.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      color: Math.random() > 0.5 ? '0,243,255' : '255,0,85'
    });
  }

  function drawGrid(){
    ctx.clearRect(0, 0, w, h);
    const gap = 56;
    ctx.strokeStyle = 'rgba(0,243,255,0.045)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += gap){
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gap){
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    dots.forEach(d => {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0 || d.x > w) d.vx *= -1;
      if (d.y < 0 || d.y > h) d.vy *= -1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.color},0.55)`;
      ctx.fill();
    });
    requestAnimationFrame(drawGrid);
  }
  drawGrid();

  /* ============================================================
     DOM REFERENCES
  ============================================================ */
  const el = {
    clock: document.getElementById('hud-clock'),
    tokens: document.getElementById('hud-tokens'),
    scoreVanguards: document.getElementById('score-vanguards'),
    scoreTitans: document.getElementById('score-titans'),
    pledgeVanguards: document.getElementById('pledge-vanguards'),
    pledgeTitans: document.getElementById('pledge-titans'),
    factionCardVanguards: document.getElementById('faction-card-vanguards'),
    factionCardTitans: document.getElementById('faction-card-titans'),
    dominanceVanguardsPct: document.getElementById('dominance-vanguards-pct'),
    dominanceTitansPct: document.getElementById('dominance-titans-pct'),
    dominanceFill: document.getElementById('dominance-fill'),
    dominanceMarker: document.getElementById('dominance-marker'),
    pledgeStatus: document.getElementById('pledge-status'),
    stakeForm: document.getElementById('stake-form'),
    stakeName: document.getElementById('stake-name'),
    stakeAmount: document.getElementById('stake-amount'),
    stakeDuration: document.getElementById('stake-duration'),
    stakeFormError: document.getElementById('stake-form-error'),
    stakeCountBadge: document.getElementById('stake-count-badge'),
    stakeActiveList: document.getElementById('stake-active-list'),
    stakeEmptyState: document.getElementById('stake-empty-state'),
    combatFeed: document.getElementById('combat-feed')
  };

  /* ============================================================
     CLOCK
  ============================================================ */
  function tickClock(){
    el.clock.textContent = new Date().toLocaleTimeString([], { hour12:false });
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ============================================================
     RENDER: HUD BALANCE
  ============================================================ */
  function renderTokens(){
    el.tokens.textContent = Math.max(0, Math.round(state.tokens)).toLocaleString();
  }

  /* ============================================================
     RENDER: FACTIONS + DOMINANCE
  ============================================================ */
  function renderFactions(){
    el.scoreVanguards.textContent = Math.round(state.scores.vanguards).toLocaleString();
    el.scoreTitans.textContent = Math.round(state.scores.titans).toLocaleString();

    const total = state.scores.vanguards + state.scores.titans;
    const vPct = total > 0 ? Math.round((state.scores.vanguards / total) * 100) : 50;
    const tPct = 100 - vPct;

    el.dominanceVanguardsPct.textContent = vPct + '%';
    el.dominanceTitansPct.textContent = tPct + '%';
    el.dominanceFill.style.width = vPct + '%';
    el.dominanceMarker.style.left = vPct + '%';

    el.factionCardVanguards.classList.toggle('pledged', state.faction === 'vanguards');
    el.factionCardTitans.classList.toggle('pledged', state.faction === 'titans');

    if (state.faction){
      el.pledgeVanguards.disabled = true;
      el.pledgeTitans.disabled = true;
      if (state.faction === 'vanguards'){
        el.pledgeVanguards.textContent = 'PLEDGED ✓';
        el.pledgeVanguards.classList.add('chosen');
        el.pledgeStatus.textContent = 'Allegiance locked: CYBER-VANGUARDS. Completed stakes fuel their war power.';
      } else {
        el.pledgeTitans.textContent = 'PLEDGED ✓';
        el.pledgeTitans.classList.add('chosen');
        el.pledgeStatus.textContent = 'Allegiance locked: SHADOW-TITANS. Completed stakes fuel their war power.';
      }
    } else {
      el.pledgeVanguards.disabled = false;
      el.pledgeTitans.disabled = false;
      el.pledgeVanguards.textContent = 'PLEDGE ALLEGIANCE';
      el.pledgeTitans.textContent = 'PLEDGE ALLEGIANCE';
      el.pledgeStatus.textContent = 'You have not pledged allegiance. Choose a faction to contribute war power.';
    }
  }

  function pledgeFaction(name){
    if (state.faction) return;
    state.faction = name;
    state.scores[name] += 250;
    saveState();
    renderFactions();
    addFeed('gain', `Allegiance pledged to ${name === 'vanguards' ? 'CYBER-VANGUARDS' : 'SHADOW-TITANS'} — +250 war power`);
  }

  el.pledgeVanguards.addEventListener('click', () => pledgeFaction('vanguards'));
  el.pledgeTitans.addEventListener('click', () => pledgeFaction('titans'));

  /* ============================================================
     COMBAT FEED
  ============================================================ */
  function renderFeedFull(){
    el.combatFeed.innerHTML = '';
    state.feed.forEach(entry => {
      el.combatFeed.appendChild(buildFeedLine(entry));
    });
    el.combatFeed.scrollTop = 0;
  }

  function buildFeedLine(entry){
    const line = document.createElement('div');
    line.className = 'feed-line ' + entry.type;
    line.innerHTML = `<span class="feed-time">[${entry.time}]</span>${entry.message}`;
    return line;
  }

  function addFeed(type, message){
    const entry = { time: new Date().toLocaleTimeString([], { hour12:false }), type, message };
    state.feed.unshift(entry);
    if (state.feed.length > 50) state.feed.length = 50;
    saveState();
    el.combatFeed.prepend(buildFeedLine(entry));
    while (el.combatFeed.children.length > 50){
      el.combatFeed.removeChild(el.combatFeed.lastChild);
    }
    el.combatFeed.scrollTop = 0;
  }

  /* ============================================================
     STAKE & BURN PROTOCOL
  ============================================================ */
  function renderStakeCount(){
    el.stakeCountBadge.textContent = `${state.stakes.length} ACTIVE`;
    el.stakeEmptyState.style.display = state.stakes.length === 0 ? 'block' : 'none';
  }

  function formatCountdown(ms){
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function buildStakeCard(stake){
    const card = document.createElement('div');
    card.className = 'stake-card';
    card.dataset.id = stake.id;
    card.innerHTML = `
      <div class="stake-card-head">
        <span class="stake-card-name">${escapeHtml(stake.name)}</span>
        <span class="stake-card-amount">${stake.amount.toLocaleString()} $FORGE</span>
      </div>
      <p class="warning-banner">⚠ BURN IMMINENT — FOCUS OR LOSE STAKE</p>
      <div class="stake-progress-track">
        <div class="stake-progress-fill" style="width:100%"></div>
      </div>
      <div class="stake-card-foot">
        <span class="stake-countdown">00:00</span>
        <div class="stake-card-actions">
          <button class="btn-mini btn-complete">COMPLETE</button>
          <button class="btn-mini btn-abandon">ABANDON</button>
        </div>
      </div>
    `;
    return card;
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderStakeListFull(){
    el.stakeActiveList.querySelectorAll('.stake-card').forEach(c => c.remove());
    state.stakes.forEach(stake => {
      el.stakeActiveList.appendChild(buildStakeCard(stake));
    });
    renderStakeCount();
  }

  function tickStakes(){
    const now = Date.now();
    const expired = [];

    state.stakes.forEach(stake => {
      const remaining = stake.expiresAt - now;
      const card = el.stakeActiveList.querySelector(`.stake-card[data-id="${stake.id}"]`);
      if (!card) return;

      if (remaining <= 0){
        expired.push(stake.id);
        return;
      }

      const pct = Math.max(0, Math.min(100, (remaining / (stake.durationSec * 1000)) * 100));
      card.querySelector('.stake-progress-fill').style.width = pct + '%';
      card.querySelector('.stake-countdown').textContent = formatCountdown(remaining);
      card.classList.toggle('burn-warning', pct <= 20);
    });

    expired.forEach(id => burnStake(id, true));
  }

  function createStake(name, amount, minutes){
    const stake = {
      id: genId(),
      name: name,
      amount: amount,
      durationSec: minutes * 60,
      expiresAt: Date.now() + minutes * 60 * 1000
    };
    state.tokens -= amount;
    state.stakes.push(stake);
    saveState();
    renderTokens();
    renderStakeListFull();
    addFeed('info', `Stake deployed: "${escapeHtml(name)}" — ${amount.toLocaleString()} $FORGE locked for ${minutes}m`);
  }

  function removeStakeCardAnimated(id, after){
    const card = el.stakeActiveList.querySelector(`.stake-card[data-id="${id}"]`);
    if (!card){ after(); return; }
    card.classList.add('removing');
    setTimeout(() => {
      card.remove();
      after();
    }, 260);
  }

  function completeStake(id){
    const idx = state.stakes.findIndex(s => s.id === id);
    if (idx === -1) return;
    const stake = state.stakes[idx];
    const bonus = Math.round(stake.amount * 0.5);
    const reward = stake.amount + bonus;

    state.tokens += reward;
    state.stakes.splice(idx, 1);

    let factionMsg = '';
    if (state.faction){
      state.scores[state.faction] += stake.amount;
      factionMsg = ` — ${state.faction === 'vanguards' ? 'CYBER-VANGUARDS' : 'SHADOW-TITANS'} war power +${stake.amount.toLocaleString()}`;
    }

    saveState();
    removeStakeCardAnimated(id, () => {
      renderTokens();
      renderFactions();
      renderStakeCount();
      addFeed('gain', `FOCUS COMPLETE: "${escapeHtml(stake.name)}" — +${reward.toLocaleString()} $FORGE reclaimed${factionMsg}`);
    });
  }

  function burnStake(id, isAuto){
    const idx = state.stakes.findIndex(s => s.id === id);
    if (idx === -1) return;
    const stake = state.stakes[idx];
    state.stakes.splice(idx, 1);

    const opposing = state.faction === 'vanguards' ? 'titans'
                    : state.faction === 'titans' ? 'vanguards'
                    : (Math.random() > 0.5 ? 'vanguards' : 'titans');
    const fuel = Math.round(stake.amount * 0.3);
    state.scores[opposing] += fuel;

    saveState();
    removeStakeCardAnimated(id, () => {
      renderTokens();
      renderFactions();
      renderStakeCount();
      const reason = isAuto ? 'TIMER EXPIRED' : 'ABANDONED BY OPERATOR';
      addFeed('burn', `STAKE BURNED (${reason}): "${escapeHtml(stake.name)}" — -${stake.amount.toLocaleString()} $FORGE, ${opposing === 'vanguards' ? 'CYBER-VANGUARDS' : 'SHADOW-TITANS'} +${fuel.toLocaleString()} power`);
    });
  }

  el.stakeActiveList.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const card = btn.closest('.stake-card');
    if (!card) return;
    const id = card.dataset.id;

    if (btn.classList.contains('btn-complete')) completeStake(id);
    else if (btn.classList.contains('btn-abandon')) burnStake(id, false);
  });

  el.stakeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    el.stakeFormError.textContent = '';

    const name = el.stakeName.value.trim();
    const amount = parseInt(el.stakeAmount.value, 10);
    const minutes = parseInt(el.stakeDuration.value, 10);

    if (!name){
      el.stakeFormError.textContent = 'TASK DESIGNATION REQUIRED.';
      return;
    }
    if (!Number.isFinite(amount) || amount < 10){
      el.stakeFormError.textContent = 'STAKE AMOUNT MUST BE AT LEAST 10.';
      return;
    }
    if (!Number.isFinite(minutes) || minutes < 1){
      el.stakeFormError.textContent = 'DURATION MUST BE AT LEAST 1 MINUTE.';
      return;
    }
    if (amount > state.tokens){
      el.stakeFormError.textContent = `INSUFFICIENT $FORGE. AVAILABLE: ${Math.round(state.tokens).toLocaleString()}.`;
      return;
    }

    createStake(name, amount, minutes);
    el.stakeForm.reset();
    el.stakeAmount.value = 100;
    el.stakeDuration.value = 25;
  });

  /* ============================================================
     RECONCILE ON LOAD (handles stakes that expired while offline)
  ============================================================ */
  function reconcileOnLoad(){
    const now = Date.now();
    const stillActive = [];

    state.stakes.forEach(stake => {
      if (stake.expiresAt - now <= 0){
        const opposing = state.faction === 'vanguards' ? 'titans'
                        : state.faction === 'titans' ? 'vanguards'
                        : (Math.random() > 0.5 ? 'vanguards' : 'titans');
        const fuel = Math.round(stake.amount * 0.3);
        state.scores[opposing] += fuel;
        state.feed.unshift({
          time: new Date().toLocaleTimeString([], { hour12:false }),
          type: 'burn',
          message: `STAKE BURNED (EXPIRED WHILE OFFLINE): "${escapeHtml(stake.name)}" — -${stake.amount.toLocaleString()} $FORGE, ${opposing === 'vanguards' ? 'CYBER-VANGUARDS' : 'SHADOW-TITANS'} +${fuel.toLocaleString()} power`
        });
      } else {
        stillActive.push(stake);
      }
    });

    state.stakes = stillActive;
    if (state.feed.length > 50) state.feed.length = 50;

    if (state.feed.length === 0){
      state.feed.push({
        time: new Date().toLocaleTimeString([], { hour12:false }),
        type: 'info',
        message: 'ARENA UPLINK ESTABLISHED. WAR ECONOMY SYNCHRONIZED.'
      });
    }

    saveState();
  }

  /* ============================================================
     INIT
  ============================================================ */
  reconcileOnLoad();
  renderTokens();
  renderFactions();
  renderStakeListFull();
  renderFeedFull();

  setInterval(tickStakes, 1000);

});