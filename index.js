import express from 'express';

const app = express();
app.use(express.json());

const DING_BASE = process.env.DING_BASE || 'https://api.dingconnect.com/api/V1';
const PROXY_AUTH_TOKEN = process.env.PROXY_AUTH_TOKEN;

// Log startup config
console.log('=== Ding Proxy Starting ===');
console.log('DING_BASE:', DING_BASE);
console.log('DING_API_KEY_TEST:', process.env.DING_API_KEY_TEST ? 'SET' : 'NOT SET');
console.log('DING_API_KEY_LIVE:', process.env.DING_API_KEY_LIVE ? 'SET' : 'NOT SET');
console.log('PROXY_AUTH_TOKEN:', PROXY_AUTH_TOKEN ? 'SET' : 'NOT SET');

// Authentication middleware (optional - only if PROXY_AUTH_TOKEN is set)
app.use((req, res, next) => {
  if (PROXY_AUTH_TOKEN) {
    const authHeader = req.headers['x-proxy-auth'];
    if (authHeader !== PROXY_AUTH_TOKEN) {
      console.log('Auth failed - invalid or missing x-proxy-auth header');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
});

// Get API key based on mode header
function getApiKey(req) {
  const mode = (req.headers['x-mode'] || 'test').toLowerCase();
  const key = mode === 'live' 
    ? process.env.DING_API_KEY_LIVE 
    : process.env.DING_API_KEY_TEST;
  console.log(`Mode: ${mode}, Using API key: ${key ? 'SET' : 'NOT SET'}`);
  return key;
}

// Proxy all requests to Ding API
app.all('/*', async (req, res) => {
  const path = req.path;
  const queryString = new URL(req.url, `http://${req.headers.host}`).search;
  const url = `${DING_BASE}${path}${queryString}`;
  
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured for this mode' });
  }

  console.log(`Proxying ${req.method} ${path} to ${url
