const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

console.log('🚀 SERVER DANG KHOI DONG...');

// ==================== 16 GAME ====================
const GAMES = {
    sunwin_tx: { name: 'Sunwin Tài Xỉu', url: 'https://bracket-ellen-roads-prefer.trycloudflare.com/api/tx', type: 'taixiu', icon: '☀️' },
    sunwin_sicbo: { name: 'Sunwin Sicbo', url: 'https://afterwards-motels-honors-vendors.trycloudflare.com/api/sunsicbo', type: 'taixiu', icon: '🎲' },
    hitclub: { name: 'HITCLUB', url: 'https://letting-tackle-newton-oak.trycloudflare.com/api/tx', type: 'taixiu', icon: '🏆' },
    lc79_tx: { name: 'LC79 Tài Xỉu', url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/tx', type: 'taixiu', icon: '🎲' },
    lc79_md5: { name: 'LC79 MD5', url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/txmd5', type: 'taixiu', icon: '🔐' },
    lc79_xocdia: { name: 'LC79 Xóc Đĩa', url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/xocdia', type: 'xocdia', icon: '🥏' },
    betvip_tx: { name: 'BETVIP Tài Xỉu', url: 'https://plastic-diet-visits-opens.trycloudflare.com/api/tx', type: 'taixiu', icon: '🎰' },
    betvip_md5: { name: 'BETVIP MD5', url: 'https://plastic-diet-visits-opens.trycloudflare.com/api/txmd5', type: 'taixiu', icon: '🔒' },
    club789: { name: '789CLUB', url: 'https://dependent-epinions-somebody-enclosed.trycloudflare.com/api/tx', type: 'taixiu', icon: '🃏' },
    max789: { name: 'MAX789', url: 'https://cage-adjustment-whose-banner.trycloudflare.com/api/tx', type: 'taixiu', icon: '⭐' },
    b52: { name: 'B52', url: 'https://gold-ultra-fails-handles.trycloudflare.com/txmd5', type: 'taixiu', icon: '✈️' },
    bcr_sexy: { name: 'BCR Sexy', url: 'https://classic-watching-cup-representatives.trycloudflare.com/api/bcr', type: 'bcr', icon: '💃' },
    luck8_md5: { name: 'Luck8 MD5', url: 'https://heroes-presents-pound-tablet.trycloudflare.com/api/txmd5', type: 'taixiu', icon: '🍀' },
    luck8_sicbo: { name: 'Luck8 Sicbo40', url: 'https://heroes-presents-pound-tablet.trycloudflare.com/api/sicbo40', type: 'taixiu', icon: '🎲' }
};

let predictionsDB = {};
for (const key of Object.keys(GAMES)) predictionsDB[key] = [];

// ==================== FETCH DATA ====================
async function fetchGameData(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return null;
    try {
        const res = await axios.get(game.url, { timeout: 8000 });
        if (game.type === 'taixiu' && res.data && res.data.ket_qua) {
            let ketQua = (res.data.ket_qua === 'Tài' || res.data.ket_qua === 'TAI') ? 'Tài' : 'Xỉu';
            return { phien: res.data.phien, ket_qua: ketQua, tong: res.data.tong || 0 };
        }
        if (game.type === 'xocdia' && res.data && res.data.ket_qua) {
            return { phien: Date.now(), ket_qua: res.data.ket_qua === 'Tài' ? 'Chẵn' : 'Lẻ', tong: 0 };
        }
        if (game.type === 'bcr' && res.data?.data) {
            let resultsStr = '';
            for (let ban of res.data.data) if (ban.results) resultsStr += ban.results;
            return { data: resultsStr, phien: Date.now() };
        }
        return null;
    } catch(e) { return null; }
}

// ==================== 50+ CẦU TÀI XỈU ====================
function phatHienCauTaiXiu(res, len) {
    // Bệt 2-15
    for (let l = 2; l <= 15; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) if (res[i] !== res[0]) { ok = false; break; }
        if (ok) return { pred: res[0], conf: Math.min(90, 50 + l * 3), name: `Bệt ${l}` };
    }
    // Đảo 1-1 3-15
    for (let l = 3; l <= 15; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) if (res[i] === res[i-1]) { ok = false; break; }
        if (ok) return { pred: res[l-1] === 'Tài' ? 'Xỉu' : 'Tài', conf: Math.min(88, 55 + l * 2), name: `Đảo ${l}` };
    }
    // 2-2
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) return { pred: res[2] === 'Tài' ? 'Xỉu' : 'Tài', conf: 82, name: '2-2' };
    // 3-3
    if (len >= 6 && res[0]===res[1] && res[1]===res[2] && res[3]===res[4] && res[4]===res[5] && res[0]!==res[3]) return { pred: res[3] === 'Tài' ? 'Xỉu' : 'Tài', conf: 85, name: '3-3' };
    // 1-2-1
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] !== res[3] && res[0] === res[3]) return { pred: res[0], conf: 86, name: '1-2-1' };
    // 2-1-2
    if (len >= 5 && res[0] === res[1] && res[1] !== res[2] && res[2] === res[3] && res[3] !== res[4] && res[0] !== res[2]) return { pred: res[0] === 'Tài' ? 'Xỉu' : 'Tài', conf: 87, name: '2-1-2' };
    // 1-2-3
    if (len >= 6 && res[0]===res[1] && res[1]===res[2] && res[3]===res[4] && res[0]!==res[3] && res[3]!==res[5]) return { pred: res[5], conf: 84, name: '1-2-3' };
    // 3-2-1
    if (len >= 6 && res[0]===res[1] && res[2]===res[3] && res[3]===res[4] && res[0]!==res[2] && res[2]!==res[5]) return { pred: res[2], conf: 84, name: '3-2-1' };
    // 1-1-2-2
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) return { pred: res[2] === 'Tài' ? 'Xỉu' : 'Tài', conf: 82, name: '1-1-2-2' };
    // Nhảy cóc
    if (len >= 5 && res[0] === res[2] && res[2] === res[4]) return { pred: res[0], conf: 78, name: 'Nhảy cóc' };
    // Gương 4
    if (len >= 4 && res[0] === res[3] && res[1] === res[2]) return { pred: res[1] === 'Tài' ? 'Xỉu' : 'Tài', conf: 80, name: 'Gương 4' };
    // Chu kỳ 2
    if (len >= 4 && res[0] === res[2] && res[1] === res[3]) return { pred: res[len % 2] === 'Tài' ? 'Tài' : 'Xỉu', conf: 76, name: 'Chu kỳ 2' };
    // Nóng 7/10
    let last10 = res.slice(0, Math.min(10, len));
    let tai10 = last10.filter(r => r === 'Tài').length;
    if (tai10 >= 8) return { pred: 'Xỉu', conf: 85, name: 'Siêu nóng Tài' };
    if (tai10 <= 2) return { pred: 'Tài', conf: 85, name: 'Siêu lạnh Xỉu' };
    if (tai10 >= 7) return { pred: 'Xỉu', conf: 78, name: 'Tài nóng' };
    if (tai10 <= 3) return { pred: 'Tài', conf: 78, name: 'Xỉu nóng' };
    // Chênh lệch 20 phiên
    let last20 = res.slice(0, Math.min(20, len));
    let tai20 = last20.filter(r => r === 'Tài').length;
    let diff20 = Math.abs(tai20 - (last20.length - tai20));
    if (diff20 >= 8) return { pred: tai20 > last20.length/2 ? 'Xỉu' : 'Tài', conf: 74, name: 'Chênh lệch lớn' };
    // Xu hướng 3 phiên
    let last3 = res.slice(0, 3);
    let tai3 = last3.filter(r => r === 'Tài').length;
    return { pred: tai3 >= 2 ? 'Tài' : 'Xỉu', conf: 65, name: 'Xu hướng 3p' };
}

