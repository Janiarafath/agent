const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const app = express();
app.use(express.json());

// Initialize the WhatsApp Web Client using Puppeteer
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: 'auth_info_webjs' }),
    puppeteer: { 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
    }
});

// Generate QR Code
client.on('qr', (qr) => {
    console.log('--------------------------------------------------');
    console.log('SCAN THIS QR CODE TO CONNECT YOUR WHATSAPP NUMBER:');
    qrcode.generate(qr, { small: true });
    console.log('--------------------------------------------------');
});

// Connected successfully
client.on('ready', () => {
    console.log('🔥 WhatsApp Connected successfully via WhatsApp-Web.js (Chrome Engine)!');
});

// Handle incoming messages
client.on('message', async msg => {
    if (msg.from === 'status@broadcast') return;
    
    console.log(`[WebJS] Received message from ${msg.from}`);
    
    // Convert Web.js format back to our standard webhook format so Python doesn't break
    const webhookPayload = {
        message: {
            key: { remoteJid: msg.from.replace('@c.us', '@s.whatsapp.net') },
            message: { conversation: msg.body }
        }
    };

    try {
        await axios.post('http://127.0.0.1:8000/webhook/baileys', webhookPayload);
    } catch (e) {
        console.error('Failed to forward to Python AI Engine. Is FastAPI running on port 8000?');
    }
});

// API Endpoint for Python to send outgoing messages
app.post('/api/send', async (req, res) => {
    const { to, text } = req.body;
    try {
        // Web.js uses @c.us instead of @s.whatsapp.net
        const jid = to.includes('@') ? to.replace('@s.whatsapp.net', '@c.us') : to + '@c.us';
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
