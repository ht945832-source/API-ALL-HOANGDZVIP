const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

console.log('🚀 SERVER DANG KHOI DONG...');

// ==================== 19 GAME ====================
const GAMES = {
    sunwin_tx: { name: 'Sunwin Tài Xỉu', url: 'https://bracket-ellen-roads-prefer.trycloudflare.com/api/tx', type: 'taixiu', icon: '☀️' },
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

// ==================== 150+ LOẠI CẦU TÀI XỈU ====================
function phatHienCauTaiXiu(res, len) {
    let result = null;
    
    // CẦU BỆT 2-20
    for (let l = 2; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) if (res[i] !== res[0]) { ok = false; break; }
        if (ok) return { pred: res[0], conf: Math.min(95, 48 + l * 3), name: `Bệt_${l}` };
    }
    
    // CẦU ĐẢO 1-1 3-20
    for (let l = 3; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) if (res[i] === res[i-1]) { ok = false; break; }
        if (ok) return { pred: res[l-1] === 'Tài' ? 'Xỉu' : 'Tài', conf: Math.min(92, 52 + l * 2), name: `Dao11_${l}` };
    }
    
    // CẦU BLOCK 2-2
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) return { pred: res[2] === 'Tài' ? 'Xỉu' : 'Tài', conf: 82, name: 'Block22' };
    // CẦU BLOCK 3-3
    if (len >= 6 && res[0] === res[1] && res[1] === res[2] && res[3] === res[4] && res[4] === res[5] && res[0] !== res[3]) return { pred: res[3] === 'Tài' ? 'Xỉu' : 'Tài', conf: 85, name: 'Block33' };
    // CẦU BLOCK 4-4
    if (len >= 8 && res[0]===res[1] && res[1]===res[2] && res[2]===res[3] && res[4]===res[5] && res[5]===res[6] && res[6]===res[7] && res[0]!==res[4]) return { pred: res[4] === 'Tài' ? 'Xỉu' : 'Tài', conf: 88, name: 'Block44' };
    // CẦU BLOCK 5-5
    if (len >= 10 && res[0]===res[1] && res[1]===res[2] && res[2]===res[3] && res[3]===res[4] && res[5]===res[6] && res[6]===res[7] && res[7]===res[8] && res[8]===res[9] && res[0]!==res[5]) return { pred: res[5] === 'Tài' ? 'Xỉu' : 'Tài', conf: 90, name: 'Block55' };
    
    // CẦU 1-2-1
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] !== res[3] && res[0] === res[3]) return { pred: res[0], conf: 86, name: 'Cau121' };
    // CẦU 2-1-2
    if (len >= 5 && res[0] === res[1] && res[1] !== res[2] && res[2] === res[3] && res[3] !== res[4] && res[0] !== res[2]) return { pred: res[0] === 'Tài' ? 'Xỉu' : 'Tài', conf: 87, name: 'Cau212' };
    // CẦU 1-2-3
    if (len >= 6 && res[0]===res[1] && res[1]===res[2] && res[3]===res[4] && res[0] !== res[3] && res[3] !== res[5]) return { pred: res[5], conf: 84, name: 'Cau123' };
    // CẦU 3-2-1
    if (len >= 6 && res[0]===res[1] && res[2]===res[3] && res[3]===res[4] && res[0] !== res[2] && res[2] !== res[5]) return { pred: res[2], conf: 84, name: 'Cau321' };
    // CẦU 1-3-1
    if (len >= 5 && res[0] !== res[1] && res[1] !== res[2] && res[2] !== res[3] && res[0] === res[2] && res[1] === res[3]) return { pred: res[3] === 'Tài' ? 'Xỉu' : 'Tài', conf: 83, name: 'Cau131' };
    // CẦU 2-3-2
    if (len >= 7 && res[0]===res[1] && res[1]===res[2] && res[3]===res[4] && res[3]===res[5] && res[0]!==res[3] && res[3]!==res[6]) return { pred: res[6] === 'Tài' ? 'Xỉu' : 'Tài', conf: 85, name: 'Cau232' };
    
    // CẦU 1-1-2-2
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) return { pred: res[2] === 'Tài' ? 'Xỉu' : 'Tài', conf: 82, name: 'Cau1122' };
    // CẦU 2-2-1-1
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3]) return { pred: res[0], conf: 82, name: 'Cau2211' };
    // CẦU 1-2-2-1
    if (len >= 6 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3] && res[3] !== res[4] && res[4] === res[5]) return { pred: res[0], conf: 86, name: 'Cau1221' };
    // CẦU 2-1-1-2
    if (len >= 6 && res[0] === res[1] && res[1] !== res[2] && res[2] === res[3] && res[3] !== res[4] && res[4] === res[5] && res[0] !== res[2]) return { pred: res[0], conf: 86, name: 'Cau2112' };
    // CẦU 1-1-1-2
    if (len >= 4 && res[0] === res[1] && res[1] === res[2] && res[2] !== res[3]) return { pred: res[3] === 'Tài' ? 'Xỉu' : 'Tài', conf: 80, name: 'Cau1112' };
    // CẦU 2-2-2-1
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3]) return { pred: res[0], conf: 80, name: 'Cau2221' };
    
    // NHẢY CÓC BẬC 1-5
    for (let step = 1; step <= 5; step++) {
        let need = step * 2 + 1;
        if (len >= need) {
            let ok = true;
            for (let i = 0; i <= step * 2; i += step) if (res[i] !== res[0]) { ok = false; break; }
            if (ok) return { pred: res[0], conf: 82 - step * 2, name: `NhayCoc_${step}` };
        }
    }
    
    // CẦU GƯƠNG 4-12
    for (let m = 4; m <= 12; m += 2) {
        if (len >= m) {
            let ok = true;
            for (let i = 0; i < m / 2; i++) if (res[i] !== res[m-1-i]) { ok = false; break; }
            if (ok) return { pred: res[m/2 - 1] === 'Tài' ? 'Xỉu' : 'Tài', conf: 75 + m/2, name: `Guong_${m}` };
        }
    }
    
    // CHU KỲ 2-10
    for (let c = 2; c <= 10; c++) {
        if (len >= c * 2) {
            let ok = true;
            for (let i = c; i < Math.min(len, c * 3); i++) if (res[i] !== res[i % c]) { ok = false; break; }
            if (ok) return { pred: res[len % c], conf: 82 - c, name: `ChuKy_${c}` };
        }
    }
    
    // ZICZAC 3-15 NHỊP
    for (let z = 3; z <= 15; z++) {
        if (len >= z + 1) {
            let ok = true;
            for (let i = 0; i < z; i++) if (res[i] === res[i+1]) { ok = false; break; }
            if (ok) return { pred: res[z-1] === 'Tài' ? 'Xỉu' : 'Tài', conf: 80 - (z - 3), name: `Ziczac_${z}` };
        }
    }
    
    // CẦU 3-1
    if (len >= 4 && res[0] === res[1] && res[1] === res[2] && res[2] !== res[3]) return { pred: res[3] === 'Tài' ? 'Xỉu' : 'Tài', conf: 81, name: 'Cau31' };
    // CẦU 1-3
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3]) return { pred: res[0], conf: 81, name: 'Cau13' };
    // CẦU 4-1
    if (len >= 5 && res[0]===res[1] && res[1]===res[2] && res[2]===res[3] && res[3]!==res[4]) return { pred: res[4] === 'Tài' ? 'Xỉu' : 'Tài', conf: 82, name: 'Cau41' };
    // CẦU 1-4
    if (len >= 5 && res[0] !== res[1] && res[1]===res[2] && res[2]===res[3] && res[3]===res[4]) return { pred: res[0], conf: 82, name: 'Cau14' };
    
    // CẦU TỔNG CAO
    let sums = history.map(h => h.tong);
    if (sums.length >= 5) {
        let avg5 = sums.slice(0,5).reduce((a,b)=>a+b,0)/5;
        if (avg5 >= 14) return { pred: 'Xỉu', conf: 78, name: 'TongCao' };
        if (avg5 >= 13) return { pred: 'Xỉu', conf: 75, name: 'TongTrungBinhCao' };
        if (avg5 <= 8) return { pred: 'Tài', conf: 78, name: 'TongThap' };
        if (avg5 <= 9) return { pred: 'Tài', conf: 75, name: 'TongTrungBinhThap' };
    }
    
    // CỰC ĐIỂM
    let sums10 = sums.slice(0,10);
    let high15 = sums10.filter(s => s >= 15).length;
    let low6 = sums10.filter(s => s <= 6).length;
    if (high15 >= 4) return { pred: 'Xỉu', conf: 84, name: 'CucDiemCao' };
    if (high15 >= 3) return { pred: 'Xỉu', conf: 80, name: 'CucDiemCaoNhe' };
    if (low6 >= 4) return { pred: 'Tài', conf: 84, name: 'CucDiemThap' };
    if (low6 >= 3) return { pred: 'Tài', conf: 80, name: 'CucDiemThapNhe' };
    
    // NÓNG LẠNH 10 PHIÊN
    let last10 = res.slice(0, Math.min(10, len));
    let tai10 = last10.filter(r => r === 'Tài').length;
    if (tai10 >= 9) return { pred: 'Xỉu', conf: 90, name: 'SieNongTai' };
    if (tai10 <= 1) return { pred: 'Tài', conf: 90, name: 'SieLanhXiu' };
    if (tai10 >= 8) return { pred: 'Xỉu', conf: 86, name: 'NongTai' };
    if (tai10 <= 2) return { pred: 'Tài', conf: 86, name: 'LanhXiu' };
    if (tai10 >= 7) return { pred: 'Xỉu', conf: 80, name: 'NongTaiNhe' };
    if (tai10 <= 3) return { pred: 'Tài', conf: 80, name: 'LanhXiuNhe' };
    
    // CHÊNH LỆCH 20 PHIÊN
    let last20 = res.slice(0, Math.min(20, len));
    let tai20 = last20.filter(r => r === 'Tài').length;
    let diff20 = Math.abs(tai20 - (last20.length - tai20));
    if (diff20 >= 8) return { pred: tai20 > last20.length/2 ? 'Xỉu' : 'Tài', conf: 76, name: 'ChenhLechLon' };
    if (diff20 >= 6) return { pred: tai20 > last20.length/2 ? 'Xỉu' : 'Tài', conf: 72, name: 'ChenhLech' };
    
    // SÓNG
    if (len >= 8) {
        let song = [], cur = res[0], cnt = 1;
        for (let i = 1; i < 8; i++) {
            if (res[i] === cur) cnt++;
            else { song.push(cnt); cur = res[i]; cnt = 1; }
        }
        song.push(cnt);
        if (song.length >= 3) {
            if (song[0] < song[1] && song[1] < song[2]) return { pred: res[0] === 'Tài' ? 'Xỉu' : 'Tài', conf: 78, name: 'SongMoRong' };
            if (song[0] > song[1] && song[1] > song[2]) return { pred: res[0], conf: 76, name: 'SongThuHep' };
        }
    }
    
    // XU HƯỚNG 3 PHIÊN
    let last3 = res.slice(0, 3);
    let tai3 = last3.filter(r => r === 'Tài').length;
    return { pred: tai3 >= 2 ? 'Tài' : 'Xỉu', conf: 65, name: 'XuHuong3Phien' };
}

