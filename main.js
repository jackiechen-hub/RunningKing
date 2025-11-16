/* main.js - 主畫面 (老師) */
const firebaseConfig = {
  apiKey: "AIzaSyARfYoqBOdZZ2MChzJF_BC7LoW_comJfec",
  authDomain: "runningking.firebaseapp.com",
  databaseURL: "https://runningking-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "runningking",
  storageBucket: "runningking.firebasestorage.app",
  messagingSenderId: "429230545810",
  appId: "1:429230545810:web:084fb018b07812e8773f4b",
  measurementId: "G-8GLV17ZXD8"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* DOM */
const playerListEl = document.getElementById('playerList');
const playerCountEl = document.getElementById('playerCount');
const btnEndRegister = document.getElementById('btnEndRegister');
const waitingSection = document.getElementById('waiting');
const configSection = document.getElementById('config');
const btnMinus = document.getElementById('btnMinus');
const btnPlus = document.getElementById('btnPlus');
const timeDisplay = document.getElementById('timeDisplay');
const btnStart = document.getElementById('btnStart');
const countdownSection = document.getElementById('countdown');
const bigCount = document.getElementById('bigCount');
const runningSection = document.getElementById('running');
const ranksEl = document.getElementById('ranks');
const final10El = document.getElementById('final10');
const finalCountEl = document.getElementById('finalCount');
const timesupSection = document.getElementById('timesup');
const btnShowResults = document.getElementById('btnShowResults');
const resultSection = document.getElementById('result');
const podiumEl = document.getElementById('podium');
const btnReset = document.getElementById('btnReset');

let gameTimeMinutes = 3;
let teacherTimerInterval = null;

timeDisplay.innerText = "03:00";

/* listen players */
db.ref('players').on('value', snapshot => {
  const data = snapshot.val() || {};
  const keys = Object.keys(data);
  playerCountEl.innerText = keys.length;
  playerListEl.innerHTML = '';

  // show each player card with name and real-time steps
  keys.forEach(k => {
    const p = data[k];
    const card = document.createElement('div');
    card.className = 'playerCard';
    card.innerHTML = `<div style="font-weight:700">${escapeHtml(p.name)}</div><div style="font-size:18px;margin-top:6px">步數：<span class="steps">${p.steps||0}</span></div>`;
    playerListEl.appendChild(card);
  });

  // if running, also update ranks panel
  db.ref('game/status').get().then(snap => {
    if (snap.val() === 'running') renderRanks(data);
  });
});

/* UI actions */
btnEndRegister.addEventListener('click', () => {
  waitingSection.classList.add('hidden');
  configSection.classList.remove('hidden');
  db.ref('game').set({ status: 'config', totalTime: gameTimeMinutes * 60 });
});

btnMinus.addEventListener('click', () => { if (gameTimeMinutes > 1) gameTimeMinutes--; updateTime(); });
btnPlus.addEventListener('click', () => { gameTimeMinutes++; updateTime(); });
function updateTime() { timeDisplay.innerText = String(gameTimeMinutes).padStart(2,'0') + ":00"; db.ref('game/totalTime').set(gameTimeMinutes*60); }

btnStart.addEventListener('click', () => {
  configSection.classList.add('hidden');
  countdownSection.classList.remove('hidden');
  let c = 3;
  db.ref('game').update({ status: 'countdown', countdown: c, totalTime: gameTimeMinutes*60 });
  bigCount.innerText = c;
  const ci = setInterval(() => {
    c--;
    if (c >= 0) {
      bigCount.innerText = (c===0? 'START': c);
      db.ref('game/countdown').set(c);
    }
    if (c < 0) {
      clearInterval(ci);
      db.ref('game').update({ status: 'running', startTime: Date.now() });
      countdownSection.classList.add('hidden');
      runningSection.classList.remove('hidden');
      startTeacherTimer();
    }
  }, 1000);
});

function startTeacherTimer() {
  teacherTimerInterval = setInterval(async () => {
    const gSnap = await db.ref('game').get();
    const g = gSnap.val() || {};
    const total = g.totalTime || (gameTimeMinutes*60);
    const startTs = g.startTime || Date.now();
    const elapsed = Math.floor((Date.now() - startTs)/1000);
    const remaining = total - elapsed;
    if (remaining <= 10 && remaining >= 0) {
      ranksEl.style.display = 'none';
      final10El.classList.remove('hidden');
      finalCountEl.innerText = remaining;
    }
    if (remaining < 0) {
      clearInterval(teacherTimerInterval);
      db.ref('game/status').set('finished');
      runningSection.classList.add('hidden');
      timesupSection.classList.remove('hidden');
    }
  }, 300);
}

btnShowResults.addEventListener('click', async () => {
  timesupSection.classList.add('hidden');
  resultSection.classList.remove('hidden');
  const snap = await db.ref('players').get();
  const players = snap.val() || {};
  const arr = Object.values(players).sort((a,b)=> (b.steps||0) - (a.steps||0));
  podiumEl.innerHTML = '';
  for (let i=0;i<Math.min(3,arr.length);i++){
    const p = arr[i];
    const el = document.createElement('div');
    el.innerHTML = `<div style="font-size:18px">第 ${i+1} 名：${escapeHtml(p.name)} (${p.steps||0} 步)</div>`;
    podiumEl.appendChild(el);
  }
});

btnReset.addEventListener('click', async () => {
  await db.ref('players').remove();
  await db.ref('game').set({ status:'waiting', totalTime:3*60, countdown:0 });
  resultSection.classList.add('hidden');
  waitingSection.classList.remove('hidden');
  playerListEl.innerHTML = '';
  playerCountEl.innerText = '0';
  gameTimeMinutes = 3;
  updateTime();
});

function renderRanks(playersObj) {
  const arr = Object.values(playersObj).map(p=>({name:p.name,steps:p.steps||0})).sort((a,b)=>b.steps-a.steps);
  ranksEl.innerHTML = '';
  arr.forEach(p=>{
    const d = document.createElement('div');
    d.className = 'playerCard';
    d.innerHTML = `<div style="font-weight:700">${escapeHtml(p.name)}</div><div style="margin-top:6px">步數：${p.steps}</div>`;
    ranksEl.appendChild(d);
  });
}

function escapeHtml(s){ if(!s) return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

/* init game state */
db.ref('game').get().then(snap=>{
  if (!snap.exists()) db.ref('game').set({ status:'waiting', totalTime:3*60, countdown:0 });
});
