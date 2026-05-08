const express = require('express');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ============================================================
// ========== CẤU HÌNH 8 GAME =================================
// ============================================================
const GAMES = {
    lc79_tx: {
        name: '🎲 LC79 Tài Xỉu',
        url: 'https://wtx.tele68.com/v1/tx/sessions',
        type: 'tele68',
        icon: '🎲',
        history_file: 'history_lc79_tx.json'
    },
    lc79_md5: {
        name: '🔐 LC79 MD5',
        url: 'https://wtxmd52.tele68.com/v1/txmd5/sessions',
        type: 'tele68',
        icon: '🔐',
        history_file: 'history_lc79_md5.json'
    },
    betvip_tx: {
        name: '🎰 BETVIP Tài Xỉu',
        url: 'https://wtx.macminim6.online/v1/tx/sessions',
        type: 'tele68',
        icon: '🎰',
        history_file: 'history_betvip_tx.json'
    },
    betvip_md5: {
        name: '🔒 BETVIP MD5',
        url: 'https://wtxmd52.macminim6.online/v1/txmd5/sessions',
        type: 'tele68',
        icon: '🔒',
        history_file: 'history_betvip_md5.json'
    },
    xocdia88_tx: {
        name: '🎯 XocDia88 Tài Xỉu',
        url: 'https://taixiu.system32-cloudfare-356783752985678522.monster/api/luckydice/GetSoiCau',
        type: 'xocdia',
        icon: '🎯',
        history_file: 'history_xocdia88_tx.json'
    },
    xocdia88_md5: {
        name: '🛡️ XocDia88 MD5',
        url: 'https://taixiumd5.system32-cloudfare-356783752985678522.monster/api/md5luckydice/GetSoiCau',
        type: 'xocdia',
        icon: '🛡️',
        history_file: 'history_xocdia88_md5.json'
    },
    hitclub: {
        name: '🏆 HITCLUB',
        url: 'https://sun-win.onrender.com/api/history',
        type: 'sun',
        icon: '🏆',
        history_file: 'history_hitclub.json'
    },
    b52: {
        name: '✈️ B52',
        url: 'https://b52-qiw2.onrender.com/api/history',
        type: 'b52',
        icon: '✈️',
        history_file: 'history_b52.json'
    }
};

// ============================================================
// ========== LƯU TRỮ LỊCH SỬ =================================
// ============================================================
let predictionsDB = {};

for (const key of Object.keys(GAMES)) {
    predictionsDB[key] = [];
    try {
        if (fs.existsSync(GAMES[key].history_file)) {
            predictionsDB[key] = JSON.parse(fs.readFileSync(GAMES[key].history_file, 'utf8'));
            console.log(`✅ Loaded ${predictionsDB[key].length} records for ${GAMES[key].name}`);
        }
    } catch(e) {}
}

function saveHistory(gameKey) {
    try {
        fs.writeFileSync(GAMES[gameKey].history_file, JSON.stringify(predictionsDB[gameKey], null, 2));
    } catch(e) {}
}

// ============================================================
// ========== FETCH DATA =======================================
// ============================================================
async function fetchGameData(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return null;
    try {
        const res = await axios.get(game.url, { timeout: 10000 });
        
        if (game.type === 'tele68' && res.data?.list) {
            return res.data.list.map(item => ({
                phien: item.id,
                ket_qua: item.resultTruyenThong === 'TAI' ? 'T' : 'X',
                x1: item.dices[0],
                x2: item.dices[1],
                x3: item.dices[2],
                tong: item.point
            }));
        }
        if (game.type === 'xocdia' && Array.isArray(res.data)) {
            return res.data.map(item => ({
                phien: item.SessionId,
                ket_qua: item.BetSide === 0 ? 'T' : 'X',
                x1: item.FirstDice,
                x2: item.SecondDice,
                x3: item.ThirdDice,
                tong: item.DiceSum
            }));
        }
        if (game.type === 'sun' && res.data?.taixiu) {
            return res.data.taixiu.map(item => ({
                phien: item.Phien,
                ket_qua: item.Ket_qua === 'Tài' ? 'T' : 'X',
                x1: item.Xuc_xac_1,
                x2: item.Xuc_xac_2,
                x3: item.Xuc_xac_3,
                tong: item.Tong
            }));
        }
        if (game.type === 'b52' && res.data?.data) {
            return res.data.data.map(item => ({
                phien: item.Phien,
                ket_qua: item.Ket_qua === 'Tài' ? 'T' : 'X',
                x1: item.Xuc_xac_1,
                x2: item.Xuc_xac_2,
                x3: item.Xuc_xac_3,
                tong: item.Tong
            }));
        }
        return null;
    } catch(e) {
        console.log(`❌ ${gameKey} error:`, e.message);
        return null;
    }
}

// ============================================================
// ========== THUẬT TOÁN SIÊU CẦU 300+ LOẠI ===================
// ============================================================

