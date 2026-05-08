const express = require('express');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ==================== CẤU HÌNH 20+ GAME ====================
const GAMES = {
    sunwin_tx: { name: 'Sunwin Tài Xỉu', url: 'https://bracket-ellen-roads-prefer.trycloudflare.com/api/tx', type: 'format1', icon: '☀️' },
    sunwin_x88: { name: 'Sunwin X88', url: 'https://letters-carries-hip-seeking.trycloudflare.com/sun/x88', type: 'format2', icon: '🎮' },
    sunwin_sicbo: { name: 'Sunwin Sicbo', url: 'https://afterwards-motels-honors-vendors.trycloudflare.com/api/sunsicbo', type: 'format3', icon: '🎲' },
    xd88_md5: { name: 'XD88 MD5', url: 'https://books-carlo-instruments-capture.trycloudflare.com/api/taixiu', type: 'format1', icon: '🎯' },
    hitclub: { name: 'HITCLUB', url: 'https://letting-tackle-newton-oak.trycloudflare.com/api/tx', type: 'format1', icon: '🏆' },
    lc79_tx: { name: 'LC79 Tài Xỉu', url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/tx', type: 'format1', icon: '🎲' },
    lc79_md5: { name: 'LC79 MD5', url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/txmd5', type: 'format1', icon: '🔐' },
    lc79_xocdia: { name: 'LC79 Xóc Đĩa', url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/xocdia', type: 'format4', icon: '🥏' },
    betvip_tx: { name: 'BETVIP Tài Xỉu', url: 'https://plastic-diet-visits-opens.trycloudflare.com/api/tx', type: 'format1', icon: '🎰' },
    betvip_md5: { name: 'BETVIP MD5', url: 'https://plastic-diet-visits-opens.trycloudflare.com/api/txmd5', type: 'format1', icon: '🔒' },
    club789: { name: '789CLUB', url: 'https://dependent-epinions-somebody-enclosed.trycloudflare.com/api/tx', type: 'format1', icon: '🃏' },
    max789: { name: 'MAX789', url: 'https://cage-adjustment-whose-banner.trycloudflare.com/api/tx', type: 'format1', icon: '⭐' },
    b52: { name: 'B52', url: 'https://gold-ultra-fails-handles.trycloudflare.com/txmd5', type: 'format1', icon: '✈️' },
    son789: { name: 'SON789', url: 'https://tanks-gates-subscription-hosting.trycloudflare.com/api/txmd5', type: 'format1', icon: '🎵' },
    bcr_sexy: { name: 'BCR Sexy', url: 'https://classic-watching-cup-representatives.trycloudflare.com/api/bcr', type: 'format_bcr', icon: '💃' },
    luck8_md5: { name: 'Luck8 MD5', url: 'https://heroes-presents-pound-tablet.trycloudflare.com/api/txmd5', type: 'format1', icon: '🍀' },
    luck8_sicbo: { name: 'Luck8 Sicbo', url: 'https://heroes-presents-pound-tablet.trycloudflare.com/api/sicbo40', type: 'format1', icon: '🎲' }
};

// Lưu lịch sử
let predictionsDB = {};
for (const key of Object.keys(GAMES)) {
    predictionsDB[key] = [];
    try { if (fs.existsSync(`history_${key}.json`)) predictionsDB[key] = JSON.parse(fs.readFileSync(`history_${key}.json`)); } catch(e) {}
}
function saveHistory(k) { try { fs.writeFileSync(`history_${k}.json`, JSON.stringify(predictionsDB[k], null, 2)); } catch(e) {} }

// Fetch data
async function fetchGameData(key) {
    const g = GAMES[key];
    if (!g) return null;
    try {
        const res = await axios.get(g.url, { timeout: 10000 });
        if (g.type === 'format1' && res.data) return [{ phien: res.data.phien, ket_qua: res.data.ket_qua === 'Tài' ? 'T' : (res.data.ket_qua === 'Xỉu' ? 'X' : 'X'), tong: res.data.tong }];
        if (g.type === 'format3' && res.data) return [{ phien: parseInt(res.data.phien.replace('#', '')), ket_qua: res.data.ket_qua === 'Tài' ? 'T' : 'X', tong: res.data.tong }];
        if (g.type === 'format_bcr' && res.data?.data) {
            let last = res.data.data[0]?.results || '';
            let lastChar = last.length ? last[last.length-1] : '?';
            return [{ phien: Date.now(), ket_qua: (lastChar === 'T' || lastChar === 'B') ? 'T' : 'X', tong: 0 }];
        }
        return null;
    } catch(e) { return null; }
}

// ==================== THUẬT TOÁN 100+ LOẠI CẦU ====================
function duDoan(history) {
    if (!history || history.length < 3) return { du_doan: 'Tài', do_tin_cay: 50, ly_do: 'Chưa đủ 3 phiên' };

    const res = history.map(h => h.ket_qua);
    const sums = history.map(h => h.tong);
    const len = res.length;

    // ========== 1-20: CẦU BỆT (2-20 PHIÊN) ==========
    for (let l = 2; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) if (res[i] !== res[0]) { ok = false; break; }
        if (ok) {
            let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
            let conf = Math.min(95, 48 + l * 3);
            return { du_doan: pred, do_tin_cay: Math.floor(conf), ly_do: `🔴 Bệt ${l} phiên ${pred}` };
        }
    }

    // ========== 21-40: CẦU ĐẢO 1-1 (3-20 PHIÊN) ==========
    for (let l = 3; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) if (res[i] === res[i-1]) { ok = false; break; }
        if (ok) {
            let pred = res[l-1] === 'T' ? 'Xỉu' : 'Tài';
            let conf = Math.min(92, 52 + l * 2);
            return { du_doan: pred, do_tin_cay: Math.floor(conf), ly_do: `🟡 Đảo 1-1 dài ${l} → ${pred}` };
        }
    }

    // ========== 41-46: CẦU BLOCK (2-2, 3-3, 4-4, 5-5, 6-6, 7-7) ==========
    for (let b = 2; b <= 7; b++) {
        if (len >= b * 2) {
            let ok = true;
            for (let i = 0; i < b; i++) if (res[i] !== res[i+b]) { ok = false; break; }
            if (ok && res[0] !== res[b]) {
                let pred = res[b] === 'T' ? 'Xỉu' : 'Tài';
                let conf = 75 + b;
                return { du_doan: pred, do_tin_cay: conf, ly_do: `🟢 Cầu ${b}-${b} → ${pred}` };
            }
        }
    }

    // ========== 47: CẦU 1-2-1 ==========
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] !== res[3] && res[0] === res[3]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 86, ly_do: `🎯 Cầu 1-2-1 → ${pred}` };
    }

    // ========== 48: CẦU 2-1-2 ==========
    if (len >= 5 && res[0] === res[1] && res[1] !== res[2] && res[2] === res[3] && res[3] !== res[4] && res[0] !== res[2]) {
        let pred = res[0] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 87, ly_do: `🎯 Cầu 2-1-2 → ${pred}` };
    }

    // ========== 49: CẦU 1-2-3 ==========
    if (len >= 6 && res[0] === res[1] && res[1] === res[2] && res[3] === res[4] && res[0] !== res[3] && res[3] !== res[5]) {
        let pred = res[5] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 84, ly_do: `📈 Cầu 1-2-3 → ${pred}` };
    }

    // ========== 50: CẦU 3-2-1 ==========
    if (len >= 6 && res[0] === res[1] && res[2] === res[3] && res[3] === res[4] && res[0] !== res[2] && res[2] !== res[5]) {
        let pred = res[2] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 84, ly_do: `📉 Cầu 3-2-1 → ${pred}` };
    }

    // ========== 51: CẦU 1-3-1 ==========
    if (len >= 5 && res[0] !== res[1] && res[1] !== res[2] && res[2] !== res[3] && res[0] === res[2] && res[1] === res[3]) {
        let pred = res[3] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 83, ly_do: `🎯 Cầu 1-3-1 → ${pred}` };
    }

    // ========== 52-53: CẦU 1-1-2-2 & 2-2-1-1 ==========
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) {
        let pred = res[2] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 82, ly_do: `🔷 Cầu 1-1-2-2 → ${pred}` };
    }
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 82, ly_do: `🔶 Cầu 2-2-1-1 → ${pred}` };
    }

    // ========== 54-55: CẦU 1-2-2-1 & 2-1-1-2 ==========
    if (len >= 6 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3] && res[3] !== res[4] && res[4] === res[5]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 86, ly_do: `🦋 Cầu 1-2-2-1 → ${pred}` };
    }
    if (len >= 6 && res[0] === res[1] && res[1] !== res[2] && res[2] === res[3] && res[3] !== res[4] && res[4] === res[5] && res[0] !== res[2]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 86, ly_do: `🦋 Cầu 2-1-1-2 → ${pred}` };
    }

    // ========== 56-60: CẦU NHẢY CÓC ==========
    for (let step = 1; step <= 4; step++) {
        let need = step * 2 + 1;
        if (len >= need) {
            let ok = true;
            for (let i = 0; i <= step * 2; i += step) if (res[i] !== res[0]) { ok = false; break; }
            if (ok) {
                let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
                let conf = 80 - step * 2;
                return { du_doan: pred, do_tin_cay: conf, ly_do: `🐸 Nhảy cóc bậc ${step} → ${pred}` };
            }
        }
    }

    // ========== 61-65: CẦU GƯƠNG ==========
    for (let m of [4, 6, 8, 10, 12]) {
        if (len >= m) {
            let ok = true;
            for (let i = 0; i < m / 2; i++) if (res[i] !== res[m-1-i]) { ok = false; break; }
            if (ok) {
                let pred = res[m/2 - 1] === 'T' ? 'Xỉu' : 'Tài';
                let conf = 75 + m/2;
                return { du_doan: pred, do_tin_cay: conf, ly_do: `🪞 Cầu gương ${m} phiên → ${pred}` };
            }
        }
    }

    // ========== 66-72: CHU KỲ ==========
    for (let c = 2; c <= 8; c++) {
        if (len >= c * 2) {
            let ok = true;
            for (let i = c; i < Math.min(len, c * 3); i++) if (res[i] !== res[i % c]) { ok = false; break; }
            if (ok) {
                let next = res[len % c];
                let pred = next === 'T' ? 'Tài' : 'Xỉu';
                let conf = 80 - c;
                return { du_doan: pred, do_tin_cay: conf, ly_do: `🔄 Chu kỳ ${c} phiên → ${pred}` };
            }
        }
    }

    // ========== 73-82: ZICZAC ==========
    for (let z = 3; z <= 12; z++) {
        if (len >= z + 1) {
            let ok = true;
            for (let i = 0; i < z; i++) if (res[i] === res[i+1]) { ok = false; break; }
            if (ok) {
                let pred = res[z-1] === 'T' ? 'Xỉu' : 'Tài';
                let conf = 78 - (z - 3);
                return { du_doan: pred, do_tin_cay: Math.max(65, conf), ly_do: `⚡ Ziczac ${z} nhịp → ${pred}` };
            }
        }
    }

    // ========== 83-87: CẦU TỔNG ĐIỂM ==========
    if (sums.length >= 5) {
        let avg5 = sums.slice(0,5).reduce((a,b)=>a+b,0)/5;
        if (avg5 >= 14) return { du_doan: 'Xỉu', do_tin_cay: 76, ly_do: `📊 Tổng TB rất cao ${avg5.toFixed(1)} → Xỉu` };
        if (avg5 >= 13) return { du_doan: 'Xỉu', do_tin_cay: 74, ly_do: `📊 Tổng TB cao ${avg5.toFixed(1)} → Xỉu` };
        if (avg5 <= 8) return { du_doan: 'Tài', do_tin_cay: 76, ly_do: `📊 Tổng TB rất thấp ${avg5.toFixed(1)} → Tài` };
        if (avg5 <= 9) return { du_doan: 'Tài', do_tin_cay: 74, ly_do: `📊 Tổng TB thấp ${avg5.toFixed(1)} → Tài` };
    }

    // ========== 88-91: XU HƯỚNG TỔNG ==========
    if (sums.length >= 4) {
        if (sums[0] < sums[1] && sums[1] < sums[2] && sums[2] < sums[3]) return { du_doan: 'Tài', do_tin_cay: 76, ly_do: `📈 Tổng tăng 4 phiên → Tài` };
        if (sums[0] > sums[1] && sums[1] > sums[2] && sums[2] > sums[3]) return { du_doan: 'Xỉu', do_tin_cay: 76, ly_do: `📉 Tổng giảm 4 phiên → Xỉu` };
    }

    // ========== 92-95: CỰC ĐIỂM ==========
    let high15 = sums.slice(0,10).filter(s => s >= 15).length;
    let low6 = sums.slice(0,10).filter(s => s <= 6).length;
    if (high15 >= 4) return { du_doan: 'Xỉu', do_tin_cay: 82, ly_do: `⚡ Cực điểm cao ${high15}/10 → Xỉu mạnh` };
    if (high15 >= 3) return { du_doan: 'Xỉu', do_tin_cay: 78, ly_do: `⚡ Cực điểm cao ${high15}/10 → Xỉu` };
    if (low6 >= 4) return { du_doan: 'Tài', do_tin_cay: 82, ly_do: `⚡ Cực điểm thấp ${low6}/10 → Tài mạnh` };
    if (low6 >= 3) return { du_doan: 'Tài', do_tin_cay: 78, ly_do: `⚡ Cực điểm thấp ${low6}/10 → Tài` };

    // ========== 96-100: NÓNG LẠNH ==========
    let last10 = res.slice(0, Math.min(10, len));
    let tai10 = last10.filter(r => r === 'T').length;
    if (tai10 >= 9) return { du_doan: 'Xỉu', do_tin_cay: 88, ly_do: `🔥 Siêu nóng Tài ${tai10}/10 → Xỉu chắc chắn` };
    if (tai10 <= 1) return { du_doan: 'Tài', do_tin_cay: 88, ly_do: `❄️ Siêu lạnh Xỉu ${10-tai10}/10 → Tài chắc chắn` };
    if (tai10 >= 8) return { du_doan: 'Xỉu', do_tin_cay: 84, ly_do: `🔥 Tài nóng ${tai10}/10 → Xỉu` };
    if (tai10 <= 2) return { du_doan: 'Tài', do_tin_cay: 84, ly_do: `❄️ Xỉu nóng ${10-tai10}/10 → Tài` };
    if (tai10 >= 7) return { du_doan: 'Xỉu', do_tin_cay: 78, ly_do: `🔥 Tài nóng ${tai10}/10 → Xỉu` };
    if (tai10 <= 3) return { du_doan: 'Tài', do_tin_cay: 78, ly_do: `❄️ Xỉu nóng ${10-tai10}/10 → Tài` };

    // ========== 101-102: CHÊNH LỆCH ==========
    let last20 = res.slice(0, Math.min(20, len));
    let tai20 = last20.filter(r => r === 'T').length;
    let diff20 = Math.abs(tai20 - (last20.length - tai20));
    if (diff20 >= 8) {
        let pred = tai20 > last20.length/2 ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 74, ly_do: `⚖️ Chênh lệch lớn ${tai20}/${last20.length-tai20} (20p) → ${pred}` };
    }
    if (diff20 >= 6) {
        let pred = tai20 > last20.length/2 ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 70, ly_do: `⚖️ Chênh ${tai20}/${last20.length-tai20} (20p) → ${pred}` };
    }

    // ========== 103-105: SÓNG ==========
    if (len >= 8) {
        let song = [], cur = res[0], cnt = 1;
        for (let i = 1; i < 8; i++) {
            if (res[i] === cur) cnt++;
            else { song.push(cnt); cur = res[i]; cnt = 1; }
        }
        song.push(cnt);
        if (song.length >= 3) {
            if (song[0] < song[1] && song[1] < song[2]) {
                let pred = res[0] === 'T' ? 'Xỉu' : 'Tài';
                return { du_doan: pred, do_tin_cay: 76, ly_do: `🌊 Sóng mở rộng ${song.join('-')} → ${pred}` };
            }
            if (song[0] > song[1] && song[1] > song[2]) {
                let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
                return { du_doan: pred, do_tin_cay: 74, ly_do: `🌊 Sóng thu hẹp ${song.join('-')} → ${pred}` };
            }
        }
    }

    // ========== 106-107: CẦU 3-1 & 1-3 ==========
    if (len >= 4 && res[0] === res[1] && res[1] === res[2] && res[2] !== res[3]) {
        let pred = res[3] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 80, ly_do: `🎯 Cầu 3-1 (${res[0] === 'T' ? 'T' : 'X'}${res[0] === 'T' ? 'T' : 'X'}${res[0] === 'T' ? 'T' : 'X'}${res[3] === 'T' ? 'T' : 'X'}) → ${pred}` };
    }
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 80, ly_do: `🎯 Cầu 1-3 → ${pred}` };
    }

    // ========== 108: CẦU TỔNG CHẴN/LẺ ==========
    if (sums.length >= 5) {
        let chan = sums.slice(0,5).filter(s => s % 2 === 0).length;
        let le = 5 - chan;
        if (chan >= 4) return { du_doan: 'Xỉu', do_tin_cay: 72, ly_do: `🔢 Tổng chẵn ${chan}/5 phiên → Xỉu` };
        if (le >= 4) return { du_doan: 'Tài', do_tin_cay: 72, ly_do: `🔢 Tổng lẻ ${le}/5 phiên → Tài` };
    }

    // ========== 109-110: XU HƯỚNG DÀI HẠN ==========
    let last30 = res.slice(0, Math.min(30, len));
    let tai30 = last30.filter(r => r === 'T').length;
    if (tai30 >= 20) return { du_doan: 'Xỉu', do_tin_cay: 75, ly_do: `📊 Xu hướng dài Tài ${tai30}/30 → Xỉu` };
    if (tai30 <= 10) return { du_doan: 'Tài', do_tin_cay: 75, ly_do: `📊 Xu hướng dài Xỉu ${30-tai30}/30 → Tài` };

    // ========== DEFAULT ==========
    let last3 = res.slice(0, 3);
    let tai3 = last3.filter(r => r === 'T').length;
    let pred = tai3 >= 2 ? 'Tài' : 'Xỉu';
    return { du_doan: pred, do_tin_cay: 64, ly_do: `📊 Xu hướng ${tai3}T-${3-tai3}X (3 phiên cuối)` };
}

