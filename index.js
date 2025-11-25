import express from 'express';

const app = express();
app.use(express.json());

const DING_BASE = process.env.DING_BASE || 'https://api.dingconnect.com/api/V1';
const DING_API_KEY_TEST = process.env.DING_API_KEY_TEST;
const DING_API_KEY_LIVE = process.env.DING_API_KEY_LIVE;
const PROXY_AUTH_TOKEN = process.env.PROXY_AUTH_TOKEN;

// Log configuration on startup
console.log('=== Ding Proxy Starting ===');
console.log('DING_BASE:', DING_BASE);
console.log('DING_API_KEY_TEST:', DING_API_KEY_TEST ? 'SET' : 'NOT SET');
console.log('DING_API_KEY_LIVE:', DING_API_KEY_LIVE ? 'SET' : 'NOT SET');
console.log('PROXY_AUTH_TOKEN:', PROXY_AUTH_TOKEN ? 'SET' : 'NOT SET');

// Authentication middleware (optional - only if PROXY_AUTH_TOKEN is set)
app.use((req, res, next) => {
  if (PROXY_AUTH_TOKEN) {
    const authHeader = req.headers['x-proxy-auth'];
    if (authHeader !== PROXY_AUTH_TOKEN) {
      console.log('Auth failed - received:', authHeader ? 'invalid token' : 'no token');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
});

// Proxy all requests
app.all('/*', async (req, res) => {
  try {
    const path = req.path;
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${DING_BASE}${path}${queryString ? '?' + queryString : ''}`;
    
    // Get mode from header, default to 'test'
    const mode = (req.headers['x-mode'] || 'test').toLowerCase();
    const apiKey = mode === 'live' ? DING_API_KEY_LIVE : DING_API_KEY_TEST;
    
    if (!apiKey) {
      console.error(`No API key configured for mode: ${mode}`);
      return res.status(500).json({ error: `No API key for mode: ${mode}` });
    }
    
    console.log(`Proxying ${req.method} ${path} to ${url} (mode: ${mode})`);
    
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
    };
    
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      options.body = JSON.stringify(req.body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`Response status: ${response.status}`);
    res.status(response.status).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ding proxy running on port ${PORT}`);
});