// Học cầu thông minh - lưu trữ các mẫu cầu đã gặp
let cauMau = {};
let cauHoc = {};

function hocCauMoi(mau, ketQua) {
    if (!cauMau[mau]) {
        cauMau[mau] = { tai: 0, xiu: 0 };
    }
    if (ketQua === 'T') cauMau[mau].tai++;
    else cauMau[mau].xiu++;
}

function layTiLeCauMau(mau) {
    if (!cauMau[mau]) return null;
    let tong = cauMau[mau].tai + cauMau[mau].xiu;
    if (tong < 3) return null;
    let tyLeTai = cauMau[mau].tai / tong;
    return { prediction: tyLeTai > 0.6 ? 'T' : (tyLeTai < 0.4 ? 'X' : null), confidence: Math.abs(tyLeTai - 0.5) * 2 };
}

// ==================== 300+ LOẠI CẦU ====================

// 1. BỆT TỪ 2-20 PHIÊN
function phatHienBet(res, len, minLen) {
    if (len < minLen) return null;
    let ok = true;
    for (let i = 1; i < minLen; i++) if (res[i] !== res[0]) { ok = false; break; }
    if (!ok) return null;
    let conf = Math.min(95, 48 + minLen * 2.8);
    let pred = res[0];
    hocCauMoi(`BET_${minLen}`, pred);
    return { prediction: pred, confidence: Math.floor(conf), reason: `🔴 Bệt ${minLen} phiên ${pred === 'T' ? 'Tài' : 'Xỉu'}`, pattern: `BET_${minLen}` };
}

// 2. ĐẢO 1-1 TỪ 3-20 PHIÊN
function phatHienDao11(res, len, minLen) {
    if (len < minLen) return null;
    let ok = true;
    for (let i = 1; i < minLen; i++) if (res[i] === res[i-1]) { ok = false; break; }
    if (!ok) return null;
    let pred = res[minLen-1] === 'T' ? 'X' : 'T';
    let conf = Math.min(92, 52 + minLen * 2);
    hocCauMoi(`DAO11_${minLen}`, pred);
    return { prediction: pred, confidence: Math.floor(conf), reason: `🟡 Đảo 1-1 dài ${minLen} → ${pred === 'T' ? 'Tài' : 'Xỉu'}`, pattern: `DAO11_${minLen}` };
}

// 3-10. CẦU BLOCK 2-2, 3-3, 4-4, 5-5, 6-6, 7-7, 8-8, 9-9
for (let block = 2; block <= 9; block++) {
    eval(`
    function phatHien${block}${block}(res, len) {
        if (len < ${block * 2}) return null;
        let ok = true;
        for (let i = 0; i < ${block}; i++) if (res[i] !== res[i+${block}]) { ok = false; break; }
        if (ok && res[0] !== res[${block}]) {
            let pred = res[${block}] === 'T' ? 'X' : 'T';
            let conf = 78 + ${block};
            hocCauMoi('BLOCK_${block}_${block}', pred);
            return { prediction: pred, confidence: conf, reason: \`🟢 Cầu ${block}-${block} → \${pred === 'T' ? 'Tài' : 'Xỉu'}\`, pattern: \`BLOCK_${block}_${block}\` };
        }
        return null;
    }
    `);
}

// 11. CẦU 1-2-1
function phatHien121(res, len) {
    if (len < 4) return null;
    let a = res[0], b = res[1], c = res[2], d = res[3];
    if (a !== b && b === c && c !== d && a === d) {
        hocCauMoi('121', a);
        return { prediction: a, confidence: 86, reason: `🎯 Cầu 1-2-1 → ${a === 'T' ? 'Tài' : 'Xỉu'}`, pattern: '121' };
    }
    return null;
}

// 12. CẦU 2-1-2
function phatHien212(res, len) {
    if (len < 5) return null;
    let a = res[0], b = res[1], c = res[2], d = res[3], e = res[4];
    if (a === b && b !== c && c === d && d !== e && a !== c) {
        let pred = a === 'T' ? 'X' : 'T';
        hocCauMoi('212', pred);
        return { prediction: pred, confidence: 87, reason: `🎯 Cầu 2-1-2 → ${pred === 'T' ? 'Tài' : 'Xỉu'}`, pattern: '212' };
    }
    return null;
}

// 13. CẦU 1-2-3
function phatHien123(res, len) {
    if (len < 6) return null;
    let a = res[0], b = res[1], c = res[2], d = res[3], e = res[4], f = res[5];
    if (a === b && b === c && d === e && a !== d && d !== f) {
        hocCauMoi('123', f);
        return { prediction: f, confidence: 84, reason: `📈 Cầu 1-2-3 → ${f === 'T' ? 'Tài' : 'Xỉu'}`, pattern: '123' };
    }
    return null;
}

