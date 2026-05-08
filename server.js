const express = require('express');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ==================== CẤU HÌNH 8 GAME ====================
const GAMES = {
    lc79_tx: {
        name: '🎲 LC79 Tài Xỉu',
        url: 'https://wtx.tele68.com/v1/tx/sessions',
        type: 'tele68',
        icon: '🎲'
    },
    lc79_md5: {
        name: '🔐 LC79 MD5',
        url: 'https://wtxmd52.tele68.com/v1/txmd5/sessions',
        type: 'tele68',
        icon: '🔐'
    },
    betvip_tx: {
        name: '🎰 BETVIP Tài Xỉu',
        url: 'https://wtx.macminim6.online/v1/tx/sessions',
        type: 'tele68',
        icon: '🎰'
    },
    betvip_md5: {
        name: '🔒 BETVIP MD5',
        url: 'https://wtxmd52.macminim6.online/v1/txmd5/sessions',
        type: 'tele68',
        icon: '🔒'
    },
    xocdia88_tx: {
        name: '🎯 XocDia88 Tài Xỉu',
        url: 'https://taixiu.system32-cloudfare-356783752985678522.monster/api/luckydice/GetSoiCau',
        type: 'xocdia',
        icon: '🎯'
    },
    xocdia88_md5: {
        name: '🛡️ XocDia88 MD5',
        url: 'https://taixiumd5.system32-cloudfare-356783752985678522.monster/api/md5luckydice/GetSoiCau',
        type: 'xocdia',
        icon: '🛡️'
    },
    hitclub: {
        name: '🏆 HITCLUB',
        url: 'https://sun-win.onrender.com/api/history',
        type: 'sun',
        icon: '🏆'
    },
    b52: {
        name: '✈️ B52',
        url: 'https://b52-qiw2.onrender.com/api/history',
        type: 'b52',
        icon: '✈️'
    }
};

// ==================== LƯU LỊCH SỬ ====================
let predictionsDB = {};
for (const key of Object.keys(GAMES)) {
    predictionsDB[key] = [];
    const file = `history_${key}.json`;
    try {
        if (fs.existsSync(file)) {
            predictionsDB[key] = JSON.parse(fs.readFileSync(file, 'utf8'));
            console.log(`✅ Loaded ${predictionsDB[key].length} records for ${key}`);
        }
    } catch(e) {}
}

function saveHistory(gameKey) {
    try {
        fs.writeFileSync(`history_${gameKey}.json`, JSON.stringify(predictionsDB[gameKey], null, 2));
    } catch(e) {}
}

// ==================== FETCH DATA ====================
async function fetchGameData(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return null;
    try {
        const res = await axios.get(game.url, { timeout: 10000 });
        
        if (game.type === 'tele68' && res.data?.list) {
            return res.data.list.map(item => ({
                phien: item.id,
                ket_qua: item.resultTruyenThong === 'TAI' ? 'T' : 'X',
                tong: item.point
            }));
        }
        if (game.type === 'xocdia' && Array.isArray(res.data)) {
            return res.data.map(item => ({
                phien: item.SessionId,
                ket_qua: item.BetSide === 0 ? 'T' : 'X',
                tong: item.DiceSum
            }));
        }
        if (game.type === 'sun' && res.data?.taixiu) {
            return res.data.taixiu.map(item => ({
                phien: item.Phien,
                ket_qua: item.Ket_qua === 'Tài' ? 'T' : 'X',
                tong: item.Tong
            }));
        }
        if (game.type === 'b52' && res.data?.data) {
            return res.data.data.map(item => ({
                phien: item.Phien,
                ket_qua: item.Ket_qua === 'Tài' ? 'T' : 'X',
                tong: item.Tong
            }));
        }
        return null;
    } catch(e) {
        console.log(`❌ ${gameKey} error:`, e.message);
        return null;
    }
}

