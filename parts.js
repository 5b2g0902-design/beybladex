// 戰鬥陀螺與 BEYBLADE X 配件資料庫 (Beyblade & Beyblade X Parts Database)

const PARTS = {
    // 結晶輪盤 / 輪盤刃 (Layers / Blades)
    layers: {
        // --- 經典代金屬/爆裂系列 ---
        pegasus: {
            id: 'pegasus',
            name: '烈風天馬 (Pegasus)',
            spinDirection: 'right', // 右旋
            stats: { attack: 9, defense: 3, stamina: 4, weight: 4, speed: 7, burstResistance: 5 },
            color: '#00ccff', // 預設亮藍色
            description: '具有銳利的三叉金屬刀刃，擅長以強大的擊退力將對手撞出場外或造成爆裂。',
            ability: '強襲：低機率造成雙倍衝擊力。',
            series: 'classic'
        },
        ldrago: {
            id: 'ldrago',
            name: '極限龍皇 (L-Drago)',
            spinDirection: 'left', // 左旋
            stats: { attack: 7, defense: 4, stamina: 5, weight: 4, speed: 8, burstResistance: 4 },
            color: '#ff3333', // 預設紅色
            description: '逆向左旋轉陀螺。配有吸能橡膠刃，在與右旋陀螺碰撞時能夠吸收對方的旋轉力。',
            ability: '吸轉：與右旋陀螺碰撞時，吸收對手 15% 碰撞損耗的轉速。',
            series: 'classic'
        },
        leone: {
            id: 'leone',
            name: '岩礁獅子 (Leone)',
            spinDirection: 'right', // 右旋
            stats: { attack: 3, defense: 9, stamina: 5, weight: 7, speed: 3, burstResistance: 7 },
            color: '#33cc33', // 預設綠色
            description: '厚實的圓弧形輪盤，能有效化解敵方的猛烈攻勢，並減少被撞擊時的爆裂值損耗。',
            ability: '堅盾：受到撞擊時的爆裂鎖定損耗降低 30%。',
            series: 'classic'
        },
        spriggan: {
            id: 'spriggan',
            name: '神聖巨神 (Spriggan)',
            spinDirection: 'dual', // 雙旋（可在工坊切換）
            stats: { attack: 6, defense: 6, stamina: 6, weight: 5, speed: 5, burstResistance: 8 },
            color: '#ffcc00', // 預設金色
            description: '傳說中的平衡型輪盤，擁有優異的爆裂抵抗力。可以任意切換左旋或右旋。',
            ability: '雙旋/高防爆：可在左/右旋之間切換，且天生擁有極高的爆裂抵抗力。',
            series: 'classic'
        },
        // --- BEYBLADE X 全新世代系列 ---
        dran_sword: {
            id: 'dran_sword',
            name: '蒼藍神劍 (DranSword)',
            spinDirection: 'right',
            stats: { attack: 11, defense: 3, stamina: 3, weight: 6, speed: 8, burstResistance: 5 },
            color: '#0066ff',
            description: '【BEYBLADE X】藍色的厚實三劍刃，能給予對手極強的重擊。是爆發型極限衝刺的代表。',
            ability: '極限衝刺：配合 X 軸底時，X-Dash 衝撞力額外提升 25%！',
            series: 'x'
        },
        hells_scythe: {
            id: 'hells_scythe',
            name: '地獄鐮刀 (HellsScythe)',
            spinDirection: 'right',
            stats: { attack: 7, defense: 6, stamina: 6, weight: 6, speed: 6, burstResistance: 6 },
            color: '#ff2255',
            description: '【BEYBLADE X】紅黑色四片鐮刀刃，兼顧了強大攻擊力與高度周轉慣性，性能極度平衡。',
            ability: '鐮刃反擊：碰撞時有 20% 機率將受到的部分轉速扣減反彈給對手。',
            series: 'x'
        },
        wizard_arrow: {
            id: 'wizard_arrow',
            name: '巫師箭矢 (WizardArrow)',
            spinDirection: 'right',
            stats: { attack: 4, defense: 5, stamina: 11, weight: 5, speed: 5, burstResistance: 5 },
            color: '#ffbb00',
            description: '【BEYBLADE X】外圈圓滑無阻力的兩片大弓箭刃。其重心完全分佈於外緣，是高持久的代名詞。',
            ability: '圓環滑能：受到的碰撞轉速自然衰減率減免 15%。',
            series: 'x'
        },
        knight_shield: {
            id: 'knight_shield',
            name: '騎士護盾 (KnightShield)',
            spinDirection: 'right',
            stats: { attack: 5, defense: 10, stamina: 5, weight: 7, speed: 4, burstResistance: 6 },
            color: '#00ff99',
            description: '【BEYBLADE X】帶有特殊吸震起伏構造的六角盾形刃。能夠將對手的正面重擊分散化解。',
            ability: '護盾減震：被強力衝擊時，自身受到的爆裂槽扣減降低 25%。',
            series: 'x'
        }
    },

    // 鋼鐵輪盤 / 高度棘輪 (Discs / Ratchets)
    discs: {
        // --- 經典代金屬/爆裂系列 ---
        wing: {
            id: 'wing',
            name: '破風輕翼 (Wing)',
            stats: { attack: 2, defense: 1, stamina: 3, weight: 3, speed: 9, burstResistance: 4 },
            color: '#e0e0e0',
            description: '輕量化並帶有空氣動力學葉片的鐵環，能極大提升陀螺的移動速度與啟動轉速。'
        },
        heavy: {
            id: 'heavy',
            name: '重裝鐵壁 (Heavy)',
            stats: { attack: 4, defense: 8, stamina: 3, weight: 9, speed: 1, burstResistance: 6 },
            color: '#888899',
            description: '極重型實心金屬鐵環，大幅增加碰撞時的衝擊力與防禦慣性，但會顯著降低移動速度。'
        },
        boost: {
            id: 'boost',
            name: '推進爆裂 (Boost)',
            stats: { attack: 7, defense: 3, stamina: 2, weight: 5, speed: 5, burstResistance: 5 },
            color: '#ff6600',
            description: '重心偏向前端的外刃設計，在高速碰撞時可對對手造成額外的爆裂鎖定值傷害。'
        },
        stamina: {
            id: 'stamina',
            name: '極限星環 (Stamina)',
            stats: { attack: 2, defense: 4, stamina: 8, weight: 6, speed: 4, burstResistance: 5 },
            color: '#cc33ff',
            description: '質量高度集中在最外圈的設計，擁有極佳的轉動慣性，能大幅延長旋轉時間。'
        },
        // --- BEYBLADE X 棘輪系列 (Ratchet) ---
        three_sixty: {
            id: 'three_sixty',
            name: '3-60 棘輪 (3-60)',
            stats: { attack: 3, defense: 3, stamina: 3, weight: 6, speed: 7, burstResistance: 5 },
            color: '#55aaff',
            description: '【BEYBLADE X】低重心設計 (6.0mm) 的 3 點式棘輪。重心集中，爆發力十足。'
        },
        four_sixty: {
            id: 'four_sixty',
            name: '4-60 棘輪 (4-60)',
            stats: { attack: 2, defense: 4, stamina: 4, weight: 6, speed: 6, burstResistance: 6 },
            color: '#ff55aa',
            description: '【BEYBLADE X】低重心設計 (6.0mm) 的 4 點式棘輪。性能最為均勻平衡，不易被挑飛。'
        },
        four_eighty: {
            id: 'four_eighty',
            name: '4-80 棘輪 (4-80)',
            stats: { attack: 4, defense: 4, stamina: 3, weight: 7, speed: 4, burstResistance: 6 },
            color: '#ffaa55',
            description: '【BEYBLADE X】高重心設計 (8.0mm) 的 4 點式棘輪。增加了砸地向下壓制的力道。'
        },
        five_sixty: {
            id: 'five_sixty',
            name: '5-60 棘輪 (5-60)',
            stats: { attack: 2, defense: 5, stamina: 4, weight: 8, speed: 5, burstResistance: 7 },
            color: '#55ffaa',
            description: '【BEYBLADE X】低重心設計 (6.0mm) 的 5 點式棘輪。重量偏高，外觀近乎正圓，防禦極佳。'
        }
    },

    // 軸底 / 齒輪軸底 (Drivers / Bits)
    drivers: {
        // --- 經典代金屬/爆裂系列 ---
        flat: {
            id: 'flat',
            name: '疾速平底 (Flat)',
            type: 'attack',
            stats: { attack: 8, defense: 2, stamina: 2, weight: 2, speed: 8, burstResistance: 6 },
            color: '#ff0055',
            description: '寬闊的塑料平形軸底。在場地上會產生劇烈的高速繞圈運動，以俯衝式攻擊碰撞對手。',
            movement: 'aggressive'
        },
        sharp: {
            id: 'sharp',
            name: '安定尖底 (Sharp)',
            type: 'stamina',
            stats: { attack: 1, defense: 3, stamina: 9, weight: 2, speed: 2, burstResistance: 4 },
            color: '#00ffff',
            description: '極尖細的金屬錐形軸底。摩擦係數極低，能使其幾乎固定在場地中心旋轉，保持體力。',
            movement: 'stationary'
        },
        ball: {
            id: 'ball',
            name: '防衛球底 (Ball)',
            type: 'defense',
            stats: { attack: 3, defense: 8, stamina: 6, weight: 3, speed: 4, burstResistance: 5 },
            color: '#00ff66',
            description: '半球形軸底。能吸收撞擊動能並在偏離中心時快速回正，極難被擊出場外。',
            movement: 'semi-stationary'
        },
        rubber: {
            id: 'rubber',
            name: '爆裂橡膠 (Rubber)',
            type: 'boost-attack',
            stats: { attack: 10, defense: 1, stamina: 1, weight: 4, speed: 10, burstResistance: 7 },
            color: '#ff33aa',
            description: '高摩擦力橡膠平底軸。發射後會在場內進行極度瘋狂、不可預測的反彈移動，擁有毀滅性的破壞力。',
            movement: 'wild'
        },
        // --- BEYBLADE X 齒輪 Bit 系列 ---
        flat_x: {
            id: 'flat_x',
            name: 'F 軸底 (Flat Bit)',
            type: 'x-attack',
            stats: { attack: 10, defense: 1, stamina: 2, weight: 3, speed: 9, burstResistance: 6 },
            color: '#0099ff',
            description: '【BEYBLADE X】具有金屬齒輪構造的平底軸。觸碰場地邊緣時會觸發極速狂飆的「極限衝刺 (X-Dash)」！',
            movement: 'x-dash-aggressive'
        },
        taper_x: {
            id: 'taper_x',
            name: 'T 軸底 (Taper Bit)',
            type: 'x-balance',
            stats: { attack: 7, defense: 4, stamina: 5, weight: 3, speed: 7, burstResistance: 6 },
            color: '#ff2299',
            description: '【BEYBLADE X】帶有傾斜錐形的齒輪軸底。在場地邊緣容易發動 X-Dash，回到中心時又極具耐力。',
            movement: 'x-dash-balance'
        },
        ball_x: {
            id: 'ball_x',
            name: 'B 軸底 (Ball Bit)',
            type: 'x-stamina',
            stats: { attack: 3, defense: 5, stamina: 10, weight: 3, speed: 5, burstResistance: 5 },
            color: '#ffcc00',
            description: '【BEYBLADE X】球形齒輪軸底。擁有全系列最頂尖的持久性，偶爾會在受擊後利用邊緣發動奇襲 X-Dash。',
            movement: 'x-dash-stamina'
        },
        needle_x: {
            id: 'needle_x',
            name: 'N 軸底 (Needle Bit)',
            type: 'x-defense',
            stats: { attack: 4, defense: 9, stamina: 4, weight: 3, speed: 4, burstResistance: 7 },
            color: '#33ffaa',
            description: '【BEYBLADE X】極尖銳的齒輪針底軸。極為耐打耐撞，受擊偏向場外時能通過齒輪咬合軌道滑回中心。',
            movement: 'x-dash-defense'
        }
    }
};

// 計算綜合數值
function calculateStats(layerId, discId, driverId) {
    const layer = PARTS.layers[layerId];
    const disc = PARTS.discs[discId];
    const driver = PARTS.drivers[driverId];

    if (!layer || !disc || !driver) return null;

    const baseStats = {
        attack: 0,
        defense: 0,
        stamina: 0,
        weight: 0,
        speed: 0,
        burstResistance: 0
    };

    // 加總數值
    for (let key in baseStats) {
        baseStats[key] = (layer.stats[key] || 0) + (disc.stats[key] || 0) + (driver.stats[key] || 0);
    }

    return baseStats;
}

// 導出模組 (支援瀏覽器端)
if (typeof module !== 'undefined') {
    module.exports = { PARTS, calculateStats };
}
