// 戰鬥陀螺自訂物理引擎與碰撞系統 (Beyblade Physics Engine)

class PhysicsEngine {
    constructor(arenaRadius = 250) {
        this.arenaRadius = arenaRadius;
        
        // 碗狀場地中心吸力係數 (斜坡重力模擬)
        this.slopeGravity = 45; 
        
        // 牆壁碰撞彈性係數
        this.wallRestitution = 0.5;
        
        // 陀螺碰撞彈性係數
        this.collisionRestitution = 0.75;

        // 競技場出界袋口配置 (Over Finish)
        // 設計三個均勻分佈的凹槽/缺口作為出場點
        // 每個缺口在特定夾角範圍內，若陀螺超出 arenaRadius 且在此範圍內，則判定出界
        this.pockets = [
            { start: -Math.PI / 12, end: Math.PI / 12 },            // 右側缺口 (約 0 弧度)
            { start: 7 * Math.PI / 12, end: 9 * Math.PI / 12 },    // 左上缺口 (約 120 度)
            { start: -9 * Math.PI / 12, end: -7 * Math.PI / 12 }   // 左下缺口 (約 240 度)
        ];

        // 粒子系統
        this.particles = [];
        // 畫面震動強度
        this.screenShake = 0;
        // 頓幀時標縮放 (Hitstop)
        this.timeScale = 1.0;
    }

    // 檢查某角度是否落在出場口袋中
    isInPocket(angle) {
        // 標準化角度至 [-PI, PI]
        let normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
        return this.pockets.some(p => normAngle >= p.start && normAngle <= p.end);
    }

