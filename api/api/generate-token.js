import crypto from 'crypto';

const ZEGO_APP_ID = parseInt(process.env.REACT_APP_ZEGO_APP_ID || process.env.ZEGO_APP_ID || '0');
const ZEGO_SERVER_SECRET = process.env.REACT_APP_ZEGO_SERVER_SECRET || process.env.ZEGO_SERVER_SECRET || '';

function generateValidZegoToken(userID, userName, roomID) {
    const now = Math.floor(Date.now() / 1000);
    const expireTime = now + 3600;

    const message = `${ZEGO_APP_ID}:${userID}:${roomID}:${expireTime}`;

    const signature = crypto
        .createHmac('sha256', ZEGO_SERVER_SECRET)
        .update(message)
        .digest('base64');

    return `${ZEGO_APP_ID}.${userID}.${signature}.${expireTime}`;
}

export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userID, userName, roomID } = req.body;

        if (!userID || !userName || !roomID) {
            return res.status(400).json({ success: false, error: 'Missing fields' });
        }

        const token = generateValidZegoToken(userID, userName, roomID);

        res.json({ success: true, token, userID, userName, roomID, expiresIn: 3600 });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
