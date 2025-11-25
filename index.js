const express = require('express');
const axios = require('axios');
const app = express();

const DING_BASE = process.env.DING_BASE;
const DING_API_KEY_TEST = process.env.DING_API_KEY_TEST;
const DING_API_KEY_LIVE = process.env.DING_API_KEY_LIVE;
const PROXY_AUTH_TOKEN = process.env.PROXY_AUTH_TOKEN; // Secret to validate incoming requests

app.use(express.json());

// Middleware to validate proxy authentication
app.use((req, res, next) => {
  const proxyAuth = req.headers['x-proxy-auth'];
  
  // If PROXY_AUTH_TOKEN is set, validate it
  if (PROXY_AUTH_TOKEN && proxyAuth !== PROXY_AUTH_TOKEN) {
    console.log('❌ Unauthorized request - invalid x-proxy-auth');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
});

app.all('/*', async (req, res) => {
  try {
    // Determine which API key to use based on x-mode header
    const mode = (req.headers['x-mode'] || 'test').toLowerCase();
    const apiKey = mode === 'live' ? DING_API_KEY_LIVE : DING_API_KEY_TEST;
    
    console.log(`[${mode.toUpperCase()}] ${req.method} ${req.path} using ${mode} API key`);
    
    if (!apiKey) {
      console.error(`Missing DING_API_KEY_${mode.toUpperCase()}`);
      return res.status(500).json({ error: `API key not configured for ${mode} mode` });
    }

    const url = `${DING_BASE}${req.path}`;
    const response = await axios({
      method: req.method,
      url,
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
      params: req.query,
      data: req.body,
      validateStatus: () => true, // Don't throw on any status
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ding proxy running on port ${PORT}`));
