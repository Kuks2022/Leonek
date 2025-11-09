/* Leonek — Clicker stealth
   Zapis przez localStorage; profile = nicki znajomych.
*/
(() => {
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // App state
  const state = {
    activeNick: null,
    profiles: {}, // nick -> data
    assets: { bg: '', dog: '', tissue: '', watcher: '' },
  };

  // Storage
  const STORAGE_KEY = 'leonek_profiles_v1';
  const ASSETS_KEY  = 'leonek_assets_v1';

  function loadAll() {
    try {
      state.profiles = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { state.profiles = {}; }
    try {
      state.assets = { ...state.assets, ...(JSON.parse(localStorage.getItem(ASSETS_KEY) || '{}')) };
    } catch {}
    renderProfiles();
    applyAssets();
  }

  function saveAll() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.profiles));
    localStorage.setItem(ASSETS_KEY, JSON.stringify(state.assets));
  }

  // Profile helpers
  function ensureProfile(nick) {
    if (!state.profiles[nick]) {
      state.profiles[nick] = {
        tissues: 0,
        hunger: 10, boredom: 10, thirst: 10, // niżej = lepiej
        risk: 0,
        createdAt: Date.now(),
        lastSeen: Date.now(),
      };
    }
    saveAll();
  }

  function renderProfiles() {
    const wrap = qs('#profiles-list');
    wrap.innerHTML = '';
    const nicks = Object.keys(state.profiles);
    if (!nicks.length) {
      const none = document.createElement('div');
      none.className = 'hint';
      none.textContent = 'Brak profili. Dodaj nowy nick poniżej.';
      wrap.appendChild(none);
      return;
    }
    nicks.forEach(nick => {
      const btn = document.createElement('button');
      btn.className = 'profile-btn';
      const p = state.profiles[nick];
      btn.innerHTML = `<strong>${nick}</strong><span class="small">🧻 ${p.tissues}</span>`;
      btn.addEventListener('click', () => selectProfile(nick));
      wrap.appendChild(btn);
    });
  }

  // Screens
  const screenHome = qs('#screen-home');
  const screenGame = qs('#screen-game');
  const screenSettings = qs('#screen-settings');

  function show(screen) {
    qsa('.screen').forEach(s => s.classList.remove('visible'));
    screen.classList.add('visible');
  }

  // Select profile
  function selectProfile(nick) {
    ensureProfile(nick);
    state.activeNick = nick;
    const p = state.profiles[nick];
    qs('#hud-nick').textContent = nick;
    qs('#hud-tissues').textContent = p.tissues;
    qs('#stat-hunger').textContent = p.hunger;
    qs('#stat-boredom').textContent = p.boredom;
    qs('#stat-thirst').textContent = p.thirst;
    qs('#hud-risk').textContent = `${p.risk}%`;
    updateRiskUI();
    show(screenGame);
  }

  // Create profile
  qs('#create-profile').addEventListener('click', () => {
    const nick = qs('#new-nick').value.trim();
    if (!nick) return;
    if (nick.length > 20) return alert('Nick max 20 znaków.');
    ensureProfile(nick);
    qs('#new-nick').value = '';
    renderProfiles();
    selectProfile(nick);
  });

  // Nav
  qs('#btn-home').addEventListener('click', () => {
    renderProfiles(); show(screenHome);
  });
  qs('#btn-settings').addEventListener('click', () => show(screenSettings));

  // Import / export
  qs('#btn-export').addEventListener('click', () => {
    const data = { profiles: state.profiles, assets: state.assets, exportedAt: new Date().toISOString() };
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('Skopiowano dane do schowka.');
    }, () => alert('Oto dane (skopiuj ręcznie):\n\n' + json));
  });

  const importDialog = qs('#import-dialog');
  qs('#btn-import').addEventListener('click', () => importDialog.showModal());
  qs('#do-import').addEventListener('click', (e) => {
    e.preventDefault();
    try {
      const text = qs('#import-json').value;
      const data = JSON.parse(text);
      if (data.profiles) state.profiles = data.profiles;
      if (data.assets) state.assets = { ...state.assets, ...data.assets };
      saveAll(); loadAll();
      alert('Zaimportowano dane.');
      importDialog.close();
    } catch (err) {
      alert('Nieprawidłowy JSON.');
    }
  });

  // Assets
  function applyAssets() {
    const bg = qs('#bg'), dog = qs('#dog'), tissue = qs('#tissue'), watcher = qs('#watcher');
    bg.style.backgroundImage = state.assets.bg ? `url("${state.assets.bg}")` : 'none';
    dog.style.backgroundImage = state.assets.dog ? `url("${state.assets.dog}")` : 'none';
    dog.textContent = state.assets.dog ? '' : '🐶';
    dog.style.backgroundSize = 'contain';
    dog.style.backgroundRepeat = 'no-repeat';
    dog.style.backgroundPosition = 'bottom left';

    tissue.style.backgroundImage = state.assets.tissue ? `url("${state.assets.tissue}")` : 'none';
    tissue.textContent = state.assets.tissue ? '' : '🧻';
    tissue.style.backgroundSize = 'contain';
    tissue.style.backgroundRepeat = 'no-repeat';
    tissue.style.backgroundPosition = 'center';

    watcher.style.backgroundImage = state.assets.watcher ? `url("${state.assets.watcher}")` : 'none';
    watcher.textContent = state.assets.watcher ? '' : '👀';
    watcher.style.backgroundSize = 'contain';
    watcher.style.backgroundRepeat = 'no-repeat';
    watcher.style.backgroundPosition = 'center';

    // settings fields
    qs('#asset-bg').value = state.assets.bg || '';
    qs('#asset-dog').value = state.assets.dog || '';
    qs('#asset-tissue').value = state.assets.tissue || '';
    qs('#asset-watcher').value = state.assets.watcher || '';
  }

  qs('#save-assets').addEventListener('click', () => {
    state.assets.bg = qs('#asset-bg').value.trim();
    state.assets.dog = qs('#asset-dog').value.trim();
    state.assets.tissue = qs('#asset-tissue').value.trim();
    state.assets.watcher = qs('#asset-watcher').value.trim();
    saveAll(); applyAssets();
    alert('Zapisano grafiki.');
  });
  qs('#reset-assets').addEventListener('click', () => {
    state.assets = { bg:'', dog:'', tissue:'', watcher:'' };
    saveAll(); applyAssets();
  });

  // Game mechanics
  const PICK_GAIN = 1;           // ile chusteczek za klik
  const RISK_PER_PICK = 6;       // ryzyko za klik
  const RISK_DECAY = 3;          // spadek ryzyka co tick (sek)
  const STATS_TICK = 1;          // co ile sekund rosną wskaźniki
  const STATS_GROW = 1;          // ile rosną wskaźniki co tick
  const MAX_STAT = 100;
  const CAUGHT_PENALTY = 15;     // strata chusteczek przy przyłapaniu
  const WATCHER_MIN = 4, WATCHER_MAX = 10;  // co ile sekund może się pojawić
  const WATCHER_DURATION = 4;    // jak długo patrzy

  let watcherActive = false;
  let watcherTimer = 0;
  let watcherCooldown = 0;

  function setRisk(v) {
    const p = state.profiles[state.activeNick];
    p.risk = clamp(Math.round(v), 0, 100);
    qs('#hud-risk').textContent = p.risk + '%';
    updateRiskUI();
  }
  function updateRiskUI(){
    const risk = state.profiles[state.activeNick]?.risk ?? 0;
    const pill = qs('#risk-pill');
    pill.classList.toggle('danger', risk >= 60);
  }

  function addTissues(n) {
    const p = state.profiles[state.activeNick];
    p.tissues = Math.max(0, (p.tissues || 0) + n);
    qs('#hud-tissues').textContent = p.tissues;
  }

  // Click to pick
  qs('#btn-pick').addEventListener('click', () => {
    const p = state.profiles[state.activeNick];
    if (!p) return;
    // If watcher active, extra risk
    const riskGain = watcherActive ? RISK_PER_PICK * 2 : RISK_PER_PICK;
    setRisk(p.risk + riskGain);
    addTissues(PICK_GAIN);
    if (p.risk >= 100) onCaught();
    saveAll();
    // simple micro animation
    pulse(qs('#tissue'));
  });

  function onCaught() {
    const p = state.profiles[state.activeNick];
    watcherActive = false;
    toggleWatcher(false);
    setRisk(0);
    const lost = Math.min(CAUGHT_PENALTY, p.tissues);
    addTissues(-lost);
    alert(`Ups! Leonka przyłapano. Tracisz ${lost} 🧻`);
  }

  function pulse(el){
    el.animate([{transform:'scale(1)'},{transform:'scale(1.15)'},{transform:'scale(1)'}], {duration:200,iterations:1});
  }

  // Store buttons
  qsa('.store-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      const costs = { food: 10, toy: 8, water: 6 };
      const effect = { food: 'hunger', toy: 'boredom', water: 'thirst' }[type];
      const p = state.profiles[state.activeNick];
      if (!p) return;
      const cost = costs[type];
      if (p.tissues < cost) return alert('Za mało chusteczek!');
      addTissues(-cost);
      p[effect] = clamp(p[effect] - 15, 0, MAX_STAT);
      qs('#stat-hunger').textContent = p.hunger;
      qs('#stat-boredom').textContent = p.boredom;
      qs('#stat-thirst').textContent = p.thirst;
      saveAll(); pulse(btn);
    });
  });

  // Game loop
  setInterval(() => {
    const nick = state.activeNick;
    if (!nick) return;
    const p = state.profiles[nick];
    // stats grow
    p.hunger = clamp(p.hunger + STATS_GROW, 0, MAX_STAT);
    p.boredom = clamp(p.boredom + STATS_GROW, 0, MAX_STAT);
    p.thirst = clamp(p.thirst + STATS_GROW, 0, MAX_STAT);
    qs('#stat-hunger').textContent = p.hunger;
    qs('#stat-boredom').textContent = p.boredom;
    qs('#stat-thirst').textContent = p.thirst;
    // risk decays
    setRisk(p.risk - RISK_DECAY);
    // watcher logic
    if (!watcherActive) {
      if (watcherCooldown <= 0) {
        // chance to spawn
        if (Math.random() < 0.2) {
          toggleWatcher(true);
          watcherTimer = WATCHER_DURATION;
          watcherCooldown = randInt(WATCHER_MIN, WATCHER_MAX);
        } else {
          watcherCooldown = randInt(1, 3);
        }
      } else watcherCooldown--;
    } else {
      watcherTimer--;
      if (watcherTimer <= 0) toggleWatcher(false);
    }
    p.lastSeen = Date.now();
    saveAll();
  }, 1000);

  function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a}

  function toggleWatcher(on){
    watcherActive = on;
    qs('#watcher').style.opacity = on ? 1 : 0;
    qs('#watcher-pill').hidden = !on;
  }

  // Init
  qs('#btn-home').addEventListener('click', () => show(screenHome));
  loadAll();
  show(screenHome);
})();