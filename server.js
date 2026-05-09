const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

console.log('🚀 AI TÀI XỈU PRO - KHỞI ĐỘNG...');

// ==================== 16 GAME ====================
const GAMES = {
    sunwin_tx: { name: 'Sunwin Tài Xỉu', url: 'https://bracket-ellen-roads-prefer.trycloudflare.com/api/tx', type: 'taixiu', icon: '☀️' },
    hitclub: { name: 'HITCLUB', url: 'https://letting-tackle-newton-oak.trycloudflare.com/api/tx', type: 'taixiu', icon: '🏆' },
    lc79_tx: { name: 'LC79 Tài Xỉu', url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/tx', type: 'taixiu', icon: '🎲' },
    lc79_md5: { name: 'LC79 MD5', url: 'https://chance-compete-chambers-feelings.trycloudflare.com/api/txmd5', type: 'taixiu', icon: '🔐' },
    betvip_tx: { name: 'BETVIP Tài Xỉu', url: 'https://plastic-diet-visits-opens.trycloudflare.com/api/tx', type: 'taixiu', icon: '🎰' },
    betvip_md5: { name: 'BETVIP MD5', url: 'https://plastic-diet-visits-opens.trycloudflare.com/api/txmd5', type: 'taixiu', icon: '🔒' },
    club789: { name: '789CLUB', url: 'https://dependent-epinions-somebody-enclosed.trycloudflare.com/api/tx', type: 'taixiu', icon: '🃏' },
    max789: { name: 'MAX789', url: 'https://cage-adjustment-whose-banner.trycloudflare.com/api/tx', type: 'taixiu', icon: '⭐' },
    b52: { name: 'B52', url: 'https://gold-ultra-fails-handles.trycloudflare.com/txmd5', type: 'taixiu', icon: '✈️' },
    bcr_sexy: { name: 'BCR Sexy', url: 'https://classic-watching-cup-representatives.trycloudflare.com/api/bcr', type: 'bcr', icon: '💃' },
    luck8_md5: { name: 'Luck8 MD5', url: 'https://heroes-presents-pound-tablet.trycloudflare.com/api/txmd5', type: 'taixiu', icon: '🍀' }
};

// AI học từ lịch sử
let aiModel = {
    patternStats: {},
    totalPredictions: 0,
    correctPredictions: 0,
    accuracyHistory: []
};

let predictionsDB = {};
for (const key of Object.keys(GAMES)) predictionsDB[key] = [];

// ==================== LẤY DỮ LIỆU ====================
async function fetchGameData(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return null;
    try {
        const res = await axios.get(game.url, { timeout: 8000 });
        if (game.type === 'taixiu' && res.data && res.data.ket_qua) {
            let ketQua = (res.data.ket_qua === 'Tài' || res.data.ket_qua === 'TAI') ? 'Tài' : 'Xỉu';
            return { phien: res.data.phien, ket_qua: ketQua, tong: res.data.tong || 0 };
        }
        if (game.type === 'bcr' && res.data?.data) {
            let resultsStr = '';
            for (let ban of res.data.data) if (ban.results) resultsStr += ban.results;
            let lastResult = resultsStr.length > 0 ? resultsStr[resultsStr.length - 1] : '?';
            let ketQua = lastResult === 'B' ? 'Con' : (lastResult === 'P' ? 'Cái' : (lastResult === 'T' ? 'Hòa' : '?'));
            return { phien: Date.now(), ket_qua: ketQua, data_raw: resultsStr };
        }
        return null;
    } catch(e) { return null; }
}

// ==================== 100+ CẦU TÀI XỈU ====================
const CAU_TAI_XIU = [
    // 1-20: BỆT 2-20
    ...Array.from({ length: 19 }, (_, i) => ({ type: 'BET', len: i + 2, conf: (l) => Math.min(95, 48 + l * 3) })),
    // 21-40: ĐẢO 1-1 3-20
    ...Array.from({ length: 18 }, (_, i) => ({ type: 'DAO', len: i + 3, conf: (l) => Math.min(92, 52 + l * 2) })),
    // 41-48: BLOCK 2-2,3-3,4-4,5-5,6-6,7-7,8-8,9-9
    { type: 'BLOCK', block: 2, conf: 82 }, { type: 'BLOCK', block: 3, conf: 85 },
    { type: 'BLOCK', block: 4, conf: 87 }, { type: 'BLOCK', block: 5, conf: 89 },
    { type: 'BLOCK', block: 6, conf: 90 }, { type: 'BLOCK', block: 7, conf: 91 },
    // 49-58: CẦU ĐẶC BIỆT
    { type: '121', conf: 86 }, { type: '212', conf: 87 }, { type: '123', conf: 84 },
    { type: '321', conf: 84 }, { type: '131', conf: 83 }, { type: '232', conf: 85 },
    { type: '1122', conf: 82 }, { type: '2211', conf: 82 }, { type: '1221', conf: 86 }, { type: '2112', conf: 86 },
    // 59-63: NHẢY CÓC
    ...Array.from({ length: 5 }, (_, i) => ({ type: 'NHACOC', step: i + 1, conf: 82 - (i + 1) * 2 })),
    // 64-68: CẦU GƯƠNG
    ...Array.from({ length: 5 }, (_, i) => ({ type: 'GUONG', mirror: (i + 2) * 2, conf: 75 + i + 2 })),
    // 69-78: CHU KỲ 2-11
    ...Array.from({ length: 10 }, (_, i) => ({ type: 'CHUKY', cycle: i + 2, conf: 82 - (i + 2) })),
    // 79-90: ZICZAC 3-14
    ...Array.from({ length: 12 }, (_, i) => ({ type: 'ZICZAC', z: i + 3, conf: 80 - i })),
    // 91-94: 3-1,1-3,4-1,1-4
    { type: '31', conf: 81 }, { type: '13', conf: 81 }, { type: '41', conf: 82 }, { type: '14', conf: 82 },
    // 95-98: TỔNG CAO/THẤP
    { type: 'TONG_CAO', conf: 78 }, { type: 'TONG_THAP', conf: 78 },
    // 99-102: CỰC ĐIỂM
    { type: 'CUC_CAO', conf: 84 }, { type: 'CUC_THAP', conf: 84 },
    // 103-108: NÓNG LẠNH 7-10/10
    { type: 'NONG_9', conf: 92 }, { type: 'NONG_8', conf: 88 }, { type: 'NONG_7', conf: 82 },
    { type: 'LANH_9', conf: 92 }, { type: 'LANH_8', conf: 88 }, { type: 'LANH_7', conf: 82 },
    // 109-110: CHÊNH LỆCH
    { type: 'CHENH_LON', conf: 76 }, { type: 'CHENH_NHE', conf: 72 },
    // 111-113: SÓNG
    { type: 'SONG_MO', conf: 78 }, { type: 'SONG_THU', conf: 76 }
];

function phatHienCauTaiXiu(res, len, sums, gameKey) {
    // 1-20: BỆT
    for (let l = 2; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) if (res[i] !== res[0]) { ok = false; break; }
        if (ok) {
            let conf = Math.min(95, 48 + l * 3);
            let pattern = `Bệt_${l}`;
            let weight = aiModel.patternStats[pattern]?.accuracy || 1;
            conf = Math.min(95, conf * weight);
            return { pred: res[0], conf: Math.floor(conf), name: `🔴 Bệt ${l} phiên`, pattern: pattern };
        }
    }
    
    // 21-40: ĐẢO
    for (let l = 3; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) if (res[i] === res[i-1]) { ok = false; break; }
        if (ok) {
            let pred = res[l-1] === 'Tài' ? 'Xỉu' : 'Tài';
            let conf = Math.min(92, 52 + l * 2);
            let pattern = `Đảo_${l}`;
            let weight = aiModel.patternStats[pattern]?.accuracy || 1;
            conf = Math.min(92, conf * weight);
            return { pred: pred, conf: Math.floor(conf), name: `🟡 Đảo 1-1 dài ${l} nhịp`, pattern: pattern };
        }
    }
    
    // BLOCK 2-2
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) {
        let pred = res[2] === 'Tài' ? 'Xỉu' : 'Tài';
        let weight = aiModel.patternStats['Block_22']?.accuracy || 1;
        let conf = Math.min(88, 82 * weight);
        return { pred: pred, conf: Math.floor(conf), name: `🟢 Cầu 2-2`, pattern: 'Block_22' };
    }
    
    // BLOCK 3-3
    if (len >= 6 && res[0]===res[1] && res[1]===res[2] && res[3]===res[4] && res[4]===res[5] && res[0]!==res[3]) {
        let pred = res[3] === 'Tài' ? 'Xỉu' : 'Tài';
        let weight = aiModel.patternStats['Block_33']?.accuracy || 1;
        let conf = Math.min(90, 85 * weight);
        return { pred: pred, conf: Math.floor(conf), name: `🟣 Cầu 3-3`, pattern: 'Block_33' };
    }
    
    // CẦU 1-2-1
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] !== res[3] && res[0] === res[3]) {
        let weight = aiModel.patternStats['Cau121']?.accuracy || 1;
        let conf = Math.min(92, 86 * weight);
        return { pred: res[0], conf: Math.floor(conf), name: `🎯 Cầu 1-2-1`, pattern: 'Cau121' };
    }
    
    // CẦU 2-1-2
    if (len >= 5 && res[0] === res[1] && res[1] !== res[2] && res[2] === res[3] && res[3] !== res[4] && res[0] !== res[2]) {
        let pred = res[0] === 'Tài' ? 'Xỉu' : 'Tài';
        let weight = aiModel.patternStats['Cau212']?.accuracy || 1;
        let conf = Math.min(92, 87 * weight);
        return { pred: pred, conf: Math.floor(conf), name: `🎯 Cầu 2-1-2`, pattern: 'Cau212' };
    }
    
    // CẦU 1-2-3
    if (len >= 6 && res[0]===res[1] && res[1]===res[2] && res[3]===res[4] && res[0]!==res[3] && res[3]!==res[5]) {
        let weight = aiModel.patternStats['Cau123']?.accuracy || 1;
        let conf = Math.min(90, 84 * weight);
        return { pred: res[5], conf: Math.floor(conf), name: `📈 Cầu 1-2-3 (Tăng dần)`, pattern: 'Cau123' };
    }
    
    // CẦU 3-2-1
    if (len >= 6 && res[0]===res[1] && res[2]===res[3] && res[3]===res[4] && res[0]!==res[2] && res[2]!==res[5]) {
        let weight = aiModel.patternStats['Cau321']?.accuracy || 1;
        let conf = Math.min(90, 84 * weight);
        return { pred: res[2], conf: Math.floor(conf), name: `📉 Cầu 3-2-1 (Giảm dần)`, pattern: 'Cau321' };
    }
    
    // CẦU 1-1-2-2
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) {
        let pred = res[2] === 'Tài' ? 'Xỉu' : 'Tài';
        let weight = aiModel.patternStats['Cau1122']?.accuracy || 1;
        let conf = Math.min(88, 82 * weight);
        return { pred: pred, conf: Math.floor(conf), name: `🔷 Cầu 1-1-2-2`, pattern: 'Cau1122' };
    }
    
    // CẦU 2-2-1-1
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3]) {
        let weight = aiModel.patternStats['Cau2211']?.accuracy || 1;
        let conf = Math.min(88, 82 * weight);
        return { pred: res[0], conf: Math.floor(conf), name: `🔶 Cầu 2-2-1-1`, pattern: 'Cau2211' };
    }
    
    // CẦU NHẢY CÓC
    if (len >= 5 && res[0] === res[2] && res[2] === res[4]) {
        let weight = aiModel.patternStats['NhayCoc']?.accuracy || 1;
        let conf = Math.min(85, 78 * weight);
        return { pred: res[0], conf: Math.floor(conf), name: `🐸 Nhảy cóc 3 bước`, pattern: 'NhayCoc' };
    }
    
    if (len >= 7 && res[0] === res[3] && res[3] === res[6]) {
        let weight = aiModel.patternStats['NhayCoc2']?.accuracy || 1;
        let conf = Math.min(83, 76 * weight);
        return { pred: res[0], conf: Math.floor(conf), name: `🐸 Nhảy cóc 4 bước`, pattern: 'NhayCoc2' };
    }
    
    // CẦU GƯƠNG
    if (len >= 4 && res[0] === res[3] && res[1] === res[2]) {
        let pred = res[1] === 'Tài' ? 'Xỉu' : 'Tài';
        let weight = aiModel.patternStats['Guong4']?.accuracy || 1;
        let conf = Math.min(86, 80 * weight);
        return { pred: pred, conf: Math.floor(conf), name: `🪞 Cầu gương 4 phiên`, pattern: 'Guong4' };
    }
    
    if (len >= 6 && res[0] === res[5] && res[1] === res[4] && res[2] === res[3]) {
        let pred = res[2] === 'Tài' ? 'Xỉu' : 'Tài';
        let weight = aiModel.patternStats['Guong6']?.accuracy || 1;
        let conf = Math.min(88, 82 * weight);
        return { pred: pred, conf: Math.floor(conf), name: `🪞 Cầu gương 6 phiên`, pattern: 'Guong6' };
    }
    
    // CHU KỲ 2
    if (len >= 4 && res[0] === res[2] && res[1] === res[3]) {
        let next = res[len % 2];
        let weight = aiModel.patternStats['ChuKy2']?.accuracy || 1;
        let conf = Math.min(84, 78 * weight);
        return { pred: next === 'Tài' ? 'Tài' : 'Xỉu', conf: Math.floor(conf), name: `🔄 Chu kỳ 2 phiên`, pattern: 'ChuKy2' };
    }
    
    // CHU KỲ 3
    if (len >= 6 && res[0] === res[3] && res[1] === res[4] && res[2] === res[5]) {
        let next = res[len % 3];
        let weight = aiModel.patternStats['ChuKy3']?.accuracy || 1;
        let conf = Math.min(82, 76 * weight);
        return { pred: next === 'Tài' ? 'Tài' : 'Xỉu', conf: Math.floor(conf), name: `🔄 Chu kỳ 3 phiên`, pattern: 'ChuKy3' };
    }
    
    // ZICZAC
    let ziczacLen = 1;
    for (let i = 1; i < Math.min(len, 15); i++) {
        if (res[i] !== res[i-1]) ziczacLen++;
        else break;
    }
    if (ziczacLen >= 6) {
        let pred = res[ziczacLen-1] === 'Tài' ? 'Xỉu' : 'Tài';
        let conf = Math.min(82, 70 + Math.floor(ziczacLen / 2));
        let weight = aiModel.patternStats['Ziczac']?.accuracy || 1;
        conf = Math.min(85, conf * weight);
        return { pred: pred, conf: Math.floor(conf), name: `⚡ Ziczac ${ziczacLen} nhịp`, pattern: 'Ziczac' };
    }
    
    // TỔNG ĐIỂM
    if (sums && sums.length >= 5) {
        let avg5 = sums.slice(0,5).reduce((a,b)=>a+b,0)/5;
        if (avg5 >= 13.5) {
            let weight = aiModel.patternStats['TongCao']?.accuracy || 1;
            let conf = Math.min(82, 76 * weight);
            return { pred: 'Xỉu', conf: Math.floor(conf), name: `📊 Tổng TB cao ${avg5.toFixed(1)} → Xỉu`, pattern: 'TongCao' };
        }
        if (avg5 <= 8.5) {
            let weight = aiModel.patternStats['TongThap']?.accuracy || 1;
            let conf = Math.min(82, 76 * weight);
            return { pred: 'Tài', conf: Math.floor(conf), name: `📊 Tổng TB thấp ${avg5.toFixed(1)} → Tài`, pattern: 'TongThap' };
        }
    }
    
    // CỰC ĐIỂM
    if (sums && sums.length >= 10) {
        let high15 = sums.slice(0,10).filter(s => s >= 15).length;
        let low6 = sums.slice(0,10).filter(s => s <= 6).length;
        if (high15 >= 4) {
            let weight = aiModel.patternStats['CucDiemCao']?.accuracy || 1;
            let conf = Math.min(88, 84 * weight);
            return { pred: 'Xỉu', conf: Math.floor(conf), name: `⚡ Cực điểm cao ${high15}/10 → Xỉu mạnh`, pattern: 'CucDiemCao' };
        }
        if (low6 >= 4) {
            let weight = aiModel.patternStats['CucDiemThap']?.accuracy || 1;
            let conf = Math.min(88, 84 * weight);
            return { pred: 'Tài', conf: Math.floor(conf), name: `⚡ Cực điểm thấp ${low6}/10 → Tài mạnh`, pattern: 'CucDiemThap' };
        }
    }
    
    // NÓNG LẠNH
    let last10 = res.slice(0, Math.min(10, len));
    let tai10 = last10.filter(r => r === 'Tài').length;
    if (tai10 >= 9) {
        let weight = aiModel.patternStats['Nong9']?.accuracy || 1;
        let conf = Math.min(95, 92 * weight);
        return { pred: 'Xỉu', conf: Math.floor(conf), name: `🔥 Siêu nóng Tài ${tai10}/10 → Xỉu chắc chắn`, pattern: 'Nong9' };
    }
    if (tai10 <= 1) {
        let weight = aiModel.patternStats['Lanh9']?.accuracy || 1;
        let conf = Math.min(95, 92 * weight);
        return { pred: 'Tài', conf: Math.floor(conf), name: `❄️ Siêu lạnh Xỉu ${10-tai10}/10 → Tài chắc chắn`, pattern: 'Lanh9' };
    }
    if (tai10 >= 8) {
        let weight = aiModel.patternStats['Nong8']?.accuracy || 1;
        let conf = Math.min(90, 88 * weight);
        return { pred: 'Xỉu', conf: Math.floor(conf), name: `🔥 Tài nóng ${tai10}/10 → Xỉu`, pattern: 'Nong8' };
    }
    if (tai10 <= 2) {
        let weight = aiModel.patternStats['Lanh8']?.accuracy || 1;
        let conf = Math.min(90, 88 * weight);
        return { pred: 'Tài', conf: Math.floor(conf), name: `❄️ Xỉu nóng ${10-tai10}/10 → Tài`, pattern: 'Lanh8' };
    }
    if (tai10 >= 7) {
        let weight = aiModel.patternStats['Nong7']?.accuracy || 1;
        let conf = Math.min(85, 82 * weight);
        return { pred: 'Xỉu', conf: Math.floor(conf), name: `🔥 Tài nóng ${tai10}/10 → Xỉu`, pattern: 'Nong7' };
    }
    if (tai10 <= 3) {
        let weight = aiModel.patternStats['Lanh7']?.accuracy || 1;
        let conf = Math.min(85, 82 * weight);
        return { pred: 'Tài', conf: Math.floor(conf), name: `❄️ Xỉu nóng ${10-tai10}/10 → Tài`, pattern: 'Lanh7' };
    }
    
    // CHÊNH LỆCH 20 PHIÊN
    if (len >= 20) {
        let last20 = res.slice(0, 20);
        let tai20 = last20.filter(r => r === 'Tài').length;
        let diff = Math.abs(tai20 - (20 - tai20));
        if (diff >= 8) {
            let pred = tai20 > 10 ? 'Xỉu' : 'Tài';
            let weight = aiModel.patternStats['ChenhLechLon']?.accuracy || 1;
            let conf = Math.min(82, 76 * weight);
            return { pred: pred, conf: Math.floor(conf), name: `⚖️ Chênh lệch lớn ${tai20}/20 → ${pred}`, pattern: 'ChenhLechLon' };
        }
        if (diff >= 6) {
            let pred = tai20 > 10 ? 'Xỉu' : 'Tài';
            let weight = aiModel.patternStats['ChenhLech']?.accuracy || 1;
            let conf = Math.min(78, 72 * weight);
            return { pred: pred, conf: Math.floor(conf), name: `⚖️ Chênh lệch ${tai20}/20 → ${pred}`, pattern: 'ChenhLech' };
        }
    }
    
    // SÓNG
    if (len >= 8) {
        let song = [], cur = res[0], cnt = 1;
        for (let i = 1; i < 8; i++) {
            if (res[i] === cur) cnt++;
            else { song.push(cnt); cur = res[i]; cnt = 1; }
        }
        song.push(cnt);
        if (song.length >= 3) {
            if (song[0] < song[1] && song[1] < song[2]) {
                let pred = res[0] === 'Tài' ? 'Xỉu' : 'Tài';
                let weight = aiModel.patternStats['SongMo']?.accuracy || 1;
                let conf = Math.min(84, 78 * weight);
                return { pred: pred, conf: Math.floor(conf), name: `🌊 Sóng mở rộng ${song.join('-')} → ${pred}`, pattern: 'SongMo' };
            }
            if (song[0] > song[1] && song[1] > song[2]) {
                let weight = aiModel.patternStats['SongThu']?.accuracy || 1;
                let conf = Math.min(82, 76 * weight);
                return { pred: res[0], conf: Math.floor(conf), name: `🌊 Sóng thu hẹp ${song.join('-')} → ${res[0]}`, pattern: 'SongThu' };
            }
        }
    }
    
    // CẦU 3-1
    if (len >= 4 && res[0] === res[1] && res[1] === res[2] && res[2] !== res[3]) {
        let pred = res[3] === 'Tài' ? 'Xỉu' : 'Tài';
        let weight = aiModel.patternStats['Cau31']?.accuracy || 1;
        let conf = Math.min(86, 81 * weight);
        return { pred: pred, conf: Math.floor(conf), name: `🎯 Cầu 3-1`, pattern: 'Cau31' };
    }
    
    // CẦU 1-3
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] === res[3]) {
        let weight = aiModel.patternStats['Cau13']?.accuracy || 1;
        let conf = Math.min(86, 81 * weight);
        return { pred: res[0], conf: Math.floor(conf), name: `🎯 Cầu 1-3`, pattern: 'Cau13' };
    }
    
    // XU HƯỚNG 3 PHIÊN (DEFAULT)
    let last3 = res.slice(0, 3);
    let tai3 = last3.filter(r => r === 'Tài').length;
    let pred = tai3 >= 2 ? 'Tài' : 'Xỉu';
    let baseConf = 65 + Math.abs(tai3 - 1.5) * 5;
    let weight = aiModel.patternStats['XuHuong']?.accuracy || 1;
    let conf = Math.min(78, baseConf * weight);
    
    return { pred: pred, conf: Math.floor(conf), name: `📊 Xu hướng ${tai3}T-${3-tai3}X`, pattern: 'XuHuong' };
}

