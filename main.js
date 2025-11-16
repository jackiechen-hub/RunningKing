/* main.js - 主畫面 (老師端) */
/* 依照 1080x1920 絕對座標顯示元件 */
/* 需要 window.DB (firebase) */

const db = window.DB;

// DOM elements
const stage = document.getElementById('stage');
const playerGrid = document.getElementById('playerGrid');
const playerCount = document.getElementById('playerCount');
const btnClose = document.getElementById('btnClose');
const uiWait = document.getElementById('ui-wait');
const uiConfig = document.getElementById('ui-config');
const uiCountdown = document.getElementById('ui-countdown');
const uiRunning = document.getElementById('ui-running');
const uiTimesup = document.getElementById('ui-timesup');
const uiResult = document.getElementById('ui-result');

const btnMinus = document.getElementById('btnMinus');
const btnPlus = document.getElementById('btnPlus');
const timeCenter = document.getElementById('timeCenter') || document.getElementById('timeDisplay');
const btnStart = document.getElementById('btnStart');
const bigCount = document.getElementById('bigCount');

const ranksPanel = document.getElementById('ranksPanel');
const finalCount = document.getElementById('finalCount');
const btnScore = document.getElementById('btnScore');
const podium = document.getElementById('podium');
const btnAgain = document.getElementById('btnAgain');

let gameState = { status: 'waiting', totalTime: 180, countdown: 0, startTime: null };
let gameTimeMinutes = 3;
timeCenter && (timeCenter.innerText = "03:00");

// 設定 stage 尺寸與 scale（以 1080x1920 為基準）
(function setupScale(){
  const wrap = document.getElementById('stageWrap');
  function applyScale(){
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw/1080, vh/1920);
    wrap.style.transform = `scale(${scale})`;
    wrap.style.width = '1080px';
    wrap.style.height = '1920px';
  }
  window.addEventListener('resize', applyScale);
  applyScale();
})();

/* 排列玩家卡片（從 (90,360) 起，間距） */
const START_X = 90, START_Y = 360;
const CARD_W = 300, CARD_H = 90, GAP_X = 24, GAP_Y = 18;
function renderPlayerGrid(playersObj){
  // convert playersObj to array preserving keys
  const arr = Object.keys(playersObj || {}).map(k => ({ id:k, name: playersObj[k].name, steps: playersObj[k].steps || 0 }));
  // show count
  playerCount.innerText = arr.length;

  // create sorted by joined? Here use name ascending for display in waiting
  arr.sort((a,b)=> b.steps - a.steps); // for waiting, also sort by steps just to show
  // remove all children, we'll absolute-position them
  playerGrid.innerHTML = '';
  playerGrid.style.position = 'absolute';
  playerGrid.style.left = START_X + 'px';
  playerGrid.style.top = START_Y + 'px';
  playerGrid.style.width = '900px';
  playerGrid.style.height = '1000px';

  arr.forEach((p, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = col * (CARD_W + GAP_X);
    const y = row * (CARD_H + GAP_Y);
    const card = document.createElement('div');
    card.className = 'playerCard';
    card.style.position = 'absolute';
    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.style.width = CARD_W + 'px';
    card.style.height = CARD_H + 'px';
    card.dataset.id = p.id;
    card.innerHTML = `<div class="pname">${escapeHtml(p.name)}</div><div class="psteps">步數：<span class="stepsVal">${p.steps}</span></div>`;
    playerGrid.appendChild(card);
  });
}

/* 即時監聽 players */
const playersRef = db.ref('players');
playersRef.on('value', snap => {
  const data = snap.val() || {};
  // In waiting/config phases show grid
  renderPlayerGrid(data);
  // If running show ranks
  if (gameState.status === 'running') {
    updateRanksLive(data);
  }
});

/* game node 監聽 */
const gameRef = db.ref('game');
gameRef.on('value', snap => {
  const g = snap.val() || {};
  gameState = Object.assign(gameState, g);
  handleGameStateChange(gameState);
});

/* UI interactions */
btnClose.addEventListener('click', () => {
  uiWait.classList.add('hidden');
  uiConfig.classList.remove('hidden');
  db.ref('game').set({ status: 'config', countdown:0, totalTime: gameTimeMinutes*60 });
});

btnMinus && btnMinus.addEventListener('click', ()=>{
  if (gameTimeMinutes>1) gameTimeMinutes--;
  updateTimeDisplay();
});
btnPlus && btnPlus.addEventListener('click', ()=>{ gameTimeMinutes++; updateTimeDisplay(); });
function updateTimeDisplay(){ const mm = String(gameTimeMinutes).padStart(2,'0'); timeCenter.innerText = mm + ':00'; db.ref('game/totalTime').set(gameTimeMinutes*60); }

