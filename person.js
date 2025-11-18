import { db, ref, set, update, onValue } from "./firebase.js";

let myId = null;
let mySteps = 0;

const registerUI = document.getElementById("register");
const raceUI = document.getElementById("race");
const finishUI = document.getElementById("finish");

const playerNameInput = document.getElementById("playerName");
const btnJoin = document.getElementById("btnJoin");

const raceCountdown = document.getElementById("raceCountdown");

const finalName = document.getElementById("finalName");
const finalSteps = document.getElementById("finalSteps");
const btnAgain2 = document.getElementById("btnAgain2");

/* 玩家報名 */
btnJoin.onclick = async () => {
  const name = playerNameInput.value.trim();
  if (!name) return alert("請輸入名稱");

  myId = "p" + Date.now();

  await set(ref(db, "players/" + myId), {
    name,
    steps: 0
  });

  registerUI.style.display = "none";
  raceUI.style.display = "block";
};

/* 等待主畫面倒數 */
onValue(ref(db, "game"), (snap) => {
  const game = snap.val();
  if (!game) return;

  if (["countdown3","countdown2","countdown1","start"].includes(game.status)) {
    raceCountdown.style.display = "block";
    raceCountdown.textContent = 
      game.status === "start" ? "START" : game.status.replace("countdown","");

  } else if (game.status === "running") {

    /* 玩家滑動跑步 */
    raceCountdown.style.display = "none";

    window.ontouchstart = (e) => {
      const startY = e.touches[0].clientY;
      window.ontouchend = (e2) => {
        const endY = e2.changedTouches[0].clientY;
        if (endY - startY > 80) {
          mySteps++;
          update(ref(db, "players/" + myId), { steps: mySteps });
        }
      };
    };

  } else if (game.status === "final10") {
    window.ontouchstart = null;
    window.ontouchend = null;

  } else if (game.status === "done") {
    showFinal();
  }
});

function showFinal() {
  raceUI.style.display = "none";
  finishUI.style.display = "block";

  finalName.textContent = playerNameInput.value;
  finalSteps.textContent = mySteps;
}

/* 玩家重新開始 */
btnAgain2.onclick = () => {
  location.reload();
};
