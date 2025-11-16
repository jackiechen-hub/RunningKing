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
const endSection = document.getElementById('end');
const finalScoreEl = document.getElementById('finalScore');
const btnBack = document.getElementById('btnBack');

// 修正：確保所有畫面都正確被選取
const screens = document.querySelectorAll('section.screen');
// 顯示特定畫面的輔助函式
function showScreen(screenId) {
    screens.forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
    // 'active' class 在我們的 CSS 中不是用來顯示/隱藏的，所以我們用 'hidden'
}

let playerKey = null;
let steps = 0;
let runningEnabled = false;

btnRegister.addEventListener('click', async () => {
  const raw = nameInput.value.trim();
  if (!raw) { regMsg.innerText = '名稱不可空白'; return; }
  const normalized = raw.toLowerCase(); // [cite: 3318] 不分大小寫
  const safeKey = sanitizeKey(normalized);

  // [cite: 3318] 檢查重複
  const snap = await db.ref('players/' + safeKey).get();
  if (snap.exists()) {
    regMsg.innerText = '選手名稱重複';
    return;
  }

  // 報名成功
  await db.ref('players/' + safeKey).set({ name: raw, steps: 0, finished:false, joinedAt: Date.now() }); [cite: 3318]
  playerKey = safeKey;
  steps = 0;
  
  // 切換畫面
  showScreen('game'); // [cite: 3318]

  // 監聽遊戲狀態
  db.ref('game').on('value', s => {
    const g = s.val() || {};
    // [cite: 3319]
    if (g.status === 'countdown') {
      waitText.innerText = g.countdown > 0 ? g.countdown : 'START';
      runningEnabled = false;
      waitText.style.display = 'block';
      scoreEl.style.display = 'none';
    } else if (g.status === 'running') {
      waitText.style.display = 'none';
      scoreEl.style.display = 'block'; // 顯示步數
      runningEnabled = true;
    } else if (g.status === 'finished') {
      runningEnabled = false;
      showScreen('end'); // [cite: 3320]
      finalScoreEl.innerText = steps;
    } else {
      // 'waiting' or 'config'
      waitText.innerText = 'WAIT';
      waitText.style.display = 'block';
      scoreEl.style.display = 'none';
      runningEnabled = false;
    }
  });
});

/* prevent page scrolling  */
document.documentElement.style.overflow = 'hidden';
document.body.style.overflow = 'hidden';

/* swipe down detection [cite: 3324] */
let touchStartY = 0;
// 修正：我們應該在整個遊戲畫面 (gameSection) 偵聽滑動，而不只是 runArea
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
    await db.ref('players/' + playerKey + '/steps').set(steps);
  }
}, { passive:true });

btnBack.addEventListener('click', async () => {
  // [cite: 3324]
  if (playerKey) await db.ref('players/' + playerKey).remove();
  showScreen('register');
  nameInput.value = '';
  regMsg.innerText = '';
  steps = 0; // 重置本地步數
  playerKey = null;
});

function sanitizeKey(s){ return s.replace(/[#.\[\]$\/]/g,'_'); }

// 修正：當頁面載入時，確保在正確的畫面上
showScreen('register');