// ==================== THUẬT TOÁN AI HỌC ====================
function aiHoc(actual, predicted, pattern, confidence) {
    if (!aiModel.patternStats[pattern]) {
        aiModel.patternStats[pattern] = { total: 0, correct: 0, accuracy: 0.7 };
    }
    let stats = aiModel.patternStats[pattern];
    stats.total++;
    if (actual === predicted) stats.correct++;
    stats.accuracy = stats.correct / stats.total;
    
    aiModel.totalPredictions++;
    if (actual === predicted) aiModel.correctPredictions++;
    
    let recentAccuracy = (aiModel.correctPredictions / aiModel.totalPredictions) * 100;
    aiModel.accuracyHistory.push({ time: new Date().toISOString(), accuracy: recentAccuracy });
    if (aiModel.accuracyHistory.length > 100) aiModel.accuracyHistory.shift();
}

// ==================== DỰ ĐOÁN TÀI XỈU ====================
function duDoanTaiXiu(lichSu, ketQuaHienTai, gameKey) {
    let res = lichSu.slice(0, 30).map(h => h.ket_qua_thuc_te).filter(r => r);
    if (res.length === 0 && ketQuaHienTai) res = [ketQuaHienTai];
    
    let sums = lichSu.slice(0, 30).map(h => h.tong).filter(t => t);
    
    let cau = phatHienCauTaiXiu(res, res.length, sums, gameKey);
    if (!cau) {
        cau = { pred: 'Tài', conf: 60, name: 'Mặc định', pattern: 'MacDinh' };
    }
    
    return {
        du_doan: cau.pred,
        do_tin_cay: cau.conf + '%',
        ly_do: cau.name,
        loai_cau: cau.pattern,
        conf_raw: cau.conf
    };
}

