/* person.js - 參賽者端 */
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

// join handler
btnJoin.addEventListener('click', async ()=>{
  const raw = nameInput.value.trim();
  if (!raw){ regMsg.innerText = '名稱不可空白'; return; }
  const normalized = raw.toLowerCase();
  const safeKey = sanitizeKey(normalized);
  // check duplicate
  const snap = await db.ref('players/' + safeKey).get();
  if (snap.exists()){ regMsg.innerText = '選手名稱重複'; return; }
  // create record
  await db.ref('players/' + safeKey).set({ name: raw, steps: 0, finished: false, joinedAt: Date.now() });
  playerId = safeKey;
  playerName = raw;
  steps = 0;
  registerDiv.classList.add('hidden');
  gameDiv.classList.remove('hidden');

  // listen game status
  db.ref('game').on('value', snap => {
    const g = snap.val() || {};
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
      // waiting or config
      waitText.innerText = 'WAIT';
      runningEnabled = false;
    }
  });
});

// prevent page scroll when in game
document.documentElement.style.overflow = 'hidden';
document.body.style.overflow = 'hidden';

// touch detection - only when runningEnabled
let startY = 0;
runArea.addEventListener('touchstart', (e)=>{ startY = e.touches[0].clientY; }, { passive: true });
runArea.addEventListener('touchend', async (e)=>{
  if (!runningEnabled || !playerId) return;
  const endY = e.changedTouches[0].clientY;
  // require swipe down by >40 px
  if (endY > startY + 40){
    steps++;
    scoreSpan.innerText = steps;
    await db.ref('players/' + playerId + '/steps').set(steps);
  }
}, { passive: true });

// back / again
btnAgainPlayer.addEventListener('click', async ()=>{
  if (playerId){
    await db.ref('players/' + playerId).remove();
  }
  endDiv.classList.add('hidden');
  registerDiv.classList.remove('hidden');
  nameInput.value = '';
  regMsg.innerText = '';
  playerId = null;
  steps = 0;
});

function sanitizeKey(s){ return s.replace(/[#.\[\]$\/]/g, '_'); }