// ==================== THUẬT TOÁN TÀI XỈU ====================
function thuatToanTaiXiu(history, currentPhien, currentResult, gameKey) {
    let duDoan = 'Tài', doTinCay = 65, lyDo = 'Xu hướng 3 phiên', loaiCau = 'XuHuong';
    if (history && history.length >= 2) {
        const res = history.map(h => h.ket_qua);
        const cau = phatHienCauTaiXiu(res, res.length);
        if (cau) { duDoan = cau.pred; doTinCay = cau.conf; loaiCau = cau.name; lyDo = `${cau.name} → ${duDoan}`; }
    }
    let ketQuaTruoc = currentResult || null;
    let dungSai = null;
    if (predictionsDB[gameKey]?.length > 0 && predictionsDB[gameKey][0]?.du_doan && ketQuaTruoc) {
        dungSai = predictionsDB[gameKey][0].du_doan === ketQuaTruoc ? '✅ ĐÚNG' : '❌ SAI';
    }
    return { phien_hien_tai: currentPhien, ket_qua_truoc: ketQuaTruoc, dung_sai_truoc: dungSai, du_doan: duDoan, do_tin_cay: doTinCay + '%', ly_do: lyDo, loai_cau: loaiCau };
}

// ==================== THUẬT TOÁN BCR ====================
function thuatToanBCR(data, currentPhien) {
    let resultsStr = data.data || '';
    let lastResult = resultsStr.length > 0 ? resultsStr[resultsStr.length - 1] : '?';
    let ketQuaTruoc = lastResult === 'B' ? 'Con' : (lastResult === 'P' ? 'Cái' : (lastResult === 'T' ? 'Hòa' : null));
    let dungSai = null;
    if (predictionsDB.bcr_sexy?.length > 0 && predictionsDB.bcr_sexy[0]?.du_doan_con_cai && ketQuaTruoc && ketQuaTruoc !== 'Hòa') {
        dungSai = predictionsDB.bcr_sexy[0].du_doan_con_cai === ketQuaTruoc ? '✅ ĐÚNG' : '❌ SAI';
    }
    // Phân tích
    let bet = 1;
    for (let i = resultsStr.length - 2; i >= 0; i--) { if (resultsStr[i] === lastResult) bet++; else break; }
    let dao = 1;
    for (let i = resultsStr.length - 2; i >= 0; i--) { if (resultsStr[i] !== resultsStr[i+1]) dao++; else break; }
    let duDoanConCai = 'Con', doTinCayConCai = 60, lyDoConCai = 'Theo xu hướng';
    if (bet >= 3) { duDoanConCai = lastResult === 'B' ? 'Con' : 'Cái'; doTinCayConCai = Math.min(85, 55 + bet * 4); lyDoConCai = `Bệt ${bet} ván`; }
    else if (dao >= 4) { duDoanConCai = lastResult === 'B' ? 'Cái' : 'Con'; doTinCayConCai = Math.min(82, 58 + dao * 2); lyDoConCai = `Đảo ${dao} ván`; }
    else {
        let bCount = (resultsStr.match(/B/g) || []).length;
        let pCount = (resultsStr.match(/P/g) || []).length;
        if (bCount > pCount + 2) { duDoanConCai = 'Cái'; doTinCayConCai = 72; lyDoConCai = 'Con nóng → bẻ Cái'; }
        else if (pCount > bCount + 2) { duDoanConCai = 'Con'; doTinCayConCai = 72; lyDoConCai = 'Cái nóng → bẻ Con'; }
    }
    let tCount = (resultsStr.match(/T/g) || []).length;
    let duDoanHoa = 'Không', doTinCayHoa = 85, lyDoHoa = 'Hòa hiếm';
    if (tCount >= 2 && resultsStr.slice(-5).includes('T')) { duDoanHoa = 'Có'; doTinCayHoa = 65; lyDoHoa = `Hòa ${tCount} lần`; }
    let duDoanConDoi = 'Không', doTinCayConDoi = 85, lyDoConDoi = 'Con đôi hiếm';
    if (resultsStr.slice(-2) === 'BB') { duDoanConDoi = 'Có'; doTinCayConDoi = 70; lyDoConDoi = 'Ván trước BB'; }
    let duDoanCaiDoi = 'Không', doTinCayCaiDoi = 85, lyDoCaiDoi = 'Cái đôi hiếm';
    if (resultsStr.slice(-2) === 'PP') { duDoanCaiDoi = 'Có'; doTinCayCaiDoi = 70; lyDoCaiDoi = 'Ván trước PP'; }
    return { phien_hien_tai: currentPhien, ket_qua_truoc: ketQuaTruoc, dung_sai_truoc: dungSai, du_doan_con_cai: duDoanConCai, do_tin_cay_con_cai: doTinCayConCai + '%', ly_do_con_cai: lyDoConCai, du_doan_hoa: duDoanHoa, do_tin_cay_hoa: doTinCayHoa + '%', ly_do_hoa: lyDoHoa, du_doan_con_doi: duDoanConDoi, do_tin_cay_con_doi: doTinCayConDoi + '%', ly_do_con_doi: lyDoConDoi, du_doan_cai_doi: duDoanCaiDoi, do_tin_cay_cai_doi: doTinCayCaiDoi + '%', ly_do_cai_doi: lyDoCaiDoi };
}