// ==================== THUẬT TOÁN TÀI XỈU ====================
function thuatToanTaiXiu(history, currentPhien, currentResult) {
    let duDoan = 'Tài';
    let doTinCay = 65;
    let lyDo = 'Xu hướng 3 phiên cuối';
    let loaiCau = 'XuHuong';
    
    if (history && history.length >= 2) {
        const res = history.map(h => h.ket_qua);
        const cau = phatHienCauTaiXiu(res, res.length);
        if (cau) {
            duDoan = cau.pred;
            doTinCay = cau.conf;
            loaiCau = cau.name;
            lyDo = `🎯 Phát hiện cầu: ${cau.name} → ${duDoan}`;
        }
    }
    
    let ketQuaTruoc = currentResult || null;
    let dungSai = null;
    if (predictionsDB[gameKey]?.length > 0 && predictionsDB[gameKey][0]?.du_doan && ketQuaTruoc) {
        dungSai = predictionsDB[gameKey][0].du_doan === ketQuaTruoc ? '✅ ĐÚNG' : '❌ SAI';
    }
    
    return { phien_hien_tai: currentPhien, ket_qua_truoc: ketQuaTruoc, dung_sai_truoc: dungSai, du_doan: duDoan, do_tin_cay: doTinCay + '%', ly_do: lyDo, loai_cau: loaiCau };
}

