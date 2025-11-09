(() => {
// ====== STATE & STORAGE ======
const STORAGE = 'leonek_mobile_profiles_v1';
const SCORES  = 'leonek_mobile_scores_v1';
const state = {
  active: null, // nick
  profiles: {}, // nick -> {vital:100, score:0, loc:'dom', chain:false, createdAt}
  scores: []    // [{nick, score, when}]
};

function load(){
  try{ state.profiles = JSON.parse(localStorage.getItem(STORAGE)||'{}'); }catch{}
  try{ state.scores = JSON.parse(localStorage.getItem(SCORES)||'[]'); }catch{}
}
function save(){
  localStorage.setItem(STORAGE, JSON.stringify(state.profiles));
  localStorage.setItem(SCORES, JSON.stringify(state.scores));
}

// ====== DOM ======
const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
const home = $('#home');
const game = $('#game');
const profilesEl = $('#profiles');
const scoreboardEl = $('#scoreboard');
const nickInput = $('#nick');
const createBtn = $('#create');
const backBtn = $('#back');
const hudNick = $('#hudNick');
const hudScore = $('#hudScore');
const hudVital = $('#hudVital');
const chainWrap = $('#chainWrap');
const chainChk = $('#chain');
const locBtns = $$('.loc-btn');

const canvas = $('#stage');
const ctx = canvas.getContext('2d', { alpha: false });
const W = () => canvas.width;
const H = () => canvas.height;

// ====== PROFILES ======
function ensureProfile(nick){
  if(!state.profiles[nick]){
    state.profiles[nick] = {
      vital: 100,
      score: 0,
      loc: 'dom',
      chain: false,
      createdAt: Date.now()
    };
  }
  save();
}
function renderProfiles(){
  profilesEl.innerHTML = '';
  const nicks = Object.keys(state.profiles);
  if(!nicks.length){
    const p = document.createElement('div');
    p.className = 'hint';
    p.textContent = 'Brak profili. Dodaj nowy nick.';
    profilesEl.appendChild(p);
    return;
  }
  nicks.forEach(n => {
    const b = document.createElement('button');
    const p = state.profiles[n];
    b.innerHTML = `<strong>${n}</strong><span class="small">🧻 ${p.score} • ❤️ ${p.vital}</span>`;
    b.addEventListener('click', () => startGame(n));
    profilesEl.appendChild(b);
  });
}
function renderScoreboard(){
  const arr = [...state.scores].sort((a,b)=>b.score-a.score).slice(0,20);
  scoreboardEl.innerHTML = '';
  if(!arr.length){
    scoreboardEl.innerHTML = '<p class="hint">Brak wyników. Zagraj pierwszą rundę!</p>';
    return;
  }
  arr.forEach((s,i)=>{
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `<span>#${i+1} <strong>${s.nick}</strong></span><span>🧻 ${s.score}</span>`;
    scoreboardEl.appendChild(row);
  });
}

// ====== GAME ======
let dog = { x: 160, y: 480, r: 26, vx:0 };
let tissues = [];
let lastSpawn = 0;
let spawnEvery = 700; // ms
let lastTick = 0;
let running = false;

function startGame(nick){
  ensureProfile(nick);
  state.active = nick;
  const p = state.profiles[nick];
  hudNick.textContent = nick;
  hudScore.textContent = p.score;
  hudVital.textContent = p.vital;
  chainWrap.hidden = (p.loc !== 'buda');
  chainChk.checked = p.chain;
  selectLoc(p.loc, true);
  show(game);
  running = true;
  dog.x = W()/2; dog.y = H()-80; dog.vx = 0;
  tissues = [];
  lastSpawn = performance.now();
  lastTick = performance.now();
  loop();
}

function endGame(reason=''){
  running = false;
  const nick = state.active;
  if(!nick) return;
  const p = state.profiles[nick];
  state.scores.push({ nick, score: p.score, when: Date.now() });
  delete state.profiles[nick];
  save();
  alert('Koniec gry ' + (reason?`(${reason})`:'') + '. Profil został usunięty. Twój wynik: ' + p.score);
  state.active = null;
  show(home);
  renderProfiles();
  renderScoreboard();
}

function show(el){
  $$('.screen').forEach(s=>s.classList.remove('active'));
  el.classList.add('active');
}

backBtn.addEventListener('click', ()=>{
  running = false;
  show(home);
  renderProfiles(); renderScoreboard();
});

createBtn.addEventListener('click', ()=>{
  const nick = nickInput.value.trim();
  if(!nick) return;
  if(nick.length>20) return alert('Nick max 20 znaków.');
  if(state.profiles[nick]) return alert('Taki nick już istnieje.');
  ensureProfile(nick);
  nickInput.value='';
  renderProfiles();
});

locBtns.forEach(b=>{
  b.addEventListener('click', ()=> selectLoc(b.dataset.loc));
});

chainChk.addEventListener('change', ()=>{
  const p = state.profiles[state.active];
  if(!p) return;
  p.chain = chainChk.checked;
  save();
});

function selectLoc(loc, silent=false){
  const p = state.profiles[state.active];
  if(!p) return;
  p.loc = loc;
  chainWrap.hidden = (loc !== 'buda');
  locBtns.forEach(btn=>{
    btn.disabled = (btn.dataset.loc===loc);
  });
  save();
  if(!silent){
    const msg = loc === 'dom' ? 'Leonek czuje się bezpiecznie ❤️'
              : loc === 'buda' ? (p.chain ? 'W budzie na łańcuchu… 😠' : 'Buda — neutralnie.')
              : 'Las — Leonkowi się podoba 🌲';
    toast(msg);
  }
}

function toast(t){
  const tip = $('#tip');
  tip.textContent = t;
  tip.style.opacity = 1;
  setTimeout(()=> tip.style.opacity = 0, 1400);
}

// ====== CANVAS & GAMEPLAY ======
function resizeCanvas(){
  const rect = $('#stageWrap').getBoundingClientRect();
  canvas.width = 360;
  canvas.height = 560;
}
resizeCanvas();
addEventListener('resize', resizeCanvas);

// Touch/Pointer control (horizontal)
let dragging = false;
canvas.addEventListener('pointerdown', e=>{ dragging = true; moveTo(e); });
canvas.addEventListener('pointermove', e=>{ if(dragging) moveTo(e); });
addEventListener('pointerup', ()=> dragging=false);
addEventListener('pointercancel', ()=> dragging=false);
function moveTo(e){
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  dog.x = Math.max(dog.r, Math.min(canvas.width - dog.r, x));
}

// spawn tissues
function spawn(){
  const x = 20 + Math.random()*(W()-40);
  tissues.push({ x, y: -20, r: 14 + Math.random()*8, vy: 90 + Math.random()*90, rot: 0, vr: (Math.random()-.5)*2 });
}

function collide(a,b){
  const dx = a.x - b.x, dy = a.y - b.y;
  const r = a.r + b.r;
  return dx*dx + dy*dy <= r*r;
}

function loop(now){
  if(!running) return;
  requestAnimationFrame(loop);
  const t = now || performance.now();
  const dt = Math.min(50, t - lastTick) / 1000;
  lastTick = t;

  const p = state.profiles[state.active];
  let vitalDecay = 3/60; // per sec baseline
  let spawnRate = 700;
  if(p.loc === 'dom'){ vitalDecay = 2/60; spawnRate = 650; }
  if(p.loc === 'las'){ vitalDecay = 2/60; spawnRate = 600; }
  if(p.loc === 'buda'){ vitalDecay = 3.5/60; spawnRate = 700; if(p.chain) vitalDecay = 6/60; }

  if(t - lastSpawn >= spawnRate){ spawn(); lastSpawn = t; }

  const g = 120;
  tissues.forEach(o => {
    o.vy += g*dt*0.2;
    o.y += o.vy*dt;
    o.rot += o.vr;
  });
  tissues = tissues.filter(o => {
    if(o.y - o.r > H()){
      p.vital = Math.max(0, p.vital - 1);
      return false;
    }
    return true;
  });

  for(let i=tissues.length-1;i>=0;i--){
    if(collide({x:dog.x,y:dog.y,r:dog.r}, tissues[i])){
      tissues.splice(i,1);
      p.score += 1;
    }
  }

  p.vital = Math.max(0, p.vital - vitalDecay*60*dt);
  hudScore.textContent = p.score;
  hudVital.textContent = Math.round(p.vital);

  if(p.vital <= 0){
    save();
    endGame('Leonek odszedł 💔');
    return;
  }

  draw(p);
  save();
}

function draw(p){
  if(p.loc==='dom'){ ctx.fillStyle = '#0b1020'; }
  else if(p.loc==='buda'){ ctx.fillStyle = '#0f0f14'; }
  else { ctx.fillStyle = '#0a1711'; }
  ctx.fillRect(0,0,W(),H());

  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.fillRect(0,H()-60,W(),60);

  tissues.forEach(o=>{
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot*0.05);
    ctx.fillStyle = '#e8f2ff';
    roundRect(ctx, -o.r, -o.r*0.7, o.r*2, o.r*1.4, 6);
    ctx.fill();
    ctx.restore();
  });

  ctx.save();
  ctx.translate(dog.x, dog.y);
  ctx.fillStyle = '#ffd67d';
  roundRect(ctx, -26, -18, 52, 36, 12); ctx.fill();
  ctx.fillStyle = '#ffcc66';
  roundRect(ctx, -18, -36, 32, 26, 10); ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(0,-26,3,0,Math.PI*2); ctx.fill();
  if(p.loc==='buda' && p.chain){
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 14px Nunito';
    ctx.fillText('😠', -6, -46);
    ctx.strokeStyle = '#c0c7d1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20,-30); ctx.lineTo(-40,-50); ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

// ====== INIT ======
load();
renderProfiles();
renderScoreboard();

})();