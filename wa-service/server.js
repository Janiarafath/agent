// wa-service: Baileys WhatsApp engine, drop-in replacement for whatsapp_service.
// Same HTTP contract so backend/frontend need ZERO changes:
//   GET  /api/whatsapp/status?userId=  -> {connected, qr}
//   GET  /api/check?number=&userId=     -> {exists, jid, number}
//   POST /api/send {to,text,user_id}    -> {status, jid}
// Inbound -> POST http://127.0.0.1:8000/webhook/baileys (same shape as web.js)
const path = require('path');
const NM = process.env.WA_DEPS_DIR || path.join(__dirname, '..', 'whatsapp_service', 'node_modules');
const express = require(NM + '/express');
const cors = require(NM + '/cors');
const axios = require(NM + '/axios');
const qrcode = require(NM + '/qrcode');
const fs = require('fs');
const P = require(NM + '/pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } = require(NM + '/@whiskeysockets/baileys');

const PORT = parseInt(process.env.WA_PORT || '3002', 10);
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
const AUTH_ROOT = process.env.WA_AUTH_DIR || path.join(__dirname, 'auth_info_baileys');
// Residential egress for WA traffic (datacenter IPs get logins killed).
// Set PROXY_URL=https://user:pass@host:port on the host. Empty = direct.
const PROXY_URL = process.env.PROXY_URL || '';
let ProxyAgent = null;
if (PROXY_URL) {
    try { ProxyAgent = require(NM + '/https-proxy-agent').HttpsProxyAgent; console.log('[BAILEYS] egress via proxy'); }
    catch (e) { console.log('[BAILEYS] PROXY_URL set but https-proxy-agent missing — direct'); }
}

const app = express();
app.use(express.json());
app.use(cors());

// Per-socket log sniffer: proves whether WHATSAPP (not just our app)
// answered the pairing handshake. Ring buffer + flags, exposed via linklog.
function makeSocketLogger(userId, st) {
    st.linklog = st.linklog || [];
    const stream = {
        write(chunk) {
            let line = '';
            try {
                const o = JSON.parse(String(chunk));
                if (o.msg === 'pair success recv') st.pairDone = true;
                const xml = o.xml || '';
                if (o.msg === 'xml send' && xml.includes('companion_hello')) st.helloSent = true;
                if (o.msg === 'recv xml' && xml.includes('link_code_companion_reg')) st.serverAnsweredHello = true;
                line = `${o.msg || ''} ${String(xml).slice(0, 300)}`.slice(0, 320);
            } catch (e) { line = String(chunk).slice(0, 320); }
            st.linklog.push(line);
            if (st.linklog.length > 120) st.linklog.splice(0, st.linklog.length - 120);
            // still print important lines to stdout
            if (/pair success|logged out|CONNECTED|pairing code|closed/i.test(line)) {
                try { process.stdout.write(`[BAILEYS:${userId}] ${line}\n`); } catch (e) {}
            }
        },
    };
    return P({ level: process.env.WA_LOG_LEVEL || 'trace' }, stream);
}
// per-user runtime
const rt = new Map(); // userId -> runtime state (see getRT defaults)
function getRT(userId) {
    if (!rt.has(userId)) rt.set(userId, { sock: null, connected: false, qr: null, retry: 0, jidCache: {}, lastCode: null, lastChange: Date.now(), pairing: false });
    return rt.get(userId);
}
const BOOT_AT = Date.now();

function textOf(msg) {
    const m = msg.message || {};
    return m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || '';
}

async function postInbound(userId, remoteJid, fromMe, text, senderPn) {
    // exact shape backend/main.py receive_baileys expects (+senderPn for LID unmasking)
    const payload = { user_id: userId, message: { key: { remoteJid, fromMe: !!fromMe, senderPn: senderPn || '' }, message: { conversation: text || '' } } };
    try { await axios.post(BACKEND + '/webhook/baileys', payload, { timeout: 15000 }); }
    catch (e) { console.log(`[BAILEYS] webhook fail for ${userId}:`, e.message); }
}

async function connectUser(userId) {
    const st = getRT(userId);
    if (st.sock) { try { st.sock.ev.removeAllListeners(); st.sock.end(); } catch (e) {} st.sock = null; }
    const dir = path.join(AUTH_ROOT, userId);
    fs.mkdirSync(dir, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    // Fetch the version WHATSAPP itself expects (web.whatsapp.com/sw.js), once
    // per process. The Baileys-repo version lags and WhatsApp silently refuses
    // to COMPLETE links (QR or pairing) on stale versions — codes generate
    // fine, phones say "couldn't link". (Upstream issue #2679.)
    if (!global._waVersion) {
        try {
            const v = await Promise.race([
                fetchLatestWaWebVersion(),
                new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
            ]);
            global._waVersion = v.version;
            console.log('[BAILEYS] WA web version', global._waVersion.join('.'));
        } catch (e) { console.log('[BAILEYS] version fetch fail, using bundled'); }
    }
    const version = global._waVersion;
    st.helloSent = false; st.serverAnsweredHello = false; st.pairDone = false; st.linklog = [];
    const sock = makeWASocket({
        auth: state,
        version,
        logger: makeSocketLogger(userId, st),
        browser: ['Windows', 'Chrome', '10.0.22631'],
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 15000,
        ...(ProxyAgent ? { agent: new ProxyAgent(PROXY_URL) } : {}),
    });
    st.sock = sock;
    st.sockBornAt = Date.now();
    st.lastCode = null;
    sock.ev.on('creds.update', (creds) => { saveCreds(); scheduleBackup(userId); });
    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect, qr } = u;
        st.lastChange = Date.now();
        if (qr) {
            qrcode.toDataURL(qr).then((d) => { st.qr = d; }).catch(() => {});
            console.log(`[BAILEYS] QR for ${userId}`);
        }
        if (connection === 'open') {
            st.connected = true; st.qr = null; st.retry = 0;
            st.logoutStreak = 0; st.needsRelink = false;
            console.log(`[BAILEYS] CONNECTED ${userId}`);
        }
        if (connection === 'close') {
            st.connected = false;
            const code = lastDisconnect?.error?.output?.statusCode;
            st.lastCode = code ?? null;
            console.log(`[BAILEYS] closed ${userId} code=${code}`);
            if (code === DisconnectReason.loggedOut) {
                // Never wipe a session that never registered or has a pairing
                // code in flight — wiping kills the code the user is typing.
                const hadSession = !!(state.creds && state.creds.registered);
                if (st.pairing || !hadSession) {
                    console.log(`[BAILEYS] ${userId} pre-auth close (pairing=${!!st.pairing}) — reconnect, keep keys`);
                    st.retry = Math.min((st.retry || 0) + 1, 5);
                    setTimeout(() => connectUser(userId).catch((e) => {
                        console.log(`[BAILEYS] reconnect attempt failed ${userId}:`, e.message);
                        setTimeout(() => connectUser(userId).catch(() => {}), 15000);
                    }), (st.retry || 1) * 5000);
                    return;
                }
                // Registered session rejected by WhatsApp: hammering re-logins
                // gets the number flagged. Back off after 3 straight logouts.
                st.logoutStreak = (st.logoutStreak || 0) + 1;
                if (st.logoutStreak >= 3) {
                    st.needsRelink = true;
                    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
                    st.qr = null; st.sock = null;
                    console.log(`[BAILEYS] ${userId} logged out x3 — STOPPED, needs fresh relink`);
                    return;
                }
                try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
                st.qr = null;
                console.log(`[BAILEYS] ${userId} logged out — rescan needed`);
                return;
            }
            // crash-proof: backoff reconnect (no crash, ever). The .catch keeps
            // this chain alive even if a rebuild attempt itself throws.
            st.retry = Math.min((st.retry || 0) + 1, 5);
            const wait = st.retry * 5000;
            console.log(`[BAILEYS] reconnect ${userId} in ${wait}ms`);
            setTimeout(() => connectUser(userId).catch((e) => {
                console.log(`[BAILEYS] reconnect attempt failed ${userId}:`, e.message);
                st.retry = Math.min((st.retry || 0) + 1, 5);
                setTimeout(() => connectUser(userId).catch(() => {}), (st.retry || 1) * 5000);
            }), wait);
        }
    });
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages || []) {
            try {
            const jid = msg.key?.remoteJid || '';
            if (!jid || jid === 'status@broadcast') continue;
            const fromMe = !!msg.key?.fromMe;
            // LID mask fix: Baileys often addresses own/other contacts by LID.
            // senderPn carries the real phone — forward it so backend can match people.
            const senderPn = msg.key?.senderPn || '';
            const text = textOf(msg);
            const digits = jid.split('@')[0].split(':')[0];
            if (digits) st.jidCache[digits] = jid; // learn real JID (lid-safe)
            if (fromMe) {
                console.log(`[BAILEYS] HUMAN TAKEOVER ${userId} on ${jid}`);
                await postInbound(userId, jid, true, text, senderPn);
                continue;
            }
            if (!text) continue;
            const digitsOnly = digits.replace(/\D/g, '');
            console.log(`[BAILEYS] inbound ${userId} from ${digitsOnly}: ${text.slice(0, 80)}`);
            await postInbound(userId, jid, false, text, senderPn);
            } catch (e) { console.log(`[BAILEYS] msg skipped ${userId}:`, e.message); }
        }
    });
}

