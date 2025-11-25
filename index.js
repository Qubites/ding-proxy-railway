import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const DING_BASE = process.env.DING_BASE || "https://api.dingconnect.com/api/V1";

// Get the right API key based on mode
function getApiKey(mode) {
  if (mode === 'live') {
    return process.env.DING_API_KEY_LIVE || process.env.DING_API_KEY;
  }
  // Default to test key for 'test' mode or any other value
  return process.env.DING_API_KEY_TEST || process.env.DING_API_KEY;
}

app.all("/*", async (req, res) => {
  const path = req.params[0];
  const url = `${DING_BASE}/${path}`;
  
  // Get mode from header, default to 'test'
  const mode = (req.headers['x-mode'] || 'test').toLowerCase();
  const apiKey = getApiKey(mode);
  
  console.log(`[${mode.toUpperCase()}] Proxying to: ${url}`);

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "api_key": apiKey,
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ding proxy running on port ${PORT}`));