// ==================== THUẬT TOÁN XÓC ĐĨA ====================
function thuatToanXocDia(history, currentPhien, currentResult, gameKey) {
    let duDoan = 'Chẵn', doTinCay = 65, lyDo = 'Mặc định';
    if (history && history.length >= 2) {
        const res = history.map(h => h.ket_qua);
        let chan = res.filter(r => r === 'Chẵn').length;
        let le = res.length - chan;
        if (chan > le + 1) { duDoan = 'Lẻ'; doTinCay = 72; lyDo = `Chẵn nóng ${chan}/${res.length} → bẻ Lẻ`; }
        else if (le > chan + 1) { duDoan = 'Chẵn'; doTinCay = 72; lyDo = `Lẻ nóng ${le}/${res.length} → bẻ Chẵn`; }
        else { duDoan = res[0]; doTinCay = 60; lyDo = `Theo xu hướng ${duDoan}`; }
    }
    let ketQuaTruoc = currentResult || null;
    let dungSai = null;
    if (predictionsDB[gameKey]?.length > 0 && predictionsDB[gameKey][0]?.du_doan && ketQuaTruoc) {
        dungSai = predictionsDB[gameKey][0].du_doan === ketQuaTruoc ? '✅ ĐÚNG' : '❌ SAI';
    }
    return { phien_hien_tai: currentPhien, ket_qua_truoc: ketQuaTruoc, dung_sai_truoc: dungSai, du_doan: duDoan, do_tin_cay: doTinCay + '%', ly_do: lyDo };
}

