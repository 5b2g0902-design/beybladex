// 戰鬥陀螺核心類別 (Beyblade Class)

class Beyblade {
    constructor(name, config, customColors = {}) {
        this.name = name || "未命名陀螺";
        this.config = {
            layer: config.layer || 'pegasus',
            disc: config.disc || 'wing',
            driver: config.driver || 'flat'
        };

        // 顏色配置 (主色、副色、發光色)
        const defaultGlow = PARTS.layers[this.config.layer] ? PARTS.layers[this.config.layer].color : '#00ffff';
        this.colors = {
            primary: customColors.primary || '#333333',
            secondary: customColors.secondary || '#777777',
            glow: customColors.glow || defaultGlow
        };

        // 旋轉方向 (若結晶輪盤是雙旋，則依據 config 指定；否則使用輪盤預設)
        const layerData = PARTS.layers[this.config.layer];
        this.spinDirection = (layerData.spinDirection === 'dual') 
            ? (config.spinDirection || 'right') 
            : layerData.spinDirection; // 'right' 或 'left'
        
        this.spinSign = (this.spinDirection === 'left') ? -1 : 1;

        // 計算綜合屬性
        this.stats = calculateStats(this.config.layer, this.config.disc, this.config.driver);
        
        // 物理常數與屬性映射
        this.mass = 50 + (this.stats.weight * 3.5); // 質量，影響碰撞慣性
        this.maxStamina = 5000 + (this.stats.stamina * 250); // 最大轉速上限 (Stamina)
        this.stamina = this.maxStamina; // 當前轉速
        
        // 摩擦阻力與軸底類型相關
        const driverData = PARTS.drivers[this.config.driver];
        this.movementType = driverData.movement; // 'aggressive', 'stationary', 'semi-stationary', 'wild'
        
        // 基礎衰減係數：持久型衰減慢，攻擊型衰減快
        this.baseDecay = 0.8 + (10 - this.stats.stamina) * 0.15;
        // 發射後的物理狀態
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.angle = Math.random() * Math.PI * 2; // 旋轉角度
        
        // 爆裂值 (Burst Lock)
        this.maxBurstLock = 80 + (this.stats.burstResistance * 6);
        this.burstLock = this.maxBurstLock;
        
        // 狀態標記
        this.isBurst = false;
        this.isOut = false;
        this.isStopped = false;

        // [新增] 戰術模式與奧義
        this.tacticalMode = 'normal'; // 'normal', 'attack', 'defense', 'stamina'
        this.specialMoveActive = false;
        this.specialMoveTimer = 0;

        // 擊爆時零件飛散的獨立物理狀態
        this.parts = {
            layer: { x: 0, y: 0, vx: 0, vy: 0, angle: 0, vangle: 0, radius: 24 },
            disc: { x: 0, y: 0, vx: 0, vy: 0, angle: 0, vangle: 0, radius: 28 },
            driver: { x: 0, y: 0, vx: 0, vy: 0, angle: 0, vangle: 0, radius: 12 }
        };

        // 殘影效果軌跡
        this.trail = [];
        this.maxTrailLength = 8;
    }

