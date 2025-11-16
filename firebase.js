// -------------------------------
// Firebase 初始化
// -------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

// 初始化
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);


// -------------------------------
// Database 操作工具
// -------------------------------

// 寫入資料
export function dbSet(path, data) {
  return set(ref(db, path), data);
}

// 更新資料
export function dbUpdate(path, data) {
  return update(ref(db, path), data);
}

// 讀取一次資料
export function dbGet(path) {
  return get(ref(db, path));
}

// 監聽即時資料
export function dbListen(path, callback) {
  return onValue(ref(db, path), callback);
}

// 刪除資料
export function dbRemove(path) {
  return remove(ref(db, path));
}
