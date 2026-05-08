const express = require('express');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ==================== 17 GAME (full list) ====================
const GAMES = {
    // Sunwin
    sunwin_tx: {
        name: 'Sunwin Tài Xỉu',
        url: 'https://bracket-ellen-roads-prefer.trycloudflare.com/api/tx',
        type: 'format1',
        icon: '☀️'
    },
    sunwin_x88: {
        name: 'Sunwin X88 Live',
        url: 'https://letters-carries-hip-seeking.trycloudflare.com/sun/x88',
        type: 'format2',
        icon: '🎮'
    },
    sunwin_sicbo: {
        name: 'Sunwin Sicbo',
        url: 'https://afterwards-motels-honors-vendors.trycloudflare.com/api/sunsicbo',
        type: 'format3',
        icon: '🎲'
    },
    // Xd88
    xd88_md5: {
        name: 'XD88 MD5',
        url: 'https://books-carlo-instruments-capture.trycloudflare.com/api/taixiu',
        type: 'format1',
        icon: '🎯'
    },
    // Hitclub
    hitclub: {
        name: 'HITCLUB',
        url: 'https://letting-tackle-newton-oak.trycloudflare.com/api/tx',
        type: 'format1',
        icon: '🏆'
    },
    // Lc79
    lc79_tx: {
        name: 'LC79 Tài Xỉu',
        url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/tx',
        type: 'format1',
        icon: '🎲'
    },
    lc79_md5: {
        name: 'LC79 MD5',
        url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/txmd5',
        type: 'format1',
        icon: '🔐'
    },
    lc79_xocdia: {
        name: 'LC79 Xóc Đĩa',
        url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/xocdia',
        type: 'format4',
        icon: '🥏'
    },
    // Betvip
    betvip_tx: {
        name: 'BETVIP Tài Xỉu',
        url: 'https://plastic-diet-visits-opens.trycloudflare.com/api/tx',
        type: 'format1',
        icon: '🎰'
    },
    betvip_md5: {
        name: 'BETVIP MD5',
        url: 'https://plastic-diet-visits-opens.trycloudflare.com/api/txmd5',
        type: 'format1',
        icon: '🔒'
    },
    // 789club
    club789: {
        name: '789CLUB',
        url: 'https://dependent-epinions-somebody-enclosed.trycloudflare.com/api/tx',
        type: 'format1',
        icon: '🃏'
    },
    // Max789
    max789: {
        name: 'MAX789',
        url: 'https://cage-adjustment-whose-banner.trycloudflare.com/api/tx',
        type: 'format1',
        icon: '⭐'
    },
    // B52
    b52: {
        name: 'B52',
        url: 'https://gold-ultra-fails-handles.trycloudflare.com/txmd5',
        type: 'format1',
        icon: '✈️'
    },
    // Son789
    son789: {
        name: 'SON789',
        url: 'https://tanks-gates-subscription-hosting.trycloudflare.com/api/txmd5',
        type: 'format1',
        icon: '🎵'
    },
    // Bcr sexy
    bcr_sexy: {
        name: 'BCR Sexy',
        url: 'https://classic-watching-cup-representatives.trycloudflare.com/api/bcr',
        type: 'format_bcr',
        icon: '💃'
    },
    // Luck8
    luck8_md5: {
        name: 'Luck8 MD5',
        url: 'https://heroes-presents-pound-tablet.trycloudflare.com/api/txmd5',
        type: 'format1',
        icon: '🍀'
    },
    luck8_sicbo: {
        name: 'Luck8 Sicbo40',
        url: 'https://heroes-presents-pound-tablet.trycloudflare.com/api/sicbo40',
        type: 'format1',
        icon: '🎲'
    }
};

// Lưu lịch sử
let predictionsDB = {};
for (const key of Object.keys(GAMES)) {
    predictionsDB[key] = [];
    try {
        if (fs.existsSync(`history_${key}.json`)) {
            predictionsDB[key] = JSON.parse(fs.readFileSync(`history_${key}.json`, 'utf8'));
        }
    } catch(e) {}
}

function saveHistory(gameKey) {
    try {
        fs.writeFileSync(`history_${gameKey}.json`, JSON.stringify(predictionsDB[gameKey], null, 2));
    } catch(e) {}
}

