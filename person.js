/* person.js - 選手端 */
const db = window.DB;

const registerDiv = document.getElementById('person-register');
const nameInput = document.getElementById('playerName');
const btnJoin = document.getElementById('btnJoin');
const regMsg = document.getElementById('regMsg');

const gameDiv = document.getElementById('person-game');
const waitText = document.getElementById('waitText');
const runArea = document.getElementById('runArea');
const scoreSpan = document.getElementById('score');

const endDiv = document.getElementById('person-end');
const endName = document.getElementById('endName');
const endScore = document.getElementById('endScore');
const btnAgainPlayer = document.getElementById('btnAgainPlayer');

let playerId = null;
let playerName = '';
let steps = 0;
let runningEnabled = false;

/* 報名：檢查重複（不分大小寫） */
btnJoin.addEventListener('click', async ()=>{
  const raw = nameInput.value.trim();
  if (!raw) { regMsg.innerText = '名稱不可空白'; return; }
  const normalized = raw.toLowerCase();
  const safeKey = sanitizeKey(normalized);

  // 讀取 players 並檢查 name 是否重複（大小寫不分）
  const snap = await db.ref('players').get();
  const data = snap.val() || {};
  const names = Object.values(data).map(p => (p.name || '').toLowerCase());
  if (names.includes(normalized)) {
    regMsg.innerText = '選手名稱重複';
    return;
  }

  // 新增 player
  await db.ref('players/' + safeKey).set({ name: raw, steps: 0, finished: false, joinedAt: Date.now() });
  playerId = safeKey;
  playerName = raw;
  steps = 0;

  registerDiv.classList.add('hidden');
  gameDiv.classList.remove('hidden');

  // 監聽 game 狀態
  db.ref('game').on('value', s => {
    const g = s.val() || {};
    if (g.status === 'countdown'){
      waitText.innerText = g.countdown > 0 ? g.countdown : 'START';
      runningEnabled = false;
    } else if (g.status === 'running'){
      waitText.innerText = '';
      runningEnabled = true;
    } else if (g.status === 'finished'){
      runningEnabled = false;
      gameDiv.classList.add('hidden');
      endDiv.classList.remove('hidden');
      endName.innerText = playerName;
      endScore.innerText = steps;
    } else {
      waitText.innerText = 'WAIT';
      runningEnabled = false;
    }
  });
});

/* 防止整頁滾動 */
document.documentElement.style.overflow = 'hidden';
document.body.style.overflow = 'hidden';

/* 手勢：向下滑動 +1 */
let startY = 0;
runArea.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive:true });
runArea.addEventListener('touchend', async e => {
  if (!runningEnabled || !playerId) return;
  const endY = e.changedTouches[0].clientY;
  if (endY > startY + 40) {
    steps++;
    scoreSpan.innerText = steps;
    await db.ref('players/' + playerId + '/steps').set(steps);
  }
}, { passive:true });

/* 重新比賽（選手端） */
btnAgainPlayer.addEventListener('click', async ()=>{
  if (playerId) await db.ref('players/' + playerId).remove();
  endDiv.classList.add('hidden');
  registerDiv.classList.remove('hidden');
  nameInput.value = '';
  regMsg.innerText = '';
  playerId = null;
  steps = 0;
});

function sanitizeKey(s){ return s.replace(/[#.\[\]$\/]/g,'_'); }