app.get('/api/whatsapp/status', (req, res) => {
    const userId = req.query.userId || 'default_user';
    const st = getRT(userId);
    if (!st.sock) connectUser(userId).catch((e) => console.log('[BAILEYS] connect fail', e.message));
    res.json({
        connected: st.connected,
        qr: st.qr,
        diag: {
            hasSocket: !!st.sock,
            needsRelink: !!st.needsRelink,
            lastCode: st.lastCode,
            secsSinceChange: Math.round((Date.now() - (st.lastChange || Date.now())) / 1000),
            retries: st.retry || 0,
            pairing: !!st.pairing,
            waVersion: global._waVersion ? global._waVersion.join('.') : null,
            viaProxy: !!ProxyAgent,
            uptimeMin: Math.round((Date.now() - BOOT_AT) / 60000),
            sessions: rt.size,
        },
    });
});

// Pairing code for phones that can't scan (mobile browsers, single device).
// WhatsApp -> Linked devices -> Link with phone number -> enter this code.
app.post('/api/whatsapp/pair', express.json(), async (req, res) => {
    const userId = req.body?.userId || req.query.userId || 'default_user';
    const phone = String(req.body?.phone || req.query.phone || '').replace(/\D/g, '');
    const fresh = req.body?.fresh === true || req.query.fresh === '1';
    if (phone.length < 10 || phone.length > 15) return res.status(400).json({ error: 'phone must be 10-15 digits WITH country code, e.g. 919876543210' });
    const st = getRT(userId);
    if (st.connected && !fresh) return res.json({ alreadyConnected: true });
    // One pairing flow at a time: a second tap while one runs kills the
    // first socket mid-request (perpetual "Connection Closed"). Refuse it.
    if (st.pairBusy) return res.status(429).json({ error: 'A code request is already running — wait 30s, then tap Get code ONCE and wait.' });
    st.pairBusy = true;
    st.logoutStreak = 0; st.needsRelink = false; // explicit user retry — allow fresh attempts
    try {
    // Rebuild ONLY on evidence of death — never blindly, or rapid taps kill
    // each other's handshakes (perpetual "Connection Closed").
    const sockDead = !st.sock || st.lastCode != null;
    // "Reset session" path: poisoned keys (repeated 401s) can never pair —
    // wipe the auth dir so the next socket registers brand-new keys.
    if (fresh) {
        try { if (st.sock) { st.sock.ev.removeAllListeners(); st.sock.end(); } } catch (e) {}
        st.sock = null; st.qr = null; st.connected = false; st.lastCode = null;
        try { fs.rmSync(path.join(AUTH_ROOT, userId), { recursive: true, force: true }); } catch (e) {}
        console.log(`[BAILEYS] session reset for ${userId}`);
    }
    const stillDead = !st.sock;
    const sockYoung = st.sock && st.sockBornAt && (Date.now() - st.sockBornAt < 40000);
    if (fresh || stillDead || sockDead) {
        try { await connectUser(userId); } catch (e) {}
    } else if (!sockYoung && !st.qr) {
        // Socket exists but wedged (old, no QR, no close): rebuild once.
        try { await connectUser(userId); } catch (e) {}
    }
    // else: handshake in flight — wait for it, don't kill it.
    if (!st.sock) return res.status(503).json({ error: 'engine starting, retry in 10s' });
    if (st.connected) return res.json({ alreadyConnected: true });
    // Wait until the socket reaches pairing state (QR offered), max ~25s.
    const t0 = Date.now();
    while (!st.connected && !st.qr && Date.now() - t0 < 25000) {
        await new Promise((r) => setTimeout(r, 1000));
    }
    if (st.connected) return res.json({ alreadyConnected: true });
    if (!st.qr) return res.status(503).json({ error: 'session not ready, retry in 10s' });
    st.pairing = true;
    const waitReady = async () => {
        const t1 = Date.now();
        while (!st.connected && !st.qr && Date.now() - t1 < 25000) {
            await new Promise((r) => setTimeout(r, 1000));
        }
    };
    try {
        let code;
        try {
            code = await st.sock.requestPairingCode(phone);
        } catch (e) {
            // Socket died mid-request (throttled CPU / blip): rebuild once and retry.
            console.log('[BAILEYS] pairing retry after:', e.message);
            try { await connectUser(userId); } catch (_) {}
            if (!st.sock) throw e;
            await waitReady();
            if (st.connected) return res.json({ alreadyConnected: true });
            code = await st.sock.requestPairingCode(phone);
        }
        console.log(`[BAILEYS] pairing code for ${userId} (${phone})`);
        return res.json({ code, phone });
    } catch (e) {
        console.log('[BAILEYS] pairing fail:', e.message);
        return res.status(500).json({ error: String(e.message || e).slice(0, 200) });
    } finally {
        // Keep keys for ~3 min so the user can type the code; then clear flag.
        setTimeout(() => { st.pairing = false; }, 180000);
    }
    } finally {
        st.pairBusy = false;
    }
});