// ==================== THUẬT TOÁN DỰ ĐOÁN ====================
function duDoan(history) {
    if (!history || history.length < 3) {
        return { du_doan: 'Tài', do_tin_cay: 50, ly_do: '📊 Chưa đủ 3 phiên' };
    }

    const res = history.map(h => h.ket_qua);
    const len = res.length;

    // 1. Cầu bệt 2-20 phiên
    for (let l = 2; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) {
            if (res[i] !== res[0]) { ok = false; break; }
        }
        if (ok) {
            let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
            let conf = Math.min(95, 48 + l * 2.8);
            return { du_doan: pred, do_tin_cay: Math.floor(conf), ly_do: `🔴 Bệt ${l} phiên ${pred}` };
        }
    }

    // 2. Cầu đảo 1-1 3-20 phiên
    for (let l = 3; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) {
            if (res[i] === res[i-1]) { ok = false; break; }
        }
        if (ok) {
            let pred = res[l-1] === 'T' ? 'Xỉu' : 'Tài';
            let conf = Math.min(92, 52 + l * 2);
            return { du_doan: pred, do_tin_cay: Math.floor(conf), ly_do: `🟡 Đảo 1-1 dài ${l} → ${pred}` };
        }
    }

    // 3. Cầu 2-2
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) {
        let pred = res[2] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 82, ly_do: `🟢 Cầu 2-2 → ${pred}` };
    }

    // 4. Cầu 3-3
    if (len >= 6 && res[0] === res[1] && res[1] === res[2] && res[3] === res[4] && res[4] === res[5] && res[0] !== res[3]) {
        let pred = res[3] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 85, ly_do: `🟣 Cầu 3-3 → ${pred}` };
    }

    // 5. Cầu 4-4
    if (len >= 8 && res[0] === res[1] && res[1] === res[2] && res[2] === res[3] && res[4] === res[5] && res[5] === res[6] && res[6] === res[7] && res[0] !== res[4]) {
        let pred = res[4] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 88, ly_do: `🟣 Cầu 4-4 → ${pred}` };
    }

    // 6. Cầu 1-2-1
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] !== res[3] && res[0] === res[3]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 86, ly_do: `🎯 Cầu 1-2-1 → ${pred}` };
    }

    // 7. Cầu 2-1-2
    if (len >= 5 && res[0] === res[1] && res[1] !== res[2] && res[2] === res[3] && res[3] !== res[4] && res[0] !== res[2]) {
        let pred = res[0] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 87, ly_do: `🎯 Cầu 2-1-2 → ${pred}` };
    }

    // 8. Cầu 1-2-3
    if (len >= 6 && res[0] === res[1] && res[1] === res[2] && res[3] === res[4] && res[0] !== res[3] && res[3] !== res[5]) {
        let pred = res[5] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 84, ly_do: `📈 Cầu 1-2-3 → ${pred}` };
    }

    // 9. Cầu 3-2-1
    if (len >= 6 && res[0] === res[1] && res[2] === res[3] && res[3] === res[4] && res[0] !== res[2] && res[2] !== res[5]) {
        let pred = res[2] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 84, ly_do: `📉 Cầu 3-2-1 → ${pred}` };
    }

    // 10. Cầu 1-1-2-2
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) {
        let pred = res[2] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 82, ly_do: `🔷 Cầu 1-1-2-2 → ${pred}` };
    }

    // 11. Cầu 2-2-1-1
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 82, ly_do: `🔶 Cầu 2-2-1-1 → ${pred}` };
    }

    // 12. Cầu 1-2-2-1
    if (len >= 6 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3] && res[3] !== res[4] && res[4] === res[5]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 86, ly_do: `🦋 Cầu 1-2-2-1 → ${pred}` };
    }

    // 13. Cầu 2-1-1-2
    if (len >= 6 && res[0] === res[1] && res[1] !== res[2] && res[2] === res[3] && res[3] !== res[4] && res[4] === res[5] && res[0] !== res[2]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 86, ly_do: `🦋 Cầu 2-1-1-2 → ${pred}` };
    }

    // 14. Cầu nhảy cóc 3 bước
    if (len >= 5 && res[0] === res[2] && res[2] === res[4]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 79, ly_do: `🐸 Nhảy cóc 3 bước → ${pred}` };
    }

    // 15. Cầu nhảy cóc 4 bước
    if (len >= 7 && res[0] === res[3] && res[3] === res[6]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 77, ly_do: `🐸 Nhảy cóc 4 bước → ${pred}` };
    }

    // 16. Cầu gương 4 phiên
    if (len >= 4 && res[0] === res[3] && res[1] === res[2]) {
        let pred = res[1] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 80, ly_do: `🪞 Cầu gương 4 phiên → ${pred}` };
    }

    // 17. Cầu gương 6 phiên
    if (len >= 6 && res[0] === res[5] && res[1] === res[4] && res[2] === res[3]) {
        let pred = res[2] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 82, ly_do: `🪞 Cầu gương 6 phiên → ${pred}` };
    }

    // 18. Chu kỳ 2 phiên
    if (len >= 4 && res[0] === res[2] && res[1] === res[3]) {
        let next = res[len % 2];
        let pred = next === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 78, ly_do: `🔄 Chu kỳ 2 phiên → ${pred}` };
    }

    // 19. Chu kỳ 3 phiên
    if (len >= 6 && res[0] === res[3] && res[1] === res[4] && res[2] === res[5]) {
        let next = res[len % 3];
        let pred = next === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 76, ly_do: `🔄 Chu kỳ 3 phiên → ${pred}` };
    }

    // 20. Ziczac 3 nhịp
    if (len >= 4 && res[0] !== res[1] && res[1] !== res[2] && res[0] === res[2]) {
        let pred = res[2] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 76, ly_do: `⚡ Ziczac 3 nhịp → ${pred}` };
    }

    // 21. Ziczac 5 nhịp
    if (len >= 6 && res[0] !== res[1] && res[1] !== res[2] && res[2] !== res[3] && res[3] !== res[4] && res[0] === res[2] && res[2] === res[4]) {
        let pred = res[4] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 74, ly_do: `⚡ Ziczac 5 nhịp → ${pred}` };
    }

    // 22. Cầu tổng cao
    let tong = history.map(h => h.tong);
    if (tong.length >= 5) {
        let avg5 = tong.slice(0,5).reduce((a,b)=>a+b,0)/5;
        if (avg5 >= 13.5) return { du_doan: 'Xỉu', do_tin_cay: 75, ly_do: `📊 Tổng TB cao ${avg5.toFixed(1)} → Xỉu` };
        if (avg5 <= 8.5) return { du_doan: 'Tài', do_tin_cay: 75, ly_do: `📊 Tổng TB thấp ${avg5.toFixed(1)} → Tài` };
    }

    // 23. Tổng tăng/giảm
    if (tong.length >= 4) {
        if (tong[0] < tong[1] && tong[1] < tong[2] && tong[2] < tong[3]) {
            return { du_doan: 'Tài', do_tin_cay: 76, ly_do: `📈 Tổng tăng 4 phiên → Tài` };
        }
        if (tong[0] > tong[1] && tong[1] > tong[2] && tong[2] > tong[3]) {
            return { du_doan: 'Xỉu', do_tin_cay: 76, ly_do: `📉 Tổng giảm 4 phiên → Xỉu` };
        }
    }

    // 24. Cực điểm
    let high15 = tong.slice(0,10).filter(s => s >= 15).length;
    let low6 = tong.slice(0,10).filter(s => s <= 6).length;
    if (high15 >= 3) return { du_doan: 'Xỉu', do_tin_cay: 78, ly_do: `⚡ Cực điểm cao ${high15}/10 → Xỉu` };
    if (low6 >= 3) return { du_doan: 'Tài', do_tin_cay: 78, ly_do: `⚡ Cực điểm thấp ${low6}/10 → Tài` };

    // 25. Nóng lạnh 10 phiên
    let last10 = res.slice(0, Math.min(10, len));
    let tai10 = last10.filter(r => r === 'T').length;
    if (tai10 >= 8) return { du_doan: 'Xỉu', do_tin_cay: 84, ly_do: `🔥 Cực nóng Tài ${tai10}/10 → Xỉu` };
    if (tai10 <= 2) return { du_doan: 'Tài', do_tin_cay: 84, ly_do: `❄️ Cực lạnh Xỉu ${10-tai10}/10 → Tài` };
    if (tai10 >= 7) return { du_doan: 'Xỉu', do_tin_cay: 78, ly_do: `🔥 Tài nóng ${tai10}/10 → Xỉu` };
    if (tai10 <= 3) return { du_doan: 'Tài', do_tin_cay: 78, ly_do: `❄️ Xỉu nóng ${10-tai10}/10 → Tài` };

    // 26. Chênh lệch 20 phiên
    let last20 = res.slice(0, Math.min(20, len));
    let tai20 = last20.filter(r => r === 'T').length;
    let diff20 = Math.abs(tai20 - (last20.length - tai20));
    if (diff20 >= 6) {
        let pred = tai20 > last20.length/2 ? 'Xỉu' : 'Tài';
        let conf = 70 + Math.min(12, diff20);
        return { du_doan: pred, do_tin_cay: conf, ly_do: `⚖️ Chênh ${tai20}/${last20.length-tai20} (20p) → ${pred}` };
    }

    // 27. Sóng mở rộng
    if (len >= 8) {
        let song = [], cur = res[0], cnt = 1;
        for (let i = 1; i < 8; i++) {
            if (res[i] === cur) cnt++;
            else { song.push(cnt); cur = res[i]; cnt = 1; }
        }
        song.push(cnt);
        if (song.length >= 3 && song[0] < song[1] && song[1] < song[2]) {
            let pred = res[0] === 'T' ? 'Xỉu' : 'Tài';
            return { du_doan: pred, do_tin_cay: 75, ly_do: `🌊 Sóng mở rộng ${song.join('-')} → ${pred}` };
        }
    }

    // 28. Mặc định - xu hướng 3 phiên cuối
    let last3 = res.slice(0, 3);
    let tai3 = last3.filter(r => r === 'T').length;
    let pred = tai3 >= 2 ? 'Tài' : 'Xỉu';
    return { du_doan: pred, do_tin_cay: 64, ly_do: `📊 Xu hướng ${tai3}T-${3-tai3}X (3 phiên cuối)` };
}