// Dự đoán cho game
async function layDuDoan(key) {
    const g = GAMES[key];
    if (!g) return { success: false, error: 'Game không tồn tại' };
    const history = await fetchGameData(key);
    if (!history) return { success: false, error: 'Không lấy được dữ liệu', game: g.name };
    const nextPhien = typeof history[0].phien === 'number' ? history[0].phien + 1 : String(parseInt(history[0].phien) + 1);
    const result = duDoan(history);
    const record = { phien: nextPhien, du_doan: result.du_doan, do_tin_cay: result.do_tin_cay + '%', ly_do: result.ly_do, game: g.name, timestamp: new Date().toISOString() };
    predictionsDB[key].unshift(record);
    if (predictionsDB[key].length > 50) predictionsDB[key] = predictionsDB[key].slice(0, 50);
    saveHistory(key);
    return { success: true, game: g.name, icon: g.icon, phien_hien_tai: nextPhien, du_doan: result.du_doan, do_tin_cay: result.do_tin_cay + '%', ly_do: result.ly_do };
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
    res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>🎲 TÀI XỈU - ${Object.keys(GAMES).length} GAME | 110 LOẠI CẦU</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);min-height:100vh;padding:20px;color:#fff}.container{max-width:1400px;margin:0 auto}h1{text-align:center;margin-bottom:10px;font-size:1.6rem;background:linear-gradient(135deg,#f093fb,#f5576c);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.sub{text-align:center;color:#aaa;margin-bottom:30px;font-size:.8rem}.games-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}.game-card{background:rgba(255,255,255,0.08);border-radius:20px;padding:18px;backdrop-filter:blur(10px)}.game-header{font-size:1.1rem;font-weight:bold;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.2)}.pred-box{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:15px;padding:12px;text-align:center;margin:12px 0}.pred-value{font-size:1.8rem;font-weight:800;margin:8px 0}.confidence{font-size:.75rem}.reason{font-size:.65rem;margin-top:8px;background:rgba(0,0,0,0.2);display:inline-block;padding:4px 10px;border-radius:20px}.btn{background:rgba(255,255,255,0.15);border:none;padding:6px;border-radius:25px;color:#fff;cursor:pointer;width:100%;margin-top:6px;font-size:.7rem}.btn:hover{background:rgba(255,255,255,0.3)}.timer{text-align:center;margin-bottom:20px;font-size:.75rem}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 1s infinite;margin-right:6px}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}</style></head>
