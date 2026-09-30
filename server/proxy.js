// Safe server proxy: holds BREVO_API_KEY secret, not exposed to browser
import dotenv from "dotenv"; dotenv.config();
import express from 'express';
import axios from 'axios';
const app = express();
app.use(express.json());

// CORS for browser - allow local dev origins
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Simple in-memory rate limit: 10 requests / minute per IP
const rateLimit = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60000; }
  entry.count++;
  rateLimit.set(ip, entry);
  return entry.count <= 10;
}

app.post('/send-email', async (req, res) => {
  try {
    // Bearer token gate
    const auth = req.headers.authorization || '';
    const token = process.env.BREVO_PROXY_TOKEN;
    if (!token || !auth.startsWith('Bearer ') || auth.slice(7) !== token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Rate limit
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Rate limit exceeded (10/min)' });
    }
    const apiKey = process.env.BREVO_API_KEY;
    // Key used server-side — never logged
    const payload = req.body;
    // Sender is configured server-side so the real address never ships to the browser
    if (process.env.BREVO_SENDER_EMAIL) {
      payload.sender = { name: "Fishing Booking System", email: process.env.BREVO_SENDER_EMAIL };
    }
    const result = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      timeout: 10000
    });
    res.status(201).json({ success: true, messageId: result.data.messageId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3004, () => console.log('Safe proxy server on 3004'));
// Suppress Chrome devtools CSP warning
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => res.sendStatus(204));
