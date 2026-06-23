// 戰鬥陀螺線上對戰網 主控制邏輯 (Main App Controller)

// 系統預設陀螺配置
const DEFAULT_BEYBLADES = [
    {
        id: 'preset-pegasus',
        name: '迅雷天馬 (Pegasus)',
        config: { layer: 'pegasus', disc: 'wing', driver: 'flat', spinDirection: 'right' },
        colors: { primary: '#1a2e40', secondary: '#4fa8ff', glow: '#00ccff' },
        isPreset: true
    },
    {
        id: 'preset-ldrago',
        name: '暗黑龍皇 (L-Drago)',
        config: { layer: 'ldrago', disc: 'boost', driver: 'rubber', spinDirection: 'left' },
        colors: { primary: '#2a1a1a', secondary: '#ff4d4d', glow: '#ff3333' },
        isPreset: true
    },
    {
        id: 'preset-leone',
        name: '黃金獅子 (Leone)',
        config: { layer: 'leone', disc: 'heavy', driver: 'ball', spinDirection: 'right' },
        colors: { primary: '#1a2e1a', secondary: '#5cd65c', glow: '#33cc33' },
        isPreset: true
    },
    {
        id: 'preset-spriggan',
        name: '聖光巨神 (Spriggan)',
        config: { layer: 'spriggan', disc: 'stamina', driver: 'sharp', spinDirection: 'right' },
        colors: { primary: '#2a2a1a', secondary: '#ffd633', glow: '#ffcc00' },
        isPreset: true
    },
    // --- BEYBLADE X 新增範例 ---
    {
        id: 'preset-dransword',
        name: '德蘭雙劍 (DranSword) X',
        config: { layer: 'dran_sword', disc: 'three_sixty', driver: 'flat_x', spinDirection: 'right' },
        colors: { primary: '#0f2b5c', secondary: '#1e5fcc', glow: '#0066ff' },
        isPreset: true
    },
    {
        id: 'preset-hellsscythe',
        name: '地獄鐮刀 (HellsScythe) X',
        config: { layer: 'hells_scythe', disc: 'four_sixty', driver: 'taper_x', spinDirection: 'right' },
        colors: { primary: '#3d0d1b', secondary: '#b51a3a', glow: '#ff2255' },
        isPreset: true
    },
    {
        id: 'preset-wizardarrow',
        name: '巫師箭矢 (WizardArrow) X',
        config: { layer: 'wizard_arrow', disc: 'four_eighty', driver: 'ball_x', spinDirection: 'right' },
        colors: { primary: '#3d2e05', secondary: '#bda11e', glow: '#ffbb00' },
        isPreset: true
    },
    {
        id: 'preset-knightshield',
        name: '騎士護盾 (KnightShield) X',
        config: { layer: 'knight_shield', disc: 'three_sixty', driver: 'needle_x', spinDirection: 'right' },
        colors: { primary: '#053d27', secondary: '#1ebda1', glow: '#00ff99' },
        isPreset: true
    }
];

class App {
    constructor() {
        this.currentScreen = 'menu-screen';
        this.customBeyblades = [];
        
        // 當前工坊組裝配置
        this.workshopConfig = {
            name: '',
            layer: 'pegasus',
            disc: 'wing',
            driver: 'flat',
            spinDirection: 'right',
            colors: {
                primary: '#1d1d26',
                secondary: '#5c5c73',
                glow: '#00ccff'
            }
        };
        this.previewSpinning = false;
        this.previewAngle = 0;
        this.previewBeybladeObj = null;

        // 大廳選擇狀態
        this.p1SelectedId = 'preset-pegasus';
        this.p2SelectedId = 'preset-ldrago';

        // 戰鬥狀態
        this.battleState = 'LAUNCH_P1'; // LAUNCH_P1, LAUNCH_P2, COUNTDOWN, RUNNING, ENDED
        this.physics = new PhysicsEngine(250);
        this.p1Beyblade = null;
        this.p2Beyblade = null;
        this.arenaRadius = 250;
        this.battleTimer = 0;
        this.battleInterval = null;
        this.animationFrameId = null;

        // 同時發射資料暫存與倒數計時
        this.p1LaunchData = null;
        this.p2LaunchData = null;
        this.countdownTime = 0;
        this.countdownText = '';

        // 奧義與能量狀態
        this.p1Spirit = 0;
        this.p2Spirit = 0;
        this.p1SpecialMoveTimer = 0;
        this.p2SpecialMoveTimer = 0;

        // 發射操作狀態
        this.launchSetup = {
            activePlayer: 1, // 1 或 2
            posX: 0,
            posY: -120, // 預設發射位置
            dragStartX: 0,
            dragStartY: 0,
            dragEndX: 0,
            dragEndY: 0,
            isDragging: false,
            powerOscillating: false,
            powerVal: 0,
            powerDir: 1, // 1: 遞增, -1: 遞減
            launchForceX: 0,
            launchForceY: 0
        };

        this.init();
    }

    init() {
        this.loadLocalBeyblades();
        this.bindEvents();
        this.setupWorkshopTab('layers');
        this.updateWorkshopPreview();
        this.renderLobbyLists();
        this.selectLobbyBey(1, this.p1SelectedId);
        this.selectLobbyBey(2, this.p2SelectedId);
        this.initFirebaseAuth();

        this.placeAuthBarForScreen(this.currentScreen);
        // 啟動預覽 Canvas 渲染循環
        this.startPreviewLoop();
    }

