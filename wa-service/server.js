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
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require(NM + '/@whiskeysockets/baileys');

const PORT = parseInt(process.env.WA_PORT || '3002', 10);
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
const AUTH_ROOT = process.env.WA_AUTH_DIR || path.join(__dirname, 'auth_info_baileys');

const app = express();
app.use(express.json());
app.use(cors());

// per-user runtime
const rt = new Map(); // userId -> { sock, connected, qr, retry, jidCache }
function getRT(userId) {
    if (!rt.has(userId)) rt.set(userId, { sock: null, connected: false, qr: null, retry: 0, jidCache: {} });
    return rt.get(userId);
}

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
    let version = undefined;
    try { version = (await fetchLatestBaileysVersion()).version; } catch (e) { console.log('[BAILEYS] version fetch fail, using bundled'); }
    const sock = makeWASocket({
        auth: state,
        version,
        browser: ['GrowthPilot', 'Chrome', '1.0'],
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
    });
    st.sock = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect, qr } = u;
        if (qr) {
            qrcode.toDataURL(qr).then((d) => { st.qr = d; }).catch(() => {});
            console.log(`[BAILEYS] QR for ${userId}`);
        }
        if (connection === 'open') {
            st.connected = true; st.qr = null; st.retry = 0;
            console.log(`[BAILEYS] CONNECTED ${userId}`);
        }
        if (connection === 'close') {
            st.connected = false;
            const code = lastDisconnect?.error?.output?.statusCode;
            console.log(`[BAILEYS] closed ${userId} code=${code}`);
            if (code === DisconnectReason.loggedOut) {
                try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
                st.qr = null;
                console.log(`[BAILEYS] ${userId} logged out — rescan needed`);
                return;
            }
            // crash-proof: backoff reconnect (no crash, ever)
            st.retry = Math.min((st.retry || 0) + 1, 5);
            const wait = st.retry * 5000;
            console.log(`[BAILEYS] reconnect ${userId} in ${wait}ms`);
            setTimeout(() => connectUser(userId), wait);
        }
    });
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages || []) {
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
        }
    });
}

app.get('/api/whatsapp/status', (req, res) => {
    const userId = req.query.userId || 'default_user';
    const st = getRT(userId);
    if (!st.sock) connectUser(userId).catch((e) => console.log('[BAILEYS] connect fail', e.message));
    res.json({ connected: st.connected, qr: st.qr });
});

// Pairing code for phones that can't scan (mobile browsers, single device).
// WhatsApp -> Linked devices -> Link with phone number -> enter this code.
app.post('/api/whatsapp/pair', express.json(), async (req, res) => {
    const userId = req.body?.userId || req.query.userId || 'default_user';
    const phone = String(req.body?.phone || req.query.phone || '').replace(/\D/g, '');
    if (!phone) return res.status(400).json({ error: 'phone required, e.g. 919876543210' });
    const st = getRT(userId);
    if (!st.sock) { try { await connectUser(userId); } catch (e) {} }
    if (!st.sock) return res.status(503).json({ error: 'engine starting, retry in 10s' });
    if (st.connected) return res.json({ alreadyConnected: true });
    // Wait until the socket reaches pairing state (QR offered), max ~25s.
    const t0 = Date.now();
    while (!st.connected && !st.qr && Date.now() - t0 < 25000) {
        await new Promise((r) => setTimeout(r, 1000));
    }
    if (st.connected) return res.json({ alreadyConnected: true });
    if (!st.qr) return res.status(503).json({ error: 'session not ready, retry in 10s' });
    try {
        const code = await st.sock.requestPairingCode(phone);
        console.log(`[BAILEYS] pairing code for ${userId}`);
        return res.json({ code });
    } catch (e) {
        console.log('[BAILEYS] pairing fail:', e.message);
        return res.status(500).json({ error: String(e.message || e).slice(0, 200) });
    }
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

app.listen(PORT, () => console.log(`Baileys wa-service on :${PORT} (contract-compatible)`));