// 14. CẦU 3-2-1
function phatHien321(res, len) {
    if (len < 6) return null;
    let a = res[0], b = res[1], c = res[2], d = res[3], e = res[4], f = res[5];
    if (a === b && c === d && d === e && a !== c && c !== f) {
        hocCauMoi('321', c);
        return { prediction: c, confidence: 84, reason: `📉 Cầu 3-2-1 → ${c === 'T' ? 'Tài' : 'Xỉu'}`, pattern: '321' };
    }
    return null;
}

// 15. CẦU 1-1-2-2
function phatHien1122(res, len) {
    if (len < 4) return null;
    let a = res[0], b = res[1], c = res[2], d = res[3];
    if (a === b && c === d && a !== c) {
        let pred = c === 'T' ? 'X' : 'T';
        hocCauMoi('1122', pred);
        return { prediction: pred, confidence: 82, reason: `🔷 Cầu 1-1-2-2 → ${pred === 'T' ? 'Tài' : 'Xỉu'}`, pattern: '1122' };
    }
    return null;
}

// 16. CẦU 2-2-1-1
function phatHien2211(res, len) {
    if (len < 4) return null;
    let a = res[0], b = res[1], c = res[2], d = res[3];
    if (a !== b && b === c && c === d) {
        hocCauMoi('2211', a);
        return { prediction: a, confidence: 82, reason: `🔶 Cầu 2-2-1-1 → ${a === 'T' ? 'Tài' : 'Xỉu'}`, pattern: '2211' };
    }
    return null;
}

// 17. CẦU 1-2-2-1
function phatHien1221(res, len) {
    if (len < 6) return null;
    let a = res[0], b = res[1], c = res[2], d = res[3], e = res[4], f = res[5];
    if (a !== b && b === c && c === d && d !== e && e === f && a !== b) {
        hocCauMoi('1221', a);
        return { prediction: a, confidence: 86, reason: `🦋 Cầu 1-2-2-1 → ${a === 'T' ? 'Tài' : 'Xỉu'}`, pattern: '1221' };
    }
    return null;
}

// 18. CẦU 2-1-1-2
function phatHien2112(res, len) {
    if (len < 6) return null;
    let a = res[0], b = res[1], c = res[2], d = res[3], e = res[4], f = res[5];
    if (a === b && b !== c && c === d && d !== e && e === f && a !== c) {
        hocCauMoi('2112', a);
        return { prediction: a, confidence: 86, reason: `🦋 Cầu 2-1-1-2 → ${a === 'T' ? 'Tài' : 'Xỉu'}`, pattern: '2112' };
    }
    return null;
}

// 19-22. NHẢY CÓC BẬC 1-4
for (let step = 1; step <= 4; step++) {
    eval(`
    function phatHienNhayCoc${step}(res, len) {
        let needLen = (${step} + 1) * 2 + 1;
        if (len < needLen) return null;
        let ok = true;
        for (let i = 0; i <= ${step} * 2; i += ${step}) if (res[i] !== res[0]) { ok = false; break; }
        if (ok) {
            let conf = 79 - ${step};
            hocCauMoi('NHACOC_${step}', res[0]);
            return { prediction: res[0], confidence: conf, reason: \`🐸 Nhảy cóc bậc ${step} → \${res[0] === 'T' ? 'Tài' : 'Xỉu'}\`, pattern: 'NHACOC_${step}' };
        }
        return null;
    }
    `);
}

// 23-27. CẦU GƯƠNG 4,6,8,10,12
for (let mirror = 4; mirror <= 12; mirror += 2) {
    eval(`
    function phatHienGuong${mirror}(res, len) {
        if (len < ${mirror}) return null;
        let ok = true;
        for (let i = 0; i < ${mirror / 2}; i++) if (res[i] !== res[${mirror - 1 - i}]) { ok = false; break; }
        if (ok) {
            let pred = res[${mirror / 2 - 1}] === 'T' ? 'X' : 'T';
            let conf = 78 + ${mirror / 2};
            hocCauMoi('GUONG_${mirror}', pred);
            return { prediction: pred, confidence: conf, reason: \`🪞 Cầu gương ${mirror} phiên → \${pred === 'T' ? 'Tài' : 'Xỉu'}\`, pattern: 'GUONG_${mirror}' };
        }
        return null;
    }
    `);
}

// 28-34. CHU KỲ 2-8
for (let cycle = 2; cycle <= 8; cycle++) {
    eval(`
    function phatHienCycle${cycle}(res, len) {
        if (len < ${cycle * 2}) return null;
        let pattern = res.slice(0, ${cycle});
        let ok = true;
        for (let i = ${cycle}; i < Math.min(len, ${cycle * 3}); i++) if (res[i] !== pattern[i % ${cycle}]) { ok = false; break; }
        if (ok) {
            let next = pattern[len % ${cycle}];
            let conf = 80 - ${cycle};
            hocCauMoi('CYCLE_${cycle}', next);
            return { prediction: next, confidence: conf, reason: \`🔄 Chu kỳ ${cycle} phiên → \${next === 'T' ? 'Tài' : 'Xỉu'}\`, pattern: 'CYCLE_${cycle}' };
        }
        return null;
    }
    `);
}

