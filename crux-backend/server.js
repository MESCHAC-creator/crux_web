const express = require('express');
const cors = require('cors');
require('dotenv').config();
const crypto = require('crypto');

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Configuration ZegoCloud
const ZEGO_APP_ID = parseInt(process.env.ZEGO_APP_ID) || 1806674959;
const ZEGO_SERVER_SECRET = process.env.ZEGO_SERVER_SECRET || '8fa054e86ffa39defc0a703f83ab77b9';

console.log('🔧 ZegoCloud Configuration:');
console.log('   - ZEGO_APP_ID:', ZEGO_APP_ID);

// Générer token ZegoCloud valide
function generateValidZegoToken(userID, userName, roomID) {
    try {
        const now = Math.floor(Date.now() / 1000);
        const expireTime = now + 3600;

        // Message à signer: "app_id:user_id:room_id:expire_time"
        const message = `${ZEGO_APP_ID}:${userID}:${roomID}:${expireTime}`;

        // Signature HMAC-SHA256
        const signature = crypto
            .createHmac('sha256', ZEGO_SERVER_SECRET)
            .update(message)
            .digest('base64');

        // Format token ZegoCloud officiel
        const token = `${ZEGO_APP_ID}.${userID}.${signature}.${expireTime}`;

        console.log('✅ Token generated successfully');
        return token;
    } catch (error) {
        console.error('❌ Error generating token:', error.message);
        throw error;
    }
}

// ENDPOINT: Générer token
app.post('/api/generate-token', (req, res) => {
    try {
        const { userID, userName, roomID } = req.body;

        console.log(`\n📝 Token request received:`);
        console.log(`   - userID: ${userID}`);
        console.log(`   - userName: ${userName}`);
        console.log(`   - roomID: ${roomID}`);

        if (!userID || !userName || !roomID) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userID, userName, roomID'
            });
        }

        const token = generateValidZegoToken(userID, userName, roomID);

        res.json({
            success: true,
            token,
            userID,
            userName,
            roomID,
            expiresIn: 3600,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error in /api/generate-token:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to generate token',
            message: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'CRUX Backend',
        timestamp: new Date().toISOString()
    });
});

// Info endpoint
app.get('/api/info', (req, res) => {
    res.json({
        name: 'CRUX Backend',
        version: '1.0.0',
        description: 'Generates ZegoCloud tokens'
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 CRUX Backend Server Started`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`\n⏳ Ready to generate tokens...\n`);
});