// ==================== THUẬT TOÁN BCR ====================
function phatHienCauBCR(resultsStr) {
    let lastResult = resultsStr.length > 0 ? resultsStr[resultsStr.length - 1] : '?';
    let bCount = (resultsStr.match(/B/g) || []).length;
    let pCount = (resultsStr.match(/P/g) || []).length;
    let tCount = (resultsStr.match(/T/g) || []).length;
    
    // Bệt
    let bet = 1;
    for (let i = resultsStr.length - 2; i >= 0; i--) {
        if (resultsStr[i] === lastResult) bet++;
        else break;
    }
    if (bet >= 3) return { conCai: lastResult === 'B' ? 'Con' : 'Cái', cCconf: Math.min(85, 55 + bet * 4), cCname: `Bệt_${bet}` };
    
    // Đảo
    let dao = 1;
    for (let i = resultsStr.length - 2; i >= 0; i--) {
        if (resultsStr[i] !== resultsStr[i+1]) dao++;
        else break;
    }
    if (dao >= 4) return { conCai: lastResult === 'B' ? 'Cái' : 'Con', cCconf: Math.min(82, 58 + dao * 2), cCname: `Đảo_${dao}` };
    
    // Nóng/lạnh
    let last10 = resultsStr.slice(-10);
    let b10 = (last10.match(/B/g) || []).length;
    let p10 = (last10.match(/P/g) || []).length;
    if (b10 > p10 + 2) return { conCai: 'Cái', cCconf: 74, cCname: 'NóngCon' };
    if (p10 > b10 + 2) return { conCai: 'Con', cCconf: 74, cCname: 'NóngCái' };
    
    return { conCai: lastResult === 'B' ? 'Con' : 'Cái', cCconf: 62, cCname: 'TheoXuHuong' };
}

