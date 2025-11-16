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

let playerKey = null;
let steps = 0;
let runningEnabled = false;

btnRegister.addEventListener('click', async () => {
  const raw = nameInput.value.trim();
  if (!raw) { regMsg.innerText = '名稱不可空白'; return; }
  const normalized = raw.toLowerCase();
  const safeKey = sanitizeKey(normalized);

  const snap = await db.ref('players/' + safeKey).get();
  if (snap.exists()) {
    regMsg.innerText = '選手名稱重複';
    return;
  }

  await db.ref('players/' + safeKey).set({ name: raw, steps: 0, finished:false, joinedAt: Date.now() });
  playerKey = safeKey;
  steps = 0;
  registerSection.classList.add('hidden');
  gameSection.classList.remove('hidden');

  db.ref('game').on('value', s => {
    const g = s.val() || {};
    if (g.status === 'countdown') {
      waitText.innerText = g.countdown > 0 ? g.countdown : 'START';
      runningEnabled = false;
    } else if (g.status === 'running') {
      waitText.innerText = '';
      runningEnabled = true;
    } else if (g.status === 'finished') {
      runningEnabled = false;
      gameSection.classList.add('hidden');
      endSection.classList.remove('hidden');
      finalScoreEl.innerText = steps;
    } else {
      waitText.innerText = 'WAIT';
      runningEnabled = false;
    }
  });
});

/* prevent page scrolling */
document.documentElement.style.overflow = 'hidden';
document.body.style.overflow = 'hidden';

/* swipe down detection */
let touchStartY = 0;
runArea.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive:true });
runArea.addEventListener('touchend', async e => {
  if (!runningEnabled || !playerKey) return;
  const endY = e.changedTouches[0].clientY;
  if (endY > touchStartY + 40) {
    steps++;
    scoreEl.innerText = steps;
    await db.ref('players/' + playerKey + '/steps').set(steps);
  }
}, { passive:true });

btnBack.addEventListener('click', async () => {
  if (playerKey) await db.ref('players/' + playerKey).remove();
  endSection.classList.add('hidden');
  registerSection.classList.remove('hidden');
  nameInput.value = '';
  regMsg.innerText = '';
});

function sanitizeKey(s){ return s.replace(/[#.\[\]$\/]/g,'_'); }