// Session restore: link via QR on a residential IP (home PC), then upload the
// session files here so the cloud engine resumes the SAME login. WhatsApp
// rejects fresh cloud-IP logins; resumed residential sessions keep running.
// Body: { userId, files: { filename: base64 } } — must include creds.json.
app.post('/api/whatsapp/restore', express.json({ limit: '25mb' }), async (req, res) => {
    const userId = String(req.body?.userId || '').trim();
    const files = req.body?.files || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const names = Object.keys(files).filter((n) => /^[\w.\-]+$/.test(n) && !n.startsWith('.'));
    if (!names.includes('creds.json')) return res.status(400).json({ error: 'files must include creds.json' });
    if (names.length > 80) return res.status(400).json({ error: 'too many files' });
    const dir = path.join(AUTH_ROOT, userId);
    try {
        const st = getRT(userId);
        try { if (st.sock) { st.sock.ev.removeAllListeners(); st.sock.end(); } } catch (e) {}
        st.sock = null; st.qr = null; st.connected = false;
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        for (const n of names) {
            fs.writeFileSync(path.join(dir, n), Buffer.from(files[n], 'base64'));
        }
        console.log(`[BAILEYS] restored ${names.length} session files for ${userId}`);
        connectUser(userId).catch((e) => console.log('[BAILEYS] connect fail', e.message));
        return res.json({ ok: true, files: names.length });
    } catch (e) {
        return res.status(500).json({ error: String(e.message || e).slice(0, 200) });
    }
});

