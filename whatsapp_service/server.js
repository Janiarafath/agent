const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Multi-Tenant Maps
const clients = new Map();
const qrCodes = new Map();
const connectionStatus = new Map();

// Helper to initialize a client for a specific user
const initClientForUser = (userId) => {
    if (clients.has(userId)) return; // Already running

    console.log(`[WebJS] Initializing WhatsApp Engine for user: ${userId}`);
    connectionStatus.set(userId, false);
    
    const client = new Client({
        authStrategy: new LocalAuth({ 
            clientId: userId, 
            dataPath: `auth_info_webjs/${userId}` 
        }),
        puppeteer: { 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
        }
    });

    client.on('qr', async (qr) => {
        console.log(`[WebJS] QR Generated for user ${userId}`);
        try {
            const dataUri = await qrcode.toDataURL(qr);
            qrCodes.set(userId, dataUri);
        } catch (e) {
            console.error("Failed to generate QR data URI");
        }
    });

    client.on('ready', () => {
        connectionStatus.set(userId, true);
        qrCodes.delete(userId);
        console.log(`[WebJS] WhatsApp Connected successfully for user ${userId}`);
    });

    const jidCache = {}; // We can keep a local cache for this user

    client.on('message', async msg => {
        if (msg.from === 'status@broadcast') return;
        
        console.log(`[WebJS] Received message from ${msg.from} for user ${userId}`);
        
        const rawNumber = msg.from.split('@')[0];
        client.jidCache = client.jidCache || {};
        client.jidCache[rawNumber] = msg.from;
        
        const webhookPayload = {
            user_id: userId,
            message: {
                key: { remoteJid: msg.from, fromMe: false },
                message: { conversation: msg.body }
            }
        };

        try {
            await axios.post('http://127.0.0.1:8000/webhook/baileys', webhookPayload);
        } catch (e) {}
    });

    client.on('message_create', async msg => {
        if (msg.fromMe) {
            console.log(`[WebJS] HUMAN TAKEOVER DETECTED for user ${userId} on chat ${msg.to}`);
            const webhookPayload = {
                user_id: userId,
                message: {
                    key: { remoteJid: msg.to, fromMe: true }, 
                    message: { conversation: msg.body }
                }
            };
            try {
                await axios.post('http://127.0.0.1:8000/webhook/baileys', webhookPayload);
            } catch (e) {}
        }
    });

    clients.set(userId, client);
    client.initialize();
};


// API Endpoint to check connection status and get QR code
app.get('/api/whatsapp/status', (req, res) => {
    const userId = req.query.userId || "default_user";
    
    // If we haven't started an engine for them, start one
    if (!clients.has(userId)) {
        initClientForUser(userId);
    }
    
    res.json({
        connected: connectionStatus.get(userId) || false,
        qr: qrCodes.get(userId) || null
    });
});

// API Endpoint to check if a number is on WhatsApp (verification, low-QPS only)
app.get('/api/check', async (req, res) => {
    const userId = req.query.userId || "default_user";
    const number = (req.query.number || "").replace(/\D/g, "");
    if (!number) return res.status(400).json({ exists: false, error: "missing number" });
    if (!clients.has(userId)) initClientForUser(userId);
    const client = clients.get(userId);
    if (!client || !connectionStatus.get(userId)) {
        return res.status(400).json({ exists: false, error: `WhatsApp not connected for user ${userId} - scan QR first` });
    }
    try {
        const id = await client.getNumberId(number);
        return res.json({ exists: !!id, jid: id ? id._serialized : null, number });
    } catch (e) {
        return res.json({ exists: false, number, error: e.toString() });
    }
});

// API Endpoint for Python to send outgoing messages
app.post('/api/send', async (req, res) => {
    const { to, text, user_id } = req.body;
    const userId = user_id || "default_user";
    if (!clients.has(userId)) initClientForUser(userId);
    const client = clients.get(userId);
    if (!client || !connectionStatus.get(userId)) {
        return res.status(400).json({ status: 'error', error: `WhatsApp not connected for user ${userId} - scan QR first` });
    }

    try {
        let jid = to;
        if (!jid.includes('@')) {
            if (client.jidCache && client.jidCache[to]) {
                jid = client.jidCache[to];
            } else {
                jid = to + '@c.us';
            }
        } else {
            jid = jid.replace('@s.whatsapp.net', '@c.us');
        }
        
        console.log(`[WebJS] User ${userId} sending to ${jid}`);
        await client.sendMessage(jid, text);
        res.json({ status: 'sent', jid });
    } catch (error) {
        console.error("Send Error:", error);
        res.status(500).json({ status: 'error', error: error.toString() });
    }
});

// Start the Web Server
app.listen(3001, () => {
    console.log('Multi-Tenant WhatsApp-Web.js Service running on port 3001');
    // Pre-initialize default for testing if needed
    // initClientForUser("default_user"); 
});
