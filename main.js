import { db, ref, onValue, update, set } from "./firebase.js";

/* UI 元件 */
const playerList = document.getElementById("playerList");
const centerText = document.getElementById("centerText");
const btnClose = document.getElementById("btnClose");
const btnScore = document.getElementById("btnScore");
const btnAgain = document.getElementById("btnAgain");

/* Firebase 路徑 */
const gameRef = ref(db, "game");
const playersRef = ref(db, "players");

/* 🔥 實時更新玩家名單 + 名次排序（含動畫） */
onValue(playersRef, (snapshot) => {
  const players = snapshot.val() || {};
  const list = Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => b.steps - a.steps);

  updatePlayerListWithAnimation(list);
});

/* 讓排序可播放向上/向下交換動畫 */
let lastOrder = [];

function updatePlayerListWithAnimation(list) {
  playerList.innerHTML = "";

  list.forEach((p, index) => {
    const div = document.createElement("div");
    div.className = "player-item";
    div.id = "player-" + p.id;
    div.innerHTML = `<span>${p.name}</span><span>${p.steps}</span>`;
    playerList.appendChild(div);
  });

  // 加上排序動畫
  list.forEach((p, index) => {
    const prevIndex = lastOrder.indexOf(p.id);
    if (prevIndex !== -1 && prevIndex !== index) {
      const el = document.getElementById("player-" + p.id);
      el.style.transform = `translateY(${(prevIndex - index) * 120}px)`;
      setTimeout(() => (el.style.transform = "translateY(0)"), 10);
    }
  });

  lastOrder = list.map(p => p.id);
}

/* 報名截止 → 進入時間設定 */
btnClose.onclick = () => {
  location.href = "time.html"; // 你若換成 start.html 也可以
};

/* ▼▼ 遊戲開始 → 顯示 3、2、1、START ▼▼ */
onValue(gameRef, (snap) => {
  const game = snap.val();
  if (!game) return;

  if (game.status === "countdown3") showCountdown(3);
  if (game.status === "countdown2") showCountdown(2);
  if (game.status === "countdown1") showCountdown(1);
  if (game.status === "start") showCountdown("START");

  if (game.status === "final10") {
    centerText.style.display = "block";
    centerText.textContent = game.countdown;
    playerList.style.display = "none";
  }

  if (game.status === "done") {
    centerText.style.display = "none";
    btnScore.style.display = "block";
  }
});

function showCountdown(txt) {
  centerText.style.display = "block";
  centerText.textContent = txt;
}

/* 公布成績 */
btnScore.onclick = () => {
  btnScore.style.display = "none";

  onValue(playersRef, (snap) => {
    const list = Object.values(snap.val() || [])
      .sort((a, b) => b.steps - a.steps)
      .slice(0, 3);

    playerList.innerHTML = "";
    centerText.style.display = "none";

    list.forEach((p, index) => {
      const row = document.createElement("div");
      row.className = "player-item";
      row.innerHTML = `<span>${index+1} 名</span><span>${p.name} - ${p.steps}</span>`;
      playerList.appendChild(row);
    });

    btnAgain.style.display = "block";
  }, { onlyOnce: true });
};

/* 重新開始 */
btnAgain.onclick = async () => {
  await set(playersRef, {});
  await update(gameRef, {
    status: "waiting",
    countdown: 0,
    totalTime: 180
  });
  location.reload();
};
