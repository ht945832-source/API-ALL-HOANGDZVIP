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

// Lưu lịch sử dự đoán
let predictionsDB = {};
let actualResultsDB = {};

for (const key of Object.keys(GAMES)) {
    predictionsDB[key] = [];
    actualResultsDB[key] = [];
    try {
        if (fs.existsSync(`history_${key}.json`)) {
            predictionsDB[key] = JSON.parse(fs.readFileSync(`history_${key}.json`, 'utf8'));
        }
        if (fs.existsSync(`actual_${key}.json`)) {
            actualResultsDB[key] = JSON.parse(fs.readFileSync(`actual_${key}.json`, 'utf8'));
        }
    } catch(e) {}
}

function saveHistory(gameKey) {
    try { fs.writeFileSync(`history_${gameKey}.json`, JSON.stringify(predictionsDB[gameKey], null, 2)); } catch(e) {}
}
function saveActual(gameKey) {
    try { fs.writeFileSync(`actual_${gameKey}.json`, JSON.stringify(actualResultsDB[gameKey], null, 2)); } catch(e) {}
}

// ==================== FETCH DATA ====================
async function fetchGameData(gameKey) {
    const game = GAMES[gameKey];
    try {
        const res = await axios.get(game.url, { timeout: 10000 });
        
        if (game.type === 'taixiu' && res.data && res.data.ket_qua) {
            let ketQua = res.data.ket_qua === 'Tài' || res.data.ket_qua === 'TAI' ? 'Tài' : 'Xỉu';
            return { phien: res.data.phien, ket_qua: ketQua, tong: res.data.tong || 0 };
        }
        if (game.type === 'xocdia' && res.data && res.data.ket_qua) {
            return { phien: Date.now(), ket_qua: res.data.ket_qua === 'Tài' ? 'Chẵn' : 'Lẻ', tong: 0 };
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
            return { data: allResults, phien: Date.now() };
        }
        return null;
    } catch(e) { return null; }
}

// ==================== THUẬT TOÁN TÀI XỈU ====================
function thuatToanTaiXiu(history, currentPhien, currentResult) {
    let duDoan = 'Tài';
    let doTinCay = 65;
    let lyDo = 'Mặc định (chưa đủ dữ liệu)';
    
    if (history && history.length >= 3) {
        const res = history.map(h => h.ket_qua);
        const len = res.length;
        
        // Bệt
        let bet = 1;
        for (let i = 1; i < Math.min(len, 15); i++) if (res[i] === res[0]) bet++; else break;
        if (bet >= 3) {
            duDoan = res[0] === 'Tài' ? 'Tài' : 'Xỉu';
            doTinCay = Math.min(88, 50 + bet * 4);
            lyDo = `🔴 Bệt ${bet} phiên → ${duDoan}`;
        }
        // Đảo 1-1
        else {
            let dao = 1;
            for (let i = 1; i < Math.min(len, 12); i++) if (res[i] !== res[i-1]) dao++; else break;
            if (dao >= 4) {
                duDoan = res[dao-1] === 'Tài' ? 'Xỉu' : 'Tài';
                doTinCay = Math.min(85, 55 + dao * 2.5);
                lyDo = `🟡 Đảo ${dao} nhịp → ${duDoan}`;
            }
            // 2-2
            else if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) {
                duDoan = res[2] === 'Tài' ? 'Xỉu' : 'Tài';
                doTinCay = 82;
                lyDo = `🟢 Cầu 2-2 → ${duDoan}`;
            }
            // Xu hướng 3 phiên cuối
            else {
                let t3 = res.slice(0,3).filter(r => r === 'Tài').length;
                duDoan = t3 >= 2 ? 'Tài' : 'Xỉu';
                doTinCay = 65;
                lyDo = `📊 Xu hướng ${t3}T-${3-t3}X → ${duDoan}`;
            }
        }
    }
    
    // Kiểm tra đúng/sai của dự đoán trước
    let lastPrediction = predictionsDB[gameKey]?.[0];
    let ketQuaTruoc = currentResult || null;
    let dungSai = null;
    if (lastPrediction && ketQuaTruoc) {
        dungSai = lastPrediction.du_doan === ketQuaTruoc ? '✅ ĐÚNG' : '❌ SAI';
    }
    
    return {
        phien_hien_tai: currentPhien,
        ket_qua_truoc: ketQuaTruoc,
        dung_sai_truoc: dungSai,
        du_doan: duDoan,
        do_tin_cay: doTinCay + '%',
        ly_do: lyDo
    };
}