    // 發射陀螺
    launch(x, y, vx, vy, powerPercent) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        
        // 根據蓄力百分比給予啟動轉速
        const powerRatio = 0.5 + (powerPercent / 100) * 0.5; // 50% ~ 100% 轉速
        this.stamina = this.maxStamina * powerRatio;
        this.burstLock = this.maxBurstLock;
        this.isBurst = false;
        this.isOut = false;
        this.isStopped = false;
        this.trail = [];
    }

    // 更新物理狀態 (dt 為秒數，例如 1/60)
    update(dt, arenaRadius) {
        if (this.isBurst) {
            // 更新飛散零件的動畫
            for (let partName in this.parts) {
                const part = this.parts[partName];
                part.x += part.vx * dt;
                part.y += part.vy * dt;
                part.angle += part.vangle * dt;
                // 空氣阻力
                part.vx *= 0.98;
                part.vy *= 0.98;
                part.vangle *= 0.98;
            }
            return;
        }

        if (this.isOut || this.isStopped) return;

        // [新增] 更新奧義計時器
        if (this.specialMoveActive) {
            this.specialMoveTimer -= dt;
            if (this.specialMoveTimer <= 0) {
                this.specialMoveActive = false;
                this.specialMoveTimer = 0;
            }
        }

        // 1. 旋轉角度更新
        const spinSpeedRad = (this.stamina / 1000) * 30; // 弧度/秒
        this.angle += spinSpeedRad * this.spinSign * dt;

        // 2. 轉速自然耗損 (摩擦力)
        // 平底運動摩擦力大，尖底小；速度快時空氣阻力也較大
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const decayMultiplier = 1 + (speed * 0.005);
        this.stamina -= this.baseDecay * decayMultiplier * dt * 16;
        
        if (this.stamina <= 0) {
            this.stamina = 0;
            this.isStopped = true;
            this.vx = 0;
            this.vy = 0;
        }

        // 3. 移動物理 (運動軌跡模擬)
        // 根據軸底類型提供自驅力 (運動行為)
        if (this.stamina > 200) {
            const staminaRatio = this.stamina / this.maxStamina;
            let forceX = 0;
            let forceY = 0;
            const timeFactor = Date.now() * 0.002;

            switch (this.movementType) {
                case 'aggressive':
                    // 平底：高速繞場運行。製造向心偏移力。
                    // 軌跡類似外圍大螺旋
                    const angleOffset = Math.atan2(this.y, this.x) + Math.PI / 2;
                    forceX = Math.cos(angleOffset) * 120 + Math.cos(timeFactor * 3) * 50;
                    forceY = Math.sin(angleOffset) * 120 + Math.sin(timeFactor * 3) * 50;
                    break;
                case 'wild':
                    // 橡膠軸：不規則瘋狂撞擊，像Z字形或星形
                    forceX = Math.cos(timeFactor * 8 + this.angle) * 350;
                    forceY = Math.sin(timeFactor * 5 - this.angle) * 350;
                    break;
                case 'semi-stationary':
                    // 球軸：防禦型。朝向中心緩緩靠近，但偏離中心時有小繞圈
                    const toCenterDist = Math.sqrt(this.x * this.x + this.y * this.y);
                    if (toCenterDist > 20) {
                        forceX = -(this.x / toCenterDist) * 30 + Math.cos(timeFactor * 2) * 20;
                        forceY = -(this.y / toCenterDist) * 30 + Math.sin(timeFactor * 2) * 20;
                    }
                    break;
                case 'stationary':
                default:
                    // 尖軸：定點。幾乎沒有自驅力，只朝中心輕微聚攏
                    const d = Math.sqrt(this.x * this.x + this.y * this.y);
                    if (d > 10) {
                        forceX = -(this.x / d) * 15;
                        forceY = -(this.y / d) * 15;
                    }
                    break;
            }

            // 施加運動自驅力 (受體力與速度值加成)
            const drivePower = (this.stats.speed * 1.5) * staminaRatio;
            this.vx += forceX * drivePower * 0.02 * dt;
            this.vy += forceY * drivePower * 0.02 * dt;
        }

        // 4. 更新位置
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // 5. 紀錄軌跡殘影
        this.trail.push({ x: this.x, y: this.y });
        const currentMaxTrail = this.specialMoveActive ? 18 : this.maxTrailLength;
        while (this.trail.length > currentMaxTrail) {
            this.trail.shift();
        }

        // 6. 檢查場外淘汰 (超出競技場半徑)
        // 競技場是有邊界的圓。如果出界且未撞牆(即從缺口掉出)，設定為場外
        const distFromCenter = Math.sqrt(this.x * this.x + this.y * this.y);
        if (distFromCenter > arenaRadius + 20) {
            this.isOut = true;
            this.vx = 0;
            this.vy = 0;
        }
    }

    // 觸發爆裂
    triggerBurst() {
        this.isBurst = true;
        this.vx = 0;
        this.vy = 0;

        // 設定各零件飛散方向與角速度
        const angles = [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2];
        const speed = 120 + Math.random() * 80;

        this.parts.layer = {
            x: this.x, y: this.y,
            vx: Math.cos(angles[0]) * speed,
            vy: Math.sin(angles[0]) * speed,
            angle: this.angle,
            vangle: (Math.random() - 0.5) * 20
        };

        this.parts.disc = {
            x: this.x, y: this.y,
            vx: Math.cos(angles[1]) * (speed * 0.8),
            vy: Math.sin(angles[1]) * (speed * 0.8),
            angle: this.angle + 1,
            vangle: (Math.random() - 0.5) * 15
        };

        this.parts.driver = {
            x: this.x, y: this.y,
            vx: Math.cos(angles[2]) * (speed * 1.2),
            vy: Math.sin(angles[2]) * (speed * 1.2),
            angle: this.angle - 1,
            vangle: (Math.random() - 0.5) * 25
        };
    }

    // 渲染陀螺 (繪圖邏輯)
    draw(ctx) {
        if (this.isBurst) {
            // 繪製四散的零件
            this.drawLayerPart(ctx, this.parts.layer);
            this.drawDiscPart(ctx, this.parts.disc);
            this.drawDriverPart(ctx, this.parts.driver);
            return;
        }

        if (this.isOut) return;

        // 1. 繪製殘影
        const isSp = this.stamina > 0;
        if (isSp && this.trail.length > 1) {
            ctx.save();
            for (let i = 0; i < this.trail.length - 1; i++) {
                // 奧義時殘影更加明亮與厚實
                const alpha = (i / this.trail.length) * (this.specialMoveActive ? 0.35 : 0.15);
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(this.trail[i].x, this.trail[i].y, this.specialMoveActive ? 27 : 26, 0, Math.PI * 2);
                ctx.fillStyle = this.colors.glow;
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // [新增] 繪製戰術模式外圍環繞霓虹光圈 (Tactical Aura)
        if (isSp) {
            ctx.save();
            ctx.rotate(-this.angle * 0.4); // 讓外圈光環反向慢速旋轉
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            
            if (this.tacticalMode === 'attack') {
                ctx.strokeStyle = '#f43f5e';
                ctx.shadowColor = '#f43f5e';
                // 攻擊鋸齒光圈
                ctx.beginPath();
                for (let i = 0; i < 16; i++) {
                    const a = (Math.PI * 2 / 16) * i;
                    const r = i % 2 === 0 ? 35 : 31;
                    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                }
                ctx.closePath();
                ctx.stroke();
            } else if (this.tacticalMode === 'defense') {
                ctx.strokeStyle = '#10b981';
                ctx.shadowColor = '#10b981';
                // 雙層防禦壁光圈
                ctx.beginPath();
                ctx.arc(0, 0, 32, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, 35, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
                ctx.stroke();
            } else if (this.tacticalMode === 'stamina') {
                ctx.strokeStyle = '#fbbf24';
                ctx.shadowColor = '#fbbf24';
                // 持久軌道與小點
                ctx.beginPath();
                ctx.arc(0, 0, 33, 0, Math.PI * 2);
                ctx.stroke();
                for (let i = 0; i < 4; i++) {
                    const a = (Math.PI * 2 / 4) * i;
                    ctx.beginPath();
                    ctx.arc(Math.cos(a) * 33, Math.sin(a) * 33, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#fbbf24';
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        // [新增] 繪製超炫奧義旋轉發光星形氣場 (Special Move Aura)
        if (this.specialMoveActive && isSp) {
            ctx.save();
            ctx.rotate(this.angle * 1.5); // 快速順向自轉
            ctx.shadowBlur = 18;
            ctx.shadowColor = this.colors.glow;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            
            // 繪製五角星軌跡
            ctx.beginPath();
            const points = 5;
            for (let i = 0; i < points * 2; i++) {
                const a = (Math.PI / points) * i;
                const r = i % 2 === 0 ? 46 : 22;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.stroke();
            
            // 繪製星芒端點
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 / points) * i;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * 46, Math.sin(a) * 46, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }
            ctx.restore();
        }

        // 旋轉內部主體
        ctx.rotate(this.angle);

        // 2. 繪製發光底環 (Glow Ring)
        if (isSp) {
            const glowSize = 25 + (this.stamina / this.maxStamina) * 7;
            ctx.shadowBlur = glowSize / 2;
            ctx.shadowColor = this.colors.glow;
            ctx.beginPath();
            ctx.arc(0, 0, 24, 0, Math.PI * 2);
            ctx.strokeStyle = this.colors.glow;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // 3. 繪製鋼鐵輪盤 (Disc - 位於 Layer 下層)
        this.drawDiscPart(ctx, { x: 0, y: 0, angle: 0 });

        // 4. 繪製結晶輪盤 (Layer)
        this.drawLayerPart(ctx, { x: 0, y: 0, angle: 0 });

        // 5. 繪製軸底 (Driver - 最上層中心)
        this.drawDriverPart(ctx, { x: 0, y: 0, angle: 0 });

        ctx.restore();
    }

    // 繪製結晶輪盤零件
    drawLayerPart(ctx, partState) {
        ctx.save();
        ctx.translate(partState.x, partState.y);
        ctx.rotate(partState.angle);

        const radius = 24;
        const cGlow = this.colors.glow;
        const cPri = this.colors.primary;
        const cSec = this.colors.secondary;

        // 外圈圓盤底座
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = cPri;
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 根據型號繪製外觀特徵
        ctx.fillStyle = cSec;
        ctx.strokeStyle = cGlow;
        ctx.lineWidth = 2;

        if (this.config.layer === 'pegasus') {
            // 天馬：三片向外的飛翼
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.rotate((Math.PI * 2 / 3) * i);
                ctx.beginPath();
                ctx.moveTo(0, -6);
                ctx.bezierCurveTo(15, -28, 32, -18, 22, 5);
                ctx.lineTo(8, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // 亮色裝飾線
                ctx.beginPath();
                ctx.arc(12, -10, 3, 0, Math.PI * 2);
                ctx.fillStyle = cGlow;
                ctx.fill();
                ctx.fillStyle = cSec;
                ctx.restore();
            }
        } 
        else if (this.config.layer === 'ldrago') {
            // 龍皇：逆向突出的三爪 (逆向流暢感，偏左旋)
            for (let i = 0; i < 3; i++) {
                ctx.save();
                // 偏向左旋方向的反向刃
                ctx.rotate((Math.PI * 2 / 3) * i);
                ctx.beginPath();
                ctx.moveTo(0, -5);
                ctx.bezierCurveTo(-15, -28, -32, -18, -20, 5);
                ctx.lineTo(-8, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 龍眼/發光點裝飾
                ctx.beginPath();
                ctx.arc(-14, -8, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.fillStyle = cSec;
                ctx.restore();
            }
            // 橡膠吸轉紅邊
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff3344';
            ctx.lineWidth = 3;
            ctx.stroke();
        } 
        else if (this.config.layer === 'leone') {
            // 獅子：重型八角盾牌
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                const r = i % 2 === 0 ? 25 : 21;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 內置獅爪盾紋
            for (let i = 0; i < 4; i++) {
                ctx.save();
                ctx.rotate((Math.PI * 2 / 4) * i);
                ctx.beginPath();
                ctx.moveTo(0, -6);
                ctx.lineTo(8, -16);
                ctx.lineTo(-8, -16);
                ctx.closePath();
                ctx.fillStyle = '#222';
                ctx.fill();
                ctx.strokeStyle = cGlow;
                ctx.stroke();
                ctx.restore();
            }
        } 
        else if (this.config.layer === 'spriggan') {
            // 巨神：上下對稱雙頭斧造型
            for (let i = 0; i < 2; i++) {
                ctx.save();
                ctx.rotate(Math.PI * i);
                ctx.beginPath();
                ctx.moveTo(-10, 0);
                ctx.lineTo(-20, -18);
                ctx.lineTo(20, -18);
                ctx.lineTo(10, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
            // 中心巨神之眼
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fillStyle = cGlow;
            ctx.fill();
        }
        else if (this.config.layer === 'dran_sword') {
            // 德蘭雙劍：三把銳利的大劍刃 (順向右旋)
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.rotate((Math.PI * 2 / 3) * i);
                ctx.beginPath();
                ctx.moveTo(0, -6);
                ctx.lineTo(24, -22);
                ctx.lineTo(27, -8);
                ctx.lineTo(12, 4);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 藍色大劍線條裝飾
                ctx.beginPath();
                ctx.moveTo(6, -8);
                ctx.lineTo(20, -18);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            }
        }
        else if (this.config.layer === 'hells_scythe') {
            // 地獄鐮刀：對稱的四把鐮刀刃
            for (let i = 0; i < 4; i++) {
                ctx.save();
                ctx.rotate((Math.PI * 2 / 4) * i);
                ctx.beginPath();
                ctx.moveTo(0, -8);
                ctx.bezierCurveTo(16, -26, 26, -18, 22, -2);
                ctx.lineTo(10, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 鐮刀內勾裝飾
                ctx.beginPath();
                ctx.arc(12, -10, 4, 0, Math.PI, true);
                ctx.strokeStyle = cGlow;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        }
        else if (this.config.layer === 'wizard_arrow') {
            // 巫師箭矢：大圓形與兩片對角大弓箭刃
            ctx.beginPath();
            ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            for (let i = 0; i < 2; i++) {
                ctx.save();
                ctx.rotate(Math.PI * i);
                ctx.beginPath();
                ctx.moveTo(-8, -20);
                ctx.lineTo(0, -26);
                ctx.lineTo(8, -20);
                ctx.lineTo(4, -12);
                ctx.lineTo(-4, -12);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        }
        else if (this.config.layer === 'knight_shield') {
            // 騎士護盾：起伏的六角盾形
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 / 6) * i;
                const r = i % 2 === 0 ? 25 : 21;
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 內六邊形盾脊
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 / 6) * i;
                ctx.lineTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
            }
            ctx.closePath();
            ctx.strokeStyle = cGlow;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // 結晶核心 (能量晶片 - Face Bolt)
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.strokeStyle = cGlow;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 旋轉方向指示箭頭
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI, this.spinDirection === 'left');
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    // 繪製鋼鐵輪盤零件
    drawDiscPart(ctx, partState) {
        ctx.save();
        ctx.translate(partState.x, partState.y);
        ctx.rotate(partState.angle);

        const r = 28;
        const discColor = PARTS.discs[this.config.disc] ? PARTS.discs[this.config.disc].color : '#bbbbcc';
        
        ctx.fillStyle = discColor;
        ctx.strokeStyle = '#555566';
        ctx.lineWidth = 2.5;

        if (this.config.disc === 'wing') {
            // 輕翼：星狀多孔金屬結構
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 / 6) * i;
                const px1 = Math.cos(angle) * r;
                const py1 = Math.sin(angle) * r;
                const px2 = Math.cos(angle + Math.PI/6) * (r - 8);
                const py2 = Math.sin(angle + Math.PI/6) * (r - 8);
                if (i === 0) ctx.moveTo(px1, py1);
                else ctx.lineTo(px1, py1);
                ctx.lineTo(px2, py2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } 
        else if (this.config.disc === 'heavy') {
            // 重鐵：巨大厚實的圓盤，邊緣有一圈防滑溝槽
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // 防滑鋸齒紋
            ctx.strokeStyle = '#333344';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 16; i++) {
                ctx.save();
                ctx.rotate((Math.PI * 2 / 16) * i);
                ctx.beginPath();
                ctx.moveTo(r - 5, 0);
                ctx.lineTo(r, 0);
                ctx.stroke();
                ctx.restore();
            }
        } 
        else if (this.config.disc === 'boost') {
            // 推進：帶有4個尖銳齒突的外圈鐵環
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI * 2 / 4) * i;
                ctx.save();
                ctx.rotate(angle);
                ctx.lineTo(r, -4);
                ctx.lineTo(r - 3, 8);
                ctx.lineTo(r - 10, 8);
                ctx.restore();
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } 
        else if (this.config.disc === 'stamina') {
            // 耐力：寬度分佈均勻的十二邊形
            ctx.beginPath();
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 / 12) * i;
                const radius = i % 2 === 0 ? r : r - 2;
                ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 外圈配重槽環
            ctx.beginPath();
            ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    // 繪製軸底零件
    drawDriverPart(ctx, partState) {
        ctx.save();
        ctx.translate(partState.x, partState.y);
        ctx.rotate(partState.angle);

        const driverColor = PARTS.drivers[this.config.driver] ? PARTS.drivers[this.config.driver].color : '#fff';

        // 軸底本體基座 (大圓)
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#222';
        ctx.fill();
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 軸尖設計
        ctx.beginPath();
        if (this.config.driver === 'flat' || this.config.driver === 'rubber' || this.config.driver === 'flat_x') {
            // 平底 / 橡膠平底 / X齒輪平底
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fillStyle = driverColor;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#fff';
            ctx.stroke();

            // 若為 Beyblade X 齒輪 Bit，額外畫一圈齒輪細節
            if (this.config.driver === 'flat_x') {
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 1.2;
                for (let i = 0; i < 8; i++) {
                    ctx.save();
                    ctx.rotate((Math.PI * 2 / 8) * i);
                    ctx.beginPath();
                    ctx.moveTo(3, 0);
                    ctx.lineTo(8, 0);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        } 
        else if (this.config.driver === 'sharp' || this.config.driver === 'needle_x') {
            // 尖底 / X齒輪針軸
            ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = driverColor;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (this.config.driver === 'needle_x') {
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 8; i++) {
                    ctx.save();
                    ctx.rotate((Math.PI * 2 / 8) * i);
                    ctx.beginPath();
                    ctx.moveTo(1.5, 0);
                    ctx.lineTo(6, 0);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        } 
        else if (this.config.driver === 'ball' || this.config.driver === 'ball_x' || this.config.driver === 'taper_x') {
            // 球底 / X齒輪球軸 / X齒輪錐軸
            const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 5.5);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, driverColor);
            grad.addColorStop(1, '#000000');
            ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            if (this.config.driver === 'ball_x' || this.config.driver === 'taper_x') {
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 8; i++) {
                    ctx.save();
                    ctx.rotate((Math.PI * 2 / 8) * i);
                    ctx.beginPath();
                    ctx.moveTo(2.5, 0);
                    ctx.lineTo(7.5, 0);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        ctx.restore();
    }
}

// 導出模組 (支援瀏覽器端)
if (typeof module !== 'undefined') {
    module.exports = { Beyblade };
}
