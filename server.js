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
        name: 'LC79 Tài Xỉu',
        url: 'https://wtx.tele68.com/v1/tx/sessions',
        type: 'tele68',
        icon: '🎲'
    },
    lc79_md5: {
        name: 'LC79 MD5',
        url: 'https://wtxmd52.tele68.com/v1/txmd5/sessions',
        type: 'tele68',
        icon: '🔐'
    },
    betvip_tx: {
        name: 'BETVIP Tài Xỉu',
        url: 'https://wtx.macminim6.online/v1/tx/sessions',
        type: 'tele68',
        icon: '🎰'
    },
    betvip_md5: {
        name: 'BETVIP MD5',
        url: 'https://wtxmd52.macminim6.online/v1/txmd5/sessions',
        type: 'tele68',
        icon: '🔒'
    },
    xocdia88_tx: {
        name: 'XocDia88 Tài Xỉu',
        url: 'https://taixiu.system32-cloudfare-356783752985678522.monster/api/luckydice/GetSoiCau',
        type: 'xocdia',
        icon: '🎯'
    },
    xocdia88_md5: {
        name: 'XocDia88 MD5',
        url: 'https://taixiumd5.system32-cloudfare-356783752985678522.monster/api/md5luckydice/GetSoiCau',
        type: 'xocdia',
        icon: '🛡️'
    },
    hitclub: {
        name: 'HITCLUB',
        url: 'https://sun-win.onrender.com/api/history',
        type: 'sun',
        icon: '🏆'
    },
    b52: {
        name: 'B52',
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
        
        if (game.type === 'tele68' && res.data && res.data.list) {
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
        if (game.type === 'sun' && res.data && res.data.taixiu) {
            return res.data.taixiu.map(item => ({
                phien: item.Phien,
                ket_qua: item.Ket_qua === 'Tài' ? 'T' : 'X',
                tong: item.Tong
            }));
        }
        if (game.type === 'b52' && res.data && res.data.data) {
            return res.data.data.map(item => ({
                phien: item.Phien,
                ket_qua: item.Ket_qua === 'Tài' ? 'T' : 'X',
                tong: item.Tong
            }));
        }
        return null;
    } catch(e) {
        return null;
    }
}