// ==================== THUẬT TOÁN BCR (CON/CÁI/HÒA/CON ĐÔI/CÁI ĐÔI) ====================
function thuatToanBCR(data, currentPhien) {
    let results = data.data || [];
    let resultsStr = results.map(r => r.result).join('');
    let lastResult = resultsStr.length > 0 ? resultsStr[resultsStr.length - 1] : '?';
    
    // Lấy kết quả trước
    let lastPrediction = predictionsDB.bcr_sexy?.[0];
    let ketQuaTruoc = null;
    let dungSai = null;
    
    if (lastResult !== '?') {
        ketQuaTruoc = lastResult === 'B' ? 'Con' : (lastResult === 'P' ? 'Cái' : (lastResult === 'T' ? 'Hòa' : '?'));
        if (lastPrediction) {
            let predStr = lastPrediction.du_doan_con_cai?.includes('CON') ? 'Con' : (lastPrediction.du_doan_con_cai?.includes('CÁI') ? 'Cái' : null);
            if (predStr && ketQuaTruoc !== '?') {
                dungSai = predStr === ketQuaTruoc ? '✅ ĐÚNG' : '❌ SAI';
            }
        }
    }
    
    // Dự đoán Con/Cái
    let bCount = (resultsStr.match(/B/g) || []).length;
    let pCount = (resultsStr.match(/P/g) || []).length;
    let tCount = (resultsStr.match(/T/g) || []).length;
    
    let duDoanConCai = 'Con';
    let doTinCayConCai = 60;
    let lyDoConCai = 'Mặc định';
    
    if (resultsStr.length >= 3) {
        let bet = 1;
        for (let i = resultsStr.length - 2; i >= 0; i--) {
            if (resultsStr[i] === lastResult) bet++;
            else break;
        }
        if (bet >= 3) {
            duDoanConCai = lastResult === 'B' ? 'Con' : 'Cái';
            doTinCayConCai = Math.min(85, 55 + bet * 4);
            lyDoConCai = `📈 Bệt ${bet} ván ${duDoanConCai}`;
        } else {
            let dao = 1;
            for (let i = resultsStr.length - 2; i >= 0; i--) {
                if (resultsStr[i] !== resultsStr[i+1]) dao++;
                else break;
            }
            if (dao >= 4) {
                duDoanConCai = lastResult === 'B' ? 'Cái' : 'Con';
                doTinCayConCai = Math.min(82, 58 + dao * 2);
                lyDoConCai = `🔄 Đảo ${dao} ván → ${duDoanConCai}`;
            } else {
                let last10 = resultsStr.slice(-10);
                let b10 = (last10.match(/B/g) || []).length;
                let p10 = (last10.match(/P/g) || []).length;
                if (b10 > p10 + 2) {
                    duDoanConCai = 'Cái';
                    doTinCayConCai = 72;
                    lyDoConCai = `📊 Con nóng ${b10}/10 → bẻ Cái`;
                } else if (p10 > b10 + 2) {
                    duDoanConCai = 'Con';
                    doTinCayConCai = 72;
                    lyDoConCai = `📊 Cái nóng ${p10}/10 → bẻ Con`;
                } else {
                    duDoanConCai = lastResult === 'B' ? 'Con' : 'Cái';
                    doTinCayConCai = 60;
                    lyDoConCai = `📈 Theo xu hướng (${duDoanConCai})`;
                }
            }
        }
    }
    
    // Dự đoán Hòa
    let duDoanHoa = 'Không Hòa';
    let doTinCayHoa = 85;
    let lyDoHoa = 'Hòa hiếm khi xuất hiện';
    
    let t5 = resultsStr.slice(-5);
    let tCount5 = (t5.match(/T/g) || []).length;
    if (tCount >= 2 && tCount5 >= 1) {
        duDoanHoa = 'Hòa';
        doTinCayHoa = 65;
        lyDoHoa = `🎲 Hòa xuất hiện ${tCount} lần, có thể về`;
    } else if (tCount5 === 0 && resultsStr.length > 20) {
        duDoanHoa = 'Hòa';
        doTinCayHoa = 58;
        lyDoHoa = `❄️ Hòa vắng ${resultsStr.length - tCount} ván`;
    }
    
    // Dự đoán Con Đôi (BB)
    let duDoanConDoi = 'Không Con Đôi';
    let doTinCayConDoi = 85;
    let lyDoConDoi = 'Con đôi hiếm';
    
    let hasBB = resultsStr.includes('BB');
    let lastTwo = resultsStr.slice(-2);
    if (hasBB && lastTwo === 'BB') {
        duDoanConDoi = 'Con Đôi (BB)';
        doTinCayConDoi = 70;
        lyDoConDoi = `🔄 Ván trước có BB → khả năng về tiếp`;
    } else if ((resultsStr.match(/BB/g) || []).length >= 2) {
        duDoanConDoi = 'Con Đôi (BB)';
        doTinCayConDoi = 62;
        lyDoConDoi = `📊 Đã có ${(resultsStr.match(/BB/g) || []).length} lần BB gần đây`;
    }
    
    // Dự đoán Cái Đôi (PP)
    let duDoanCaiDoi = 'Không Cái Đôi';
    let doTinCayCaiDoi = 85;
    let lyDoCaiDoi = 'Cái đôi hiếm';
    
    let hasPP = resultsStr.includes('PP');
    if (hasPP && lastTwo === 'PP') {
        duDoanCaiDoi = 'Cái Đôi (PP)';
        doTinCayCaiDoi = 70;
        lyDoCaiDoi = `🔄 Ván trước có PP → khả năng về tiếp`;
    } else if ((resultsStr.match(/PP/g) || []).length >= 2) {
        duDoanCaiDoi = 'Cái Đôi (PP)';
        doTinCayCaiDoi = 62;
        lyDoCaiDoi = `📊 Đã có ${(resultsStr.match(/PP/g) || []).length} lần PP gần đây`;
    }
    
    return {
        phien_hien_tai: currentPhien,
        ket_qua_truoc: ketQuaTruoc,
        dung_sai_truoc: dungSai,
        du_doan_con_cai: duDoanConCai,
        do_tin_cay_con_cai: doTinCayConCai + '%',
        ly_do_con_cai: lyDoConCai,
        du_doan_hoa: duDoanHoa,
        do_tin_cay_hoa: doTinCayHoa + '%',
        ly_do_hoa: lyDoHoa,
        du_doan_con_doi: duDoanConDoi,
        do_tin_cay_con_doi: doTinCayConDoi + '%',
        ly_do_con_doi: lyDoConDoi,
        du_doan_cai_doi: duDoanCaiDoi,
        do_tin_cay_cai_doi: doTinCayCaiDoi + '%',
        ly_do_cai_doi: lyDoCaiDoi
    };
}