function thuatToanBCR(data, currentPhien) {
    let resultsStr = data.data || '';
    let lastResult = resultsStr.length > 0 ? resultsStr[resultsStr.length - 1] : '?';
    
    let ketQuaTruoc = lastResult === 'B' ? 'Con' : (lastResult === 'P' ? 'Cái' : (lastResult === 'T' ? 'Hòa' : null));
    let dungSai = null;
    if (predictionsDB.bcr_sexy?.length > 0 && predictionsDB.bcr_sexy[0]?.du_doan_con_cai && ketQuaTruoc && ketQuaTruoc !== 'Hòa') {
        dungSai = predictionsDB.bcr_sexy[0].du_doan_con_cai === ketQuaTruoc ? '✅ ĐÚNG' : '❌ SAI';
    }
    
    let cau = phatHienCauBCR(resultsStr);
    let bCount = (resultsStr.match(/B/g) || []).length;
    let pCount = (resultsStr.match(/P/g) || []).length;
    let tCount = (resultsStr.match(/T/g) || []).length;
    
    // Hòa
    let duDoanHoa = 'Không';
    let doTinCayHoa = 85;
    let lyDoHoa = 'Hòa hiếm';
    let t5 = resultsStr.slice(-5);
    let tCount5 = (t5.match(/T/g) || []).length;
    if (tCount >= 2 && tCount5 >= 1) { duDoanHoa = 'Có'; doTinCayHoa = 65; lyDoHoa = `Hòa xuất hiện ${tCount} lần`; }
    
    // Con đôi
    let duDoanConDoi = 'Không';
    let doTinCayConDoi = 85;
    let lyDoConDoi = 'Con đôi hiếm';
    if (resultsStr.slice(-2) === 'BB') { duDoanConDoi = 'Có'; doTinCayConDoi = 70; lyDoConDoi = 'Ván trước có BB'; }
    
    // Cái đôi
    let duDoanCaiDoi = 'Không';
    let doTinCayCaiDoi = 85;
    let lyDoCaiDoi = 'Cái đôi hiếm';
    if (resultsStr.slice(-2) === 'PP') { duDoanCaiDoi = 'Có'; doTinCayCaiDoi = 70; lyDoCaiDoi = 'Ván trước có PP'; }
    
    return {
        phien_hien_tai: currentPhien,
        ket_qua_truoc: ketQuaTruoc,
        dung_sai_truoc: dungSai,
        du_doan_con_cai: cau.conCai,
        do_tin_cay_con_cai: cau.cCconf + '%',
        ly_do_con_cai: `🎯 ${cau.cCname}`,
        du_doan_hoa: duDoanHoa, do_tin_cay_hoa: doTinCayHoa + '%', ly_do_hoa: lyDoHoa,
        du_doan_con_doi: duDoanConDoi, do_tin_cay_con_doi: doTinCayConDoi + '%', ly_do_con_doi: lyDoConDoi,
        du_doan_cai_doi: duDoanCaiDoi, do_tin_cay_cai_doi: doTinCayCaiDoi + '%', ly_do_cai_doi: lyDoCaiDoi
    };
}

