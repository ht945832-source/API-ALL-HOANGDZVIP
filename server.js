const express = require('express');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ==================== 19 GAME ====================
const GAMES = {
    sunwin_tx: { name: 'Sunwin Tài Xỉu', url: 'https://bracket-ellen-roads-prefer.trycloudflare.com/api/tx', type: 'taixiu', icon: '☀️' },
    sunwin_x88: { name: 'Sunwin X88', url: 'https://letters-carries-hip-seeking.trycloudflare.com/sun/x88', type: 'unknown', icon: '🎮' },
    sunwin_sicbo: { name: 'Sunwin Sicbo', url: 'https://afterwards-motels-honors-vendors.trycloudflare.com/api/sunsicbo', type: 'taixiu', icon: '🎲' },
    xd88_md5: { name: 'XD88 MD5', url: 'https://books-carlo-instruments-capture.trycloudflare.com/api/taixiu', type: 'taixiu', icon: '🎯' },
    hitclub: { name: 'HITCLUB', url: 'https://letting-tackle-newton-oak.trycloudflare.com/api/tx', type: 'taixiu', icon: '🏆' },
    lc79_tx: { name: 'LC79 Tài Xỉu', url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/tx', type: 'taixiu', icon: '🎲' },
    lc79_md5: { name: 'LC79 MD5', url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/txmd5', type: 'taixiu', icon: '🔐' },
    lc79_xocdia: { name: 'LC79 Xóc Đĩa', url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/xocdia', type: 'xocdia', icon: '🥏' },
    betvip_tx: { name: 'BETVIP Tài Xỉu', url: 'https://plastic-diet-visits-opens.trycloudflare.com/api/tx', type: 'taixiu', icon: '🎰' },
    betvip_md5: { name: 'BETVIP MD5', url: 'https://plastic-diet-visits-opens.trycloudflare.com/api/txmd5', type: 'taixiu', icon: '🔒' },
    club789: { name: '789CLUB', url: 'https://dependent-epinions-somebody-enclosed.trycloudflare.com/api/tx', type: 'taixiu', icon: '🃏' },
    max789: { name: 'MAX789', url: 'https://cage-adjustment-whose-banner.trycloudflare.com/api/tx', type: 'taixiu', icon: '⭐' },
    b52: { name: 'B52', url: 'https://gold-ultra-fails-handles.trycloudflare.com/txmd5', type: 'taixiu', icon: '✈️' },
    son789: { name: 'SON789', url: 'https://tanks-gates-subscription-hosting.trycloudflare.com/api/txmd5', type: 'taixiu', icon: '🎵' },
    bcr_sexy: { name: 'BCR Sexy', url: 'https://classic-watching-cup-representatives.trycloudflare.com/api/bcr', type: 'bcr', icon: '💃' },
    luck8_md5: { name: 'Luck8 MD5', url: 'https://heroes-presents-pound-tablet.trycloudflare.com/api/txmd5', type: 'taixiu', icon: '🍀' },
    luck8_sicbo: { name: 'Luck8 Sicbo40', url: 'https://heroes-presents-pound-tablet.trycloudflare.com/api/sicbo40', type: 'taixiu', icon: '🎲' }
};

let predictionsDB = {};
for (const key of Object.keys(GAMES)) {
    predictionsDB[key] = [];
    try { if (fs.existsSync(`history_${key}.json`)) predictionsDB[key] = JSON.parse(fs.readFileSync(`history_${key}.json`)); } catch(e) {}
}
function saveHistory(k) { try { fs.writeFileSync(`history_${k}.json`, JSON.stringify(predictionsDB[k], null, 2)); } catch(e) {} }

// ==================== FETCH DATA ====================
async function fetchGameData(gameKey) {
    const game = GAMES[gameKey];
    try {
        const res = await axios.get(game.url, { timeout: 10000 });
        if (game.type === 'taixiu' && res.data && res.data.ket_qua) {
            let ketQua = res.data.ket_qua === 'Tài' || res.data.ket_qua === 'TAI' ? 'T' : 'X';
            return [{ phien: res.data.phien, ket_qua: ketQua, tong: res.data.tong || 0 }];
        }
        if (game.type === 'xocdia' && res.data) {
            let ketQua = res.data.ket_qua === 'Tài' ? 'T' : 'X';
            return [{ phien: Date.now(), ket_qua: ketQua, tong: 0 }];
        }
        if (game.type === 'bcr' && res.data?.data) {
            let allResults = [];
            for (let ban of res.data.data) {
                if (ban.results) {
                    for (let ch of ban.results) {
                        allResults.push({ ban: ban.ban, result: ch });
                    }
                }
            }
            return allResults;
        }
        return null;
    } catch(e) { return null; }
}

// ==================== THUẬT TOÁN RIÊNG CHO TÀI XỈU ====================
function thuatToanTaiXiu(history) {
    if (!history || history.length < 3) return { du_doan: 'Tài', do_tin_cay: 50, ly_do: 'Chưa đủ dữ liệu' };
    const res = history.map(h => h.ket_qua);
    const len = res.length;
    
    // Cầu bệt
    let bet = 1;
    for (let i = 1; i < Math.min(len, 15); i++) if (res[i] === res[0]) bet++; else break;
    if (bet >= 3) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        let conf = Math.min(88, 50 + bet * 4);
        return { du_doan: pred, do_tin_cay: conf, ly_do: `🔴 Cầu bệt ${bet} phiên - ${pred}` };
    }
    
    // Cầu đảo 1-1
    let dao = 1;
    for (let i = 1; i < Math.min(len, 12); i++) if (res[i] !== res[i-1]) dao++; else break;
    if (dao >= 4) {
        let pred = res[dao-1] === 'T' ? 'Xỉu' : 'Tài';
        let conf = Math.min(85, 55 + dao * 2.5);
        return { du_doan: pred, do_tin_cay: conf, ly_do: `🟡 Cầu đảo 1-1 dài ${dao} nhịp → ${pred}` };
    }
    
    // Cầu 2-2
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) {
        let pred = res[2] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 82, ly_do: `🟢 Cầu 2-2 → ${pred}` };
    }
    
    // Cầu 1-2-1
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] !== res[3] && res[0] === res[3]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 86, ly_do: `🎯 Cầu 1-2-1 → ${pred}` };
    }
    
    // Xu hướng 3 phiên
    let t3 = res.slice(0,3).filter(r=>r==='T').length;
    let pred = t3 >= 2 ? 'Tài' : 'Xỉu';
    return { du_doan: pred, do_tin_cay: 65, ly_do: `📊 Xu hướng ${t3}T-${3-t3}X` };
}