// ==================== THUẬT TOÁN XÓC ĐĨA ====================
function thuatToanXocDia(history, currentPhien, currentResult) {
    let duDoan = 'Chẵn';
    let doTinCay = 60;
    let lyDo = 'Mặc định';
    
    if (history && history.length >= 3) {
        const res = history.map(h => h.ket_qua);
        let chan = res.filter(r => r === 'Chẵn').length;
        let le = res.length - chan;
        
        if (chan > le + 1) {
            duDoan = 'Lẻ';
            doTinCay = 72;
            lyDo = `📊 Chẵn nóng ${chan}/${res.length} → bẻ Lẻ`;
        } else if (le > chan + 1) {
            duDoan = 'Chẵn';
            doTinCay = 72;
            lyDo = `📊 Lẻ nóng ${le}/${res.length} → bẻ Chẵn`;
        } else {
            duDoan = res[0] === 'Chẵn' ? 'Chẵn' : 'Lẻ';
            doTinCay = 60;
            lyDo = `📈 Theo xu hướng ván cuối (${duDoan})`;
        }
    }
    
    let lastPrediction = predictionsDB[gameKey]?.[0];
    let ketQuaTruoc = currentResult || null;
    let dungSai = null;
    if (lastPrediction && ketQuaTruoc) {
        dungSai = lastPrediction.du_doan === ketQuaTruoc ? '✅ ĐÚNG' : '❌ SAI';
    }
    
    return {
        phien_hien_tai: currentPhien,
        ket_qua_truoc: ketQuaTruoc,
        dung_sai_truoc: dungSai,
        du_doan: duDoan,
        do_tin_cay: doTinCay + '%',
        ly_do: lyDo
    };
}