<body><div class="container"><h1>🎲 TÀI XỈU - ${Object.keys(GAMES).length} GAME | 110 LOẠI CẦU 🎲</h1><div class="sub">100+ loại cầu | Bệt 2-20 | Đảo 1-1 | Block 2-7 | Chu kỳ | Ziczac | Gương | Sóng | Học thông minh</div>
<div class="timer"><span class="dot"></span><span id="timer">Đang tải...</span></div><div class="games-grid" id="grid">Đang tải...</div></div>
<script>async function load(){try{const r=await fetch('/api/all');const d=await r.json();let h='';for(const[k,v]of Object.entries(d)){if(!v.success){h+='<div class="game-card"><div class="game-header">⚠️ '+k+'</div><div style="color:#f87171">Lỗi</div></div>';continue}let c=v.du_doan==='Tài'?'#f87171':'#60a5fa';h+='<div class="game-card"><div class="game-header">'+v.icon+' '+v.game+'</div><div class="pred-box"><div class="pred-value" style="color:'+c+'">'+v.du_doan+'</div><div class="confidence">🎯 '+v.do_tin_cay+'</div><div class="reason">📐 '+v.ly_do+'</div></div><button class="btn" onclick="refresh(\''+k+'\')">🔄 Dự đoán lại</button><button class="btn" onclick="resetGame(\''+k+'\')">🗑️ Reset</button></div>';}document.getElementById('grid').innerHTML=h;document.getElementById('timer').innerHTML=' Cập nhật: '+new Date().toLocaleString();}catch(e){}} async function refresh(g){await fetch('/api/predict/'+g);load();} async function resetGame(g){if(confirm('Xóa lịch sử?')){await fetch('/api/reset/'+g,{method:'POST'});load();}}load();setInterval(load,30000);</script></body></html>`);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 TÀI XỈU API - ${Object.keys(GAMES).length} GAME | 110+ LOẠI CẦU`);
    console.log(`📡 Các game: ${Object.keys(GAMES).join(', ')}`);
});