// ==================== DỰ ĐOÁN ====================
async function layDuDoan(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return { success: false, error: 'Game không tồn tại' };
    const data = await fetchGameData(gameKey);
    if (!data) return { success: false, error: 'Không lấy được dữ liệu', game: game.name };
    let result = {};
    let history = predictionsDB[gameKey] || [];
    if (game.type === 'bcr') result = thuatToanBCR(data, data.phien);
    else if (game.type === 'taixiu') result = thuatToanTaiXiu(history, data.phien, data.ket_qua, gameKey);
    else if (game.type === 'xocdia') result = thuatToanXocDia(history, data.phien, data.ket_qua, gameKey);
    else return { success: false, error: 'Loại game không hỗ trợ' };
    result.game = game.name;
    result.icon = game.icon;
    result.timestamp = new Date().toISOString();
    predictionsDB[gameKey].unshift(result);
    if (predictionsDB[gameKey].length > 30) predictionsDB[gameKey] = predictionsDB[gameKey].slice(0, 30);
    return result;
}

// ==================== API ====================
app.get('/api/predict/:game', async (req, res) => { try { res.json(await layDuDoan(req.params.game)); } catch(e) { res.json({ error: e.message }); } });
app.get('/api/history/:game', (req, res) => { const k = req.params.game; res.json({ success: true, game: GAMES[k]?.name, history: predictionsDB[k] || [], total: predictionsDB[k]?.length || 0 }); });
app.post('/api/reset/:game', (req, res) => { const k = req.params.game; predictionsDB[k] = []; res.json({ success: true }); });
app.get('/api/all', async (req, res) => { let r = {}; for (let k of Object.keys(GAMES)) r[k] = await layDuDoan(k); res.json(r); });
app.get('/api/games', (req, res) => { let g = {}; for (let [k, v] of Object.entries(GAMES)) g[k] = { name: v.name, icon: v.icon, type: v.type }; res.json({ success: true, games: g, total: Object.keys(GAMES).length }); });
app.get('/', (req, res) => { res.json({ status: 'running', total_games: Object.keys(GAMES).length, games: Object.keys(GAMES) }); });

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 SERVER CHAY - ${Object.keys(GAMES).length} GAME | 50+ CAU`);
    console.log(`📡 PORT: ${PORT}`);
});