// ==================== DỰ ĐOÁN CHUNG ====================
async function layDuDoan(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return { success: false, error: 'Game không tồn tại' };
    
    const data = await fetchGameData(gameKey);
    if (!data) return { success: false, error: 'Không lấy được dữ liệu', game: game.name };
    
    let result = {};
    let history = [];
    
    // Lấy lịch sử dự đoán trước đó
    let previousPredictions = predictionsDB[gameKey] || [];
    
    if (game.type === 'bcr') {
        let currentPhien = data.phien;
        result = thuatToanBCR(data, currentPhien);
        result.game = game.name;
        result.icon = game.icon;
        result.timestamp = new Date().toISOString();
        
        // Lưu lịch sử kết quả thực tế
        let lastResult = data.data?.length > 0 ? data.data[data.data.length-1].result : null;
        if (lastResult) {
            let actual = lastResult === 'B' ? 'Con' : (lastResult === 'P' ? 'Cái' : (lastResult === 'T' ? 'Hòa' : null));
            if (actual) {
                actualResultsDB[gameKey].push({ phien: currentPhien, ket_qua: actual, timestamp: new Date().toISOString() });
                saveActual(gameKey);
            }
        }
    } 
    else if (game.type === 'taixiu') {
        let currentPhien = data.phien;
        let currentResult = data.ket_qua;
        
        // Lấy lịch sử kết quả từ file actual
        let actualList = actualResultsDB[gameKey] || [];
        
        result = thuatToanTaiXiu(previousPredictions.map(p => ({ ket_qua: p.ket_qua })), currentPhien, currentResult);
        result.game = game.name;
        result.icon = game.icon;
        result.timestamp = new Date().toISOString();
        
        // Lưu kết quả thực tế
        actualResultsDB[gameKey].push({ phien: currentPhien, ket_qua: currentResult, timestamp: new Date().toISOString() });
        saveActual(gameKey);
    }
    else if (game.type === 'xocdia') {
        let currentPhien = data.phien;
        let currentResult = data.ket_qua;
        result = thuatToanXocDia(previousPredictions.map(p => ({ ket_qua: p.ket_qua })), currentPhien, currentResult);
        result.game = game.name;
        result.icon = game.icon;
        result.timestamp = new Date().toISOString();
        
        actualResultsDB[gameKey].push({ phien: currentPhien, ket_qua: currentResult, timestamp: new Date().toISOString() });
        saveActual(gameKey);
    }
    else {
        result = { success: false, error: 'Loại game không hỗ trợ', game: game.name };
    }
    
    // Lưu dự đoán vào lịch sử
    predictionsDB[gameKey].unshift(result);
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
    res.json({ 
        success: true, 
        game: GAMES[k]?.name, 
        predictions: predictionsDB[k] || [], 
        actual_results: actualResultsDB[k] || [],
        total_predictions: predictionsDB[k]?.length || 0,
        total_actual: actualResultsDB[k]?.length || 0
    });
});