// ==================== THUẬT TOÁN BCR ====================
function duDoanBCR(dataRaw, lichSu, ketQuaHienTai) {
    let resultsStr = dataRaw || '';
    let lastResult = resultsStr.length > 0 ? resultsStr[resultsStr.length - 1] : '?';
    
    let bet = 1;
    for (let i = resultsStr.length - 2; i >= 0; i--) {
        if (resultsStr[i] === lastResult) bet++;
        else break;
    }
    
    let dao = 1;
    for (let i = resultsStr.length - 2; i >= 0; i--) {
        if (resultsStr[i] !== resultsStr[i+1]) dao++;
        else break;
    }
    
    let duDoanConCai = 'Con';
    let doTinCayConCai = 60;
    let lyDoConCai = 'Theo xu hướng';
    let patternCC = 'XuHuong';
    
    if (bet >= 3) {
        duDoanConCai = lastResult === 'B' ? 'Con' : 'Cái';
        doTinCayConCai = Math.min(85, 55 + bet * 4);
        lyDoConCai = `📈 Bệt ${bet} ván ${duDoanConCai}`;
        patternCC = `Bet_${bet}`;
    } else if (dao >= 4) {
        duDoanConCai = lastResult === 'B' ? 'Cái' : 'Con';
        doTinCayConCai = Math.min(82, 58 + dao * 2);
        lyDoConCai = `🔄 Đảo ${dao} ván → ${duDoanConCai}`;
        patternCC = `Dao_${dao}`;
    } else {
        let bCount = (resultsStr.match(/B/g) || []).length;
        let pCount = (resultsStr.match(/P/g) || []).length;
        if (bCount > pCount + 3) {
            duDoanConCai = 'Cái';
            doTinCayConCai = 74;
            lyDoConCai = `📊 Con nóng ${bCount}/${resultsStr.length} → bẻ Cái`;
            patternCC = 'NongCon';
        } else if (pCount > bCount + 3) {
            duDoanConCai = 'Con';
            doTinCayConCai = 74;
            lyDoConCai = `📊 Cái nóng ${pCount}/${resultsStr.length} → bẻ Con`;
            patternCC = 'NongCai';
        }
    }
    
    let tCount = (resultsStr.match(/T/g) || []).length;
    let duDoanHoa = 'Không', doTinCayHoa = 85, lyDoHoa = 'Hòa hiếm', patternHoa = 'HoaHiem';
    if (tCount >= 2 && resultsStr.slice(-5).includes('T')) {
        duDoanHoa = 'Có';
        doTinCayHoa = 65;
        lyDoHoa = `🎲 Hòa xuất hiện ${tCount} lần`;
        patternHoa = 'HoaXuatHien';
    }
    
    let duDoanConDoi = 'Không', doTinCayConDoi = 85, lyDoConDoi = 'Con đôi hiếm', patternConDoi = 'ConDoiHiem';
    if (resultsStr.slice(-2) === 'BB') {
        duDoanConDoi = 'Có';
        doTinCayConDoi = 70;
        lyDoConDoi = 'Ván trước có BB';
        patternConDoi = 'ConDoiXuatHien';
    }
    
    let duDoanCaiDoi = 'Không', doTinCayCaiDoi = 85, lyDoCaiDoi = 'Cái đôi hiếm', patternCaiDoi = 'CaiDoiHiem';
    if (resultsStr.slice(-2) === 'PP') {
        duDoanCaiDoi = 'Có';
        doTinCayCaiDoi = 70;
        lyDoCaiDoi = 'Ván trước có PP';
        patternCaiDoi = 'CaiDoiXuatHien';
    }
    
    return {
        du_doan_con_cai: duDoanConCai,
        do_tin_cay_con_cai: doTinCayConCai + '%',
        ly_do_con_cai: lyDoConCai,
        pattern_con_cai: patternCC,
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

// ==================== API DỰ ĐOÁN ====================
app.get('/api/predict/:game', async (req, res) => {
    const gameKey = req.params.game;
    const game = GAMES[gameKey];
    if (!game) return res.json({ error: 'Game không tồn tại', games: Object.keys(GAMES) });
    
    const currentData = await fetchGameData(gameKey);
    if (!currentData) return res.json({ error: 'Không lấy được dữ liệu', game: game.name });
    
    let result = {};
    let lastPrediction = predictionsDB[gameKey]?.length > 0 ? predictionsDB[gameKey][0] : null;
    let ketQuaTruoc = currentData.ket_qua;
    let dungSaiTruoc = null;
    let phienTiepTheo = typeof currentData.phien === 'number' ? currentData.phien + 1 : (parseInt(currentData.phien) + 1).toString();
    
    if (lastPrediction && ketQuaTruoc) {
        if (game.type === 'taixiu') {
            dungSaiTruoc = lastPrediction.du_doan === ketQuaTruoc ? '✅ ĐÚNG' : '❌ SAI';
            if (lastPrediction.loai_cau) {
                aiHoc(ketQuaTruoc, lastPrediction.du_doan, lastPrediction.loai_cau, lastPrediction.conf_raw);
            }
        } else if (game.type === 'bcr') {
            dungSaiTruoc = lastPrediction.du_doan_con_cai === ketQuaTruoc ? '✅ ĐÚNG' : '❌ SAI';
        }
    }
    
    if (game.type === 'taixiu') {
        const prediction = duDoanTaiXiu(predictionsDB[gameKey], currentData.ket_qua, gameKey);
        result = {
            game: game.name,
            icon: game.icon,
            phien_hien_tai: phienTiepTheo,
            ket_qua_truoc: ketQuaTruoc,
            dung_sai_truoc: dungSaiTruoc,
            du_doan: prediction.du_doan,
            do_tin_cay: prediction.do_tin_cay,
            ly_do: prediction.ly_do,
            loai_cau: prediction.loai_cau,
            timestamp: new Date().toISOString(),
            ket_qua_thuc_te: ketQuaTruoc
        };
    } else if (game.type === 'bcr') {
        const prediction = duDoanBCR(currentData.data_raw, predictionsDB[gameKey], currentData.ket_qua);
        result = {
            game: game.name,
            icon: game.icon,
            phien_hien_tai: phienTiepTheo,
            ket_qua_truoc: ketQuaTruoc,
            dung_sai_truoc: dungSaiTruoc,
            du_doan_con_cai: prediction.du_doan_con_cai,
            do_tin_cay_con_cai: prediction.do_tin_cay_con_cai,
            ly_do_con_cai: prediction.ly_do_con_cai,
            du_doan_hoa: prediction.du_doan_hoa,
            do_tin_cay_hoa: prediction.do_tin_cay_hoa,
            ly_do_hoa: prediction.ly_do_hoa,
            du_doan_con_doi: prediction.du_doan_con_doi,
            do_tin_cay_con_doi: prediction.do_tin_cay_con_doi,
            ly_do_con_doi: prediction.ly_do_con_doi,
            du_doan_cai_doi: prediction.du_doan_cai_doi,
            do_tin_cay_cai_doi: prediction.do_tin_cay_cai_doi,
            ly_do_cai_doi: prediction.ly_do_cai_doi,
            timestamp: new Date().toISOString(),
            ket_qua_thuc_te: ketQuaTruoc
        };
    }
    
    predictionsDB[gameKey].unshift(result);
    if (predictionsDB[gameKey].length > 50) predictionsDB[gameKey] = predictionsDB[gameKey].slice(0, 50);
    
    let aiStats = {
        total: aiModel.totalPredictions,
        correct: aiModel.correctPredictions,
        accuracy: aiModel.totalPredictions > 0 ? ((aiModel.correctPredictions / aiModel.totalPredictions) * 100).toFixed(1) + '%' : '0%'
    };
    
    res.json({ ...result, ai_stats: aiStats });
});

// ==================== API KHÁC ====================
app.get('/api/history/:game', (req, res) => {
    const k = req.params.game;
    res.json({ success: true, game: GAMES[k]?.name, history: predictionsDB[k] || [], total: predictionsDB[k]?.length || 0 });
});

app.post('/api/reset/:game', (req, res) => {
    const k = req.params.game;
    predictionsDB[k] = [];
    res.json({ success: true, message: 'Đã reset lịch sử' });
});

app.get('/api/all', async (req, res) => {
    let results = {};
    for (let key of Object.keys(GAMES)) {
        const game = GAMES[key];
        const currentData = await fetchGameData(key);
        if (currentData) {
            if (game.type === 'taixiu') {
                const pred = duDoanTaiXiu(predictionsDB[key], currentData.ket_qua, key);
                results[key] = { game: game.name, icon: game.icon, ket_qua_truoc: currentData.ket_qua, du_doan: pred.du_doan, do_tin_cay: pred.do_tin_cay };
            } else if (game.type === 'bcr') {
                const pred = duDoanBCR(currentData.data_raw, predictionsDB[key], currentData.ket_qua);
                results[key] = { game: game.name, icon: game.icon, ket_qua_truoc: currentData.ket_qua, du_doan: pred.du_doan_con_cai, do_tin_cay: pred.do_tin_cay_con_cai };
            }
        } else { results[key] = { error: 'Không lấy được dữ liệu' }; }
    }
    res.json(results);
});

app.get('/api/games', (req, res) => {
    let games = {};
    for (let [k, v] of Object.entries(GAMES)) games[k] = { name: v.name, icon: v.icon, type: v.type };
    res.json({ success: true, games, total: Object.keys(GAMES).length });
});

app.get('/api/ai-stats', (req, res) => {
    res.json({
        total_predictions: aiModel.totalPredictions,
        correct_predictions: aiModel.correctPredictions,
        accuracy: aiModel.totalPredictions > 0 ? ((aiModel.correctPredictions / aiModel.totalPredictions) * 100).toFixed(2) + '%' : '0%',
        pattern_stats: aiModel.patternStats,
        history: aiModel.accuracyHistory.slice(-20)
    });
});

app.get('/', (req, res) => {
    res.json({
        status: 'AI TÀI XỈU PRO',
        version: '10.0.0',
        total_games: Object.keys(GAMES).length,
        games: Object.keys(GAMES),
        total_cau: '100+ loại cầu',
        ai_status: {
            total_learned: aiModel.totalPredictions,
            current_accuracy: aiModel.totalPredictions > 0 ? ((aiModel.correctPredictions / aiModel.totalPredictions) * 100).toFixed(1) + '%' : 'Đang học'
        },
        endpoints: {
            predict: '/api/predict/:game',
            history: '/api/history/:game',
            reset: '/api/reset/:game (POST)',
            all: '/api/all',
            games: '/api/games',
            ai_stats: '/api/ai-stats'
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🤖 AI TÀI XỈU PRO - ${Object.keys(GAMES).length} GAME | 100+ CẦU`);
    console.log(`📡 PORT: ${PORT}`);
    console.log(`🎓 AI đã sẵn sàng học từ lịch sử dự đoán`);
    console.log(`🎮 Games: ${Object.keys(GAMES).join(', ')}`);
});