// ==================== DỰ ĐOÁN VÀ LƯU LỊCH SỬ ====================
async function layDuDoan(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return { success: false, error: 'Game không tồn tại' };
    
    const history = await fetchGameData(gameKey);
    if (!history || history.length === 0) {
        return { success: false, error: 'Không lấy được dữ liệu', game: game.name };
    }
    
    const latestPhien = history[0].phien;
    const nextPhien = latestPhien + 1;
    const result = duDoan(history);
    
    const record = {
        phien: nextPhien,
        du_doan: result.du_doan,
        do_tin_cay: result.do_tin_cay + '%',
        ly_do: result.ly_do,
        game: game.name,
        timestamp: new Date().toISOString()
    };
    
    predictionsDB[gameKey].unshift(record);
    if (predictionsDB[gameKey].length > 50) predictionsDB[gameKey] = predictionsDB[gameKey].slice(0, 50);
    saveHistory(gameKey);
    
    return {
        success: true,
        game: game.name,
        icon: game.icon,
        phien_hien_tai: nextPhien,
        du_doan: result.du_doan,
        do_tin_cay: result.do_tin_cay + '%',
        ly_do: result.ly_do,
        timestamp: new Date().toISOString()
    };
}

// ==================== API ENDPOINTS ====================

// Dự đoán 1 game
app.get('/api/predict/:game', async (req, res) => {
    const gameKey = req.params.game;
    if (!GAMES[gameKey]) {
        return res.status(404).json({ error: `Game không tồn tại. Các game: ${Object.keys(GAMES).join(', ')}` });
    }
    const result = await layDuDoan(gameKey);
    res.json(result);
});

