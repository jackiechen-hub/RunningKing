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

// 修正：補上缺失的 screens 變數
const screens = document.querySelectorAll('section.screen');

let gameTimeMinutes = 3;
let teacherTimerInterval = null;

timeDisplay.innerText = "03:00";

// 修正：補上缺失的 showScreen 函式
function showScreen(screenId) {
    screens.forEach(s => s.classList.add('hidden'));
    // 移除 active class，改用 hidden
    document.querySelectorAll('.screen.active').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.remove('hidden');
}

/* 監聽 遊戲狀態 */
db.ref('game/status').on('value', snapshot => {
    const status = snapshot.val();
    switch (status) {
        case 'waiting':
            showScreen('waiting');
            break;
        case 'config':
            showScreen('config');
            break;
        case 'countdown':
            showScreen('countdown');
            break;
        case 'running':
            showScreen('running');
            break;
        case 'finished':
            showScreen('timesup');
            break;
        default:
            showScreen('waiting');
    }
});


/* 監聽 players */
db.ref('players').on('value', snapshot => {
  const data = snapshot.val() || {};
  const keys = Object.keys(data);
  playerCountEl.innerText = keys.length;
  playerListEl.innerHTML = '';
  
  const allPlayers = Object.values(data);
  
  // 1. 更新等待列表 (永遠更新)
  allPlayers.forEach(p => {
    const card = document.createElement('div');
    card.className = 'playerCard';
    card.innerHTML = `<div style="font-weight:700">${escapeHtml(p.name)}</div>`;
    playerListEl.appendChild(card);
  });

  // 2. 更新比賽排名 (永遠更新)
  renderRanks(allPlayers);
});

/* UI actions */
btnEndRegister.addEventListener('click', () => {
  // 需求 #2：報名結束，不開放選手報名
  db.ref('game').set({ status: 'config', totalTime: gameTimeMinutes * 60 });
});

btnMinus.addEventListener('click', () => { if (gameTimeMinutes > 1) gameTimeMinutes--; updateTime(); });
btnPlus.addEventListener('click', () => { gameTimeMinutes++; updateTime(); });
function updateTime() { timeDisplay.innerText = String(gameTimeMinutes).padStart(2,'0') + ":00"; db.ref('game/totalTime').set(gameTimeMinutes*60); }

btnStart.addEventListener('click', () => {
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
      startTeacherTimer();
    }
  }, 1000);
});

function startTeacherTimer() {
  if (teacherTimerInterval) clearInterval(teacherTimerInterval);
    
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
    }
  }, 300);
}

btnShowResults.addEventListener('click', async () => {
  showScreen('result');
  const snap = await db.ref('players').get();
  const players = snap.val() || {};
  const arr = Object.values(players).sort((a,b)=> (b.steps||0) - (a.steps||0));
  podiumEl.innerHTML = '';
  for (let i=0;i<Math.min(3,arr.length);i++){
    const p = arr[i];
    const el = document.createElement('div');
    el.innerHTML = `<div style="font-size:1.5em; margin: 10px 0;">第 ${i+1} 名：${escapeHtml(p.name)} (${p.steps||0} 步)</div>`;
    podiumEl.appendChild(el);
  }
});

btnReset.addEventListener('click', async () => {
    await resetGameData(); // 呼叫重置函式
});

// 修正：新增重置函式
async function resetGameData() {
  await db.ref('players').remove();
  await db.ref('game').set({ status:'waiting', totalTime:3*60, countdown:0 });
  
  // 重設 UI
  playerListEl.innerHTML = '';
  playerCountEl.innerText = '0';
  gameTimeMinutes = 3;
  updateTime();
  if (teacherTimerInterval) clearInterval(teacherTimerInterval);
  ranksEl.style.display = 'flex';
  final10El.classList.add('hidden');
}


// 需求 #3：修正比賽時的選手資訊顯示
function renderRanks(allPlayers) {
  const arr = allPlayers.map(p=>({name:p.name,steps:p.steps||0})).sort((a,b)=>b.steps-a.steps);
  ranksEl.innerHTML = '';
  arr.forEach((p, index)=>{
    const d = document.createElement('div');
    d.className = 'playerCard';
    // 修正：使用 span class="steps" 來顯示步數
    d.innerHTML = `<span class="steps">${p.steps}</span><div>${index + 1}. ${escapeHtml(p.name)}</div>`;
    ranksEl.appendChild(d);
  });
}

function escapeHtml(s){ if(!s) return ''; 
  return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); 
}

/* 需求 #1：重新整理時清除資料 */
async function initialize() {
    await resetGameData();
    showScreen('waiting'); // 確保顯示正確的初始畫面
}
initialize();