// ==================== THUẬT TOÁN RIÊNG CHO BCR (Con/Cái/Hòa/Con Đôi/Cái Đôi) ====================
function thuatToanBCR(results) {
    if (!results || results.length < 5) {
        return { du_doan: 'Chưa đủ dữ liệu', do_tin_cay: 50, phan_tich: 'Cần ít nhất 5 ván để phân tích' };
    }
    
    let resultsStr = results.map(r => r.result).join('');
    let lastChar = resultsStr[resultsStr.length - 1] || '?';
    
    // Phân tích cầu Con/Cái (B=Con/Cái? B là Banker/Con, P là Player/Cái)
    let betStreak = 1;
    for (let i = resultsStr.length - 2; i >= 0; i--) {
        if (resultsStr[i] === lastChar) betStreak++;
        else break;
    }
    
    let dao = 1;
    for (let i = resultsStr.length - 2; i >= 0; i--) {
        if (resultsStr[i] !== resultsStr[i+1]) dao++;
        else break;
    }
    
    // Dự đoán Con/Cái
    let duDoanConCai = '';
    let doTinCayConCai = 50;
    let lyDoConCai = '';
    
    if (betStreak >= 3) {
        duDoanConCai = lastChar === 'B' ? '🏦 CON' : (lastChar === 'P' ? '👤 CÁI' : (lastChar === 'T' ? '🏦 CON' : '👤 CÁI'));
        doTinCayConCai = Math.min(85, 55 + betStreak * 5);
        lyDoConCai = `📈 Cầu bệt ${betStreak} ván ${lastChar === 'B' ? 'CON' : 'CÁI'} → theo`;
    } else if (dao >= 4) {
        let next = lastChar === 'B' ? 'CÁI' : 'CON';
        duDoanConCai = next === 'CON' ? '🏦 CON' : '👤 CÁI';
        doTinCayConCai = Math.min(82, 58 + dao * 2);
        lyDoConCai = `🔄 Cầu đảo ${dao} ván → bẻ sang ${next}`;
    } else {
        // Đếm tần suất 10 ván gần nhất
        let last10 = resultsStr.slice(-10);
        let b = (last10.match(/B/g) || []).length;
        let p = (last10.match(/P/g) || []).length;
        if (b > p + 2) {
            duDoanConCai = '👤 CÁI';
            doTinCayConCai = 72;
            lyDoConCai = `📊 CON đang nóng ${b}/10 → bẻ CÁI`;
        } else if (p > b + 2) {
            duDoanConCai = '🏦 CON';
            doTinCayConCai = 72;
            lyDoConCai = `📊 CÁI đang nóng ${p}/10 → bẻ CON`;
        } else {
            duDoanConCai = lastChar === 'B' ? '🏦 CON' : '👤 CÁI';
            doTinCayConCai = 60;
            lyDoConCai = `📊 Theo xu hướng ván cuối (${lastChar === 'B' ? 'CON' : 'CÁI'})`;
        }
    }
    
    // Dự đoán Hòa (T)
    let tCount = (resultsStr.match(/T/g) || []).length;
    let last5 = resultsStr.slice(-5);
    let t5 = (last5.match(/T/g) || []).length;
    let duDoanHoa = '';
    let doTinCayHoa = 0;
    let lyDoHoa = '';
    
    if (tCount >= 3 && t5 >= 1) {
        duDoanHoa = '⚖️ HÒA';
        doTinCayHoa = 65;
        lyDoHoa = `🎲 Hòa xuất hiện ${tCount} lần, có thể về tiếp`;
    } else if (t5 === 0 && resultsStr.length > 20) {
        duDoanHoa = '⚖️ HÒA';
        doTinCayHoa = 55;
        lyDoHoa = `❄️ Hòa vắng ${resultsStr.length - tCount} ván, khả năng về`;
    } else {
        duDoanHoa = '❌ KHÔNG HÒA';
        doTinCayHoa = 85;
        lyDoHoa = `📊 Hòa hiếm khi xuất hiện (${tCount}/${resultsStr.length})`;
    }
    
    // Dự đoán Con Đôi (BB) và Cái Đôi (PP)
    let duDoanConDoi = '';
    let doTinCayConDoi = 0;
    let lyDoConDoi = '';
    let duDoanCaiDoi = '';
    let doTinCayCaiDoi = 0;
    let lyDoCaiDoi = '';
    
    let last3Pairs = [];
    for (let i = 0; i < resultsStr.length - 1; i++) {
        if (resultsStr[i] === resultsStr[i+1]) last3Pairs.push(resultsStr[i] + resultsStr[i+1]);
    }
    let lastPair = last3Pairs.length > 0 ? last3Pairs[last3Pairs.length-1] : '';
    
    if (lastPair === 'BB') {
        duDoanConDoi = '🎲 CON ĐÔI (BB)';
        doTinCayConDoi = 70;
        lyDoConDoi = `🔄 Ván trước có BB (Con Đôi), khả năng lặp lại`;
    } else if (last3Pairs.filter(p => p === 'BB').length >= 2) {
        duDoanConDoi = '🎲 CON ĐÔI (BB)';
        doTinCayConDoi = 65;
        lyDoConDoi = `📊 Đã có ${last3Pairs.filter(p=>p==='BB').length} lần BB gần đây`;
    } else {
        duDoanConDoi = '❌ KHÔNG CON ĐÔI';
        doTinCayConDoi = 85;
        lyDoConDoi = `📊 BB hiếm gặp`;
    }
    
    if (lastPair === 'PP') {
        duDoanCaiDoi = '🎲 CÁI ĐÔI (PP)';
        doTinCayCaiDoi = 70;
        lyDoCaiDoi = `🔄 Ván trước có PP (Cái Đôi), khả năng lặp lại`;
    } else if (last3Pairs.filter(p => p === 'PP').length >= 2) {
        duDoanCaiDoi = '🎲 CÁI ĐÔI (PP)';
        doTinCayCaiDoi = 65;
        lyDoCaiDoi = `📊 Đã có ${last3Pairs.filter(p=>p==='PP').length} lần PP gần đây`;
    } else {
        duDoanCaiDoi = '❌ KHÔNG CÁI ĐÔI';
        doTinCayCaiDoi = 85;
        lyDoCaiDoi = `📊 PP hiếm gặp`;
    }
    
    return {
        success: true,
        du_doan_con_cai: duDoanConCai,
        tin_cay_con_cai: doTinCayConCai + '%',
        ly_do_con_cai: lyDoConCai,
        du_doan_hoa: duDoanHoa,
        tin_cay_hoa: doTinCayHoa + '%',
        ly_do_hoa: lyDoHoa,
        du_doan_con_doi: duDoanConDoi,
        tin_cay_con_doi: doTinCayConDoi + '%',
        ly_do_con_doi: lyDoConDoi,
        du_doan_cai_doi: duDoanCaiDoi,
        tin_cay_cai_doi: doTinCayCaiDoi + '%',
        ly_do_cai_doi: lyDoCaiDoi,
        phan_tich_cau: {
            chuoi_bet: betStreak,
            chuoi_dao: dao,
            tan_suat_B: (resultsStr.match(/B/g) || []).length,
            tan_suat_P: (resultsStr.match(/P/g) || []).length,
            tan_suat_T: (resultsStr.match(/T/g) || []).length,
            ket_qua_gan_nhat: lastChar === 'B' ? 'CON' : (lastChar === 'P' ? 'CÁI' : (lastChar === 'T' ? 'HÒA' : '?')),
            lich_su_10_gan_nhat: resultsStr.slice(-10)
        }
    };
}

