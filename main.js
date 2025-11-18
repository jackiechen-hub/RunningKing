/* main.js - 主畫面 (老師端) */
const db = window.DB;

/* DOM */
const stageWrap = document.getElementById('stageWrap');
const playerGrid = document.getElementById('playerGrid');
const playerCount = document.getElementById('playerCount');

const uiWait = document.getElementById('ui-wait');
const uiConfig = document.getElementById('ui-config');
const uiCountdown = document.getElementById('ui-countdown');
const uiRunning = document.getElementById('ui-running');
const uiTimesup = document.getElementById('ui-timesup');
const uiResult = document.getElementById('ui-result');

const btnClose = document.getElementById('btnClose');
const btnMinus = document.getElementById('btnMinus');
const btnPlus = document.getElementById('btnPlus');
const timeDisplay = document.getElementById('timeDisplay') || document.getElementById('timeDisplay') || document.getElementById('timeDisplay');
const btnStart = document.getElementById('btnStart');
const bigCount = document.getElementById('bigCount');

const ranksPanel = document.getElementById('ranksPanel');
const finalCount = document.getElementById('finalCount');
const btnScore = document.getElementById('btnScore');
const podium = document.getElementById('podium');
const btnAgain = document.getElementById('btnAgain');

let gameTimeMinutes = 3;

/* scale to center on desktop/mobile */
(function setupScale(){
  function applyScale(){
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw/1080, vh/1920);
    stageWrap.style.transform = `translate(-50%,-50%) scale(${scale})`;
    stageWrap.style.left = '50%';
    stageWrap.style.top = '50%';
    stageWrap.style.position = 'fixed';
  }
  window.addEventListener('resize', applyScale);
  applyScale();
})();

/* 初始化：當重新整理主畫面時，清空 players 與重置 game（符合你的需求） */
(async function initialClear(){
  try {
    await db.ref('players').remove();
    await db.ref('game').set({ status: 'waiting', countdown:0, totalTime: 180, startTime: null });
    console.log('遊戲資料已初始化（players 清空，game 重置）');
  } catch(e){
    console.warn('初始化資料時發生錯誤', e);
  }
})();

/* helper: escape */
function esc(s){ if(!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

/* render waiting player grid - show only name cards, rounded rect */
function renderPlayerGrid(playersObj){
  const arr = Object.keys(playersObj || {}).map(k=>({ id:k, name: playersObj[k].name, steps: playersObj[k].steps||0 }));
  playerCount.innerText = arr.length;
  playerGrid.innerHTML = '';
  // position container at (90,360) via CSS; create cards in rows
  const COLS = 3;
  arr.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'playerCard';
    card.style.position = 'absolute';
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col *  (300 + 24); // CARD_W + GAP_X
    const y = row *  (90 + 18);
    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.dataset.id = p.id;
    card.innerHTML = `<div class="pname">${esc(p.name)}</div>`;
    playerGrid.appendChild(card);
  });
}

/* listen players */
db.ref('players').on('value', snap=>{
  const data = snap.val() || {};
  renderPlayerGrid(data);
  // if running, update ranks
  db.ref('game/status').get().then(snap2=>{
    if (snap2.val() === 'running') updateRanksLive(data);
  });
});

/* listen game node */
db.ref('game').on('value', snap=>{
  const g = snap.val() || {};
  handleGameState(g);
});

/* UI events */
btnClose.addEventListener('click', ()=> {
  uiWait.classList.add('hidden');
  uiConfig.classList.remove('hidden');
  db.ref('game').set({ status: 'config', countdown:0, totalTime: gameTimeMinutes*60, startTime: null });
});

btnMinus && btnMinus.addEventListener('click', ()=>{ if (gameTimeMinutes>1) gameTimeMinutes--; updateTimeDisplay(); });
btnPlus && btnPlus.addEventListener('click', ()=>{ gameTimeMinutes++; updateTimeDisplay(); });
function updateTimeDisplay(){ const mm = String(gameTimeMinutes).padStart(2,'0'); (document.getElementById('timeDisplay')||document.getElementById('timeDisplay')).innerText = mm + ':00'; db.ref('game/totalTime').set(gameTimeMinutes*60); }