// Lịch sử 1 game
app.get('/api/history/:game', (req, res) => {
    const gameKey = req.params.game;
    if (!GAMES[gameKey]) {
        return res.status(404).json({ error: 'Game không tồn tại' });
    }
    res.json({
        success: true,
        game: GAMES[gameKey].name,
        icon: GAMES[gameKey].icon,
        history: predictionsDB[gameKey] || [],
        total: predictionsDB[gameKey]?.length || 0
    });
});

// Reset lịch sử 1 game
app.post('/api/reset/:game', (req, res) => {
    const gameKey = req.params.game;
    if (!GAMES[gameKey]) {
        return res.status(404).json({ error: 'Game không tồn tại' });
    }
    predictionsDB[gameKey] = [];
    saveHistory(gameKey);
    res.json({ success: true, game: GAMES[gameKey].name, message: 'Đã xóa lịch sử' });
});

// Dự đoán tất cả game
app.get('/api/all', async (req, res) => {
    let results = {};
    for (let key of Object.keys(GAMES)) {
        results[key] = await layDuDoan(key);
    }
    res.json(results);
});

// Danh sách game
app.get('/api/games', (req, res) => {
    let games = {};
    for (let [key, game] of Object.entries(GAMES)) {
        games[key] = { name: game.name, icon: game.icon };
    }
    res.json({ success: true, games });
});