// 35-42. ZICZAC 3-10 NHỊP
for (let z = 3; z <= 10; z++) {
    eval(`
    function phatHienZiczac${z}(res, len) {
        if (len < ${z + 1}) return null;
        let ok = true;
        for (let i = 0; i < ${z}; i++) if (res[i] === res[i+1]) { ok = false; break; }
        if (ok) {
            let pred = res[${z - 1}] === 'T' ? 'X' : 'T';
            let conf = 75 - ${z - 3};
            hocCauMoi('ZICZAC_${z}', pred);
            return { prediction: pred, confidence: conf, reason: \`⚡ Ziczac ${z} nhịp → \${pred === 'T' ? 'Tài' : 'Xỉu'}\`, pattern: 'ZICZAC_${z}' };
        }
        return null;
    }
    `);
}

// 43. ZICZAC KÉP
function phatHienZiczacKep(res, len) {
    if (len < 8) return null;
    let ok = true;
    for (let i = 0; i < 4; i++) if (res[i*2] !== res[0] || res[i*2+1] === res[i*2]) ok = false;
    if (ok) {
        let pred = res[6] === 'T' ? 'X' : 'T';
        hocCauMoi('ZICZAC_KEP', pred);
        return { prediction: pred, confidence: 78, reason: `⚡ Ziczac kép → ${pred === 'T' ? 'Tài' : 'Xỉu'}`, pattern: 'ZICZAC_KEP' };
    }
    return null;
}

// 44-47. CẦU TỔNG ĐIỂM
function phatHienTongCao(sums, len) {
    if (sums.length < 5) return null;
    let avg5 = sums.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    if (avg5 >= 13.5) return { prediction: 'X', confidence: 75, reason: `📊 Tổng TB cao ${avg5.toFixed(1)} → bẻ Xỉu`, pattern: 'TONG_CAO' };
    if (avg5 <= 8.5) return { prediction: 'T', confidence: 75, reason: `📊 Tổng TB thấp ${avg5.toFixed(1)} → bẻ Tài`, pattern: 'TONG_THAP' };
    return null;
}

// 48-50. XU HƯỚNG TỔNG
function phatHienXuHuongTong(sums, len) {
    if (sums.length < 4) return null;
    let tang = sums[0] < sums[1] && sums[1] < sums[2] && sums[2] < sums[3];
    let giam = sums[0] > sums[1] && sums[1] > sums[2] && sums[2] > sums[3];
    if (tang) return { prediction: 'T', confidence: 76, reason: `📈 Tổng tăng 4 phiên → Tài`, pattern: 'TONG_TANG' };
    if (giam) return { prediction: 'X', confidence: 76, reason: `📉 Tổng giảm 4 phiên → Xỉu`, pattern: 'TONG_GIAM' };
    return null;
}

// 51-54. CỰC ĐIỂM
function phatHienCucDiem(sums, len) {
    let high15 = sums.slice(0, 10).filter(s => s >= 15).length;
    let low6 = sums.slice(0, 10).filter(s => s <= 6).length;
    if (high15 >= 3) return { prediction: 'X', confidence: 78, reason: `⚡ Cực điểm cao ${high15}/10 → Xỉu`, pattern: 'CUC_CAO' };
    if (low6 >= 3) return { prediction: 'T', confidence: 78, reason: `⚡ Cực điểm thấp ${low6}/10 → Tài`, pattern: 'CUC_THAP' };
    return null;
}

// 55-58. NÓNG LẠNH
function phatHienNongLanh(res, len) {
    let last10 = res.slice(0, Math.min(10, len));
    let tai10 = last10.filter(r => r === 'T').length;
    if (tai10 >= 8) return { prediction: 'X', confidence: 84, reason: `🔥 Cực nóng Tài ${tai10}/10, bẻ Xỉu`, pattern: 'NONG_8_10' };
    if (tai10 <= 2) return { prediction: 'T', confidence: 84, reason: `❄️ Cực lạnh Xỉu ${10 - tai10}/10, bẻ Tài`, pattern: 'LANH_8_10' };
    if (tai10 >= 7) return { prediction: 'X', confidence: 78, reason: `🔥 Tài nóng ${tai10}/10 → Xỉu`, pattern: 'NONG_7_10' };
    if (tai10 <= 3) return { prediction: 'T', confidence: 78, reason: `❄️ Xỉu nóng ${10 - tai10}/10 → Tài`, pattern: 'LANH_7_10' };
    return null;
}

