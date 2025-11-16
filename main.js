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

// 修正：確保所有畫面都正確被選取
const screens = document.querySelectorAll('section.screen');
// 顯示特定畫面的輔助函式
function showScreen(screenId) {
    screens.forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
    // 'active' class 在我們的 CSS 中不是用來顯示/隱藏的，所以我們用 'hidden'
}


timeDisplay.innerText = "03:00";

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

  // [cite: 3300] show each player card with name and real-time steps
  keys.forEach(k => {
    const p = data[k];
    const card = document.createElement('div');
    card.className = 'playerCard';
    // 修正：使用 span class="steps" 來顯示步數 [cite: 3300]
    card.innerHTML = `<span class="steps">${p.steps||0}</span><div style="font-weight:700">${escapeHtml(p.name)}</div>`;
    playerListEl.appendChild(card);
  });

  // if running, also update ranks panel
  db.ref('game/status').get().then(snap => {
    if (snap.val() === 'running') renderRanks(data);
  });
});

/* UI actions */
btnEndRegister.addEventListener('click', () => {
  // [cite: 3302]
  db.ref('game').set({ status: 'config', totalTime: gameTimeMinutes * 60 });
});

btnMinus.addEventListener('click', () => { if (gameTimeMinutes > 1) gameTimeMinutes--; updateTime(); });
btnPlus.addEventListener('click', () => { gameTimeMinutes++; updateTime(); });
function updateTime() { timeDisplay.innerText = String(gameTimeMinutes).padStart(2,'0') + ":00"; db.ref('game/totalTime').set(gameTimeMinutes*60); } [cite: 3303]

btnStart.addEventListener('click', () => {
  let c = 3;
  db.ref('game').update({ status: 'countdown', countdown: c, totalTime: gameTimeMinutes*60 }); [cite: 3304]
  bigCount.innerText = c;
  const ci = setInterval(() => {
    c--;
    if (c >= 0) {
      bigCount.innerText = (c===0? 'START': c);
      db.ref('game/countdown').set(c);
    }
    if (c < 0) {
      clearInterval(ci);
      db.ref('game').update({ status: 'running', startTime: Date.now() }); [cite: 3304]
      startTeacherTimer();
    }
  }, 1000);
});

function startTeacherTimer() {
  // 修正：清除舊的計時器 (如果存在)
  if (teacherTimerInterval) clearInterval(teacherTimerInterval);
    
  teacherTimerInterval = setInterval(async () => {
    const gSnap = await db.ref('game').get();
    const g = gSnap.val() || {};
    const total = g.totalTime || (gameTimeMinutes*60);
    const startTs = g.startTime || Date.now();
    const elapsed = Math.floor((Date.now() - startTs)/1000);
    const remaining = total - elapsed;
    
    // [cite: 3308] 剩下 10 秒
    if (remaining <= 10 && remaining >= 0) {
      ranksEl.style.display = 'none'; // 隱藏排名
      final10El.classList.remove('hidden');
      finalCountEl.innerText = remaining;
    }
    
    // [cite: 3309] 時間到
    if (remaining < 0) {
      clearInterval(teacherTimerInterval);
      db.ref('game/status').set('finished');
    }
  }, 300);
}

btnShowResults.addEventListener('click', async () => {
  showScreen('result'); // [cite: 3310]
  const snap = await db.ref('players').get();
  const players = snap.val() || {};
  const arr = Object.values(players).sort((a,b)=> (b.steps||0) - (a.steps||0));
  podiumEl.innerHTML = '';
  // 顯示前三名 [cite: 3310]
  for (let i=0;i<Math.min(3,arr.length);i++){
    const p = arr[i];
    const el = document.createElement('div');
    // 修正：顯示名次、名稱、步數
    el.innerHTML = `<div style="font-size:1.5em; margin: 10px 0;">第 ${i+1} 名：${escapeHtml(p.name)} (${p.steps||0} 步)</div>`;
    podiumEl.appendChild(el);
  }
});

btnReset.addEventListener('click', async () => {
  await db.ref('players').remove();
  await db.ref('game').set({ status:'waiting', totalTime:3*60, countdown:0 }); [cite: 3311]
  
  // 重設 UI
  playerListEl.innerHTML = '';
  playerCountEl.innerText = '0';
  gameTimeMinutes = 3;
  updateTime();
  // 修正：確保計時器停止
  if (teacherTimerInterval) clearInterval(teacherTimerInterval);
  // 修正：還原跑步畫面的排名顯示
  ranksEl.style.display = 'flex';
  final10El.classList.add('hidden');
});

//  比賽中渲染排名
function renderRanks(playersObj) {
  const arr = Object.values(playersObj).map(p=>({name:p.name,steps:p.steps||0})).sort((a,b)=>b.steps-a.steps);
  ranksEl.innerHTML = '';
  arr.forEach(p=>{
    const d = document.createElement('div');
    d.className = 'playerCard';
    // 修正：使用 span class="steps" 來顯示步數 
    d.innerHTML = `<span class="steps">${p.steps}</span><div style="font-weight:700">${escapeHtml(p.name)}</div>`;
    ranksEl.appendChild(d);
  });
}

function escapeHtml(s){ if(!s) return ''; 
  // 修正：拼寫錯誤 replaceAll [cite: 3314]
  return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); 
}

/* init game state */
db.ref('game').get().then(snap=>{
  if (!snap.exists()) {
    db.ref('game').set({ status:'waiting', totalTime:3*60, countdown:0 }); [cite: 3314]
  } else {
    // 如果重整時遊戲已在進行，強制重設
    if(snap.val().status !== 'waiting') {
        btnReset.click(); // 觸發重設
    }
  }
});