// ==================== THUẬT TOÁN DỰ ĐOÁN ====================
function duDoan(history) {
    if (!history || history.length < 3) {
        return { du_doan: 'Tài', do_tin_cay: 50, ly_do: 'Chua du 3 phien' };
    }

    const res = history.map(h => h.ket_qua);
    const len = res.length;

    // Bet
    for (let l = 2; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) {
            if (res[i] !== res[0]) { ok = false; break; }
        }
        if (ok) {
            let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
            let conf = Math.min(95, 48 + l * 2.8);
            return { du_doan: pred, do_tin_cay: Math.floor(conf), ly_do: `Bet ${l} phien → ${pred}` };
        }
    }

    // Dao 1-1
    for (let l = 3; l <= 20; l++) {
        if (len < l) continue;
        let ok = true;
        for (let i = 1; i < l; i++) {
            if (res[i] === res[i-1]) { ok = false; break; }
        }
        if (ok) {
            let pred = res[l-1] === 'T' ? 'Xỉu' : 'Tài';
            let conf = Math.min(92, 52 + l * 2);
            return { du_doan: pred, do_tin_cay: Math.floor(conf), ly_do: `Dao 1-1 dai ${l} → ${pred}` };
        }
    }

    // Cau 2-2
    if (len >= 4 && res[0] === res[1] && res[2] === res[3] && res[0] !== res[2]) {
        let pred = res[2] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 82, ly_do: `Cau 2-2 → ${pred}` };
    }

    // Cau 3-3
    if (len >= 6 && res[0] === res[1] && res[1] === res[2] && res[3] === res[4] && res[4] === res[5] && res[0] !== res[3]) {
        let pred = res[3] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 85, ly_do: `Cau 3-3 → ${pred}` };
    }

    // Cau 1-2-1
    if (len >= 4 && res[0] !== res[1] && res[1] === res[2] && res[2] !== res[3] && res[0] === res[3]) {
        let pred = res[0] === 'T' ? 'Tài' : 'Xỉu';
        return { du_doan: pred, do_tin_cay: 86, ly_do: `Cau 1-2-1 → ${pred}` };
    }

    // Cau 2-1-2
    if (len >= 5 && res[0] === res[1] && res[1] !== res[2] && res[2] === res[3] && res[3] !== res[4] && res[0] !== res[2]) {
        let pred = res[0] === 'T' ? 'Xỉu' : 'Tài';
        return { du_doan: pred, do_tin_cay: 87, ly_do: `Cau 2-1-2 → ${pred}` };
    }

    // Nong lanh
    let last10 = res.slice(0, Math.min(10, len));
    let tai10 = last10.filter(r => r === 'T').length;
    if (tai10 >= 8) return { du_doan: 'Xỉu', do_tin_cay: 84, ly_do: `Tai nong ${tai10}/10 → Xiu` };
    if (tai10 <= 2) return { du_doan: 'Tài', do_tin_cay: 84, ly_do: `Xiu nong ${10-tai10}/10 → Tai` };
    if (tai10 >= 7) return { du_doan: 'Xỉu', do_tin_cay: 78, ly_do: `Tai nong ${tai10}/10 → Xiu` };
    if (tai10 <= 3) return { du_doan: 'Tài', do_tin_cay: 78, ly_do: `Xiu nong ${10-tai10}/10 → Tai` };

    // Xu huong 3 phien
    let last3 = res.slice(0, 3);
    let tai3 = last3.filter(r => r === 'T').length;
    let pred = tai3 >= 2 ? 'Tài' : 'Xỉu';
    return { du_doan: pred, do_tin_cay: 64, ly_do: `Xu huong ${tai3}T-${3-tai3}X` };
}

// ==================== DỰ ĐOÁN ====================
async function layDuDoan(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return { success: false, error: 'Game not found' };
    
    const history = await fetchGameData(gameKey);
    if (!history || history.length === 0) {
        return { success: false, error: 'Cannot fetch data', game: game.name };
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
        ly_do: result.ly_do
    };
}

// ==================== API ====================
app.get('/api/predict/:game', async (req, res) => {
    const gameKey = req.params.game;
    if (!GAMES[gameKey]) {
        return res.status(404).json({ error: 'Game not found. Games: ' + Object.keys(GAMES).join(', ') });
    }
    const result = await layDuDoan(gameKey);
    res.json(result);
});

app.get('/api/history/:game', (req, res) => {
    const gameKey = req.params.game;
    if (!GAMES[gameKey]) {
        return res.status(404).json({ error: 'Game not found' });
    }
    res.json({
        success: true,
        game: GAMES[gameKey].name,
        icon: GAMES[gameKey].icon,
        history: predictionsDB[gameKey] || [],
        total: predictionsDB[gameKey] ? predictionsDB[gameKey].length : 0
    });
});

app.post('/api/reset/:game', (req, res) => {
    const gameKey = req.params.game;
    if (!GAMES[gameKey]) {
        return res.status(404).json({ error: 'Game not found' });
    }
    predictionsDB[gameKey] = [];
    saveHistory(gameKey);
    res.json({ success: true, game: GAMES[gameKey].name, message: 'History cleared' });
});

app.get('/api/all', async (req, res) => {
    let results = {};
    for (let key of Object.keys(GAMES)) {
        results[key] = await layDuDoan(key);
    }
    res.json(results);
});

app.get('/api/games', (req, res) => {
    let games = {};
    for (let [key, game] of Object.entries(GAMES)) {
        games[key] = { name: game.name, icon: game.icon };
    }
    res.json({ success: true, games });
});