app.post('/api/reset/:game', (req, res) => {
    const k = req.params.game;
    predictionsDB[k] = [];
    actualResultsDB[k] = [];
    saveHistory(k);
    saveActual(k);
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
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);min-height:100vh;padding:20px;color:#fff}
.container{max-width:1400px;margin:0 auto}
h1{text-align:center;margin-bottom:10px;background:linear-gradient(135deg,#f093fb,#f5576c);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.timer{text-align:center;margin-bottom:20px;font-size:.8rem}
.games-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px}
.game-card{background:rgba(255,255,255,0.08);border-radius:20px;padding:18px;backdrop-filter:blur(10px)}
.game-header{font-size:1.1rem;font-weight:bold;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:8px}
.pred-box{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:15px;padding:12px;text-align:center;margin:12px 0}
.pred-value{font-size:1.5rem;font-weight:800;margin:6px 0}
.confidence{font-size:.7rem}
.reason{font-size:.6rem;margin-top:6px;background:rgba(0,0,0,0.2);display:inline-block;padding:3px 8px;border-radius:20px}
.info{font-size:.65rem;margin-top:8px;color:#aaa}
.btn{background:rgba(255,255,255,0.15);border:none;padding:6px;border-radius:25px;color:#fff;cursor:pointer;width:100%;margin-top:6px;font-size:.65rem}
.btn:hover{background:rgba(255,255,255,0.3)}
.dot{width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse 1s infinite;margin-right:6px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.win{color:#4ade80}
.lose{color:#f87171}
</style></head>
<body><div class="container"><h1>🎲 TÀI XỈU - ${Object.keys(GAMES).length} GAME 🎲</h1><div class="timer"><span class="dot"></span><span id="timerText">Đang tải...</span></div><div class="games-grid" id="gamesGrid">Đang tải...</div></div>
<script>
async function load(){try{const r=await fetch('/api/all');const d=await r.json();let h='';for(const[k,v]of Object.entries(d)){if(!v.success){h+='<div class="game-card"><div class="game-header">⚠️ '+k+'</div><div style="color:#f87171">Lỗi</div></div>';continue}
let c='';let mainPred='';
if(v.du_doan_con_cai){mainPred=v.du_doan_con_cai;c=mainPred==='Con'?'#f87171':'#60a5fa';
h+='<div class="game-card"><div class="game-header">'+v.icon+' '+v.game+'</div><div class="pred-box"><div class="pred-value" style="color:'+c+'">🎯 '+mainPred+'</div><div class="confidence">Tin cậy: '+v.do_tin_cay_con_cai+'</div><div class="reason">'+v.ly_do_con_cai+'</div></div>';
h+='<div class="info">🔄 Hòa: '+v.du_doan_hoa+' ('+v.do_tin_cay_hoa+')</div>';
h+='<div class="info">🎲 Con Đôi: '+v.du_doan_con_doi+' | Cái Đôi: '+v.du_doan_cai_doi+'</div>';
}else{mainPred=v.du_doan;c=mainPred==='Tài'||mainPred==='Chẵn'?'#f87171':'#60a5fa';
h+='<div class="game-card"><div class="game-header">'+v.icon+' '+v.game+'</div><div class="pred-box"><div class="pred-value" style="color:'+c+'">🎯 '+mainPred+'</div><div class="confidence">Tin cậy: '+v.do_tin_cay+'</div><div class="reason">'+v.ly_do+'</div></div>';}
if(v.ket_qua_truoc){let cls=v.dung_sai_truoc==='✅ ĐÚNG'?'win':'lose';h+='<div class="info">📜 Kết quả trước: '+v.ket_qua_truoc+' | '+v.dung_sai_truoc+'</div>';}
h+='<div class="info">📌 Phiên: #'+v.phien_hien_tai+'</div>';
h+='<button class="btn" onclick="refresh(\''+k+'\')">🔄 Dự đoán lại</button><button class="btn" onclick="resetGame(\''+k+'\')">🗑️ Reset</button></div>';}
document.getElementById('gamesGrid').innerHTML=h;document.getElementById('timerText').innerHTML=' Cập nhật: '+new Date().toLocaleString();}catch(e){}}
async function refresh(g){await fetch('/api/predict/'+g);load();}
async function resetGame(g){if(confirm('Xóa lịch sử?')){await fetch('/api/reset/'+g,{method:'POST'});load();}}
load();setInterval(load,30000);</script></body></html>`);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ${Object.keys(GAMES).length} GAME | Dự đoán luôn không cần đủ data`);
    console.log(`📡 Mỗi game có lịch sử riêng + kết quả đúng/sai`);
});