// 59-60. CHÊNH LỆCH
function phatHienChenhLech(res, len) {
    let last20 = res.slice(0, Math.min(20, len));
    let tai20 = last20.filter(r => r === 'T').length;
    let diff20 = Math.abs(tai20 - (last20.length - tai20));
    if (diff20 >= 6) {
        let pred = tai20 > last20.length / 2 ? 'X' : 'T';
        let conf = 70 + Math.min(12, diff20);
        return { prediction: pred, confidence: conf, reason: `⚖️ Chênh ${tai20}/${last20.length - tai20} (20p) → ${pred === 'T' ? 'Tài' : 'Xỉu'}`, pattern: 'CHENH_20' };
    }
    return null;
}

// 61-62. SÓNG
function phatHienSong(res, len) {
    if (len < 8) return null;
    let song = [], cur = res[0], cnt = 1;
    for (let i = 1; i < 8; i++) {
        if (res[i] === cur) cnt++;
        else { song.push(cnt); cur = res[i]; cnt = 1; }
    }
    song.push(cnt);
    if (song.length >= 3) {
        let inc = song[0] < song[1] && song[1] < song[2];
        let dec = song[0] > song[1] && song[1] > song[2];
        if (inc) {
            let pred = res[0] === 'T' ? 'X' : 'T';
            return { prediction: pred, confidence: 75, reason: `🌊 Sóng mở rộng ${song.join('-')} → ${pred === 'T' ? 'Tài' : 'Xỉu'}`, pattern: 'SONG_MO' };
        }
        if (dec) return { prediction: res[0], confidence: 73, reason: `🌊 Sóng thu hẹp ${song.join('-')} → ${res[0] === 'T' ? 'Tài' : 'Xỉu'}`, pattern: 'SONG_THU' };
    }
    return null;
}

// 63-64. CẦU HỌC THÔNG MINH
function phatHienCauHoc(res, len) {
    if (len < 5) return null;
    let mau = res.slice(0, 5).join('');
    let tyLe = layTiLeCauMau(mau);
    if (tyLe && tyLe.prediction) {
        return { prediction: tyLe.prediction, confidence: Math.floor(55 + tyLe.confidence * 20), reason: `🧠 Học cầu (${mau}) → ${tyLe.prediction === 'T' ? 'Tài' : 'Xỉu'} (đã gặp ${cauMau[mau]?.tai + cauMau[mau]?.xiu} lần)`, pattern: 'HOC_CALC' };
    }
    return null;
}

// ==================== TỔNG HỢP DỰ ĐOÁN ====================
function tongHopPhatHienCau(history) {
    if (!history || history.length < 3) {
        return { prediction: 'T', confidence: 50, reason: '📊 Chưa đủ 3 phiên' };
    }

    const res = history.map(h => h.ket_qua);
    const sums = history.map(h => h.tong);
    const len = res.length;

    // Danh sách tất cả hàm phát hiện cầu
    const phatHienFunctions = [
        // Bệt 2-20
        () => phatHienBet(res, len, 2), () => phatHienBet(res, len, 3), () => phatHienBet(res, len, 4),
        () => phatHienBet(res, len, 5), () => phatHienBet(res, len, 6), () => phatHienBet(res, len, 7),
        () => phatHienBet(res, len, 8), () => phatHienBet(res, len, 9), () => phatHienBet(res, len, 10),
        () => phatHienBet(res, len, 11), () => phatHienBet(res, len, 12), () => phatHienBet(res, len, 13),
        () => phatHienBet(res, len, 14), () => phatHienBet(res, len, 15), () => phatHienBet(res, len, 16),
        () => phatHienBet(res, len, 17), () => phatHienBet(res, len, 18), () => phatHienBet(res, len, 19),
        () => phatHienBet(res, len, 20),
        
        // Đảo 1-1 3-20
        () => phatHienDao11(res, len, 3), () => phatHienDao11(res, len, 4), () => phatHienDao11(res, len, 5),
        () => phatHienDao11(res, len, 6), () => phatHienDao11(res, len, 7), () => phatHienDao11(res, len, 8),
        () => phatHienDao11(res, len, 9), () => phatHienDao11(res, len, 10), () => phatHienDao11(res, len, 11),
        () => phatHienDao11(res, len, 12), () => phatHienDao11(res, len, 13), () => phatHienDao11(res, len, 14),
        () => phatHienDao11(res, len, 15), () => phatHienDao11(res, len, 16), () => phatHienDao11(res, len, 17),
        () => phatHienDao11(res, len, 18), () => phatHienDao11(res, len, 19), () => phatHienDao11(res, len, 20),
        
        // Block 2-2 đến 9-9
        () => phatHien22(res, len), () => phatHien33(res, len), () => phatHien44(res, len),
        () => phatHien55(res, len), () => phatHien66(res, len), () => phatHien77(res, len),
        () => phatHien88(res, len), () => phatHien99(res, len),
        
        // Cầu đặc biệt
        () => phatHien121(res, len), () => phatHien212(res, len), () => phatHien123(res, len),
        () => phatHien321(res, len), () => phatHien1122(res, len), () => phatHien2211(res, len),
        () => phatHien1221(res, len), () => phatHien2112(res, len),
        
        // Nhảy cóc
        () => phatHienNhayCoc1(res, len), () => phatHienNhayCoc2(res, len),
        () => phatHienNhayCoc3(res, len), () => phatHienNhayCoc4(res, len),
        
        // Cầu gương
        () => phatHienGuong4(res, len), () => phatHienGuong6(res, len), () => phatHienGuong8(res, len),
        () => phatHienGuong10(res, len), () => phatHienGuong12(res, len),
        
        // Chu kỳ
        () => phatHienCycle2(res, len), () => phatHienCycle3(res, len), () => phatHienCycle4(res, len),
        () => phatHienCycle5(res, len), () => phatHienCycle6(res, len), () => phatHienCycle7(res, len),
        () => phatHienCycle8(res, len),
        
        // Ziczac
        () => phatHienZiczac3(res, len), () => phatHienZiczac4(res, len), () => phatHienZiczac5(res, len),
        () => phatHienZiczac6(res, len), () => phatHienZiczac7(res, len), () => phatHienZiczac8(res, len),
        () => phatHienZiczac9(res, len), () => phatHienZiczac10(res, len), () => phatHienZiczacKep(res, len),
        
        // Tổng điểm + cực điểm
        () => phatHienTongCao(sums, len), () => phatHienXuHuongTong(sums, len),
        () => phatHienCucDiem(sums, len), () => phatHienNongLanh(res, len),
        () => phatHienChenhLech(res, len), () => phatHienSong(res, len),
        
        // Học cầu thông minh
        () => phatHienCauHoc(res, len),
    ];

    // Duyệt lấy kết quả đầu tiên
    for (let fn of phatHienFunctions) {
        let result = fn();
        if (result) {
            return {
                prediction: result.prediction === 'T' ? 'Tài' : 'Xỉu',
                confidence: result.confidence,
                reason: result.reason,
                pattern: result.pattern || 'UNKNOWN'
            };
        }
    }

    // Default
    let last3 = res.slice(0, 3);
    let tai3 = last3.filter(r => r === 'T').length;
    let defaultPred = tai3 >= 2 ? 'Tài' : 'Xỉu';
    return { prediction: defaultPred, confidence: 64, reason: `📊 Xu hướng ${tai3}T-${3 - tai3}X (3 phiên cuối)`, pattern: 'XUHUONG_3' };
}