// Giao dien web
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tai Xiu - 8 Game</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:system-ui;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);min-height:100vh;padding:20px;color:#fff}
        .container{max-width:1300px;margin:0 auto}
        h1{text-align:center;margin-bottom:10px;font-size:1.8rem;background:linear-gradient(135deg,#f093fb,#f5576c);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .sub{text-align:center;color:#aaa;margin-bottom:30px;font-size:.85rem}
        .games-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
        .game-card{background:rgba(255,255,255,0.08);border-radius:20px;padding:20px;backdrop-filter:blur(10px)}
        .game-header{font-size:1.2rem;font-weight:bold;margin-bottom:15px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.2)}
        .pred-box{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:15px;padding:15px;text-align:center;margin:15px 0}
        .pred-value{font-size:2rem;font-weight:800;margin:10px 0}
        .confidence{font-size:.8rem;opacity:.9}
        .reason{font-size:.7rem;margin-top:10px;opacity:.8;background:rgba(0,0,0,0.2);display:inline-block;padding:4px 12px;border-radius:20px}
        .phien{font-size:.7rem;margin-top:10px;color:#aaa}
        .btn{background:rgba(255,255,255,0.15);border:none;padding:8px;border-radius:25px;color:#fff;cursor:pointer;width:100%;margin-top:8px;font-size:.75rem}
        .btn:hover{background:rgba(255,255,255,0.3)}
        .btn-reset{background:rgba(239,68,68,0.3)}
        .btn-reset:hover{background:rgba(239,68,68,0.5)}
        .timer{text-align:center;margin-bottom:20px;font-size:.8rem;color:#aaa}
        .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 1s infinite;margin-right:6px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @media(max-width:640px){.games-grid{grid-template-columns:1fr}}
    </style>
</head>
<body>
<div class="container">
    <h1>🎲 TAI XIU - 8 GAME 🎲</h1>
    <div class="sub">28 loai cau | Du doan chinh xac</div>
    <div class="timer"><span class="dot"></span><span id="timerText">Dang tai...</span></div>
    <div class="games-grid" id="gamesGrid">Dang tai...</div>
</div>
<script>
    async function loadAll(){
        try{
            const res=await fetch('/api/all');
            const data=await res.json();
            let html='';
            for(const[key,val]of Object.entries(data)){
                if(!val.success){
                    html+='<div class="game-card"><div class="game-header">'+val.icon+' '+key+'</div><div style="color:#f87171">Loi: '+val.error+'</div></div>';
                    continue;
                }
                let color=val.du_doan==='Tai'?'#f87171':'#60a5fa';
                html+='<div class="game-card">';
                html+='<div class="game-header">'+val.icon+' '+val.game+'</div>';
                html+='<div class="pred-box">';
                html+='<div class="pred-value" style="color:'+color+'">'+val.du_doan+'</div>';
                html+='<div class="confidence">Do tin cay: '+val.do_tin_cay+'</div>';
                html+='<div class="reason">'+val.ly_do+'</div>';
                html+='<div class="phien">Phien #'+val.phien_hien_tai+'</div>';
                html+='</div>';
                html+='<button class="btn" onclick="refresh(\''+key+'\')">Du doan lai</button>';
                html+='<button class="btn btn-reset" onclick="resetGame(\''+key+'\')">Reset lich su</button>';
                html+='</div>';
            }
            document.getElementById('gamesGrid').innerHTML=html;
            document.getElementById('timerText').innerHTML='Cap nhat: '+new Date().toLocaleString();
        }catch(e){}
    }
    async function refresh(game){
        try{
            await fetch('/api/predict/'+game);
            loadAll();
        }catch(e){}
    }
    async function resetGame(game){
        if(!confirm('Xoa lich su cua '+game+'?'))return;
        try{
            await fetch('/api/reset/'+game,{method:'POST'});
            alert('Da xoa lich su');
            loadAll();
        }catch(e){alert('Loi reset');}
    }
    loadAll();
    setInterval(loadAll,30000);
</script>
</body>
</html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📡 Games: ${Object.keys(GAMES).join(', ')}`);
});