// ==================== GIAO DIỆN WEB ĐẸP ====================
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎲 TÀI XỈU - 8 GAME | DỰ ĐOÁN CHUẨN</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
            min-height: 100vh;
            padding: 20px;
            color: #fff;
        }
        .container { max-width: 1300px; margin: 0 auto; }
        h1 {
            text-align: center;
            font-size: 1.8rem;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #f093fb, #f5576c);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .sub {
            text-align: center;
            color: #aaa;
            margin-bottom: 30px;
            font-size: 0.85rem;
        }
        .games-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .game-card {
            background: rgba(255,255,255,0.08);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 20px;
            border: 1px solid rgba(255,255,255,0.1);
            transition: transform 0.2s;
        }
        .game-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.12); }
        .game-header {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .pred-box {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 15px;
            padding: 15px;
            text-align: center;
            margin: 15px 0;
        }
        .pred-value {
            font-size: 2rem;
            font-weight: 800;
            margin: 10px 0;
            letter-spacing: 2px;
        }
        .confidence { font-size: 0.8rem; opacity: 0.9; }
        .reason {
            font-size: 0.7rem;
            margin-top: 10px;
            opacity: 0.8;
            background: rgba(0,0,0,0.2);
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
        }
        .phien { font-size: 0.7rem; margin-top: 10px; color: #aaa; }
        .btn {
            background: rgba(255,255,255,0.15);
            border: none;
            padding: 8px 12px;
            border-radius: 25px;
            color: white;
            cursor: pointer;
            width: 100%;
            margin-top: 8px;
            transition: 0.2s;
            font-size: 0.75rem;
        }
        .btn:hover { background: rgba(255,255,255,0.3); }
        .btn-reset { background: rgba(239,68,68,0.3); }
        .btn-reset:hover { background: rgba(239,68,68,0.5); }
        .btn-history { background: rgba(34,197,94,0.3); }
        .btn-history:hover { background: rgba(34,197,94,0.5); }
        .timer {
            text-align: center;
            margin-bottom: 20px;
            font-size: 0.8rem;
            color: #aaa;
        }
        .dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #22c55e;
            animation: pulse 1s infinite;
            margin-right: 6px;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 0.7rem;
            color: #555;
        }
        @media (max-width: 640px) {
            .games-grid { grid-template-columns: 1fr; }
            h1 { font-size: 1.4rem; }
        }
    </style>
</head>
<body>
<div class="container">
    <h1>🎲 DỰ ĐOÁN TÀI XỈU - 8 GAME 🎲</h1>
    <div class="sub">⚡ 30+ LOẠI CẦU | TỈ LỆ CHÍNH XÁC CAO ⚡</div>
    <div class="timer"><span class="dot"></span><span id="timerText">Đang cập nhật...</span></div>
    <div class="games-grid" id="gamesGrid"><div style="text-align:center;padding:50px">Đang tải dữ liệu...</div></div>
    <div class="footer">Powered by @tranhoang2286 | 8 Game | 30+ Loại Cầu | Dự đoán mỗi 30 giây</div>
</div>
<script>
    const games = ${JSON.stringify(Object.keys(GAMES))};
    async function loadAll() {
        try {
            const res = await fetch('/api/all');
            const data = await res.json();
            let html = '';
            for (const [key, val] of Object.entries(data)) {
                if (!val.success) {
                    html += `<div class="game-card"><div class="game-header">🎮 ${key}</div><div style="color:#f87171">Lỗi: ${val.error}</div></div>`;
                    continue;
                }
                const color = val.du_doan === 'Tài' ? '#f87171' : '#60a5fa';
                html += \`
                    <div class="game-card">
                        <div class="game-header">\${val.icon || '🎲'} \${val.game}</div>
                        <div class="pred-box">
                            <div class="pred-value" style="color:\${color}">\${val.du_doan}</div>
                            <div class="confidence">🎯 Độ tin cậy: \${val.do_tin_cay}</div>
                            <div class="reason">📐 \${val.ly_do}</div>
                            <div class="phien">📌 Phiên: #\${val.phien_hien_tai}</div>
                        </div>
                        <button class="btn" onclick="refresh('\${key}')">🔄 Dự đoán lại</button>
                        <button class="btn btn-history" onclick="viewHistory('\${key}')">📜 Xem lịch sử</button>
                        <button class="btn btn-reset" onclick="resetGame('\${key}')">🗑️ Reset</button>
                    </div>
                \`;
            }
            document.getElementById('gamesGrid').innerHTML = html;
            document.getElementById('timerText').innerHTML = ' Cập nhật lúc: ' + new Date().toLocaleString();
        } catch(e) { console.error(e); }
    }
    async function refresh(game) {
        try {
            await fetch('/api/predict/' + game);
            loadAll();
        } catch(e) {}
    }
    async function resetGame(game) {
        if (!confirm('Xóa lịch sử dự đoán của ' + game + '?')) return;
        try {
            await fetch('/api/reset/' + game, { method: 'POST' });
            alert('Đã reset lịch sử');
            loadAll();
        } catch(e) { alert('Lỗi reset'); }
    }
    function viewHistory(game) {
        window.open('/api/history/' + game, '_blank');
    }
    loadAll();
    setInterval(loadAll, 30000);
</script>
</body>
</html>`);
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     🎲 TÀI XỈU API - 8 GAME - 30+ LOẠI CẦU 🎲               ║
╠══════════════════════════════════════════════════════════════╣
║  🚀 Server: http://localhost:${PORT}                          ║
║  📡 API:                                                      ║
║     GET  /api/predict/:game  - Dự đoán 1 game                ║
║     GET  /api/history/:game  - Lịch sử 1 game                ║
║     POST /api/reset/:game    - Reset lịch sử                 ║
║     GET  /api/all            - Dự đoán tất cả                ║
║     GET  /api/games          - Danh sách game                ║
║  🎮 Các game: ${Object.keys(GAMES).join(', ')}
╚══════════════════════════════════════════════════════════════╝
    `);
});
