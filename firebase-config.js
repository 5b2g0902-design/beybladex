// Firebase 串接配置設定檔 (Firebase Configuration)
// ==========================================
// 說明：此處為登入系統所需的 Firebase 設定佔位符。
// 請前往 Firebase Console (https://console.firebase.google.com/) 建立專案，
// 並在專案設定中新增一個 Web 應用程式，將產生的配置貼至下方對應欄位中。

const firebaseConfig = {
    apiKey: "YOUR_API_KEY_PLACEHOLDER",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初始化 Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase 模組載入成功。");
} else {
    console.error("無法載入 Firebase SDK。請確保已在 index.html 載入相關 script，並確認網路連線正常。");
}