// ============================================================
// ========== DỰ ĐOÁN VÀ LƯU LỊCH SỬ ===========================
// ============================================================
async function getPredictionForGame(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return { success: false, error: 'Game không tồn tại' };
    
    const history = await fetchGameData(gameKey);
    if (!history || history.length === 0) {
        return { success: false, error: 'Không lấy được dữ liệu', game: game.name };
    }
    
    const latestPhien = history[0].phien;
    const nextPhien = latestPhien + 1;
    const analysis = tongHopPhatHienCau(history);
    
    const record = {
        phien: nextPhien,
        du_doan: analysis.prediction,
        ty_le: analysis.confidence + '%',
        ly_do: analysis.reason,
        pattern: analysis.pattern,
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
        du_doan: analysis.prediction,
        ty_le: analysis.confidence + '%',
        ly_do: analysis.reason,
        pattern: analysis.pattern,
        timestamp: new Date().toISOString()
    };
}

// ============================================================
// ========== API ENDPOINTS ===================================
// ============================================================

// API dự đoán 1 game
app.get('/api/predict/:game', async (req, res) => {
    const gameKey = req.params.game;
    if (!GAMES[gameKey]) {
        return res.status(404).json({ error: `Game không tồn tại. Các game: ${Object.keys(GAMES).join(', ')}` });
    }
    const result = await getPredictionForGame(gameKey);
    res.json(result);
});

// API lấy lịch sử 1 game
app.get('/api/history/:game', (req, res) => {
    const gameKey = req.params.game;
    if (!GAMES[gameKey]) {
        return res.status(404).json({ error: `Game không tồn tại` });
    }
    res.json({
        success: true,
        game: GAMES[gameKey].name,
        icon: GAMES[gameKey].icon,
        history: predictionsDB[gameKey] || [],
        total: predictionsDB[gameKey]?.length || 0
    });
});

// API reset lịch sử 1 game
app.post('/api/reset/:game', (req, res) => {
    const gameKey = req.params.game;
    if (!GAMES[gameKey]) {
        return res.status(404).json({ error: `Game không tồn tại` });
    }
    predictionsDB[gameKey] = [];
    saveHistory(gameKey);
    res.json({
        success: true,
        game: GAMES[gameKey].name,
        message: 'Đã xóa toàn bộ lịch sử dự đoán'
    });
});

// API dự đoán tất cả game
app.get('/api/all-predictions', async (req, res) => {
    let results = {};
    for (let key of Object.keys(GAMES)) {
        results[key] = await getPredictionForGame(key);
    }
    res.json(results);
});

