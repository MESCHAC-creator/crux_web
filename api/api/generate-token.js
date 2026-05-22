import crypto from 'crypto';

const ZEGO_APP_ID = 1806674959;
const ZEGO_SERVER_SECRET = '8fa054e86ffa39defc0a703f83ab77b9';

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
            return res.status(400).json({
                success: false,
                error: 'Missing fields'
            });
        }

        const token = generateValidZegoToken(userID, userName, roomID);

        res.json({
            success: true,
            token,
            userID,
            userName,
            roomID,
            expiresIn: 3600
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}