// Fetch data
async function fetchGameData(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return null;
    try {
        const res = await axios.get(game.url, { timeout: 10000 });
        
        if (game.type === 'format1' && res.data && res.data.ket_qua) {
            let ketQua = res.data.ket_qua;
            if (ketQua === 'Tài' || ketQua === 'TAI') ketQua = 'T';
            else if (ketQua === 'Xỉu' || ketQua === 'XIU' || ketQua === 'Xiu') ketQua = 'X';
            return [{
                phien: res.data.phien,
                ket_qua: ketQua,
                tong: res.data.tong || 0
            }];
        }
        
        if (game.type === 'format3' && res.data && res.data.ket_qua) {
            let phien = typeof res.data.phien === 'string' ? parseInt(res.data.phien.replace('#', '')) : res.data.phien;
            return [{
                phien: phien,
                ket_qua: res.data.ket_qua === 'Tài' ? 'T' : 'X',
                tong: res.data.tong
            }];
        }
        
        if (game.type === 'format_bcr' && res.data?.data) {
            let firstBan = res.data.data[0];
            let resultsStr = firstBan?.results || '';
            let lastResult = resultsStr.length > 0 ? resultsStr[resultsStr.length - 1] : '?';
            let ketQua = (lastResult === 'T' || lastResult === 'B') ? 'T' : (lastResult === 'P' ? 'X' : '?');
            return [{
                phien: Date.now(),
                ket_qua: ketQua === 'T' ? 'T' : 'X',
                tong: 0
            }];
        }
        
        return null;
    } catch(e) {
        console.log(`❌ ${gameKey} error:`, e.message);
        return null;
    }
}