btnStart && btnStart.addEventListener('click', ()=>{
  uiConfig.classList.add('hidden');
  uiCountdown.classList.remove('hidden');
  let c = 3;
  db.ref('game').update({ status:'countdown', countdown:c, totalTime: gameTimeMinutes*60 });
  bigCount.innerText = c;
  const ci = setInterval(()=>{
    c--;
    if (c>=0){
      bigCount.innerText = (c===0? 'START' : c);
      db.ref('game/countdown').set(c);
    }
    if (c<0){
      clearInterval(ci);
      const startTs = Date.now();
      db.ref('game').update({ status:'running', startTime: startTs });
      uiCountdown.classList.add('hidden');
      uiRunning.classList.remove('hidden');
      startTeacherTimer();
    }
  }, 1000);
});

/* teacher timer: check remaining time and handle final10/timesup */
let teacherTimer = null;
function startTeacherTimer(){
  if (teacherTimer) clearInterval(teacherTimer);
  teacherTimer = setInterval(async ()=>{
    const gSnap = await db.ref('game').get();
    const g = gSnap.val() || {};
    const total = g.totalTime || gameTimeMinutes*60;
    const startTs = g.startTime || Date.now();
    const elapsed = Math.floor((Date.now()-startTs)/1000);
    const remaining = total - elapsed;
    if (remaining <= 10 && remaining >= 0){
      // show only final 10
      ranksPanel.style.display = 'none';
      document.getElementById('final10').classList.remove('hidden');
      finalCount.innerText = remaining;
    }
    if (remaining < 0){
      clearInterval(teacherTimer);
      db.ref('game/status').set('finished');
      uiRunning.classList.add('hidden');
      uiTimesup.classList.remove('hidden');
    }
  }, 300);
}

/* When times up and show results */
btnScore && btnScore.addEventListener('click', async ()=>{
  uiTimesup.classList.add('hidden');
  uiResult.classList.remove('hidden');
  // get top 3
  const snap = await db.ref('players').get();
  const players = snap.val() || {};
  const arr = Object.values(players).sort((a,b)=> (b.steps||0) - (a.steps||0));
  podium.innerHTML = '';
  for (let i = 0; i < Math.min(3, arr.length); i++){
    const p = arr[i];
    const el = document.createElement('div');
    el.className = 'podiumRow';
    el.innerHTML = `<div class="rank">第 ${i+1} 名</div><div class="pName">${escapeHtml(p.name)}</div><div class="pSteps">${p.steps||0} 步</div>`;
    podium.appendChild(el);
  }
});

/* 再次開始 / reset */
btnAgain && btnAgain.addEventListener('click', async ()=>{
  await db.ref('players').remove();
  await db.ref('game').set({ status:'waiting', countdown:0, totalTime:180, startTime:null });
  uiResult.classList.add('hidden');
  uiWait.classList.remove('hidden');
});

/* RANKS live update + FLIP based swap animation */
let lastOrder = [];
function updateRanksLive(playersObj){
  const arr = Object.keys(playersObj || {}).map(k=> ({ id:k, name: playersObj[k].name, steps: playersObj[k].steps || 0 }));
  arr.sort((a,b)=> b.steps - a.steps);
  // FLIP technique
  const beforeRects = {};
  Array.from(ranksPanel.children).forEach(child => {
    beforeRects[child.dataset.id] = child.getBoundingClientRect();
  });

  // build new DOM (keep same elements if exist)
  const newChildren = [];
  arr.forEach((p, idx) => {
    let el = ranksPanel.querySelector(`[data-id="${p.id}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'playerCard';
      el.dataset.id = p.id;
      el.innerHTML = `<div class="pname">${escapeHtml(p.name)}</div><div class="psteps">步數：<span class="stepsVal">${p.steps}</span></div>`;
    } else {
      el.querySelector('.stepsVal').innerText = p.steps;
    }
    newChildren.push(el);
  });

  // replace children
  ranksPanel.innerHTML = '';
  newChildren.forEach(el => ranksPanel.appendChild(el));

  // animate from previous positions
  Array.from(ranksPanel.children).forEach(el=>{
    const id = el.dataset.id;
    const before = beforeRects[id];
    const after = el.getBoundingClientRect();
    if (before){
      const dy = before.top - after.top;
      if (dy !== 0){
        el.style.transition = 'none';
        el.style.transform = `translateY(${dy}px)`;
        requestAnimationFrame(()=>{
          el.style.transition = 'transform 400ms cubic-bezier(.2,.9,.2,1)';
          el.style.transform = 'translateY(0)';
        });
      }
    } 
  });
}

/* utility */
function escapeHtml(s){ if(!s) return ''; return s.toString().replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

/* init DB game state */
db.ref('game').get().then(snap=>{
  if (!snap.exists()){
    db.ref('game').set({ status:'waiting', countdown:0, totalTime:180, startTime:null });
  }
});