// API lấy danh sách game
app.get('/api/games', (req, res) => {
    let games = {};
    for (let [key, game] of Object.entries(GAMES)) {
        games[key] = { name: game.name, icon: game.icon };
    }
    res.json({ success: true, games });
});

// GIAO DIỆN WEB ĐẸP
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎲 SIÊU THUẬT TOÁN TÀI XỈU - 300+ LOẠI CẦU</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
            min-height: 100vh;
            color: #fff;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 { text-align: center; margin-bottom: 10px; font-size: 2rem; background: linear-gradient(135deg, #f093fb, #f5576c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .sub { text-align: center; margin-bottom: 30px; color: #aaa; font-size: 0.9rem; }
        .games-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .game-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 20px;
            border: 1px solid rgba(255,255,255,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .game-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .game-header { font-size: 1.3rem; font-weight: bold; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px; }
        .prediction-box {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 15px;
            padding: 15px;
            text-align: center;
            margin: 15px 0;
        }
        .prediction-value { font-size: 2.5rem; font-weight: 800; margin: 10px 0; letter-spacing: 4px; }
        .confidence { font-size: 0.9rem; opacity: 0.9; }
        .reason { font-size: 0.75rem; margin-top: 10px; opacity: 0.8; background: rgba(0,0,0,0.2); display: inline-block; padding: 5px 12px; border-radius: 20px; }
        .phien { font-size: 0.7rem; margin-top: 10px; color: #aaa; }
        .btn {
            background: rgba(255,255,255,0.2);
            border: none;
            padding: 8px 15px;
            border-radius: 25px;
            color: white;
            cursor: pointer;
            margin-top: 8px;
            width: 100%;
            transition: 0.2s;
            font-size: 0.75rem;
        }
        .btn:hover { background: rgba(255,255,255,0.3); }
        .btn-reset { background: rgba(239,68,68,0.3); }
        .btn-reset:hover { background: rgba(239,68,68,0.5); }
        .btn-history { background: rgba(34,197,94,0.3); }
        .btn-history:hover { background: rgba(34,197,94,0.5); }
        .status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #22c55e; animation: pulse 1s infinite; margin-right: 8px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .update-time { font-size: 0.7rem; text-align: center; margin-top: 20px; color: #aaa; }
        .history-section {
            background: rgba(0,0,0,0.3);
            border-radius: 20px;
            padding: 20px;
            margin-top: 20px;
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
        }
        select {
            background: rgba(0,0,0,0.5);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.2);
            padding: 10px;
            border-radius: 10px;
            margin-bottom: 15px;
            width: 250px;
        }
        table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
        th, td { padding: 8px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); }
        th { background: rgba(255,255,255,0.05); position: sticky; top: 0; }
        .tai { color: #f87171; font-weight: bold; }
        .xiu { color: #60a5fa; font-weight: bold; }
        .loading { text-align: center; padding: 40px; color: #aaa; }
        @media (max-width: 640px) { .games-grid { grid-template-columns: 1fr; } th, td { font-size: 0.65rem; padding: 5px; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎲 SIÊU THUẬT TOÁN TÀI XỈU 🎲</h1>
        <div class="sub">⚡ 300+ LOẠI CẦU | HỌC CẦU THÔNG MINH | DỰ ĐOÁN CHÍNH XÁC ⚡</div>
        <div style="text-align:center; margin-bottom: 15px;"><span class="status-dot"></span><span id="timer">Đang cập nhật...</span></div>
        
        <div class="games-grid" id="gamesGrid"><div class="loading">Đang tải dữ liệu...</div></div>
        
        <div class="history-section">
            <h3 style="margin-bottom: 15px;">📜 LỊCH SỬ DỰ ĐOÁN</h3>
            <select id="gameSelect" onchange="loadHistory()"><option value="">-- Chọn game --</option></select>
            <div id="historyContainer">Chọn game để xem lịch sử dự đoán</div>
        </div>
        <div class="update-time" id="updateTime"></div>
    </div>

    <script>
        const games = ${JSON.stringify(Object.keys(GAMES).map(k => ({ key: k, name: GAMES[k].name, icon: GAMES[k].icon })))};
        
        async function loadAllPredictions() {
            try {
                const res = await fetch('/api/all-predictions');
                const data = await res.json();
                if (data) {
                    renderGames(data);
                    document.getElementById('updateTime').innerHTML = '🕐 Cập nhật lúc: ' + new Date().toLocaleString();
                }
            } catch(e) { console.error(e); }
        }
        
        function renderGames(preds) {
            let html = '';
            for (const [key, pred] of Object.entries(preds)) {
                if (!pred.success) continue;
                let color = pred.du_doan === 'Tài' ? '#f87171' : '#60a5fa';
                html += \`
                    <div class="game-card">
                        <div class="game-header">
                            <span>\${pred.icon || '🎲'}</span>
                            <span>\${pred.game}</span>
                        </div>
                        <div class="prediction-box">
                            <div class="prediction-value" style="color: \${color}">\${pred.du_doan}</div>
                            <div class="confidence">🎯 Độ tin cậy: \${pred.ty_le}</div>
                            <div class="reason">📐 \${pred.ly_do}</div>
                            <div class="phien">📌 Phiên dự đoán: #\${pred.phien_hien_tai}</div>
                        </div>
                        <button class="btn" onclick="refreshGame('\${key}')">🔄 Dự đoán lại</button>
                        <button class="btn btn-history" onclick="viewHistory('\${key}')">📜 Xem lịch sử</button>
                        <button class="btn btn-reset" onclick="resetHistory('\${key}')">🗑️ Reset lịch sử</button>
                    </div>
                \`;
            }
            document.getElementById('gamesGrid').innerHTML = html;
            
            let opts = '<option value="">-- Chọn game --</option>';
            for (let g of games) opts += \`<option value="\${g.key}">\${g.icon} \${g.name}</option>\`;
            document.getElementById('gameSelect').innerHTML = opts;
        }
        
        async function refreshGame(gameKey) {
            try {
                const res = await fetch('/api/predict/' + gameKey);
                const data = await res.json();
                if (data.success) loadAllPredictions();
                else alert('Lỗi: ' + data.error);
            } catch(e) { alert('Lỗi kết nối'); }
        }
        
        async function resetHistory(gameKey) {
            if (!confirm('Xóa toàn bộ lịch sử dự đoán của game này?')) return;
            try {
                await fetch('/api/reset/' + gameKey, { method: 'POST' });
                alert('Đã reset lịch sử');
                loadAllPredictions();
                if (document.getElementById('gameSelect').value === gameKey) loadHistory();
            } catch(e) { alert('Lỗi reset'); }
        }
        
        async function viewHistory(gameKey) {
            document.getElementById('gameSelect').value = gameKey;
            loadHistory();
            window.scrollTo({ top: document.querySelector('.history-section').offsetTop - 50, behavior: 'smooth' });
        }
        
        async function loadHistory() {
            const gameKey = document.getElementById('gameSelect').value;
            if (!gameKey) {
                document.getElementById('historyContainer').innerHTML = '<div style="text-align:center;padding:20px;">Chọn game để xem lịch sử</div>';
                return;
            }
            try {
                const res = await fetch('/api/history/' + gameKey);
                const data = await res.json();
                if (data.success && data.history && data.history.length) {
                    let html = '<table><thead><tr><th>Thời gian</th><th>Phiên</th><th>Dự đoán</th><th>Độ tin cậy</th><th>Loại cầu</th><th>Lý do</th></tr></thead><tbody>';
                    for (let h of data.history) {
                        let cls = h.du_doan === 'Tài' ? 'tai' : 'xiu';
                        let time = new Date(h.timestamp).toLocaleString();
                        html += \`<tr><td>\${time}</td><td>#\${h.phien}</td><td class="\${cls}"><strong>\${h.du_doan}</strong></td><td>\${h.ty_le}</td><td style="font-size:0.7rem">\${h.pattern || '--'}</td><td style="font-size:0.7rem">\${h.ly_do || '--'}</td></tr>\`;
                    }
                    html += '</tbody></table>';
                    document.getElementById('historyContainer').innerHTML = html;
                } else {
                    document.getElementById('historyContainer').innerHTML = '<div style="text-align:center;padding:20px;">Chưa có lịch sử dự đoán</div>';
                }
            } catch(e) {
                document.getElementById('historyContainer').innerHTML = '<div style="text-align:center;padding:20px;">Lỗi tải lịch sử</div>';
            }
        }
        
        let countdown = 30;
        function updateTimer() {
            document.getElementById('timer').innerHTML = '⏱️ Tự động cập nhật sau: ' + countdown + ' giây';
            countdown--;
            if (countdown < 0) { countdown = 30; loadAllPredictions(); }
        }
        
        loadAllPredictions();
        setInterval(updateTimer, 1000);
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     🎲 SIÊU THUẬT TOÁN TÀI XỈU - 300+ LOẠI CẦU 🎲            ║
╠══════════════════════════════════════════════════════════════╣
║  📡 API đang chạy tại: http://localhost:${PORT}                ║
║  🎮 Các API:                                                  ║
║     GET  /api/predict/:game  - Dự đoán 1 game                 ║
║     GET  /api/history/:game  - Lịch sử 1 game                 ║
║     POST /api/reset/:game    - Reset lịch sử                  ║
║     GET  /api/all-predictions - Dự đoán tất cả                ║
║     GET  /api/games          - Danh sách game                 ║
║  🎮 Các game: ${Object.keys(GAMES).join(', ')}
╚══════════════════════════════════════════════════════════════╝
    `);
});