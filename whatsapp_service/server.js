const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

let latestQR = null;
let isConnected = false;

// Initialize the WhatsApp Web Client using Puppeteer
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: 'auth_info_webjs' }),
    puppeteer: { 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
    }
});

// Generate QR Code
client.on('qr', async (qr) => {
    console.log('--------------------------------------------------');
    console.log('SCAN THIS QR CODE TO CONNECT YOUR WHATSAPP NUMBER:');
    qrcodeTerminal.generate(qr, { small: true });
    console.log('--------------------------------------------------');
    
    // Store as Data URI for the React frontend
    try {
        latestQR = await qrcode.toDataURL(qr);
    } catch (e) {
        console.error("Failed to generate QR data URI");
    }
});

// Connected successfully
client.on('ready', () => {
    isConnected = true;
    latestQR = null;
    console.log('🔥 WhatsApp Connected successfully via WhatsApp-Web.js (Chrome Engine)!');
});

// Cache exact domains so we don't accidentally reply to @c.us when the user is @lid
const jidCache = {};

// Handle incoming messages
client.on('message', async msg => {
    if (msg.from === 'status@broadcast') return;
    
    console.log(`[WebJS] Received message from ${msg.from}`);
    
    const rawNumber = msg.from.split('@')[0];
    jidCache[rawNumber] = msg.from;
    
    const webhookPayload = {
        message: {
            key: { remoteJid: msg.from, fromMe: false },
            message: { conversation: msg.body }
        }
    };

    try {
        await axios.post('http://127.0.0.1:8000/webhook/baileys', webhookPayload);
    } catch (e) {
        console.error('Failed to forward to Python AI Engine. Is FastAPI running on port 8000?');
    }
});

// Intercept Human Takeover (When the user texts from their own phone)
client.on('message_create', async msg => {
    if (msg.fromMe) {
        console.log(`[WebJS] HUMAN TAKEOVER DETECTED on chat ${msg.to}`);
        const webhookPayload = {
            message: {
                key: { remoteJid: msg.to, fromMe: true }, // Send to Python so it knows to mute the AI
                message: { conversation: msg.body }
            }
        };
        try {
            await axios.post('http://127.0.0.1:8000/webhook/baileys', webhookPayload);
        } catch (e) {}
    }
});

// API Endpoint to check connection status and get QR code
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        connected: isConnected,
        qr: latestQR
    });
});

// API Endpoint for Python to send outgoing messages
app.post('/api/send', async (req, res) => {
    const { to, text } = req.body;
    try {
        let jid = to;
        if (!jid.includes('@')) {
            if (jidCache[to]) {
                jid = jidCache[to];
            } else {
                jid = to + '@c.us';
            }
        } else {
            jid = jid.replace('@s.whatsapp.net', '@c.us');
        }
        
        console.log(`[WebJS] Replying to exact JID: ${jid}`);
        await client.sendMessage(jid, text);
        res.json({ status: 'sent', jid });
    } catch (error) {
        console.error("Send Error:", error);
        res.status(500).json({ status: 'error', error: error.toString() });
    }
});

// Start the Web Server
app.listen(3001, () => {
    console.log('WhatsApp-Web.js Service running on port 3001');
    client.initialize();
});
