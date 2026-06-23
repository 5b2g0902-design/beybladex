// Firebase 串接配置設定檔 (Firebase Configuration)
// ==========================================
// 你需要到 Firebase Console 建立 Web App，並把設定貼到 firebaseConfig。
// 另外請在 Firebase Console 啟用：Authentication > Google、Firestore Database。

const firebaseConfig = {
  apiKey: "AIzaSyDFq869qgT6qTtKzRDyVAUe7DIUhQru5WU",
  authDomain: "blade-5c307.firebaseapp.com",
  projectId: "blade-5c307",
  storageBucket: "blade-5c307.firebasestorage.app",
  messagingSenderId: "540799994045",
  appId: "1:540799994045:web:68075dfe223bc5ac6e8fd4"
};

// 初始化 Firebase Compat SDK
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // 全域服務，讓 app.js 可以直接使用
    window.firebaseAuth = firebase.auth();
    window.firebaseDb = firebase.firestore ? firebase.firestore() : null;

    // 登入狀態盡量保留在瀏覽器，下次開啟仍是登入狀態
    if (window.firebaseAuth && firebase.auth.Auth.Persistence) {
        window.firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((err) => {
            console.warn("Firebase 登入持久化設定失敗：", err);
        });
    }

    console.log("Firebase 模組載入成功。Auth:", !!window.firebaseAuth, "Firestore:", !!window.firebaseDb);
} else {
    console.error("無法載入 Firebase SDK。請確認 index.html 已載入 firebase-app-compat.js、firebase-auth-compat.js、firebase-firestore-compat.js，並使用 http://localhost 開啟。不要直接用 file:// 開啟。");
}