// ==================== THUẬT TOÁN 110+ CẦU (giữ nguyên từ code trước) ====================
function duDoan(history) {
    if (!history || history.length < 3) {
        return { du_doan: 'Tài', do_tin_cay: 50, ly_do: 'Chưa đủ 3 phiên' };
    }
    const res = history.map(h => h.ket_qua);
    const sums = history.map(h => h.tong);
    const len = res.length;
    
    // Bệt 2-20
    for (let l = 2; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) if (res[i] !== res[0]) { ok = false; break; }
        if (ok) {
            let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
            let conf = Math.min(95, 48 + l * 3);
            return { du_doan: pred, do_tin_cay: Math.floor(conf), ly_do: `Bệt ${l} phiên ${pred}` };
        }
    }
    
    // Đảo 1-1 3-20
    for (let l = 3; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) if (res[i] === res[i-1]) { ok = false; break; }
        if (ok) {
            let pred = res[l-1] === 'T' ? 'Xỉu' : 'Tài';
            let conf = Math.min(92, 52 + l * 2);
            return { du_doan: pred, do_tin_cay: Math.floor(conf), ly_do: `Đảo 1-1 dài ${l} → ${pred}` };
        }
    }
    
    // Block 2-2 đến 7-7
    for (let b = 2; b <= 7; b++) {
        if (len >= b * 2) {
            let ok = true;
            for (let i = 0; i < b; i++) if (res[i] !== res[i+b]) { ok = false; break; }
            if (ok && res[0] !== res[b]) {
                let pred = res[b] === 'T' ? 'Xỉu' : 'Tài';
                let conf = 75 + b;
                return { du_doan: pred, do_tin_cay: conf, ly_do: `Cầu ${b}-${b} → ${pred}` };
            }
        }
    }
    
    // Cầu 1-2-1
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] !== res[3] && res[0] === res[3]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 86, ly_do: `Cầu 1-2-1 → ${pred}` };
    }
    
    // Cầu 2-1-2
    if (len >= 5 && res[0] === res[1] && res[1] !== res[2] && res[2] === res[3] && res[3] !== res[4] && res[0] !== res[2]) {
        let pred = res[0] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 87, ly_do: `Cầu 2-1-2 → ${pred}` };
    }
    
    // Cầu 1-2-3
    if (len >= 6 && res[0] === res[1] && res[1] === res[2] && res[3] === res[4] && res[0] !== res[3] && res[3] !== res[5]) {
        let pred = res[5] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 84, ly_do: `Cầu 1-2-3 → ${pred}` };
    }
    
    // Cầu 3-2-1
    if (len >= 6 && res[0] === res[1] && res[2] === res[3] && res[3] === res[4] && res[0] !== res[2] && res[2] !== res[5]) {
        let pred = res[2] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 84, ly_do: `Cầu 3-2-1 → ${pred}` };
    }
    
    // Cầu 1-1-2-2 & 2-2-1-1
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) {
        let pred = res[2] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 82, ly_do: `Cầu 1-1-2-2 → ${pred}` };
    }
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 82, ly_do: `Cầu 2-2-1-1 → ${pred}` };
    }
    
    // Nhảy cóc
    for (let step = 1; step <= 4; step++) {
        let need = step * 2 + 1;
        if (len >= need) {
            let ok = true;
            for (let i = 0; i <= step * 2; i += step) if (res[i] !== res[0]) { ok = false; break; }
            if (ok) {
                let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
                let conf = 80 - step * 2;
                return { du_doan: pred, do_tin_cay: conf, ly_do: `Nhảy cóc bậc ${step} → ${pred}` };
            }
        }
    }
    
    // Cầu gương 4,6,8,10,12
    for (let m of [4, 6, 8, 10, 12]) {
        if (len >= m) {
            let ok = true;
            for (let i = 0; i < m / 2; i++) if (res[i] !== res[m-1-i]) { ok = false; break; }
            if (ok) {
                let pred = res[m/2 - 1] === 'T' ? 'Xỉu' : 'Tài';
                let conf = 75 + m/2;
                return { du_doan: pred, do_tin_cay: conf, ly_do: `Cầu gương ${m} phiên → ${pred}` };
            }
        }
    }
    
    // Chu kỳ 2-8
    for (let c = 2; c <= 8; c++) {
        if (len >= c * 2) {
            let ok = true;
            for (let i = c; i < Math.min(len, c * 3); i++) if (res[i] !== res[i % c]) { ok = false; break; }
            if (ok) {
                let next = res[len % c];
                let pred = next === 'T' ? 'Tài' : 'Xỉu';
                let conf = 80 - c;
                return { du_doan: pred, do_tin_cay: conf, ly_do: `Chu kỳ ${c} phiên → ${pred}` };
            }
        }
    }
    
    // Ziczac 3-12 nhịp
    for (let z = 3; z <= 12; z++) {
        if (len >= z + 1) {
            let ok = true;
            for (let i = 0; i < z; i++) if (res[i] === res[i+1]) { ok = false; break; }
            if (ok) {
                let pred = res[z-1] === 'T' ? 'Xỉu' : 'Tài';
                let conf = 78 - (z - 3);
                return { du_doan: pred, do_tin_cay: Math.max(65, conf), ly_do: `Ziczac ${z} nhịp → ${pred}` };
            }
        }
    }
    
    // Tổng điểm
    if (sums.length >= 5) {
        let avg5 = sums.slice(0,5).reduce((a,b)=>a+b,0)/5;
        if (avg5 >= 14) return { du_doan: 'Xỉu', do_tin_cay: 76, ly_do: `Tổng TB rất cao ${avg5.toFixed(1)} → Xỉu` };
        if (avg5 >= 13) return { du_doan: 'Xỉu', do_tin_cay: 74, ly_do: `Tổng TB cao ${avg5.toFixed(1)} → Xỉu` };
        if (avg5 <= 8) return { du_doan: 'Tài', do_tin_cay: 76, ly_do: `Tổng TB rất thấp ${avg5.toFixed(1)} → Tài` };
        if (avg5 <= 9) return { du_doan: 'Tài', do_tin_cay: 74, ly_do: `Tổng TB thấp ${avg5.toFixed(1)} → Tài` };
    }
    
    // Nóng lạnh
    let last10 = res.slice(0, Math.min(10, len));
    let tai10 = last10.filter(r => r === 'T').length;
    if (tai10 >= 9) return { du_doan: 'Xỉu', do_tin_cay: 88, ly_do: `Siêu nóng Tài ${tai10}/10 → Xỉu` };
    if (tai10 <= 1) return { du_doan: 'Tài', do_tin_cay: 88, ly_do: `Siêu lạnh Xỉu ${10-tai10}/10 → Tài` };
    if (tai10 >= 8) return { du_doan: 'Xỉu', do_tin_cay: 84, ly_do: `Tài nóng ${tai10}/10 → Xỉu` };
    if (tai10 <= 2) return { du_doan: 'Tài', do_tin_cay: 84, ly_do: `Xỉu nóng ${10-tai10}/10 → Tài` };
    if (tai10 >= 7) return { du_doan: 'Xỉu', do_tin_cay: 78, ly_do: `Tài nóng ${tai10}/10 → Xỉu` };
    if (tai10 <= 3) return { du_doan: 'Tài', do_tin_cay: 78, ly_do: `Xỉu nóng ${10-tai10}/10 → Tài` };
    
    // Xu hướng 3 phiên cuối
    let last3 = res.slice(0, 3);
    let tai3 = last3.filter(r => r === 'T').length;
    let pred = tai3 >= 2 ? 'Tài' : 'Xỉu';
    return { du_doan: pred, do_tin_cay: 64, ly_do: `Xu hướng ${tai3}T-${3-tai3}X` };
}

// Dự đoán 1 game
async function layDuDoan(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return { success: false, error: 'Game không tồn tại' };
    const history = await fetchGameData(gameKey);
    if (!history || history.length === 0) {
        return { success: false, error: 'Không lấy được dữ liệu', game: game.name };
    }
    let latestPhien = history[0].phien;
    let nextPhien = typeof latestPhien === 'number' ? latestPhien + 1 : (parseInt(latestPhien) + 1).toString();
    const result = duDoan(history);
    const record = { phien: nextPhien, du_doan: result.du_doan, do_tin_cay: result.do_tin_cay + '%', ly_do: result.ly_do, game: game.name, timestamp: new Date().toISOString() };
    predictionsDB[gameKey].unshift(record);
    if (predictionsDB[gameKey].length > 50) predictionsDB[gameKey] = predictionsDB[gameKey].slice(0, 50);
    saveHistory(gameKey);
    return { success: true, game: game.name, icon: game.icon, phien_hien_tai: nextPhien, du_doan: result.du_doan, do_tin_cay: result.do_tin_cay + '%', ly_do: result.ly_do };
}

