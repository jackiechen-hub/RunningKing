/* app.js - shared logic for pages. Uses window.PAGE to know which page.
   Compact implementation for multi-page project.
*/
function q(id){return document.getElementById(id);}
function nav(url){ location.href = url; }

function sanitizeKey(s){ return s.toLowerCase().replace(/[#.\[\]$\/]/g,'_'); }
async function getPlayersObj(){ const snap = await window.DB.ref('players').get(); return snap.val() || {}; }

window.initPage = function(){
  (function applyScale(){ const stage = document.querySelector('.stage'); if(!stage) return; const vw = window.innerWidth, vh = window.innerHeight; const scale = Math.min(vw/1080, vh/1920); stage.style.transform = 'translate(-50%,-50%) scale('+scale+')'; stage.style.left='50%'; stage.style.top='50%'; stage.style.position='fixed'; })();
  window.addEventListener('resize', ()=>{ window.initPage(); });
  const page = window.PAGE || '';
  if(page==='index') initIndex();
  if(page==='timeset') initTimeSet();
  if(page==='game') initGame();
  if(page==='time') initFinal10();
  if(page==='score') initScore();
  if(page==='person') initPerson();
  if(page==='personrun') initPersonRun();
  if(page==='personscore') initPersonScore();
};

/* INDEX */
async function initIndex(){
  const listEl = q('playerList'), pc=q('playerCount');
  async function refresh(){ const obj = await getPlayersObj(); listEl.innerHTML=''; const arr = Object.keys(obj||{}).map(k=>({id:k,name:obj[k].name,steps:obj[k].steps||0})); pc.innerText=arr.length; arr.forEach((p,i)=>{ const card=document.createElement('div'); card.className='player-card'; card.innerText=p.name; listEl.appendChild(card); }); }
  refresh(); setInterval(refresh,2000);
  q('btnClose').addEventListener('click', async ()=>{ await window.DB.ref('game').set({status:'config', totalTime:180, countdown:0, startTime:null}); nav('timeset.html'); });
}

/* TIMESET */
function minuteDisplay(totalSec){ const m=Math.floor(totalSec/60); const s=totalSec%60; return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); }
async function initTimeSet(){ const display=q('timeDisplay'); let total=180; const gsnap=await window.DB.ref('game/totalTime').get(); if(gsnap.exists()) total=gsnap.val(); display.innerText=minuteDisplay(total); q('btnMinus').addEventListener('click', ()=>{ total=Math.max(60,total-60); display.innerText=minuteDisplay(total); window.DB.ref('game/totalTime').set(total); }); q('btnPlus').addEventListener('click', ()=>{ total=total+60; display.innerText=minuteDisplay(total); window.DB.ref('game/totalTime').set(total); }); q('btnStart').addEventListener('click', async ()=>{ await window.DB.ref('game').update({status:'countdown', countdown:3}); nav('game.html'); }); }

/* GAME */
async function initGame(){ const countdownBig=q('countdownBig'), rankingList=q('rankingList'); window.DB.ref('game').on('value', async snap=>{ const g=snap.val()||{}; if(g.status==='countdown'){ countdownBig.innerText=(g.countdown>0?g.countdown:'START'); } else if(g.status==='running'){ countdownBig.innerText=''; const obj=await getPlayersObj(); const arr=Object.values(obj||{}).sort((a,b)=>(b.steps||0)-(a.steps||0)).slice(0,10); rankingList.innerHTML=''; arr.forEach((p,i)=>{ const row=document.createElement('div'); row.className='rank-row'; row.innerText=(i+1)+'. '+(p.name||'')+'   '+(p.steps||0); rankingList.appendChild(row); }); } else if(g.status==='final10'){ nav('time.html'); } else if(g.status==='finished'){ nav('time.html'); } }); const gsnap=await window.DB.ref('game').get(); const g=gsnap.val()||{}; if(g.status==='countdown'){ let c=g.countdown; const ci=setInterval(async ()=>{ c--; if(c>=0) await window.DB.ref('game/countdown').set(c); if(c<0){ clearInterval(ci); const startTs=Date.now(); await window.DB.ref('game').update({status:'running', startTime:startTs}); startGameTimer(); } },1000); } else if(g.status==='running'){ startGameTimer(); } async function startGameTimer(){ const gs=await window.DB.ref('game').get(); const gv=gs.val()||{}; const total=gv.totalTime||180; const startTs=gv.startTime||Date.now(); const tick=setInterval(async ()=>{ const elapsed=Math.floor((Date.now()-startTs)/1000); const remain=total-elapsed; if(remain<=10 && remain>=0){ await window.DB.ref('game').update({status:'final10', countdown:remain}); } if(remain<0){ clearInterval(tick); await window.DB.ref('game').update({status:'finished'}); } },250); } }

/* FINAL10 */
function initFinal10(){ const ten=q('tenCount'); window.DB.ref('game').on('value', snap=>{ const g=snap.val()||{}; if(g.status==='final10'){ ten.innerText=g.countdown; } if(g.status==='finished'){ nav('score.html'); } }); q('btnScore').addEventListener('click', ()=>nav('score.html')); }

/* SCORE */
async function initScore(){ const box=q('resultBox'); const snap=await window.DB.ref('players').get(); const arr=Object.values(snap.val()||{}).sort((a,b)=>(b.steps||0)-(a.steps||0)); box.innerHTML=''; const top3=arr.slice(0,3); for(let i=top3.length-1;i>=0;i--){ const p=top3[i]; const el=document.createElement('div'); el.innerHTML='<div style=\"font-size:28px;\">'+(i+1)+'st</div><div style=\"font-size:36px;\">'+(p.name||'')+'：'+(p.steps||0)+'</div><hr style=\"opacity:0.1\"/>'; box.appendChild(el); } q('btnRestart').addEventListener('click', async ()=>{ await window.DB.ref('players').remove(); await window.DB.ref('game').set({status:'waiting', totalTime:180, countdown:0, startTime:null}); nav('index.html'); }); }

/* PERSON */
async function initPerson(){ const nameInput=q('playerName'), dup=q('dupMsg'); q('btnJoin').addEventListener('click', async ()=>{ const raw=(nameInput.value||'').trim(); if(!raw){ dup.innerText='名稱不可空白'; return; } const key=sanitizeKey(raw); const snap=await window.DB.ref('players').get(); const obj=snap.val()||{}; const names=Object.values(obj).map(p=> (p.name||'').toLowerCase()); if(names.includes(raw.toLowerCase())){ dup.innerText='名稱重複 Duplicate name'; return; } await window.DB.ref('players/'+key).set({name:raw,steps:0,joinedAt:Date.now()}); location.href='personrun.html?id='+encodeURIComponent(key); }); }

/* PERSONRUN */
function getQueryParam(name){ const u=new URL(location.href); return u.searchParams.get(name); }
async function initPersonRun(){ const id=getQueryParam('id'); const prCountdown=q('prCountdown'), runScore=q('runScore'); if(!id){ prCountdown.innerText='未報名'; return; } window.DB.ref('game').on('value', snap=>{ const g=snap.val()||{}; if(g.status==='countdown') prCountdown.innerText=(g.countdown>0?g.countdown:'START'); else if(g.status==='running') prCountdown.innerText=''; else if(g.status==='final10') prCountdown.innerText=g.countdown; else if(g.status==='finished'){ location.href='personscore.html?id='+encodeURIComponent(id); } else prCountdown.innerText='WAIT'; }); let startY=0; window.addEventListener('touchstart', e=>{ if(e.touches) startY=e.touches[0].clientY; }, {passive:true}); window.addEventListener('touchend', async e=>{ const endY=e.changedTouches[0].clientY; if(endY>startY+40){ const snap=await window.DB.ref('players/'+id+'/steps').get(); const cur=snap.exists()? (snap.val()||0):0; const updated=cur+1; await window.DB.ref('players/'+id+'/steps').set(updated); runScore.innerText=updated; } }, {passive:true}); }

/* PERSONSCORE */
async function initPersonScore(){ const id=getQueryParam('id'); const nameEl=q('psName'), scoreEl=q('psScore'); if(!id){ nameEl.innerText='未報名'; return; } const snap=await window.DB.ref('players/'+id).get(); const p=snap.val()||{}; nameEl.innerText=p.name||''; scoreEl.innerText=(p.steps||0)+' 步'; q('btnAgain').addEventListener('click', async ()=>{ await window.DB.ref('players/'+id).remove(); location.href='person.html'; }); }
