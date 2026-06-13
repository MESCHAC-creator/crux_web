const functions = require('firebase-functions');
const crypto = require('crypto');

const APP_ID = 2042049519;
const SERVER_SECRET = '41fb869d2bbcb148571a22b1ad4840ae';

// Generate ZegoCloud production token (Token04 format)
// This replaces generateKitTokenForTest and removes the ~10 user limit
function generateZegoToken(appId, userId, roomId, secret, expireSeconds = 3600) {
  const timestamp = Math.floor(Date.now() / 1000);
  const expireAt = timestamp + expireSeconds;
  const nonce = Math.floor(Math.random() * 2147483647);

  // Token04 payload
  const payload = {
    app_id: appId,
    user_id: userId,
    nonce,
    ctime: timestamp,
    expire: expireAt,
    room_id: roomId,
  };

  const payloadStr = JSON.stringify(payload);
  const payloadBuf = Buffer.from(payloadStr, 'utf8');

  // HMAC-SHA256
  const hmac = crypto.createHmac('sha256', Buffer.from(secret, 'utf8'));
  hmac.update(Buffer.concat([
    Buffer.from(new Uint32Array([payloadBuf.length]).buffer),
    payloadBuf,
  ]));
  const hash = hmac.digest();

  // Build: version(2) + hashLen(4) + hash + payloadLen(4) + payload
  const version = Buffer.from([0x04, 0x00]); // Token04
  const hashLen = Buffer.alloc(4); hashLen.writeUInt32BE(hash.length);
  const payloadLen = Buffer.alloc(4); payloadLen.writeUInt32BE(payloadBuf.length);

  const tokenBuf = Buffer.concat([version, hashLen, hash, payloadLen, payloadBuf]);
  return '04' + tokenBuf.toString('base64');
}

exports.zegoToken = functions.https.onRequest((req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  const { userId, roomId, userName } = req.body || {};
  if (!userId || !roomId) {
    res.status(400).json({ error: 'userId and roomId are required' });
    return;
  }

  try {
    const token = generateZegoToken(APP_ID, userId, roomId, SERVER_SECRET, 3600);
    res.json({ token, appId: APP_ID, userId, roomId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