    initFirebaseAuth() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            console.warn("Firebase SDK 未載入，略過驗證監聽。");
            return;
        }

        const auth = firebase.auth();

        // 讓 Google 登入狀態保留在瀏覽器，下次重開仍可保持登入
        if (firebase.auth.Auth && firebase.auth.Auth.Persistence) {
            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((err) => {
                console.warn("Firebase 登入持久化設定失敗：", err);
            });
        }

        auth.onAuthStateChanged(async (user) => {
            const userNameEl = document.getElementById('user-display-name');
            const loginTriggerEl = document.getElementById('btn-login-trigger');
            const logoutEl = document.getElementById('btn-logout');

            if (user) {
                // Google 登入會有 displayName / email；訪客登入則顯示訪客
                const name = user.isAnonymous
                    ? "訪客戰士 (Guest)"
                    : (user.displayName || user.email || "Google 戰士");

                if (userNameEl) userNameEl.textContent = `歡迎，戰士：${name}`;
                if (loginTriggerEl) loginTriggerEl.classList.add('hidden');
                if (logoutEl) logoutEl.classList.remove('hidden');

                // Google 登入後自動載入雲端自製陀螺，並與本機資料合併
                if (!user.isAnonymous) {
                    await this.loadCloudBeyblades(true);
                }
            } else {
                if (userNameEl) userNameEl.textContent = "訪客戰士 (Guest)";
                if (loginTriggerEl) loginTriggerEl.classList.remove('hidden');
                if (logoutEl) logoutEl.classList.add('hidden');
            }
        });
    }

    getCurrentFirebaseUser() {
        if (typeof firebase === 'undefined' || !firebase.auth) return null;
        return firebase.auth().currentUser || null;
    }

    getCloudLibraryRef() {
        const user = this.getCurrentFirebaseUser();
        if (!user || user.isAnonymous) return null;
        if (typeof firebase === 'undefined' || !firebase.firestore) return null;
        return firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('beybladeData')
            .doc('library');
    }

    mergeBeybladeLibraries(localList, cloudList) {
        const map = new Map();
        [...(cloudList || []), ...(localList || [])].forEach((bey) => {
            if (!bey || !bey.config || !bey.colors) return;
            const key = bey.id || `${bey.name}|${bey.config.layer}|${bey.config.disc}|${bey.config.driver}|${bey.config.spinDirection || 'right'}|${bey.colors.primary}|${bey.colors.secondary}|${bey.colors.glow}`;
            map.set(key, bey);
        });
        return Array.from(map.values());
    }

    async loadCloudBeyblades(mergeWithLocal = true) {
        const ref = this.getCloudLibraryRef();
        if (!ref) return;

        try {
            const snap = await ref.get();
            const cloudList = snap.exists && Array.isArray(snap.data().beyblades)
                ? snap.data().beyblades
                : [];

            this.customBeyblades = mergeWithLocal
                ? this.mergeBeybladeLibraries(this.customBeyblades, cloudList)
                : cloudList;

            localStorage.setItem('beyblade_custom_library', JSON.stringify(this.customBeyblades));
            this.renderLobbyLists();
            await this.saveCloudBeyblades(false);
            console.log(`雲端陀螺庫同步完成，共 ${this.customBeyblades.length} 個自製陀螺。`);
        } catch (err) {
            console.error("讀取雲端陀螺庫失敗：", err);
            alert("讀取雲端陀螺庫失敗。請確認 Firestore 已啟用，且安全規則允許登入使用者讀寫自己的資料。\n" + err.message);
        }
    }

    async saveCloudBeyblades(showMessage = false) {
        const ref = this.getCloudLibraryRef();
        if (!ref) return;

        try {
            await ref.set({
                beyblades: this.customBeyblades,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            if (showMessage) console.log("雲端陀螺庫儲存成功。", this.customBeyblades.length);
        } catch (err) {
            console.error("儲存雲端陀螺庫失敗：", err);
            if (showMessage) alert("儲存雲端陀螺庫失敗：" + err.message);
        }
    }


    // 讀取本地儲存的陀螺
    loadLocalBeyblades() {
        const saved = localStorage.getItem('beyblade_custom_library');
        if (saved) {
            try {
                this.customBeyblades = JSON.parse(saved);
            } catch (e) {
                console.error("載入本地陀螺失敗", e);
                this.customBeyblades = [];
            }
        }
    }

    // 儲存陀螺至本地；若已登入 Google，會同步到 Firestore 雲端
    saveLocalBeyblades() {
        localStorage.setItem('beyblade_custom_library', JSON.stringify(this.customBeyblades));
        this.renderLobbyLists();
        this.saveCloudBeyblades(true);
    }    // 將帳號狀態列放進目前畫面的標題列，避免浮動遮住「返回選單」等按鈕
    placeAuthBarForScreen(screenId) {
        const authBar = document.getElementById('user-auth-bar');
        if (!authBar) return;

        if (screenId === 'battle-screen') {
            authBar.classList.add('hidden');
            return;
        }

        authBar.classList.remove('hidden');

        const headerSlot = document.querySelector(`#${screenId} .auth-slot`);
        if (headerSlot) {
            headerSlot.appendChild(authBar);
            return;
        }

        // 主選單沒有 screen-header，所以放在主選單容器上方，保持在正常排版中不浮動
        const menuContainer = document.querySelector('#menu-screen .menu-container');
        if (menuContainer) {
            let menuSlot = document.querySelector('#menu-screen .menu-auth-slot');
            if (!menuSlot) {
                menuSlot = document.createElement('div');
                menuSlot.className = 'menu-auth-slot';
                menuContainer.insertBefore(menuSlot, menuContainer.firstChild);
            }
            menuSlot.appendChild(authBar);
        }
    }



    // 畫面切換
    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            this.currentScreen = screenId;
        }
        // 帳號狀態列改放到目前畫面標題列右側，位於返回按鈕左邊
        this.placeAuthBarForScreen(screenId);
        // 如果離開戰鬥畫面，停止循環與計時器
        if (screenId !== 'battle-screen') {
            this.stopBattle();
        }
    }

    // 綁定 UI 事件
    bindEvents() {
        // 主選單
        document.getElementById('btn-enter-workshop').addEventListener('click', () => {
            // 重置工坊名稱與隨機配色
            this.workshopConfig.name = "陀螺" + Math.floor(Math.random() * 900 + 100);
            this.workshopConfig.colors.primary = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            this.workshopConfig.colors.secondary = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            this.workshopConfig.colors.glow = PARTS.layers[this.workshopConfig.layer].color;
            
            document.getElementById('beyblade-name').value = this.workshopConfig.name;
            document.getElementById('color-primary').value = this.workshopConfig.colors.primary;
            document.getElementById('color-secondary').value = this.workshopConfig.colors.secondary;
            document.getElementById('color-glow').value = this.workshopConfig.colors.glow;
            
            this.updateWorkshopPreview();
            this.switchScreen('workshop-screen');
        });

        document.getElementById('btn-enter-lobby').addEventListener('click', () => {
            this.renderLobbyLists();
            this.switchScreen('lobby-screen');
        });

        document.getElementById('btn-how-to-play').addEventListener('click', () => {
            document.getElementById('how-to-play-modal').classList.add('active');
        });

        document.getElementById('btn-close-how').addEventListener('click', () => {
            document.getElementById('how-to-play-modal').classList.remove('active');
        });

        // 通用返回按鈕
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', () => this.switchScreen('menu-screen'));
        });

        // 工坊頁面零件分頁切換
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.setupWorkshopTab(e.target.dataset.tab);
            });
        });

        // 預覽旋轉測試按鈕
        document.getElementById('btn-preview-spin').addEventListener('click', () => {
            this.previewSpinning = !this.previewSpinning;
            const icon = document.querySelector('.play-icon');
            icon.textContent = this.previewSpinning ? '⏸' : '▶';
        });

        // 工坊顏色自訂
        document.getElementById('color-primary').addEventListener('input', (e) => {
            this.workshopConfig.colors.primary = e.target.value;
            this.updateWorkshopPreview();
        });
        document.getElementById('color-secondary').addEventListener('input', (e) => {
            this.workshopConfig.colors.secondary = e.target.value;
            this.updateWorkshopPreview();
        });
        document.getElementById('color-glow').addEventListener('input', (e) => {
            this.workshopConfig.colors.glow = e.target.value;
            this.updateWorkshopPreview();
        });

        // 巨神雙旋方向切換
        document.getElementById('spin-dir-right').addEventListener('click', () => {
            document.getElementById('spin-dir-left').classList.remove('active');
            document.getElementById('spin-dir-right').classList.add('active');
            this.workshopConfig.spinDirection = 'right';
            this.updateWorkshopPreview();
        });
        document.getElementById('spin-dir-left').addEventListener('click', () => {
            document.getElementById('spin-dir-right').classList.remove('active');
            document.getElementById('spin-dir-left').classList.add('active');
            this.workshopConfig.spinDirection = 'left';
            this.updateWorkshopPreview();
        });

        // 工坊保存
        document.getElementById('btn-save-beyblade').addEventListener('click', () => {
            const nameInput = document.getElementById('beyblade-name').value.trim();
            if (!nameInput) {
                alert("請輸入陀螺名字！");
                return;
            }
            this.workshopConfig.name = nameInput;

            // 儲存新的陀螺配置
            const newBey = {
                id: 'custom-' + Date.now(),
                name: this.workshopConfig.name,
                config: {
                    layer: this.workshopConfig.layer,
                    disc: this.workshopConfig.disc,
                    driver: this.workshopConfig.driver,
                    spinDirection: this.workshopConfig.spinDirection
                },
                colors: {
                    primary: this.workshopConfig.colors.primary,
                    secondary: this.workshopConfig.colors.secondary,
                    glow: this.workshopConfig.colors.glow
                },
                isPreset: false
            };

            this.customBeyblades.push(newBey);
            this.saveLocalBeyblades();
            alert(`儲存成功！「${newBey.name}」已加入您的陀螺庫。`);
            this.p1SelectedId = newBey.id; // 自動為 P1 選取最新組裝的
            this.switchScreen('lobby-screen');
            this.selectLobbyBey(1, newBey.id);
        });

        // 工坊匯出與匯入
        document.getElementById('btn-export-code').addEventListener('click', () => {
            const nameInput = document.getElementById('beyblade-name').value.trim() || '未命名';
            const data = {
                name: nameInput,
                config: {
                    layer: this.workshopConfig.layer,
                    disc: this.workshopConfig.disc,
                    driver: this.workshopConfig.driver,
                    spinDirection: this.workshopConfig.spinDirection
                },
                colors: this.workshopConfig.colors
            };
            const code = btoa(encodeURIComponent(JSON.stringify(data)));
            
            document.getElementById('code-modal-title').textContent = '匯出陀螺代碼';
            const area = document.getElementById('code-modal-text');
            area.value = code;
            area.readOnly = true;
            document.getElementById('code-modal').classList.add('active');
        });

        document.getElementById('btn-import-code').addEventListener('click', () => {
            document.getElementById('code-modal-title').textContent = '匯入陀螺代碼';
            const area = document.getElementById('code-modal-text');
            area.value = '';
            area.readOnly = false;
            area.placeholder = '貼上他人分享的 Base64 陀螺代碼並點選匯入...';
            document.getElementById('code-modal').classList.add('active');
        });

        document.getElementById('btn-copy-code').addEventListener('click', () => {
            const area = document.getElementById('code-modal-text');
            if (area.readOnly) {
                // 複製
                area.select();
                document.execCommand('copy');
                alert('代碼已複製到剪貼簿！');
                document.getElementById('code-modal').classList.remove('active');
            } else {
                // 匯入
                const code = area.value.trim();
                if (!code) return;
                try {
                    const data = JSON.parse(decodeURIComponent(atob(code)));
                    if (data.name && data.config && data.colors) {
                        this.workshopConfig.name = data.name;
                        this.workshopConfig.layer = data.config.layer;
                        this.workshopConfig.disc = data.config.disc;
                        this.workshopConfig.driver = data.config.driver;
                        this.workshopConfig.spinDirection = data.config.spinDirection || 'right';
                        this.workshopConfig.colors = data.colors;

                        document.getElementById('beyblade-name').value = data.name;
                        document.getElementById('color-primary').value = data.colors.primary;
                        document.getElementById('color-secondary').value = data.colors.secondary;
                        document.getElementById('color-glow').value = data.colors.glow;

                        // 更新選取卡片 UI
                        this.setupWorkshopTab('layers');
                        this.updateWorkshopPreview();
                        alert(`成功解析陀螺「${data.name}」，可點儲存加入庫中！`);
                        document.getElementById('code-modal').classList.remove('active');
                    } else {
                        alert('代碼格式錯誤！');
                    }
                } catch(e) {
                    alert('無效的陀螺代碼！');
                }
            }
        });

        document.getElementById('btn-close-code').addEventListener('click', () => {
            document.getElementById('code-modal').classList.remove('active');
        });

        // 大廳上傳代碼
        document.getElementById('btn-lobby-upload').addEventListener('click', () => {
            const input = document.getElementById('lobby-import-input');
            const code = input.value.trim();
            if (!code) return;
            try {
                const data = JSON.parse(decodeURIComponent(atob(code)));
                if (data.name && data.config && data.colors) {
                    const newBey = {
                        id: 'custom-' + Date.now(),
                        name: data.name + ' (匯入)',
                        config: data.config,
                        colors: data.colors,
                        isPreset: false
                    };
                    this.customBeyblades.push(newBey);
                    this.saveLocalBeyblades();
                    input.value = '';
                    alert(`陀螺「${newBey.name}」已成功上傳並添加到選擇列表中！`);
                } else {
                    alert('代碼格式錯誤！');
                }
            } catch(e) {
                alert('代碼解析失敗，請確保代碼完整。');
            }
        });

        // 點選開始戰鬥
        document.getElementById('btn-start-battle').addEventListener('click', () => {
            this.switchScreen('battle-screen');
            this.startBattlePreparation();
        });

        // 放棄戰鬥
        document.getElementById('btn-abort-battle').addEventListener('click', () => {
            this.switchScreen('lobby-screen');
        });

        // 結算選單
        document.getElementById('btn-rematch').addEventListener('click', () => {
            document.getElementById('results-modal').classList.remove('active');
            this.startBattlePreparation();
        });

        document.getElementById('btn-results-lobby').addEventListener('click', () => {
            document.getElementById('results-modal').classList.remove('active');
            this.switchScreen('lobby-screen');
        });

        // 綁定對戰 Canvas 鼠標操作 (發射機制)
        const canvas = document.getElementById('battle-canvas');
        canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        window.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));
        
        // 雙擊快速發射
        canvas.addEventListener('dblclick', (e) => {
            if (this.battleState === 'LAUNCH_P1' || this.battleState === 'LAUNCH_P2') {
                const rect = canvas.getBoundingClientRect();
                const mx = e.clientX - rect.left - 300;
                const my = e.clientY - rect.top - 300;
                
                // 計算發射往中心的初始速度
                const dist = Math.sqrt(mx * mx + my * my);
                const vx = -mx / dist * 250;
                const vy = -my / dist * 250;

                this.launchSetup.posX = mx;
                this.launchSetup.posY = my;
                this.launchSetup.launchForceX = vx;
                this.launchSetup.launchForceY = vy;
                this.triggerLaunch(90); // 以 90% 力道直接射出
            }
        });

        // [新增] 綁定鍵盤控制事件 (引導、衝刺、模式、奧義)
        this.keys = {};
        window.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && this.currentScreen === 'battle-screen') {
                e.preventDefault();
            }
            this.keys[e.code] = true;
            this.handleBattleKeyDown(e);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Firebase 登入 UI 事件綁定
        const loginModal = document.getElementById('login-modal');
        const loginMessage = document.getElementById('login-message');
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');

        const showMessage = (msg, isSuccess = false) => {
            if (loginMessage) {
                loginMessage.textContent = msg;
                loginMessage.className = `login-message ${isSuccess ? 'success' : 'error'}`;
            }
        };

        // 開啟登入彈窗
        const loginTrigger = document.getElementById('btn-login-trigger');
        if (loginTrigger) {
            loginTrigger.addEventListener('click', () => {
                if (loginMessage) loginMessage.textContent = '';
                if (emailInput) emailInput.value = '';
                if (passwordInput) passwordInput.value = '';
                if (loginModal) loginModal.classList.add('active');
            });
        }



        // Google 登入：登入後會自動同步 Firestore 裡自己的自製陀螺庫
        const googleLoginBtn = document.getElementById('btn-google-login');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', async () => {
                if (typeof firebase === 'undefined' || !firebase.auth) {
                    showMessage('Firebase SDK 未加載，無法使用 Google 登入。');
                    return;
                }
                try {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    provider.setCustomParameters({ prompt: 'select_account' });
                    await firebase.auth().signInWithPopup(provider);
                    showMessage('Google 登入成功！正在同步你的自製陀螺...', true);
                    await this.loadCloudBeyblades(true);
                    setTimeout(() => {
                        if (loginModal) loginModal.classList.remove('active');
                    }, 800);
                } catch (err) {
                    console.error('Google 登入失敗：', err);
                    showMessage('Google 登入失敗：' + err.message);
                }
            });
        }

        // 關閉登入彈窗
        const closeLoginBtn = document.getElementById('btn-close-login');
        if (closeLoginBtn) {
            closeLoginBtn.addEventListener('click', () => {
                if (loginModal) loginModal.classList.remove('active');
            });
        }

        // 登出按鈕
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (typeof firebase !== 'undefined') {
                    this.saveCloudBeyblades(false);
                    firebase.auth().signOut().then(() => {
                        alert('您已登出戰士帳號。');
                    }).catch(err => {
                        alert('登出失敗: ' + err.message);
                    });
                }
            });
        }

        // 執行信箱密碼登入
        const doLoginBtn = document.getElementById('btn-do-login');
        if (doLoginBtn) {
            doLoginBtn.addEventListener('click', () => {
                const email = emailInput ? emailInput.value.trim() : '';
                const password = passwordInput ? passwordInput.value : '';

                if (!email || !password) {
                    showMessage('請填寫電子信箱與密碼！');
                    return;
                }

                if (typeof firebase !== 'undefined') {
                    firebase.auth().signInWithEmailAndPassword(email, password)
                        .then(() => {
                            showMessage('登入成功！正在回到戰場...', true);
                            setTimeout(() => {
                                if (loginModal) loginModal.classList.remove('active');
                            }, 1000);
                        })
                        .catch(err => {
                            showMessage('登入失敗: ' + err.message);
                        });
                } else {
                    showMessage('Firebase SDK 未加載，無法執行登入。');
                }
            });
        }

        // 執行信箱密碼註冊
        const doRegisterBtn = document.getElementById('btn-do-register');
        if (doRegisterBtn) {
            doRegisterBtn.addEventListener('click', () => {
                const email = emailInput ? emailInput.value.trim() : '';
                const password = passwordInput ? passwordInput.value : '';

                if (!email || !password) {
                    showMessage('請填寫電子信箱與密碼！');
                    return;
                }

                if (password.length < 6) {
                    showMessage('密碼長度需至少為 6 位數！');
                    return;
                }

                if (typeof firebase !== 'undefined') {
                    firebase.auth().createUserWithEmailAndPassword(email, password)
                        .then(() => {
                            showMessage('註冊並登入成功！歡迎加入！', true);
                            setTimeout(() => {
                                if (loginModal) loginModal.classList.remove('active');
                            }, 1000);
                        })
                        .catch(err => {
                            showMessage('註冊失敗: ' + err.message);
                        });
                } else {
                    showMessage('Firebase SDK 未加載，無法執行註冊。');
                }
            });
        }

        // 執行匿名登入
        const anonymousLoginBtn = document.getElementById('btn-anonymous-login');
        if (anonymousLoginBtn) {
            anonymousLoginBtn.addEventListener('click', () => {
                if (typeof firebase !== 'undefined') {
                    firebase.auth().signInAnonymously()
                        .then(() => {
                            showMessage('訪客登入成功！正在進入大廳...', true);
                            setTimeout(() => {
                                if (loginModal) loginModal.classList.remove('active');
                            }, 1000);
                        })
                        .catch(err => {
                            showMessage('訪客登入失敗: ' + err.message);
                        });
                } else {
                    showMessage('Firebase SDK 未加載，無法執行訪客登入。');
                }
            });
        }
    }

    // 工坊切換不同零件選單
    setupWorkshopTab(tabName) {
        const grid = document.getElementById('parts-grid');
        grid.innerHTML = '';

        const currentSelectedId = this.workshopConfig[tabName.slice(0, -1)]; // layer, disc, driver

        const list = PARTS[tabName];
        for (let key in list) {
            const part = list[key];
            const card = document.createElement('div');
            card.className = `part-item-card ${part.id === currentSelectedId ? 'selected' : ''}`;
            card.dataset.id = part.id;
            
            // 零件圖標 (Emoji/代號簡易美化)
            let iconText = '⚙️';
            if (tabName === 'layers') iconText = '🌀';
            if (tabName === 'discs') iconText = '💿';
            if (tabName === 'drivers') iconText = '🔩';

            card.innerHTML = `
                <div class="part-icon-placeholder" style="color: ${part.color || '#fff'}">${iconText}</div>
                <div class="part-item-name">${part.name.split(' ')[0]}</div>
            `;

            // 點擊事件：更換零件
            card.addEventListener('click', () => {
                document.querySelectorAll('.part-item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                
                this.workshopConfig[tabName.slice(0, -1)] = part.id;
                
                // 如果是結晶輪盤，且不是巨神，自動隱藏雙旋切換
                if (tabName === 'layers') {
                    const group = document.getElementById('spin-direction-group');
                    if (part.id === 'spriggan') {
                        group.classList.remove('hidden');
                    } else {
                        group.classList.add('hidden');
                        this.workshopConfig.spinDirection = part.spinDirection;
                    }
                    // 發光顏色同步
                    this.workshopConfig.colors.glow = part.color;
                    document.getElementById('color-glow').value = part.color;
                }

                this.updateWorkshopPreview();
                this.showPartInfo(tabName, part.id);
            });

            grid.appendChild(card);
        }

        this.showPartInfo(tabName, currentSelectedId);
    }

    // 顯示選定零件資訊
    showPartInfo(category, id) {
        const part = PARTS[category][id];
        if (!part) return;

        document.getElementById('info-part-name').textContent = part.name;
        document.getElementById('info-part-desc').textContent = part.description;
        
        const abilityDiv = document.getElementById('info-part-ability');
        if (part.ability) {
            abilityDiv.style.display = 'block';
            abilityDiv.textContent = `⚡ 被動特技 - ${part.ability}`;
        } else {
            abilityDiv.style.display = 'none';
        }
    }

    // 更新工坊預覽與數值進度條
    updateWorkshopPreview() {
        // 建立臨時陀螺物件
        this.previewBeybladeObj = new Beyblade(
            this.workshopConfig.name,
            {
                layer: this.workshopConfig.layer,
                disc: this.workshopConfig.disc,
                driver: this.workshopConfig.driver,
                spinDirection: this.workshopConfig.spinDirection
            },
            this.workshopConfig.colors
        );

        // 更新 UI 進度條與數值
        const stats = this.previewBeybladeObj.stats;
        const maxSingleStat = 30; // 六個屬性總和最高可能約 25-30
        
        for (let key in stats) {
            const bar = document.getElementById(`bar-${key}`);
            const valSpan = document.getElementById(`val-${key}`);
            if (bar && valSpan) {
                const percent = Math.min(100, (stats[key] / maxSingleStat) * 100);
                bar.style.width = `${percent}%`;
                valSpan.textContent = stats[key];
            }
        }
    }

    // 工坊預覽渲染循環
    startPreviewLoop() {
        const canvas = document.getElementById('workshop-preview-canvas');
        const ctx = canvas.getContext('2d');
        
        const loop = () => {
            if (this.currentScreen === 'workshop-screen') {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if (this.previewBeybladeObj) {
                    ctx.save();
                    // 將陀螺移到畫布中心
                    this.previewBeybladeObj.x = canvas.width / 2;
                    this.previewBeybladeObj.y = canvas.height / 2;
                    
                    if (this.previewSpinning) {
                        this.previewAngle += 0.12 * this.previewBeybladeObj.spinSign;
                        this.previewBeybladeObj.angle = this.previewAngle;
                    }
                    
                    // 繪製
                    this.previewBeybladeObj.draw(ctx);
                    ctx.restore();
                }
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    // ==========================================================================
    // 大廳邏輯 (Lobby Logic)
    // ==========================================================================
    
    // 合併預設與自訂陀螺列表
    getAllBeyblades() {
        return [...DEFAULT_BEYBLADES, ...this.customBeyblades];
    }

    // 渲染大廳陀螺選擇清單
    renderLobbyLists() {
        const p1List = document.querySelector('.p1-list');
        const p2List = document.querySelector('.p2-list');
        p1List.innerHTML = '';
        p2List.innerHTML = '';

        const all = this.getAllBeyblades();

        all.forEach(bey => {
            // 建立 P1 卡片
            const item1 = this.createLobbyItem(bey, 1);
            p1List.appendChild(item1);

            // 建立 P2 卡片
            const item2 = this.createLobbyItem(bey, 2);
            p2List.appendChild(item2);
        });

        // 重新高亮選取項
        this.selectLobbyBey(1, this.p1SelectedId);
        this.selectLobbyBey(2, this.p2SelectedId);
    }

    createLobbyItem(bey, playerNum) {
        const card = document.createElement('div');
        card.className = 'lobby-item-card';
        card.dataset.id = bey.id;

        const layerName = PARTS.layers[bey.config.layer] ? PARTS.layers[bey.config.layer].name.split(' ')[0] : '結晶';
        const dirText = bey.config.spinDirection === 'left' ? '左旋' : '右旋';

        card.innerHTML = `
            <div class="lobby-item-left">
                <div class="lobby-item-dot" style="background-color: ${bey.colors.glow}"></div>
                <div>
                    <div class="lobby-item-name">${bey.name}</div>
                    <div class="lobby-item-meta">${layerName} • ${dirText}</div>
                </div>
            </div>
        `;

        // 刪除按鈕 (僅非預設的自訂陀螺有)
        if (!bey.isPreset) {
            const delBtn = document.createElement('button');
            delBtn.className = 'btn-delete-bey';
            delBtn.innerHTML = '🗑️';
            delBtn.title = '刪除此陀螺';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`確定要刪除「${bey.name}」嗎？`)) {
                    this.customBeyblades = this.customBeyblades.filter(b => b.id !== bey.id);
                    this.saveLocalBeyblades();
                    
                    // 如果被刪除的是當前選取的，更換為預設
                    if (this.p1SelectedId === bey.id) this.p1SelectedId = 'preset-pegasus';
                    if (this.p2SelectedId === bey.id) this.p2SelectedId = 'preset-ldrago';
                    
                    this.renderLobbyLists();
                }
            });
            card.appendChild(delBtn);
        }

        // 選擇陀螺事件
        card.addEventListener('click', () => {
            this.selectLobbyBey(playerNum, bey.id);
        });

        return card;
    }

    // 在大廳中選取陀螺
    selectLobbyBey(playerNum, id) {
        const all = this.getAllBeyblades();
        const found = all.find(b => b.id === id);
        if (!found) return;

        if (playerNum === 1) {
            this.p1SelectedId = id;
            document.querySelectorAll('.p1-list .lobby-item-card').forEach(c => {
                c.classList.toggle('selected', c.dataset.id === id);
            });
            this.renderSelectedDetails(1, found);
        } else {
            this.p2SelectedId = id;
            document.querySelectorAll('.p2-list .lobby-item-card').forEach(c => {
                c.classList.toggle('selected', c.dataset.id === id);
            });
            this.renderSelectedDetails(2, found);
        }

        // 啟用/停用開始按鈕
        const btn = document.getElementById('btn-start-battle');
        if (this.p1SelectedId && this.p2SelectedId) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    }

    // 渲染已選擇的陀螺細節
    renderSelectedDetails(playerNum, bey) {
        const detailContainer = document.getElementById(`p${playerNum}-selected-details`);
        const stats = calculateStats(bey.config.layer, bey.config.disc, bey.config.driver);
        const dirText = bey.config.spinDirection === 'left' ? '左旋 (Left)' : '右旋 (Right)';
        const layerData = PARTS.layers[bey.config.layer];

        detailContainer.innerHTML = `
            <div class="selected-card ${playerNum === 2 ? 'p2-selected' : ''}">
                <div class="selected-icon-preview" style="border-color: ${bey.colors.glow}">
                    <span style="font-size: 1.8rem; color: ${bey.colors.glow}">🌀</span>
                </div>
                <div class="selected-info">
                    <h4>${bey.name}</h4>
                    <p style="color: ${bey.colors.glow}">${dirText}</p>
                    <p style="font-size: 0.75rem; color: var(--text-muted)">
                        攻:${stats.attack} 防:${stats.defense} 耐:${stats.stamina} 重:${stats.weight}
                    </p>
                    <p style="font-size: 0.7rem; color: var(--neon-yellow); margin-top: 4px;">
                        能力: ${layerData ? layerData.ability.split('：')[0] : '無'}
                    </p>
                </div>
            </div>
        `;
    }

    // ==========================================================================
    // 對戰區與發射物理控制 (Battle & Launcher)
    // ==========================================================================
    
    // 初始化對戰，進入發射準備
    startBattlePreparation() {
        const all = this.getAllBeyblades();
        const p1Data = all.find(b => b.id === this.p1SelectedId);
        const p2Data = all.find(b => b.id === this.p2SelectedId);

        if (!p1Data || !p2Data) return;

        // 建立戰鬥用陀螺實例
        this.p1Beyblade = new Beyblade(p1Data.name, p1Data.config, p1Data.colors);
        this.p2Beyblade = new Beyblade(p2Data.name, p2Data.config, p2Data.colors);

        // 更新場地設定
        const arenaStyle = document.getElementById('arena-style').value;
        if (arenaStyle === 'extreme') {
            this.physics.slopeGravity = 90; // 高斜度，重力大
        } else if (arenaStyle === 'flat') {
            this.physics.slopeGravity = 15; // 平緩
        } else {
            this.physics.slopeGravity = 45; // 標準
        }

        // 清空火花粒子與震動
        this.physics.particles = [];
        this.physics.screenShake = 0;
        this.battleTimer = 0;

        // 重置發射資料與倒數
        this.p1LaunchData = null;
        this.p2LaunchData = null;
        this.countdownTime = 0;
        this.countdownText = '';

        // 重置奧義與能量
        this.p1Spirit = 0;
        this.p2Spirit = 0;
        this.p1SpecialMoveTimer = 0;
        this.p2SpecialMoveTimer = 0;

        // [新增] 重置 HUD 模式文字與 initial mode
        const m1 = document.getElementById('hud-p1-mode');
        if (m1) {
            m1.className = 'mode-val mode-normal';
            m1.textContent = '均衡 (NORMAL)';
        }
        
        const oppMode = document.getElementById('opponent-mode').value;
        const difficulty = document.getElementById('ai-difficulty').value;
        const m2 = document.getElementById('hud-p2-mode');
        
        if (oppMode === 'ai') {
            if (difficulty === 'aggressive') {
                this.p2Beyblade.tacticalMode = 'attack';
            } else if (difficulty === 'defensive') {
                this.p2Beyblade.tacticalMode = 'defense';
            } else {
                this.p2Beyblade.tacticalMode = 'normal';
            }
            if (m2) {
                m2.className = `mode-val mode-${this.p2Beyblade.tacticalMode}`;
                const texts = {
                    normal: '均衡 (NORMAL)',
                    attack: '攻擊 (ATTACK) 🔥',
                    defense: '防禦 (DEFENSE) 🛡️'
                };
                m2.textContent = texts[this.p2Beyblade.tacticalMode];
            }
        } else {
            this.p2Beyblade.tacticalMode = 'normal';
            if (m2) {
                m2.className = 'mode-val mode-normal';
                m2.textContent = '均衡 (NORMAL)';
            }
        }

        // 更新鍵盤操作提示板 (如果 P2 是 AI，隱藏 P2 操作提示)
        const p2Hint = document.getElementById('p2-control-hint');
        if (p2Hint) {
            p2Hint.style.display = oppMode === 'ai' ? 'none' : 'flex';
        }

        // 更新頂欄 UI 顯示
        document.getElementById('hud-p1-name').textContent = this.p1Beyblade.name;
        document.getElementById('hud-p1-name').style.color = this.p1Beyblade.colors.glow;
        document.getElementById('hud-p1-spin').textContent = this.p1Beyblade.spinDirection === 'left' ? '左旋' : '右旋';
        
        document.getElementById('hud-p2-name').textContent = this.p2Beyblade.name;
        document.getElementById('hud-p2-name').style.color = this.p2Beyblade.colors.glow;
        document.getElementById('hud-p2-spin').textContent = this.p2Beyblade.spinDirection === 'left' ? '左旋' : '右旋';

        this.updateHUD();

        // 狀態切換至 P1 準備發射
        this.battleState = 'LAUNCH_P1';
        this.launchSetup.activePlayer = 1;
        this.launchSetup.posX = -130;
        this.launchSetup.posY = 0;
        this.launchSetup.isDragging = false;
        this.launchSetup.powerOscillating = false;
        this.launchSetup.powerVal = 0;

        document.getElementById('launch-overlay').classList.add('active');
        document.getElementById('launch-prompt-title').textContent = `${this.p1Beyblade.name} 發射準備`;
        document.getElementById('launch-prompt-subtitle').textContent = `在場地內拖曳左鍵調整射出角度，放開滑鼠啟動蓄力計。`;
        document.getElementById('launch-power-fill').style.width = '0%';
        document.getElementById('launch-power-val').textContent = '0%';

        // 啟動對戰渲染與物理循環
        this.stopBattle(); // 確保停止先前的循環
        
        // 使用定時更新與渲染分開，確保物理步伐穩定
        let lastTime = performance.now();
        const battleLoop = (time) => {
            let dt = (time - lastTime) / 1000;
            if (dt > 0.1) dt = 0.1; // 防止背景標籤頁恢復時物理崩潰
            lastTime = time;

            this.updateBattlePhysics(dt);
            this.drawBattleArena();

            if (this.currentScreen === 'battle-screen') {
                this.animationFrameId = requestAnimationFrame(battleLoop);
            }
        };
        this.animationFrameId = requestAnimationFrame(battleLoop);
    }

    // 停止戰鬥循環
    stopBattle() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this.battleInterval) {
            clearInterval(this.battleInterval);
            this.battleInterval = null;
        }
    }

    // 處理畫布鼠標點下：開始瞄準拖曳 或 鎖定力道發射
    handleCanvasMouseDown(e) {
        if (this.launchSetup.powerOscillating) {
            this.triggerLaunch();
            return;
        }

        if (this.battleState !== 'LAUNCH_P1' && this.battleState !== 'LAUNCH_P2') return;
        
        const canvas = document.getElementById('battle-canvas');
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left - 300;
        const my = e.clientY - rect.top - 300;

        // 發射點限制在場地邊緣內
        const dist = Math.sqrt(mx * mx + my * my);
        if (dist > this.arenaRadius - 20) return;

        this.launchSetup.isDragging = true;
        this.launchSetup.posX = mx;
        this.launchSetup.posY = my;
        this.launchSetup.dragStartX = mx;
        this.launchSetup.dragStartY = my;
        this.launchSetup.dragEndX = mx;
        this.launchSetup.dragEndY = my;
    }

    // 處理滑鼠移動：拖曳拉線瞄準
    handleCanvasMouseMove(e) {
        if (!this.launchSetup.isDragging) return;
        
        const canvas = document.getElementById('battle-canvas');
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left - 300;
        const my = e.clientY - rect.top - 300;

        this.launchSetup.dragEndX = mx;
        this.launchSetup.dragEndY = my;
    }

    // 處理滑鼠放開：確認角度，直接鎖定並進入倒數發射階段
    handleCanvasMouseUp(e) {
        if (!this.launchSetup.isDragging) return;
        this.launchSetup.isDragging = false;

        // 計算發射向量 (拉線的反方向作為射出速度)
        const dx = this.launchSetup.dragStartX - this.launchSetup.dragEndX;
        const dy = this.launchSetup.dragStartY - this.launchSetup.dragEndY;
        
        // 限制最大拉力速度向量
        const pullDist = Math.sqrt(dx * dx + dy * dy);
        let speed = Math.min(300, pullDist * 2.5);
        if (speed < 40) speed = 120; // 提供最低限度發射初速

        const angle = Math.atan2(dy, dx);
        this.launchSetup.launchForceX = Math.cos(angle) * speed;
        this.launchSetup.launchForceY = Math.sin(angle) * speed;

        // 直接以初始 40% 的拉線力道發射 (在 3-2-1 倒數中狂按按鍵拉引增加至 100%!)
        this.triggerLaunch(40);
    }

    // 完美發射判定儲存 (儲存發射數據，等待雙方同時射出)
    triggerLaunch(customPower = null) {
        this.launchSetup.powerOscillating = false;
        
        // 獲取蓄力百分比
        const power = customPower !== null ? customPower : 40;

        if (this.launchSetup.activePlayer === 1) {
            // 儲存 P1 發射資料
            this.p1LaunchData = {
                x: this.launchSetup.posX,
                y: this.launchSetup.posY,
                forceX: this.launchSetup.launchForceX,
                forceY: this.launchSetup.launchForceY,
                power: power
            };
            
            // 判斷 Player 2 類型
            const oppMode = document.getElementById('opponent-mode').value;
            if (oppMode === 'local') {
                // 轉為 P2 玩家發射階段
                this.battleState = 'LAUNCH_P2';
                this.launchSetup.activePlayer = 2;
                this.launchSetup.posX = 130;
                this.launchSetup.posY = 0;
                this.launchSetup.powerVal = 0;

                document.getElementById('launch-prompt-title').textContent = `${this.p2Beyblade.name} 發射準備`;
                document.getElementById('launch-prompt-subtitle').textContent = `在場地右側點選位置並拉曳發射角度，放開以鎖定角度。`;
                document.getElementById('launch-power-fill').style.width = '0%';
                document.getElementById('launch-power-val').textContent = '0%';
            } else {
                // AI 模式：自動計算 AI 發射資料，然後進入倒數
                this.p2LaunchData = this.calculateAiLaunch();
                
                this.battleState = 'COUNTDOWN';
                this.countdownTime = 3.0;
                this.countdownText = '3';
                document.getElementById('launch-overlay').classList.remove('active');
            }
        } else {
            // P2 本地玩家準備就緒
            this.p2LaunchData = {
                x: this.launchSetup.posX,
                y: this.launchSetup.posY,
                forceX: this.launchSetup.launchForceX,
                forceY: this.launchSetup.launchForceY,
                power: power
            };
            
            // 雙方準備就緒，進入倒數階段
            this.battleState = 'COUNTDOWN';
            this.countdownTime = 3.0;
            this.countdownText = '3';
            document.getElementById('launch-overlay').classList.remove('active');
        }
    }

    // AI 自動計算位置與速度
    calculateAiLaunch() {
        const difficulty = document.getElementById('ai-difficulty').value;
        let px = 130, py = 0;
        let vx = -200, vy = 0;
        const power = 55 + Math.random() * 20; // AI 初始拉線 55% ~ 75%，後續在倒數自動累加

        if (difficulty === 'aggressive') {
            // 攻擊型：發射在邊緣，獲得高速度衝撞對手
            px = 120 + (Math.random() - 0.5) * 40;
            py = 80 + (Math.random() - 0.5) * 40;
            // 瞄準 P1 預定發射的位置
            const dx = this.p1LaunchData.x - px;
            const dy = this.p1LaunchData.y - py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            vx = dx / dist * 350;
            vy = dy / dist * 350;
        } else if (difficulty === 'defensive') {
            // 防禦型：中心固守
            px = (Math.random() - 0.5) * 20;
            py = (Math.random() - 0.5) * 20;
            vx = (Math.random() - 0.5) * 50;
            vy = (Math.random() - 0.5) * 50;
        } else {
            // 均衡型
            px = 100;
            py = -50;
            vx = -250;
            vy = 120;
        }

        return {
            x: px,
            y: py,
            forceX: vx,
            forceY: vy,
            power: power
        };
    }

    // 執行同時發射
    executeSimultaneousLaunch() {
        // 同時啟動雙方陀螺 (基於拉拉線最終 mashing 累計的 power 重新套用速度)
        const p1PowerRatio = 0.6 + (this.p1LaunchData.power / 100) * 0.7;
        const p1Vx = this.p1LaunchData.forceX * p1PowerRatio;
        const p1Vy = this.p1LaunchData.forceY * p1PowerRatio;

        const p2PowerRatio = 0.6 + (this.p2LaunchData.power / 100) * 0.7;
        const p2Vx = this.p2LaunchData.forceX * p2PowerRatio;
        const p2Vy = this.p2LaunchData.forceY * p2PowerRatio;

        this.p1Beyblade.launch(this.p1LaunchData.x, this.p1LaunchData.y, p1Vx, p1Vy, this.p1LaunchData.power);
        this.p2Beyblade.launch(this.p2LaunchData.x, this.p2LaunchData.y, p2Vx, p2Vy, this.p2LaunchData.power);
        
        // 產生發射火花
        this.physics.addSparks(this.p1LaunchData.x, this.p1LaunchData.y, this.p1Beyblade.colors.glow, 15);
        this.physics.addSparks(this.p2LaunchData.x, this.p2LaunchData.y, this.p2Beyblade.colors.glow, 15);

        // 畫面力道震動
        this.physics.screenShake = 6;

        this.battleState = 'RUNNING';
        this.startBattleTimer();
    }

    // 啟動對戰計時器
    startBattleTimer() {
        this.battleTimer = 0;
        document.getElementById('battle-phase-indicator').textContent = '對戰中';
        document.getElementById('battle-phase-indicator').style.color = '#ff33aa';
        
        this.battleInterval = setInterval(() => {
            this.battleTimer += 0.01;
            document.getElementById('battle-timer-display').textContent = this.battleTimer.toFixed(2);
        }, 10);
    }

    // 物理世界更新
    updateBattlePhysics(dt) {
        // 瞄準與倒數階段的陀螺慢速自轉與預備位置更新
        if (this.battleState === 'LAUNCH_P1') {
            if (this.p1Beyblade) {
                this.p1Beyblade.x = this.launchSetup.posX;
                this.p1Beyblade.y = this.launchSetup.posY;
                this.p1Beyblade.angle += 3 * dt * this.p1Beyblade.spinSign;
            }
        } else if (this.battleState === 'LAUNCH_P2') {
            if (this.p1Beyblade && this.p1LaunchData) {
                this.p1Beyblade.x = this.p1LaunchData.x;
                this.p1Beyblade.y = this.p1LaunchData.y;
                this.p1Beyblade.angle += 1 * dt * this.p1Beyblade.spinSign;
            }
            if (this.p2Beyblade) {
                this.p2Beyblade.x = this.launchSetup.posX;
                this.p2Beyblade.y = this.launchSetup.posY;
                this.p2Beyblade.angle += 3 * dt * this.p2Beyblade.spinSign;
            }
        } else if (this.battleState === 'COUNTDOWN') {
            // 倒數計時更新
            this.countdownTime -= dt;
            if (this.countdownTime > 2.0) {
                this.countdownText = '3';
            } else if (this.countdownTime > 1.0) {
                this.countdownText = '2';
            } else if (this.countdownTime > 0.0) {
                this.countdownText = '1';
            } else if (this.countdownTime > -0.6) {
                this.countdownText = 'GO SHOOT!!';
            } else {
                this.executeSimultaneousLaunch();
                return;
            }

            // 更新 UI 文字
            document.getElementById('battle-phase-indicator').textContent = this.countdownText;
            document.getElementById('battle-phase-indicator').style.color = '#ffcc00';
            document.getElementById('battle-timer-display').textContent = 'READY';

            // 倒數期間提供微弱的基礎蓄力充能，且電腦 AI 會自動拉引充能
            if (this.p1LaunchData) {
                this.p1LaunchData.power = Math.min(100, this.p1LaunchData.power + 5 * dt);
            }
            if (this.p2LaunchData) {
                const oppMode = document.getElementById('opponent-mode').value;
                if (oppMode === 'ai') {
                    const difficulty = document.getElementById('ai-difficulty').value;
                    let chargeSpeed = 38; // 均衡/防禦
                    if (difficulty === 'aggressive') chargeSpeed = 50; // 攻擊型 AI 拉得更快
                    this.p2LaunchData.power = Math.min(100, this.p2LaunchData.power + chargeSpeed * dt);
                } else {
                    this.p2LaunchData.power = Math.min(100, this.p2LaunchData.power + 5 * dt);
                }
            }

            if (this.p1Beyblade && this.p1LaunchData) {
                this.p1Beyblade.x = this.p1LaunchData.x;
                this.p1Beyblade.y = this.p1LaunchData.y;
                this.p1Beyblade.angle += 1 * dt * this.p1Beyblade.spinSign;
            }
            if (this.p2Beyblade && this.p2LaunchData) {
                this.p2Beyblade.x = this.p2LaunchData.x;
                this.p2Beyblade.y = this.p2LaunchData.y;
                this.p2Beyblade.angle += 1 * dt * this.p2Beyblade.spinSign;
            }
        }

        if (this.battleState !== 'RUNNING') {
            // 如果還在準備/倒數，僅更新粒子動畫，不執行核心物理
            this.physics.update(this.p1Beyblade, this.p2Beyblade, dt);
            return;
        }

        // 氣量隨時間自然充能
        this.p1Spirit = Math.min(100, this.p1Spirit + dt * 14.0); // 操作性：氣量回復加快，讓玩家更常衝刺/放招
        this.p2Spirit = Math.min(100, this.p2Spirit + dt * 14.0); // 操作性：氣量回復加快

        // 執行 AI 智慧決策
        this.updateAiBattleDecisions(dt);

        // 處理 Player 1 鍵盤微引導方向控制 (Steer)
        let p1Dx = 0, p1Dy = 0;
        if (this.keys['KeyW']) p1Dy = -1;
        if (this.keys['KeyS']) p1Dy = 1;
        if (this.keys['KeyA']) p1Dx = -1;
        if (this.keys['KeyD']) p1Dx = 1;
        if (p1Dx !== 0 && p1Dy !== 0) {
            p1Dx *= 0.7071;
            p1Dy *= 0.7071;
        }
        if ((p1Dx !== 0 || p1Dy !== 0) && this.p1Spirit > 0) {
            this.p1Spirit = Math.max(0, this.p1Spirit - dt * 3.2); // 操作性：微引導耗氣降低，長按控制更有用
            this.physics.steerBeyblade(this.p1Beyblade, p1Dx, p1Dy, dt);
        }

        // 處理 Player 2 鍵盤微引導方向控制 (Steer) - 僅本地雙人對戰可用
        const oppMode = document.getElementById('opponent-mode').value;
        if (oppMode === 'local') {
            let p2Dx = 0, p2Dy = 0;
            if (this.keys['ArrowUp']) p2Dy = -1;
            if (this.keys['ArrowDown']) p2Dy = 1;
            if (this.keys['ArrowLeft']) p2Dx = -1;
            if (this.keys['ArrowRight']) p2Dx = 1;
            if (p2Dx !== 0 && p2Dy !== 0) {
                p2Dx *= 0.7071;
                p2Dy *= 0.7071;
            }
            if ((p2Dx !== 0 || p2Dy !== 0) && this.p2Spirit > 0) {
                this.p2Spirit = Math.max(0, this.p2Spirit - dt * 3.2); // 操作性：微引導耗氣降低
                this.physics.steerBeyblade(this.p2Beyblade, p2Dx, p2Dy, dt);
            }
        }

        // 進行一格物理計算
        this.physics.update(this.p1Beyblade, this.p2Beyblade, dt);

        this.updateHUD();

        // 檢查勝利判定條件
        this.checkMatchEnd();
    }

    // 更新抬頭顯示器 (HUD)
    updateHUD() {
        if (!this.p1Beyblade || !this.p2Beyblade) return;

        // P1
        const p1StaminaPct = (this.p1Beyblade.stamina / this.p1Beyblade.maxStamina) * 100;
        const p1BurstPct = Math.max(0, (this.p1Beyblade.burstLock / this.p1Beyblade.maxBurstLock) * 100);
        document.getElementById('hud-p1-stamina').style.width = `${p1StaminaPct}%`;
        document.getElementById('hud-p1-burst').style.width = `${p1BurstPct}%`;
        document.getElementById('hud-p1-spirit').style.width = `${this.p1Spirit}%`;

        // P2
        const p2StaminaPct = (this.p2Beyblade.stamina / this.p2Beyblade.maxStamina) * 100;
        const p2BurstPct = Math.max(0, (this.p2Beyblade.burstLock / this.p2Beyblade.maxBurstLock) * 100);
        document.getElementById('hud-p2-stamina').style.width = `${p2StaminaPct}%`;
        document.getElementById('hud-p2-burst').style.width = `${p2BurstPct}%`;
        document.getElementById('hud-p2-spirit').style.width = `${this.p2Spirit}%`;
    }

    // 檢查戰鬥是否結束
    checkMatchEnd() {
        let p1Dead = this.p1Beyblade.isStopped || this.p1Beyblade.isOut || this.p1Beyblade.isBurst;
        let p2Dead = this.p2Beyblade.isStopped || this.p2Beyblade.isOut || this.p2Beyblade.isBurst;

        if (p1Dead || p2Dead) {
            this.battleState = 'ENDED';
            this.stopBattle();
            
            document.getElementById('battle-phase-indicator').textContent = '對戰結束';
            document.getElementById('battle-phase-indicator').style.color = '#fff';

            // 延遲 1.2 秒顯示結算視窗，讓擊爆飛散或出界動畫播完
            setTimeout(() => this.showResults(), 1200);
        }
    }

    // 結算視窗
    showResults() {
        let winner = '';
        let type = '';

        // 判定勝負情況
        const p1Out = this.p1Beyblade.isOut;
        const p2Out = this.p2Beyblade.isOut;
        const p1Burst = this.p1Beyblade.isBurst;
        const p2Burst = this.p2Beyblade.isBurst;
        const p1Stopped = this.p1Beyblade.isStopped;
        const p2Stopped = this.p2Beyblade.isStopped;

        if (p1Burst && p2Burst) {
            winner = '雙方平手';
            type = '雙重爆裂 (Double Burst)';
        } else if (p1Burst) {
            winner = this.p2Beyblade.name;
            type = '爆裂擊爆 (Burst Finish) 💥';
        } else if (p2Burst) {
            winner = this.p1Beyblade.name;
            type = '爆裂擊爆 (Burst Finish) 💥';
        } else if (p1Out && p2Out) {
            winner = '雙方平手';
            type = '雙重場外淘汰 (Double Over Finish)';
        } else if (p1Out) {
            winner = this.p2Beyblade.name;
            type = '場外淘汰 (Over Finish) 🕳️';
        } else if (p2Out) {
            winner = this.p1Beyblade.name;
            type = '場外淘汰 (Over Finish) 🕳️';
        } else if (p1Stopped && p2Stopped) {
            // 比誰的剩餘體力多或最後轉動 (這裏用 launch/stopped 先後)
            if (this.p1Beyblade.stamina > this.p2Beyblade.stamina) {
                winner = this.p1Beyblade.name;
            } else {
                winner = this.p2Beyblade.name;
            }
            type = '持久勝 (Spin Finish) 🌀';
        } else if (p1Stopped) {
            winner = this.p2Beyblade.name;
            type = '持久勝 (Spin Finish) 🌀';
        } else if (p2Stopped) {
            winner = this.p1Beyblade.name;
            type = '持久勝 (Spin Finish) 🌀';
        }

        // 渲染結算視窗
        const displayWinner = document.getElementById('winner-name-display');
        displayWinner.textContent = winner === '雙方平手' ? winner : `${winner} 獲勝！`;
        displayWinner.style.color = winner === '雙方平手' ? '#ffffff' : (winner === this.p1Beyblade.name ? this.p1Beyblade.colors.glow : this.p2Beyblade.colors.glow);
        
        document.getElementById('victory-type-display').textContent = type;
        document.getElementById('result-time').textContent = `${this.battleTimer.toFixed(2)} 秒`;
        document.getElementById('result-p1-stamina').textContent = Math.floor(this.p1Beyblade.stamina);
        document.getElementById('result-p2-stamina').textContent = Math.floor(this.p2Beyblade.stamina);

        document.getElementById('results-modal').classList.add('active');
    }

    // 繪製戰鬥場地
    drawBattleArena() {
        const canvas = document.getElementById('battle-canvas');
        const ctx = canvas.getContext('2d');
        
        ctx.save();

        // 1. 畫面震動效果
        if (this.physics.screenShake > 0) {
            const dx = (Math.random() - 0.5) * this.physics.screenShake;
            const dy = (Math.random() - 0.5) * this.physics.screenShake;
            ctx.translate(dx, dy);
        }

        // 清空背景
        ctx.fillStyle = '#07070d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 平移坐標系到中心點 (300, 300)
        ctx.translate(canvas.width / 2, canvas.height / 2);

        // 2. 繪製競技場底盤
        ctx.beginPath();
        ctx.arc(0, 0, this.arenaRadius, 0, Math.PI * 2);
        
        // 碗狀陰影與深淺漸層
        const radGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, this.arenaRadius);
        radGrad.addColorStop(0, '#0a0a14'); // 中心最深
        radGrad.addColorStop(0.6, '#141424');
        radGrad.addColorStop(0.95, '#1e1e35');
        radGrad.addColorStop(1, '#2c2c4a'); // 邊緣最淺
        ctx.fillStyle = radGrad;
        ctx.fill();

        // 同心圓線條 (斜率引導視覺)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        for (let r = 50; r < this.arenaRadius; r += 50) {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 放射狀格線 (雷達感)
        ctx.strokeStyle = 'rgba(0, 204, 255, 0.04)';
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * this.arenaRadius, Math.sin(angle) * this.arenaRadius);
            ctx.stroke();
        }

        // 3. 繪製出界口袋 openings (3 個) 與紅色警告警示
        this.physics.pockets.forEach(pocket => {
            ctx.save();
            ctx.beginPath();
            // 袋口邊緣外凸弧度
            ctx.arc(0, 0, this.arenaRadius + 6, pocket.start, pocket.end);
            ctx.strokeStyle = '#ff3344';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff3344';
            ctx.stroke();
            ctx.restore();
            
            // 袋口黑色陰影
            ctx.beginPath();
            ctx.moveTo(Math.cos(pocket.start) * this.arenaRadius, Math.sin(pocket.start) * this.arenaRadius);
            ctx.lineTo(Math.cos(pocket.start) * (this.arenaRadius + 30), Math.sin(pocket.start) * (this.arenaRadius + 30));
            ctx.arc(0, 0, this.arenaRadius + 30, pocket.start, pocket.end);
            ctx.lineTo(Math.cos(pocket.end) * this.arenaRadius, Math.sin(pocket.end) * this.arenaRadius);
            ctx.arc(0, 0, this.arenaRadius, pocket.end, pocket.start, true);
            ctx.fillStyle = '#030306';
            ctx.fill();
        });

        // 4. 繪製競技場實體牆壁邊界 (除了口袋區域)
        ctx.strokeStyle = '#3e3e5c';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 0;
        
        // 繪製非口袋段的圍牆
        const steps = 120;
        let drawing = false;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const angle = (Math.PI * 2 / steps) * i;
            const inPocket = this.physics.isInPocket(angle);
            
            const px = Math.cos(angle) * this.arenaRadius;
            const py = Math.sin(angle) * this.arenaRadius;

            if (!inPocket) {
                if (!drawing) {
                    ctx.moveTo(px, py);
                    drawing = true;
                } else {
                    ctx.lineTo(px, py);
                }
            } else {
                if (drawing) {
                    ctx.stroke();
                    ctx.beginPath();
                    drawing = false;
                }
            }
        }
        if (drawing) ctx.stroke();

        // 5. 繪製發射導引瞄準線 (LAUNCH_P1 或 LAUNCH_P2 狀態)
        if ((this.battleState === 'LAUNCH_P1' && this.launchSetup.activePlayer === 1) || 
            (this.battleState === 'LAUNCH_P2' && this.launchSetup.activePlayer === 2)) {
            
            // 繪製發射落點十字
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.launchSetup.posX, this.launchSetup.posY, 28, 0, Math.PI * 2);
            ctx.stroke();

            // 繪製十字瞄準心
            ctx.beginPath();
            ctx.moveTo(this.launchSetup.posX - 10, this.launchSetup.posY);
            ctx.lineTo(this.launchSetup.posX + 10, this.launchSetup.posY);
            ctx.moveTo(this.launchSetup.posX, this.launchSetup.posY - 10);
            ctx.lineTo(this.launchSetup.posX, this.launchSetup.posY + 10);
            ctx.stroke();

            // 如果正在拖曳，畫拉力指示箭頭
            if (this.launchSetup.isDragging) {
                ctx.beginPath();
                ctx.moveTo(this.launchSetup.dragStartX, this.launchSetup.dragStartY);
                ctx.lineTo(this.launchSetup.dragEndX, this.launchSetup.dragEndY);
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([4, 4]); // 虛線
                ctx.stroke();
                ctx.setLineDash([]); // 恢復實線

                // 箭頭方向 (指向發射方向，即拉反方向)
                const dx = this.launchSetup.dragStartX - this.launchSetup.dragEndX;
                const dy = this.launchSetup.dragStartY - this.launchSetup.dragEndY;
                const pullDist = Math.sqrt(dx*dx + dy*dy);
                if (pullDist > 10) {
                    const arrowX = this.launchSetup.dragStartX + dx * 0.5;
                    const arrowY = this.launchSetup.dragStartY + dy * 0.5;
                    ctx.beginPath();
                    ctx.arc(arrowX, arrowY, 6, 0, Math.PI*2);
                    ctx.fillStyle = '#ffcc00';
                    ctx.fill();
                }
            }
        }

        // 5.2 如果是 P2 正在瞄準，我們可以把 P1 的已鎖定發射點與方向箭頭畫出來 (半透明引導)
        if (this.battleState === 'LAUNCH_P2' && this.p1LaunchData) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            // 繪製 P1 已鎖定圈圈
            ctx.strokeStyle = this.p1Beyblade.colors.glow;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.p1LaunchData.x, this.p1LaunchData.y, 28, 0, Math.PI * 2);
            ctx.stroke();

            // 繪製 P1 已鎖定指向線
            ctx.beginPath();
            ctx.moveTo(this.p1LaunchData.x, this.p1LaunchData.y);
            ctx.lineTo(this.p1LaunchData.x + this.p1LaunchData.vx * 0.4, this.p1LaunchData.y + this.p1LaunchData.vy * 0.4);
            ctx.strokeStyle = this.p1Beyblade.colors.glow;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // 5.5 繪製倒數計時文字與蓄力拉線光圈 (Mashing Ripcord Visuals)
        if (this.battleState === 'COUNTDOWN') {
            // P1 蓄力光圈與文字
            if (this.p1LaunchData) {
                ctx.save();
                ctx.lineWidth = 4;
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.p1Beyblade.colors.glow;
                
                // 灰色底圈
                ctx.beginPath();
                ctx.arc(this.p1LaunchData.x, this.p1LaunchData.y, 35, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.stroke();
                
                // 霓虹進度弧
                const p1EndAngle = -Math.PI / 2 + (Math.PI * 2 * (this.p1LaunchData.power / 100));
                ctx.beginPath();
                ctx.arc(this.p1LaunchData.x, this.p1LaunchData.y, 35, -Math.PI / 2, p1EndAngle);
                ctx.strokeStyle = this.p1Beyblade.colors.glow;
                ctx.stroke();
                
                // 漂浮提示與力道
                ctx.font = 'bold 11px Outfit, Noto Sans TC, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText(`按 [空白鍵] 拉引!`, this.p1LaunchData.x, this.p1LaunchData.y - 48);
                ctx.fillText(`${Math.floor(this.p1LaunchData.power)}%`, this.p1LaunchData.x, this.p1LaunchData.y + 4);
                ctx.restore();
            }

            // P2 蓄力光圈與文字
            if (this.p2LaunchData) {
                ctx.save();
                ctx.lineWidth = 4;
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.p2Beyblade.colors.glow;
                
                ctx.beginPath();
                ctx.arc(this.p2LaunchData.x, this.p2LaunchData.y, 35, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.stroke();
                
                const p2EndAngle = -Math.PI / 2 + (Math.PI * 2 * (this.p2LaunchData.power / 100));
                ctx.beginPath();
                ctx.arc(this.p2LaunchData.x, this.p2LaunchData.y, 35, -Math.PI / 2, p2EndAngle);
                ctx.strokeStyle = this.p2Beyblade.colors.glow;
                ctx.stroke();
                
                ctx.font = 'bold 11px Outfit, Noto Sans TC, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                const oppMode = document.getElementById('opponent-mode').value;
                const promptText = oppMode === 'local' ? '按 [Enter] 拉引!' : 'AI 蓄力中...';
                ctx.fillText(promptText, this.p2LaunchData.x, this.p2LaunchData.y - 48);
                ctx.fillText(`${Math.floor(this.p2LaunchData.power)}%`, this.p2LaunchData.x, this.p2LaunchData.y + 4);
                ctx.restore();
            }

            ctx.save();
            ctx.font = 'italic 800 80px Outfit, Noto Sans TC, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 霓虹發光字體效果
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ffcc00';
            ctx.fillStyle = '#ffffff';
            
            if (this.countdownText === 'GO SHOOT!!') {
                ctx.shadowColor = '#00ff66';
                ctx.fillStyle = '#00ff66';
                ctx.font = 'italic 800 90px Outfit, Noto Sans TC, sans-serif';
            }
            
            ctx.fillText(this.countdownText, 0, 0);
            ctx.restore();
        }

        // 6. 繪製陀螺
        if (this.p2Beyblade) this.p2Beyblade.draw(ctx);
        if (this.p1Beyblade) this.p1Beyblade.draw(ctx);

        // 7. 繪製物理粒子 (碰撞火花與激爆波動)
        this.physics.drawParticles(ctx);

        ctx.restore();
    }

    // [新增] 鍵盤單次按下事件 (Dashes, Mode Switches, Special Moves, countdown pull)
    handleBattleKeyDown(e) {
        if (this.currentScreen !== 'battle-screen') return;

        // --- 發射蓄力拉線狂按階段 ---
        if (this.battleState === 'COUNTDOWN') {
            if (e.code === 'Space') {
                // P1 拉引蓄力
                if (this.p1LaunchData) {
                    this.p1LaunchData.power = Math.min(100, this.p1LaunchData.power + 8.5);
                    this.physics.addSparks(this.p1LaunchData.x, this.p1LaunchData.y, this.p1Beyblade.colors.glow, 6);
                }
            }
            if (e.code === 'Enter') {
                // P2 拉引蓄力 (僅在本地雙人模式)
                const oppMode = document.getElementById('opponent-mode').value;
                if (oppMode === 'local' && this.p2LaunchData) {
                    this.p2LaunchData.power = Math.min(100, this.p2LaunchData.power + 8.5);
                    this.physics.addSparks(this.p2LaunchData.x, this.p2LaunchData.y, this.p2Beyblade.colors.glow, 6);
                }
            }
            return;
        }

        // --- 戰鬥中操作階段 ---
        if (this.battleState !== 'RUNNING') return;

        // Player 1: 戰術切換與奧義大招
        if (e.code === 'KeyQ') {
            this.cycleTacticalMode(1);
        }
        if (e.code === 'Space') {
            this.triggerSpecialMove(1);
        }

        // Player 2: 戰術切換與奧義大招 (僅本地雙人可用)
        const oppMode = document.getElementById('opponent-mode').value;
        if (oppMode === 'local') {
            if (e.code === 'Slash' || e.code === 'Period' || e.code === 'ShiftRight') {
                this.cycleTacticalMode(2);
            }
            if (e.code === 'Enter') {
                this.triggerSpecialMove(2);
            }
        }
        
        // 瞬間衝刺 (Dash) 偵測：單次鍵入且氣量高於 40%
        let p1Dx = 0, p1Dy = 0;
        if (e.code === 'KeyW') p1Dy = -1;
        if (e.code === 'KeyS') p1Dy = 1;
        if (e.code === 'KeyA') p1Dx = -1;
        if (e.code === 'KeyD') p1Dx = 1;
        
        if ((p1Dx !== 0 || p1Dy !== 0) && this.p1Spirit >= 28) {
            this.p1Spirit -= 28; // 操作性：衝刺成本降低
            this.physics.dashBeyblade(this.p1Beyblade, p1Dx, p1Dy);
        }
        
        if (oppMode === 'local') {
            let p2Dx = 0, p2Dy = 0;
            if (e.code === 'ArrowUp') p2Dy = -1;
            if (e.code === 'ArrowDown') p2Dy = 1;
            if (e.code === 'ArrowLeft') p2Dx = -1;
            if (e.code === 'ArrowRight') p2Dx = 1;
            
            if ((p2Dx !== 0 || p2Dy !== 0) && this.p2Spirit >= 28) {
                this.p2Spirit -= 28; // 操作性：衝刺成本降低
                this.physics.dashBeyblade(this.p2Beyblade, p2Dx, p2Dy);
            }
        }
    }

    // [新增] 切換戰術模式
    cycleTacticalMode(playerNum) {
        const bey = playerNum === 1 ? this.p1Beyblade : this.p2Beyblade;
        if (!bey) return;

        const modes = ['normal', 'attack', 'defense', 'stamina'];
        let idx = modes.indexOf(bey.tacticalMode);
        idx = (idx + 1) % modes.length;
        bey.tacticalMode = modes[idx];

        this.syncModeHud(playerNum);

        // 彈出模式切換字體
        this.physics.addFloatingText(bey.x, bey.y, bey.tacticalMode.toUpperCase() + " MODE", bey.colors.glow);
        this.physics.addSparks(bey.x, bey.y, bey.colors.glow, 4);
    }

    // [新增] 觸發奧義大招
    triggerSpecialMove(playerNum) {
        const spirit = playerNum === 1 ? this.p1Spirit : this.p2Spirit;
        const bey = playerNum === 1 ? this.p1Beyblade : this.p2Beyblade;
        
        if (!bey || spirit < 100 || bey.specialMoveActive) return;

        // 消耗能量
        if (playerNum === 1) this.p1Spirit = 0;
        else this.p2Spirit = 0;

        // 啟用特殊效果
        bey.specialMoveActive = true;
        bey.specialMoveTimer = 3.0; // 3 秒強化

        // 回補 Stamina 轉速
        bey.stamina = Math.min(bey.maxStamina, bey.stamina + 800);

        // 取得該陀螺專屬招式
        const moveName = this.getSpecialMoveName(bey.config.layer, bey.name);

        // 發動大震動、擴散波與視覺文字
        this.physics.addBurstWave(bey.x, bey.y, bey.colors.glow);
        this.physics.addSparks(bey.x, bey.y, '#ffffff', 20);
        this.physics.addSparks(bey.x, bey.y, bey.colors.glow, 20);
        
        this.physics.addFloatingText(bey.x, bey.y - 32, moveName, '#ffffff');
        this.physics.addFloatingText(bey.x, bey.y, "SPECIAL MOVE RELEASE!!!", bey.colors.glow);
        
        this.physics.screenShake = Math.max(this.physics.screenShake, 8.5);
    }

    // [新增] 獲取不同結晶輪盤的專屬招式名字
    getSpecialMoveName(layerId, name) {
        const moves = {
            pegasus: '天馬彗星風暴 (Pegasus Storm)!!',
            ldrago: '龍皇破滅突擊 (Drago Destroyer)!!',
            leone: '獅王風暴羽翼 (Leone Gale Force)!!',
            spriggan: '巨神反擊衝撞 (Spriggan Impact)!!',
            dran_sword: '蒼藍神劍一閃 (Cobalt Slash)!!',
            hells_scythe: '地獄鐮刀斬切 (Gravity Reaper)!!',
            wizard_arrow: '巫師箭矢魔弓 (Shining Arrow)!!',
            knight_shield: '騎士防護崩擊 (Deflect Bound)!!'
        };
        return moves[layerId] || `${name.split(' ')[0]} 極限奧義!!`;
    }

    // [新增] AI 自適應決策與微引導控制
    updateAiBattleDecisions(dt) {
        if (this.battleState !== 'RUNNING' || !this.p2Beyblade || this.p2Beyblade.isStopped || this.p2Beyblade.isOut || this.p2Beyblade.isBurst) return;

        const oppMode = document.getElementById('opponent-mode').value;
        if (oppMode !== 'ai') return;

        const difficulty = document.getElementById('ai-difficulty').value;
        
        if (this.aiDecisionCooldown === undefined) this.aiDecisionCooldown = 0;
        this.aiDecisionCooldown -= dt;

        // 1. 集滿氣自動放奧義大絕
        if (this.p2Spirit >= 100) {
            this.triggerSpecialMove(2);
        }

        // 2. 戰術模式適應切換
        if (this.p2Beyblade.stamina / this.p2Beyblade.maxStamina < 0.35) {
            // 體力告急時自動切換至 Stamina 模式節能
            if (this.p2Beyblade.tacticalMode !== 'stamina') {
                this.p2Beyblade.tacticalMode = 'stamina';
                this.syncModeHud(2);
                this.physics.addFloatingText(this.p2Beyblade.x, this.p2Beyblade.y, "STAMINA", this.p2Beyblade.colors.glow);
            }
        } else {
            // 否則依難度性格選取模式
            if (difficulty === 'aggressive') {
                if (this.p2Beyblade.tacticalMode !== 'attack') {
                    this.p2Beyblade.tacticalMode = 'attack';
                    this.syncModeHud(2);
                }
            } else if (difficulty === 'defensive') {
                if (this.p2Beyblade.tacticalMode !== 'defense') {
                    this.p2Beyblade.tacticalMode = 'defense';
                    this.syncModeHud(2);
                }
            } else {
                // 均衡型 AI：當對手開啟奧義大招時，自動轉為防禦模式抵禦
                if (this.p1Beyblade.specialMoveActive) {
                    if (this.p2Beyblade.tacticalMode !== 'defense') {
                        this.p2Beyblade.tacticalMode = 'defense';
                        this.syncModeHud(2);
                    }
                } else {
                    if (this.p2Beyblade.tacticalMode !== 'normal') {
                        this.p2Beyblade.tacticalMode = 'normal';
                        this.syncModeHud(2);
                    }
                }
            }
        }

        // 3. AI 衝刺決策 (Dash)
        if (this.aiDecisionCooldown <= 0) {
            this.aiDecisionCooldown = 0.8 + Math.random() * 0.7; // 隨機決策頻率

            const dx = this.p1Beyblade.x - this.p2Beyblade.x;
            const dy = this.p1Beyblade.y - this.p2Beyblade.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 10) {
                const nx = dx / dist;
                const ny = dy / dist;

                if (difficulty === 'aggressive') {
                    // 攻擊型 AI：只要有氣 (>= 40) 就拼命朝玩家衝刺
                    if (this.p2Spirit >= 40 && dist > 70) {
                        this.p2Spirit -= 40;
                        this.physics.dashBeyblade(this.p2Beyblade, nx, ny);
                    }
                } else if (difficulty === 'defensive') {
                    // 防禦型 AI：如果自己離場地缺口(口袋)太近，主動朝中心或反方向衝刺自救
                    const distToCenter = Math.sqrt(this.p2Beyblade.x * this.p2Beyblade.x + this.p2Beyblade.y * this.p2Beyblade.y);
                    if (this.p2Spirit >= 40 && distToCenter > 140) {
                        // 衝回中心
                        this.p2Spirit -= 40;
                        this.physics.dashBeyblade(this.p2Beyblade, -this.p2Beyblade.x / distToCenter, -this.p2Beyblade.y / distToCenter);
                    }
                } else {
                    // 均衡型 AI：中等機率發動追擊衝刺
                    if (this.p2Spirit >= 40 && Math.random() < 0.4 && dist > 100) {
                        this.p2Spirit -= 40;
                        this.physics.dashBeyblade(this.p2Beyblade, nx, ny);
                    }
                }
            }
        }

        // 4. 持續的方向引導 (Steer)
        const dx = this.p1Beyblade.x - this.p2Beyblade.x;
        const dy = this.p1Beyblade.y - this.p2Beyblade.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
            const nx = dx / dist;
            const ny = dy / dist;

            if (difficulty === 'aggressive') {
                // 追逐玩家
                this.physics.steerBeyblade(this.p2Beyblade, nx, ny, dt);
            } else if (difficulty === 'defensive') {
                // 引導固守中心點
                const distToCenter = Math.sqrt(this.p2Beyblade.x * this.p2Beyblade.x + this.p2Beyblade.y * this.p2Beyblade.y);
                if (distToCenter > 10) {
                    this.physics.steerBeyblade(this.p2Beyblade, -this.p2Beyblade.x / distToCenter, -this.p2Beyblade.y / distToCenter, dt);
                }
            } else {
                // 均衡型：向對手逼近但力道減半，保留戰略空間
                this.physics.steerBeyblade(this.p2Beyblade, nx * 0.5, ny * 0.5, dt);
            }
        }
    }

    // [新增] 同步 HUD 戰術模式面板文字
    syncModeHud(playerNum) {
        const bey = playerNum === 1 ? this.p1Beyblade : this.p2Beyblade;
        if (!bey) return;
        const modeSpan = document.getElementById(`hud-p${playerNum}-mode`);
        if (modeSpan) {
            modeSpan.className = `mode-val mode-${bey.tacticalMode}`;
            const texts = {
                normal: '均衡 (NORMAL)',
                attack: '攻擊 (ATTACK) 🔥',
                defense: '防禦 (DEFENSE) 🛡️',
                stamina: '持久 (STAMINA) 🌀'
            };
            modeSpan.textContent = texts[bey.tacticalMode];
        }
    }
}

// 啟動應用
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