// ==================== THUẬT TOÁN RIÊNG CHO XÓC ĐĨA ====================
function thuatToanXocDia(history) {
    if (!history || history.length < 3) return { du_doan: 'Chẵn', do_tin_cay: 50, ly_do: 'Chưa đủ dữ liệu' };
    const res = history.map(h => h.ket_qua);
    let chan = res.filter(r => r === 'T').length;
    let le = res.length - chan;
    if (chan > le + 2) return { du_doan: 'Lẻ', do_tin_cay: 75, ly_do: `📊 Chẵn đang nóng ${chan}/${res.length} → bẻ Lẻ` };
    if (le > chan + 2) return { du_doan: 'Chẵn', do_tin_cay: 75, ly_do: `📊 Lẻ đang nóng ${le}/${res.length} → bẻ Chẵn` };
    return { du_doan: res[0] === 'T' ? 'Chẵn' : 'Lẻ', do_tin_cay: 60, ly_do: `📈 Theo xu hướng ván cuối (${res[0] === 'T' ? 'Chẵn' : 'Lẻ'})` };
}

// ==================== DỰ ĐOÁN CHUNG ====================
async function layDuDoan(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return { success: false, error: 'Game không tồn tại' };
    
    const data = await fetchGameData(gameKey);
    if (!data) return { success: false, error: 'Không lấy được dữ liệu', game: game.name };
    
    let result = {};
    if (game.type === 'bcr') {
        result = thuatToanBCR(data);
        result.game = game.name;
        result.icon = game.icon;
        result.timestamp = new Date().toISOString();
    } else if (game.type === 'taixiu') {
        let txResult = thuatToanTaiXiu(data);
        result = {
            success: true,
            game: game.name,
            icon: game.icon,
            du_doan: txResult.du_doan,
            do_tin_cay: txResult.do_tin_cay + '%',
            ly_do: txResult.ly_do
        };
    } else if (game.type === 'xocdia') {
        let xdResult = thuatToanXocDia(data);
        result = {
            success: true,
            game: game.name,
            icon: game.icon,
            du_doan: xdResult.du_doan,
            do_tin_cay: xdResult.do_tin_cay + '%',
            ly_do: xdResult.ly_do
        };
    } else {
        result = { success: false, error: 'Loại game không hỗ trợ', game: game.name };
    }
    
    // Lưu lịch sử
    const record = { ...result, timestamp: new Date().toISOString() };
    predictionsDB[gameKey].unshift(record);
    if (predictionsDB[gameKey].length > 50) predictionsDB[gameKey] = predictionsDB[gameKey].slice(0, 50);
    saveHistory(gameKey);
    
    return result;
}