    // 新增火花粒子
    addSparks(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color || '#ffcc00',
                size: 2 + Math.random() * 3,
                life: 1.0, // 生命值 1.0 -> 0.0
                decay: 1.5 + Math.random() * 2.0,
                type: 'spark'
            });
        }
    }

    // 新增擊爆光圈粒子
    addBurstWave(x, y, color) {
        this.particles.push({
            x: x,
            y: y,
            color: color || '#ffffff',
            size: 10,
            maxSize: 70,
            life: 1.0,
            decay: 3.0,
            type: 'wave'
        });
    }

    // 新增浮動文字粒子
    addFloatingText(x, y, text, color) {
        this.particles.push({
            x: x,
            y: y - 12,
            vx: (Math.random() - 0.5) * 40,
            vy: -55 - Math.random() * 25, // 向上飄移
            color: color || '#ffffff',
            text: text,
            size: 14 + Math.random() * 4,
            life: 1.0,
            decay: 1.2, // 約 0.8 秒消失
            type: 'text'
        });
    }

    // 更新物理世界所有物件 (dt 為秒)
    update(bey1, bey2, dt) {
        // 漸慢恢復時標 (頓幀後慢慢回到 1.0)
        if (this.timeScale < 1.0) {
            this.timeScale += dt * 3.5; // 約 0.3 秒恢復
            if (this.timeScale > 1.0) this.timeScale = 1.0;
        }

        // 當前計算使用的縮放後 dt
        const scaledDt = dt * this.timeScale;

        // 1. 更新螢幕震動
        if (this.screenShake > 0) {
            this.screenShake -= dt * 15;
            if (this.screenShake < 0) this.screenShake = 0;
        }

        // 2. 更新粒子 (粒子不受頓幀影響，依然用原 dt，使火花動作流暢)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p.type === 'spark') {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                // 重力微落
                p.vy += 80 * dt;
            } else if (p.type === 'wave') {
                p.size += (p.maxSize - p.size) * 12 * dt;
            } else if (p.type === 'text') {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy *= 0.95; // 垂直速度衰減，產生斜上飄升效果
            }
            p.life -= p.decay * dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 3. 更新陀螺物理 (使用縮放後的 scaledDt，製造頓幀效果)
        this.updateSingleBeyblade(bey1, scaledDt);
        this.updateSingleBeyblade(bey2, scaledDt);

        // 4. 陀螺與陀螺碰撞檢測與處理
        if (!bey1.isBurst && !bey1.isOut && !bey1.isStopped &&
            !bey2.isBurst && !bey2.isOut && !bey2.isStopped) {
            this.handleBeybladeCollision(bey1, bey2);
        }
    }

    // 單個陀螺與環境的物理交互
    updateSingleBeyblade(bey, dt) {
        if (bey.isBurst || bey.isOut || bey.isStopped) {
            // 依然要更新已擊爆零件的物理飛行
            bey.update(dt, this.arenaRadius);
            return;
        }

        // 1. 計算碗狀傾斜場地的重力效應
        // 離中心越遠，受向心拉力越大：a_slope = -slopeGravity * (pos / arenaRadius)
        const dist = Math.sqrt(bey.x * bey.x + bey.y * bey.y);
        if (dist > 5) {
            const pullX = -(bey.x / dist) * this.slopeGravity * (dist / this.arenaRadius);
            const pullY = -(bey.y / dist) * this.slopeGravity * (dist / this.arenaRadius);
            bey.vx += pullX * dt * 50;
            bey.vy += pullY * dt * 50;
        }

        // 2. 空氣與地面阻力阻尼 (Linear Damping)
        // 根據軸底有微調，套用當前戰術模式與奧義速度乘數
        const effSpeed = bey.stats.speed * (bey.tacticalMode === 'attack' ? 1.25 : (bey.tacticalMode === 'defense' ? 0.75 : (bey.tacticalMode === 'stamina' ? 0.85 : 1.0))) * (bey.specialMoveActive ? 1.35 : 1.0);
        const damping = 0.985 - (effSpeed * 0.001); // 速度型阻力小些
        bey.vx *= Math.pow(damping, dt * 60);
        bey.vy *= Math.pow(damping, dt * 60);

        // [新增] 更新 X-Dash 計時器與冷卻時間
        if (bey.xDashTimer === undefined) bey.xDashTimer = 0;
        if (bey.xDashCooldown === undefined) bey.xDashCooldown = 0;

        if (bey.xDashTimer > 0) bey.xDashTimer -= dt;
        if (bey.xDashCooldown > 0) bey.xDashCooldown -= dt;

        // BEYBLADE X 專屬極限衝刺 (X-Dash) 軌道嚙合檢測
        const isXBit = ['flat_x', 'taper_x', 'ball_x', 'needle_x'].includes(bey.config.driver);
        if (isXBit && bey.xDashCooldown <= 0 && bey.stamina > 500) {
            // 邊緣齒輪軌道範圍：距離邊界 12px 至 25px
            const minXDashR = this.arenaRadius - 28;
            const maxXDashR = this.arenaRadius - 10;
            if (dist >= minXDashR && dist <= maxXDashR) {
                // 觸發 X-Dash！
                bey.xDashCooldown = 3.8; // 3.8 秒冷卻
                bey.xDashTimer = 1.0;    // 1.0 秒衝刺加成時間

                // 計算切線速度方向 (順/逆旋方向沿軌道狂飆)
                const tx = -bey.y / dist;
                const ty = bey.x / dist;

                // 根據速度屬性加成 X-Dash 衝刺速度
                let dashSpeed = 390 + (effSpeed * 8);
                
                // 德蘭雙劍 (Dran Sword) 特技：X-Dash 速度額外提升 25%
                if (bey.config.layer === 'dran_sword') {
                    dashSpeed *= 1.25;
                }

                // 切向速度分量
                const vx_tangent = tx * dashSpeed * bey.spinSign;
                const vy_tangent = ty * dashSpeed * bey.spinSign;

                // 向心斜坡發射分量 (切入中央的衝刺力)
                const ix = -bey.x / dist;
                const iy = -bey.y / dist;
                const vx_inward = ix * 220;
                const vy_inward = iy * 220;

                // 混合向量：沿軌道滑行一段距離直接咬合衝入中心
                bey.vx = vx_tangent * 0.7 + vx_inward;
                bey.vy = vy_tangent * 0.7 + vy_inward;

                // 視覺與震動效果
                this.addFloatingText(bey.x, bey.y, "X-DASH!!!", '#00ccff');
                this.addSparks(bey.x, bey.y, '#ffffff', 18);
                this.addSparks(bey.x, bey.y, bey.colors.glow, 12);
                this.screenShake = Math.max(this.screenShake, 4.0);

                // 產生極限衝刺擴散波
                this.particles.push({
                    x: bey.x, y: bey.y,
                    color: '#00ccff', size: 8, maxSize: 45,
                    life: 1.0, decay: 4.5, type: 'wave'
                });
            }
        }

        // 3. 牆壁碰撞檢測
        // 陀螺半徑設為 28 (以 Disc 半徑為準)
        const beyRadius = 28;
        if (dist + beyRadius > this.arenaRadius) {
            const angle = Math.atan2(bey.y, bey.x);
            
            if (this.isInPocket(angle)) {
                // 如果落在口袋範圍，且真的完全滑出邊緣 (dist > arenaRadius + 20)
                // 則在 update() 中會判定 isOut = true，這裡不需要特殊反彈
            } else {
                // 否則為撞擊牆壁反彈
                // 修正位置避免穿牆
                const overlap = (dist + beyRadius) - this.arenaRadius;
                const nx = bey.x / dist;
                const ny = bey.y / dist;
                bey.x -= nx * overlap;
                bey.y -= ny * overlap;

                // 反彈速度
                // 撞牆法線方向為 -nx, -ny
                const velAlongNormal = bey.vx * (-nx) + bey.vy * (-ny);
                if (velAlongNormal < 0) { // 朝著牆壁撞
                    const impulse = -(1 + this.wallRestitution) * velAlongNormal;
                    bey.vx += impulse * (-nx);
                    bey.vy += impulse * (-ny);

                    // 撞擊牆壁造成的轉速損耗與爆裂槽損耗
                    const impactForce = Math.abs(velAlongNormal);
                    bey.stamina -= impactForce * 0.4;
                    bey.burstLock -= impactForce * 0.08;

                    // 產生少量火花
                    const contactX = bey.x + nx * beyRadius;
                    const contactY = bey.y + ny * beyRadius;
                    this.addSparks(contactX, contactY, bey.colors.glow, 4);

                    // 觸發撞牆擊爆判定
                    if (bey.burstLock <= 0) {
                        bey.triggerBurst();
                        this.addBurstWave(bey.x, bey.y, bey.colors.glow);
                    }
                }
            }
        }

        // 4. 更新陀螺內部物理 (自驅力、角度等)
        bey.update(dt, this.arenaRadius);
    }

    // 兩顆陀螺碰撞處理
    handleBeybladeCollision(b1, b2) {
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const r1 = 28;
        const r2 = 28;
        const minDist = r1 + r2; // 56像素

        if (dist >= minDist) return; // 未碰撞

        // 碰撞法線
        const nx = dx / dist;
        const ny = dy / dist;

        // 1. 位置修正 (防止穿透重疊)
        const overlap = minDist - dist;
        
        // [新增] 計算雙方戰術與奧義狀態下的有效質量 (mass)
        const m1 = b1.mass * (b1.tacticalMode === 'defense' ? 1.25 : 1.0) * (b1.specialMoveActive ? 1.35 : 1.0);
        const m2 = b2.mass * (b2.tacticalMode === 'defense' ? 1.25 : 1.0) * (b2.specialMoveActive ? 1.35 : 1.0);
        
        const totalMass = m1 + m2;
        const ratio1 = m2 / totalMass; // 質量大者被推移較少
        const ratio2 = m1 / totalMass;
        
        b1.x -= nx * overlap * ratio1;
        b1.y -= ny * overlap * ratio1;
        b2.x += nx * overlap * ratio2;
        b2.y += ny * overlap * ratio2;

        // 2. 彈性碰撞速度計算
        const rvx = b2.vx - b1.vx;
        const rvy = b2.vy - b1.vy;
        const velAlongNormal = rvx * nx + rvy * ny;

        // 僅當雙方相對靠近時才處理速度反彈 (避免粘滯)
        if (velAlongNormal < 0) {
            const impulseScalar = -(1 + this.collisionRestitution) * velAlongNormal / (1 / m1 + 1 / m2);
            
            b1.vx -= impulseScalar * nx / m1;
            b1.vy -= impulseScalar * ny / m1;
            b2.vx += impulseScalar * nx / m2;
            b2.vy += impulseScalar * ny / m2;

            // 碰撞強度
            const rawForce = Math.abs(velAlongNormal);
            let collisionForce = rawForce * (totalMass / 100);

            // [新增] 碰撞增加雙方奧義氣量 (Spirit)
            if (window.app) {
                window.app.p1Spirit = Math.min(100, window.app.p1Spirit + collisionForce * 2.2);
                window.app.p2Spirit = Math.min(100, window.app.p2Spirit + collisionForce * 2.2);
            }

            // [新增] BEYBLADE X 極限衝刺 (X-Dash) 威力加成
            let isXDashImpact = false;
            if (b1.xDashTimer > 0) {
                collisionForce *= 1.4;
                isXDashImpact = true;
                this.addFloatingText(b1.x, b1.y, "X-IMPACT!!", '#00ccff');
            }
            if (b2.xDashTimer > 0) {
                collisionForce *= 1.4;
                isXDashImpact = true;
                this.addFloatingText(b2.x, b2.y, "X-IMPACT!!", '#00ccff');
            }

            // 頓幀慢動作 (Hitstop) 觸發
            if (collisionForce > 2.2) {
                // 力道越大，停頓感越強，最慢為原速的 0.08
                this.timeScale = Math.max(0.08, 0.45 - (collisionForce * 0.06));
            }

            // 碰撞位置
            const sparkX = b1.x + nx * r1;
            const sparkY = b1.y + ny * r1;

            // 產生碰撞衝擊波與文字
            if (collisionForce > 4.5) {
                this.addFloatingText(sparkX, sparkY, "CRASH!!!", '#ff1a55');
                this.particles.push({
                    x: sparkX, y: sparkY,
                    color: '#ffffff', size: 5, maxSize: 55,
                    life: 1.0, decay: 4.0, type: 'wave'
                });
            } else if (collisionForce > 2.2) {
                this.addFloatingText(sparkX, sparkY, "CLASH!", '#ffcc00');
                this.particles.push({
                    x: sparkX, y: sparkY,
                    color: 'rgba(255, 204, 0, 0.8)', size: 5, maxSize: 35,
                    life: 1.0, decay: 5.0, type: 'wave'
                });
            }

            // 隨機觸發天馬輪盤的「強襲」被動
            let isPegasusStrike1 = false;
            let isPegasusStrike2 = false;
            if (b1.config.layer === 'pegasus' && Math.random() < 0.25) {
                isPegasusStrike1 = true;
                collisionForce *= 1.8;
                this.addFloatingText(b1.x, b1.y, "PEGASUS STRIKE!", b1.colors.glow);
            }
            if (b2.config.layer === 'pegasus' && Math.random() < 0.25) {
                isPegasusStrike2 = true;
                collisionForce *= 1.8;
                this.addFloatingText(b2.x, b2.y, "PEGASUS STRIKE!", b2.colors.glow);
            }

            // 畫面震動
            this.screenShake = Math.min(10, this.screenShake + collisionForce * 0.15);

            // 3. 轉速 (Stamina) 損耗與吸轉計算
            // 基礎損耗：防禦力受戰術模式與奧義防守增益影響
            const def1 = b1.stats.defense * (b1.tacticalMode === 'defense' ? 1.3 : 1.0) * (b1.specialMoveActive ? 1.35 : 1.0);
            const def2 = b2.stats.defense * (b2.tacticalMode === 'defense' ? 1.3 : 1.0) * (b2.specialMoveActive ? 1.35 : 1.0);

            let spinLoss1 = (collisionForce * 4.5) * (1.2 - def1 * 0.04);
            let spinLoss2 = (collisionForce * 4.5) * (1.2 - def2 * 0.04);

            // 判斷旋轉方向交互
            if (b1.spinDirection !== b2.spinDirection) {
                // 旋轉方向相反 (左旋 vs 右旋)，摩擦力較低，碰撞有吸轉機會
                spinLoss1 *= 0.5;
                spinLoss2 *= 0.5;

                // 吸轉邏輯：低轉速方從高轉速方「吸取」一部分損耗的轉速
                if (b1.config.layer === 'ldrago' && b1.stamina < b2.stamina) {
                    const stolen = spinLoss2 * 0.4;
                    b1.stamina += stolen;
                    spinLoss2 += stolen * 0.5; // 被吸取者額外損損
                    if (Math.random() < 0.35) {
                        this.addFloatingText(b1.x, b1.y, "SPIN STEAL!", '#ff3333');
                    }
                }
                if (b2.config.layer === 'ldrago' && b2.stamina < b1.stamina) {
                    const stolen = spinLoss1 * 0.4;
                    b2.stamina += stolen;
                    spinLoss1 += stolen * 0.5;
                    if (Math.random() < 0.35) {
                        this.addFloatingText(b2.x, b2.y, "SPIN STEAL!", '#ff3333');
                    }
                }
            } else {
                // 同方向旋轉，撞擊接觸面速度翻倍，摩擦損耗大
                spinLoss1 *= 1.3;
                spinLoss2 *= 1.3;
            }

            b1.stamina = Math.max(0, b1.stamina - spinLoss1);
            b2.stamina = Math.max(0, b2.stamina - spinLoss2);

            // 4. 爆裂鎖定值 (Burst Lock) 損耗與擊爆判定
            // 爆裂傷害由：碰撞力 * 對手攻擊力 / 自身防禦力 * 自身抗爆係數
            // 攻擊力 atk 與抗爆係數 bRes 受戰術模式及奧義加成
            const atk1 = b1.stats.attack * (b1.tacticalMode === 'attack' ? 1.3 : (b1.tacticalMode === 'stamina' ? 0.7 : 1.0)) * (b1.specialMoveActive ? 1.35 : 1.0);
            const atk2 = b2.stats.attack * (b2.tacticalMode === 'attack' ? 1.3 : (b2.tacticalMode === 'stamina' ? 0.7 : 1.0)) * (b2.specialMoveActive ? 1.35 : 1.0);
            
            const bRes1 = b1.stats.burstResistance * (b1.tacticalMode === 'defense' ? 1.25 : 1.0);
            const bRes2 = b2.stats.burstResistance * (b2.tacticalMode === 'defense' ? 1.25 : 1.0);

            let burstDmg1 = collisionForce * (atk2 / def1) * (2.2 / bRes1);
            let burstDmg2 = collisionForce * (atk1 / def2) * (2.2 / bRes2);

            // 獅子輪盤被動能力：減免 30% 爆裂鎖定損耗
            if (b1.config.layer === 'leone') {
                burstDmg1 *= 0.7;
                if (Math.random() < 0.3) {
                    this.addFloatingText(b1.x, b1.y, "DEFLECT!", '#33cc33');
                }
            }
            if (b2.config.layer === 'leone') {
                burstDmg2 *= 0.7;
                if (Math.random() < 0.3) {
                    this.addFloatingText(b2.x, b2.y, "DEFLECT!", '#33cc33');
                }
            }

            b1.burstLock -= burstDmg1;
            b2.burstLock -= burstDmg2;

            // 5. 產生碰撞火花與粒子
            // 混合雙方發光顏色
            const sparkColor = (isPegasusStrike1 || isPegasusStrike2) ? '#ffffff' : b1.colors.glow;
            this.addSparks(sparkX, sparkY, sparkColor, Math.floor(collisionForce * 3.5) + 12);

            // 6. 擊爆觸發
            let burst1 = b1.burstLock <= 0;
            let burst2 = b2.burstLock <= 0;

            if (burst1) {
                b1.triggerBurst();
                this.addBurstWave(b1.x, b1.y, b1.colors.glow);
                this.addSparks(b1.x, b1.y, '#ffffff', 25);
                this.screenShake = 12;
            }
            if (burst2) {
                b2.triggerBurst();
                this.addBurstWave(b2.x, b2.y, b2.colors.glow);
                this.addSparks(b2.x, b2.y, '#ffffff', 25);
                this.screenShake = 12;
            }
        }
    }

    // 繪製粒子系統
    drawParticles(ctx) {
        ctx.save();
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            ctx.globalAlpha = p.life;

            if (p.type === 'spark') {
                ctx.shadowBlur = 4;
                ctx.shadowColor = p.color;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } 
            else if (p.type === 'wave') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3 * p.life;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.stroke();
            }
            else if (p.type === 'text') {
                ctx.font = 'italic 900 ' + p.size + 'px Outfit, Noto Sans TC, sans-serif';
                ctx.textAlign = 'center';
                
                // 陰影發光描邊效果
                ctx.shadowBlur = 8;
                ctx.shadowColor = p.color;
                ctx.fillStyle = p.color;
                ctx.strokeStyle = '#07070a';
                ctx.lineWidth = 3.5;
                ctx.strokeText(p.text, p.x, p.y);
                ctx.fillText(p.text, p.x, p.y);
                ctx.shadowBlur = 0; // 恢復
            }
        }
        ctx.restore();
    }

    // [新增] 鍵盤微引導方向控制 (Steer)
    steerBeyblade(bey, dx, dy, dt) {
        if (bey.isBurst || bey.isOut || bey.isStopped) return;
        
        // 微調加速度 (與防禦模式或持久模式相關)
        let steerAcc = 175;
        if (bey.tacticalMode === 'defense') steerAcc *= 0.7; // 防守重型，轉向較鈍
        if (bey.tacticalMode === 'stamina') steerAcc *= 0.9;
        
        bey.vx += dx * steerAcc * dt;
        bey.vy += dy * steerAcc * dt;
    }

    // [新增] 鍵盤瞬間爆發衝刺 (Dash)
    dashBeyblade(bey, dx, dy) {
        if (bey.isBurst || bey.isOut || bey.isStopped) return;
        
        const dashSpeed = 290;
        
        // 混合當前速度與衝刺方向，使其轉向瞬間極度靈敏，並附加衝量
        bey.vx = (bey.vx * 0.25) + dx * dashSpeed;
        bey.vy = (bey.vy * 0.25) + dy * dashSpeed;

        // 產生帥氣的火花粒子與漂浮字
        this.addFloatingText(bey.x, bey.y, "DASH!!", bey.colors.glow);
        this.addSparks(bey.x, bey.y, bey.colors.glow, 8);
        
        // 輕微晃動畫面
        this.screenShake = Math.max(this.screenShake, 1.8);
    }
}

// 導出模組 (支援瀏覽器端)
if (typeof module !== 'undefined') {
    module.exports = { PhysicsEngine };
}