// ==================== THUẬT TOÁN XÓC ĐĨA ====================
function thuatToanXocDia(history, currentPhien, currentResult) {
    let duDoan = 'Chẵn';
    let doTinCay = 65;
    let lyDo = 'Mặc định';
    
    if (history && history.length >= 2) {
        const res = history.map(h => h.ket_qua);
        let chan = res.filter(r => r === 'Chẵn').length;
        let le = res.length - chan;
        if (chan > le + 1) { duDoan = 'Lẻ'; doTinCay = 72; lyDo = `Chẵn nóng ${chan}/${res.length} → bẻ Lẻ`; }
        else if (le > chan + 1) { duDoan = 'Chẵn'; doTinCay = 72; lyDo = `Lẻ nóng ${le}/${res.length} → bẻ Chẵn`; }
        else { duDoan = res[0]; doTinCay = 60; lyDo = `Theo xu hướng ván cuối (${duDoan})`; }
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
    else if (game.type === 'taixiu') result = thuatToanTaiXiu(history, data.phien, data.ket_qua);
    else if (game.type === 'xocdia') result = thuatToanXocDia(history, data.phien, data.ket_qua);
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

app.get('/', (req, res) => { res.json({ status: 'running', total_games: Object.keys(GAMES).length, games: Object.keys(GAMES), endpoints: { predict: '/api/predict/:game', history: '/api/history/:game', reset: '/api/reset/:game (POST)', all: '/api/all', games: '/api/games' } }); });

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ${Object.keys(GAMES).length} GAME | 150+ LOẠI CẦU`);
    console.log(`📡 PORT: ${PORT}`);
    console.log(`🎮 Games: ${Object.keys(GAMES).join(', ')}`);
});
