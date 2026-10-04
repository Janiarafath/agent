// Baileys lightness spike: boots a WA socket (QR), measures RAM, proves no Chromium.
// Usage: node session.js --check <digits>   (check runs only after YOU scan QR)
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('../whatsapp_service/node_modules/@whiskeysockets/baileys');
const qrcodeTerminal = require('../whatsapp_service/node_modules/qrcode-terminal');
const fs = require('fs');

const AUTH_DIR = __dirname + '/auth';
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const mem = () => `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`;
console.log(`[SPIKE] boot RSS=${mem()}`);

async function main() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const sock = makeWASocket({
        auth: state,
        browser: ['GrowthPilot-Spike', 'Chrome', '1.0'],
        syncFullHistory: false,
        markOnlineOnConnect: false,
    });
    console.log(`[SPIKE] socket created RSS=${mem()}`);
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u;
        if (qr) { console.log('[SPIKE] QR READY — scan with WhatsApp app:'); qrcodeTerminal.generate(qr, { small: true }); }
        if (connection === 'open') {
            console.log(`[SPIKE] CONNECTED RSS=${mem()}`);
            const target = (process.argv[process.argv.indexOf('--check') + 1] || '').replace(/\D/g, '');
            if (target) {
                const chk = await sock.onWhatsApp(target);
                console.log('[SPIKE] onWhatsApp', target, JSON.stringify(chk));
                if (chk && chk[0] && chk[0].exists) {
                    await sock.sendMessage(chk[0].jid, { text: 'Baileys spike OK — lightness proven. Ignore this.' });
                    console.log('[SPIKE] test message SENT to', chk[0].jid);
                } else {
                    console.log('[SPIKE] number not on WhatsApp, nothing sent');
                }
            }
            console.log(`[SPIKE] steady RSS=${mem()} — compare vs web.js Chromium (~400-600MB+)`);
        }
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            console.log('[SPIKE] closed code=', code);
            if (code !== DisconnectReason.loggedOut) { console.log('[SPIKE] reconnecting...'); main(); }
        }
    });
    setInterval(() => console.log(`[SPIKE] heartbeat RSS=${mem()}`), 20000).unref();
}
main().catch((e) => { console.error('[SPIKE] fatal', e); process.exit(1); });