btnStart && btnStart.addEventListener('click', ()=>{
  uiConfig.classList.add('hidden');
  uiCountdown.classList.remove('hidden');
  let c = 3;
  db.ref('game').update({ status: 'countdown', countdown: c, totalTime: gameTimeMinutes*60, startTime: null });
  bigCount.innerText = c;
  const ci = setInterval(()=>{
    c--;
    bigCount.innerText = (c===0? 'START': c);
    db.ref('game/countdown').set(c);
    if (c < 0){
      clearInterval(ci);
      const startTs = Date.now();
      db.ref('game').update({ status: 'running', startTime: startTs });
      uiCountdown.classList.add('hidden');
      uiRunning.classList.remove('hidden');
      startTeacherTimer();
    }
  }, 1000);
});

/* teacher timer for final10 & times up */
let teacherTimer = null;
function startTeacherTimer(){
  if (teacherTimer) clearInterval(teacherTimer);
  teacherTimer = setInterval(async ()=>{
    const gSnap = await db.ref('game').get();
    const g = gSnap.val() || {};
    const total = g.totalTime || gameTimeMinutes*60;
    const startTs = g.startTime || Date.now();
    const elapsed = Math.floor((Date.now() - startTs)/1000);
    const remaining = total - elapsed;
    if (remaining <= 10 && remaining >= 0){
      // show final 10
      document.getElementById('ranksPanel').style.display = 'none';
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

/* show podium results when btnScore clicked */
document.getElementById('btnScore').addEventListener('click', async ()=>{
  uiTimesup.classList.add('hidden');
  uiResult.classList.remove('hidden');
  const snap = await db.ref('players').get();
  const arr = Object.values(snap.val() || {}).sort((a,b)=> (b.steps||0)-(a.steps||0));
  podium.innerHTML = '';
  for (let i = 0; i < Math.min(3, arr.length); i++){
    const p = arr[i];
    const div = document.createElement('div');
    div.className = 'podiumRow';
    div.innerHTML = `<div class="rank">第 ${i+1} 名</div><div class="pName">${esc(p.name)}</div><div class="pSteps">${p.steps||0} 步</div>`;
    podium.appendChild(div);
  }
});

/* reset */
btnAgain.addEventListener('click', async ()=>{
  await db.ref('players').remove();
  await db.ref('game').set({ status:'waiting', countdown:0, totalTime:180, startTime:null });
  uiResult.classList.add('hidden');
  uiWait.classList.remove('hidden');
});

/* Ranks live update with FLIP-style sliding */
function updateRanksLive(playersObj){
  const arr = Object.keys(playersObj || {}).map(k=>({ id:k, name:playersObj[k].name, steps:playersObj[k].steps||0 })).sort((a,b)=> b.steps - a.steps);
  ranksPanel.innerHTML = '';
  arr.forEach((p, idx) => {
    const el = document.createElement('div');
    el.className = 'playerCard';
    el.dataset.id = p.id;
    el.style.position = 'relative';
    el.style.marginBottom = '12px';
    el.innerHTML = `<div class="pname">${esc(p.name)}</div><div class="psteps">步數：${p.steps}</div>`;
    ranksPanel.appendChild(el);
  });
}

/* handle game state updates to show/hide screens */
function handleGameState(g){
  const s = g.status || 'waiting';
  if (s === 'waiting' || s === 'config'){
    uiWait.classList.remove('hidden');
    uiConfig.classList.add('hidden');
    uiCountdown.classList.add('hidden');
    uiRunning.classList.add('hidden');
    uiTimesup.classList.add('hidden');
    uiResult.classList.add('hidden');
  } else if (s === 'countdown'){
    uiCountdown.classList.remove('hidden');
    uiWait.classList.add('hidden');
    uiConfig.classList.add('hidden');
    bigCount.innerText = (g.countdown>0?g.countdown:'START');
  } else if (s === 'running'){
    uiRunning.classList.remove('hidden');
    uiCountdown.classList.add('hidden');
    uiWait.classList.add('hidden');
  } else if (s === 'finished' || s === 'ending'){
    uiRunning.classList.add('hidden');
    uiTimesup.classList.remove('hidden');
  }
}
