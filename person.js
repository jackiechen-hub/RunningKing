/* person.js - 參賽者端 */
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

const nameInput = document.getElementById('nameInput');
const btnRegister = document.getElementById('btnRegister');
const regMsg = document.getElementById('regMsg');
const registerSection = document.getElementById('register');
const gameSection = document.getElementById('game');
const waitText = document.getElementById('waitText');
const runArea = document.getElementById('runArea');
const scoreEl = document.getElementById('score');
const scoreBox = document.getElementById('scoreBox'); // 抓取分數框
const endSection = document.getElementById('end');
const finalScoreEl = document.getElementById('finalScore');
const btnBack = document.getElementById('btnBack');

// 修正：補上缺失的 screens 變數
const screens = document.querySelectorAll('section.screen');

let playerKey = null;
let steps = 0;
let runningEnabled = false;

// 修正：補上缺失的 showScreen 函式
function showScreen(screenId) {
    screens.forEach(s => s.classList.add('hidden'));
    // 移除 active class，改用 hidden
    document.querySelectorAll('.screen.active').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.remove('hidden');
}


btnRegister.addEventListener('click', async () => {
  const raw = nameInput.value.trim();
  if (!raw) { regMsg.innerText = '名稱不可空白'; return; }
  
  btnRegister.disabled = true; // 鎖定按鈕
  regMsg.innerText = '檢查報名狀態...';
  
  // 需求 #2：檢查是否已結束報名
  const gameStatusSnap = await db.ref('game/status').get();
  if (gameStatusSnap.val() !== 'waiting') {
      regMsg.innerText = '報名已結束';
      btnRegister.disabled = false;
      return;
  }
  
  const normalized = raw.toLowerCase(); // 不分大小寫
  const safeKey = sanitizeKey(normalized);

  const snap = await db.ref('players/' + safeKey).get();
  if (snap.exists()) {
    regMsg.innerText = '選手名稱重複';
    btnRegister.disabled = false; // 解鎖按鈕
    return;
  }

  // 報名成功
  await db.ref('players/' + safeKey).set({ name: raw, steps: 0, finished:false, joinedAt: Date.now() });
  playerKey = safeKey;
  steps = 0;
  
  // 需求 #1：顯示預備跑步畫面
  showScreen('game'); 

  // 監聽遊戲狀態
  db.ref('game').on('value', s => {
    const g = s.val() || {};
    
    if (g.status === 'countdown') {
      waitText.innerText = g.countdown > 0 ? g.countdown : 'START';
      waitText.style.display = 'block';
      scoreBox.style.display = 'none'; // 隱藏步數
      runningEnabled = false;
    } else if (g.status === 'running') {
      waitText.style.display = 'none';
      scoreBox.style.display = 'block'; // 顯示步數
      runningEnabled = true;
    } else if (g.status === 'finished') {
      runningEnabled = false;
      showScreen('end');
      finalScoreEl.innerText = steps;
    } else {
      // 'waiting' or 'config'
      waitText.innerText = 'WAIT';
      waitText.style.display = 'block';
      scoreBox.style.display = 'none'; // 隱藏步數
      runningEnabled = false;
    }
  });
});

/* prevent page scrolling */
document.documentElement.style.overflow = 'hidden';
document.body.style.overflow = 'hidden';

/* swipe down detection */
let touchStartY = 0;
// 修正：我們應該在整個遊戲畫面 (gameSection) 偵聽滑動
gameSection.addEventListener('touchstart', e => { 
    touchStartY = e.touches[0].clientY; 
}, { passive:true });

gameSection.addEventListener('touchend', async e => {
  if (!runningEnabled || !playerKey) return;
  const endY = e.changedTouches[0].clientY;
  
  if (endY > touchStartY + 40) { // 往下滑動
    steps++;
    scoreEl.innerText = steps;
    // 立即更新 Firebase
    await db.ref('players/'F/' + playerKey + '/steps').set(steps);
  }
}, { passive:true });

btnBack.addEventListener('click', async () => {
  //
  if (playerKey) await db.ref('players/' + playerKey).remove();
  
  showScreen('register');
  
  // 重置UI
  nameInput.value = '';
  regMsg.innerText = '';
  steps = 0;
  playerKey = null;
  btnRegister.disabled = false; // 確保按鈕可以再次使用
  db.ref('game').off(); // 停止監聽
});

function sanitizeKey(s){ return s.replace(/[#.\[\]$\/]/g,'_'); }

// 修正：當頁面載入時，確保在正確的畫面上
showScreen('register');