// Pairing handshake proof: did WHATSAPP answer our hello? Did it complete?
// Poll this after tapping Get code — settles "fake code" doubts with server frames.
app.get('/api/whatsapp/linklog', (req, res) => {
    const st = getRT(req.query.userId || 'default_user');
    res.json({
        helloSent: !!st.helloSent,
        serverAnsweredHello: !!st.serverAnsweredHello,
        pairDone: !!st.pairDone,
        connected: !!st.connected,
        lines: (st.linklog || []).slice(-25),
    });
});

app.get('/api/check', async (req, res) => {    const userId = req.query.userId || 'default_user';
    const number = (req.query.number || '').replace(/\D/g, '');
    if (!number) return res.status(400).json({ exists: false, error: 'missing number' });
    const st = getRT(userId);
    if (!st.sock || !st.connected) return res.status(400).json({ exists: false, error: `WhatsApp not connected for user ${userId} - scan QR first` });
    try {
        const out = await st.sock.onWhatsApp(number);
        const hit = out && out[0];
        if (hit && hit.exists) {
            if (hit.jid) st.jidCache[number] = hit.jid;
            return res.json({ exists: true, jid: hit.jid, number });
        }
        return res.json({ exists: false, number });
    } catch (e) { return res.json({ exists: false, number, error: e.toString().slice(0, 200) }); }
});