// API
app.get('/api/predict/:game', async (req, res) => {
    const result = await layDuDoan(req.params.game);
    res.json(result);
});
app.get('/api/history/:game', (req, res) => {
    const k = req.params.game;
    res.json({ success: true, game: GAMES[k]?.name, history: predictionsDB[k] || [], total: predictionsDB[k]?.length || 0 });
});
app.post('/api/reset/:game', (req, res) => {
    const k = req.params.game;
    predictionsDB[k] = [];
    saveHistory(k);
    res.json({ success: true, message: 'Đã reset lịch sử' });
});
app.get('/api/all', async (req, res) => {
    let results = {};
    for (let key of Object.keys(GAMES)) results[key] = await layDuDoan(key);
    res.json(results);
});
app.get('/api/games', (req, res) => {
    let games = {};
    for (let [k, v] of Object.entries(GAMES)) games[k] = { name: v.name, icon: v.icon };
    res.json({ success: true, games, total: Object.keys(GAMES).length });
});

// Giao diện web
app.get('/', (req, res) => {
    const gameList = Object.keys(GAMES);
    res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>🎲 TÀI XỈU - ${gameList.length} GAME | 110 LOẠI CẦU</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);min-height:100vh;padding:20px;color:#fff}.container{max-width:1400px;margin:0 auto}h1{text-align:center;margin-bottom:10px;font-size:1.8rem;background:linear-gradient(135deg,#f093fb,#f5576c);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.sub{text-align:center;color:#aaa;margin-bottom:30px;font-size:.85rem}.games-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}.game-card{background:rgba(255,255,255,0.08);border-radius:20px;padding:18px;backdrop-filter:blur(10px)}.game-header{font-size:1.1rem;font-weight:bold;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.2)}.pred-box{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:15px;padding:15px;text-align:center;margin:12px 0}.pred-value{font-size:2rem;font-weight:800;margin:8px 0}.confidence{font-size:.8rem}.reason{font-size:.7rem;margin-top:8px;background:rgba(0,0,0,0.2);display:inline-block;padding:4px 12px;border-radius:20px}.btn{background:rgba(255,255,255,0.15);border:none;padding:7px;border-radius:25px;color:#fff;cursor:pointer;width:100%;margin-top:6px;font-size:.7rem}.btn:hover{background:rgba(255,255,255,0.3)}.timer{text-align:center;margin-bottom:20px;font-size:.8rem}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 1s infinite;margin-right:6px}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}</style></head>
<body><div class="container"><h1>🎲 TÀI XỈU - ${gameList.length} GAME | 110 LOẠI CẦU 🎲</h1><div class="sub">Bệt 2-20 | Đảo 1-1 | Block 2-7 | Chu kỳ | Ziczac | Gương | Sóng</div><div class="timer"><span class="dot"></span><span id="timerText">Đang tải...</span></div><div class="games-grid" id="gamesGrid">Đang tải...</div></div>
<script>async function loadAll(){try{const r=await fetch('/api/all');const d=await r.json();let h='';for(const[k,v]of Object.entries(d)){if(!v.success){h+='<div class="game-card"><div class="game-header">⚠️ '+k+'</div><div style="color:#f87171">Lỗi: '+v.error+'</div></div>';continue}let c=v.du_doan==='Tài'?'#f87171':'#60a5fa';h+='<div class="game-card"><div class="game-header">'+v.icon+' '+v.game+'</div><div class="pred-box"><div class="pred-value" style="color:'+c+'">'+v.du_doan+'</div><div class="confidence">🎯 '+v.do_tin_cay+'</div><div class="reason">📐 '+v.ly_do+'</div></div><button class="btn" onclick="refresh(\''+k+'\')">🔄 Dự đoán lại</button><button class="btn" onclick="resetGame(\''+k+'\')">🗑️ Reset</button></div>';}document.getElementById('gamesGrid').innerHTML=h;document.getElementById('timerText').innerHTML=' Cập nhật: '+new Date().toLocaleString();}catch(e){}}async function refresh(g){await fetch('/api/predict/'+g);loadAll();}async function resetGame(g){if(confirm('Xóa lịch sử?')){await fetch('/api/reset/'+g,{method:'POST'});loadAll();}}loadAll();setInterval(loadAll,30000);</script></body></html>`);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 TÀI XỈU API - ${Object.keys(GAMES).length} GAME | 110+ LOẠI CẦU`);
    console.log(`📡 Các game: ${Object.keys(GAMES).join(', ')}`);
});