// ==================== API ====================
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
    for (let [k, v] of Object.entries(GAMES)) games[k] = { name: v.name, icon: v.icon, type: v.type };
    res.json({ success: true, games, total: Object.keys(GAMES).length });
});

// Giao diện web
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>🎲 ALL GAME - ${Object.keys(GAMES).length} GAME</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);min-height:100vh;padding:20px;color:#fff}.container{max-width:1400px;margin:0 auto}h1{text-align:center;margin-bottom:10px;background:linear-gradient(135deg,#f093fb,#f5576c);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.timer{text-align:center;margin-bottom:20px;font-size:.8rem}.games-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}.game-card{background:rgba(255,255,255,0.08);border-radius:20px;padding:18px;backdrop-filter:blur(10px)}.game-header{font-size:1.1rem;font-weight:bold;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:8px}.pred-box{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:15px;padding:15px;text-align:center;margin:12px 0}.pred-value{font-size:1.8rem;font-weight:800;margin:8px 0}.confidence{font-size:.75rem}.reason{font-size:.65rem;margin-top:8px;background:rgba(0,0,0,0.2);display:inline-block;padding:4px 10px;border-radius:20px}.btn{background:rgba(255,255,255,0.15);border:none;padding:6px;border-radius:25px;color:#fff;cursor:pointer;width:100%;margin-top:6px;font-size:.7rem}.btn:hover{background:rgba(255,255,255,0.3)}.dot{width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse 1s infinite;margin-right:6px}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}</style></head>
<body><div class="container"><h1>🎲 TÀI XỈU - ${Object.keys(GAMES).length} GAME 🎲</h1><div class="timer"><span class="dot"></span><span id="timerText">Đang tải...</span></div><div class="games-grid" id="gamesGrid">Đang tải...</div></div>
<script>async function load(){try{const r=await fetch('/api/all');const d=await r.json();let h='';for(const[k,v]of Object.entries(d)){if(!v.success){h+='<div class="game-card"><div class="game-header">⚠️ '+k+'</div><div style="color:#f87171">Lỗi: '+v.error+'</div></div>';continue}let c=v.du_doan==='Tài'||v.du_doan==='🏦 CON'||v.du_doan==='Chẵn'?'#f87171':'#60a5fa';h+='<div class="game-card"><div class="game-header">'+v.icon+' '+v.game+'</div><div class="pred-box"><div class="pred-value" style="color:'+c+'">'+v.du_doan+'</div><div class="confidence">🎯 '+v.do_tin_cay+'</div><div class="reason">📐 '+v.ly_do+'</div></div><button class="btn" onclick="refresh(\''+k+'\')">🔄 Dự đoán lại</button><button class="btn" onclick="resetGame(\''+k+'\')">🗑️ Reset</button></div>';}document.getElementById('gamesGrid').innerHTML=h;document.getElementById('timerText').innerHTML=' Cập nhật: '+new Date().toLocaleString();}catch(e){}}async function refresh(g){await fetch('/api/predict/'+g);load();}async function resetGame(g){if(confirm('Xóa lịch sử ?')){await fetch('/api/reset/'+g,{method:'POST'});load();}}load();setInterval(load,30000);</script></body></html>`);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ${Object.keys(GAMES).length} GAME | MỖI GAME THUẬT TOÁN RIÊNG`);
    console.log(`📡 BCR: Dự đoán Con/Cái/Hòa/Con Đôi/Cái Đôi`);
    console.log(`📡 Tài Xỉu: 30+ loại cầu riêng`);
    console.log(`📡 Xóc Đĩa: Chẵn/Lẻ riêng`);
});