app.post('/api/send', async (req, res) => {
    const { to, text, user_id } = req.body || {};
    const userId = user_id || 'default_user';
    const st = getRT(userId);
    if (!st.sock || !st.connected) return res.status(400).json({ status: 'error', error: `WhatsApp not connected for user ${userId} - scan QR first` });
    try {
        const raw = String(to || '').trim();
        let jid;
        if (raw.includes('@')) {
            jid = raw; // full JID passed through (lid-safe)
        } else {
            const digits = raw.replace(/\D/g, '');
            jid = st.jidCache[digits] || null;
            if (!jid) {
                const out = await st.sock.onWhatsApp(digits);
                jid = (out && out[0] && out[0].exists && out[0].jid) ? out[0].jid : digits + '@s.whatsapp.net';
                st.jidCache[digits] = jid;
            }
        }
        console.log(`[BAILEYS] ${userId} -> ${jid}`);
        await st.sock.sendMessage(jid, { text: String(text || '') });
        res.json({ status: 'sent', jid });
    } catch (e) { console.error('[BAILEYS] send fail', e.message); res.status(500).json({ status: 'error', error: String(e.message || e).slice(0, 300) }); }
});

app.get('/health', (req, res) => {
    const users = [...rt.entries()].map(([u, s]) => ({ user: u, connected: s.connected }));
    const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);
    res.json({ ok: true, rssMB: rss, users });
});

process.on('unhandledRejection', (e) => console.log('[BAILEYS] unhandledRejection suppressed:', e && e.message));
process.on('uncaughtException', (e) => console.log('[BAILEYS] uncaughtException suppressed:', e && e.message));

// ---- Session vault: survive redeploys ------------------------------------
// Auth files live in AUTH_ROOT (wiped on Cloud Run redeploys). Every linked
// session is backed up to the backend DB and resurrected on boot.
const backupTimers = new Map();
function readSessionFiles(userId) {
    const dir = path.join(AUTH_ROOT, userId);
    const out = {};
    try {
        for (const n of fs.readdirSync(dir)) {
            if (/^[\w.\-]+$/.test(n) && !n.startsWith('.') && n.length < 64) {
                const p = path.join(dir, n);
                if (fs.statSync(p).isFile() && fs.statSync(p).size < 2 * 1024 * 1024) {
                    out[n] = fs.readFileSync(p).toString('base64');
                }
            }
        }
    } catch (e) {}
    return out;
}
async function backupNow(userId) {
    try {
        const files = readSessionFiles(userId);
        if (!files['creds.json']) return;
        await axios.post(`${BACKEND}/api/whatsapp/vault-backup`, { userId, files }, { timeout: 30000 });
        console.log(`[BAILEYS] vault backup ${userId} (${Object.keys(files).length} files)`);
    } catch (e) { console.log(`[BAILEYS] vault backup fail ${userId}:`, e.message); }
}
function scheduleBackup(userId) {
    if (backupTimers.has(userId)) return;
    backupTimers.set(userId, setTimeout(() => {
        backupTimers.delete(userId);
        backupNow(userId);
    }, 30000));
}
async function resurrectAll() {
    // Pull every backed-up session from the DB and reconnect — no rescan after deploys.
    try {
        const { data } = await axios.get(`${BACKEND}/api/whatsapp/vault`, { timeout: 30000 });
        for (const uid of data.userIds || []) {
            try {
                const dir = path.join(AUTH_ROOT, String(uid));
                const hasCreds = fs.existsSync(path.join(dir, 'creds.json'));
                if (!hasCreds) {
                    const r = await axios.get(`${BACKEND}/api/whatsapp/vault/${encodeURIComponent(uid)}`, { timeout: 30000 });
                    fs.mkdirSync(dir, { recursive: true });
                    for (const [n, b64] of Object.entries(r.data.files || {})) {
                        if (/^[\w.\-]+$/.test(n) && !n.startsWith('.')) {
                            fs.writeFileSync(path.join(dir, n), Buffer.from(b64, 'base64'));
                        }
                    }
                    console.log(`[BAILEYS] resurrected session ${uid}`);
                }
                connectUser(uid).catch((e) => console.log('[BAILEYS] resurrect fail', uid, e.message));
            } catch (e) { console.log('[BAILEYS] resurrect skip', uid, e.message); }
        }
    } catch (e) { console.log('[BAILEYS] vault list fail:', e.message); }
}
setInterval(() => { // safety net: re-backup every connected session every 10 min
    for (const [uid, st] of rt) {
        if (st.connected) backupNow(uid).catch(() => {});
    }
}, 10 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`Baileys wa-service on :${PORT} (contract-compatible)`);
    setTimeout(resurrectAll, 15000); // let backend finish booting first
});
