const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const app = express();
app.use(express.json());

let sock;

const qrImage = require('qrcode');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'fatal' }), // Set to fatal to completely hide libsignal Bad MAC noise
        syncFullHistory: false,           // Do not attempt to download old messages (which causes Bad MAC)
        generateHighQualityLinkPreview: false,
        markOnlineOnConnect: true,
        browser: ['GrowthPilot', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if(qr) {
            console.log('--------------------------------------------------');
            console.log('SCAN THIS QR CODE TO CONNECT YOUR WHATSAPP NUMBER:');
            qrcode.generate(qr, { small: true });
            console.log('--------------------------------------------------');
        }
        if(connection === 'close') {
            console.log('Connection closed, reconnecting...');
            connectToWhatsApp();
        } else if(connection === 'open') {
            console.log('🔥 WhatsApp Connected successfully via Baileys!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if(!msg.key.fromMe && m.type === 'notify') {
            // Forward to Python FastAPI webhook
            try {
                await axios.post('http://127.0.0.1:8000/webhook/baileys', {
                    message: msg
                });
            } catch(e) {
                console.error('Failed to forward to Python AI Engine. Is FastAPI running on port 8000?');
            }
        }
    });
}

app.post('/api/send', async (req, res) => {
    const { to, text } = req.body;
    try {
        const jid = to + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: text });
        res.json({ status: 'sent', jid: jid });
    } catch (e) {
        console.error('Error sending message:', e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(3001, () => {
    console.log('Baileys WhatsApp Service running on port 3001');
    connectToWhatsApp();
});
