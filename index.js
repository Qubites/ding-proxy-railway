import express from "express";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const DING_BASE = (process.env.DING_BASE || "https://api.dingconnect.com/api/V1").replace(/\/+$/,"");
const DING_KEY = process.env.DING_API_KEY || "";
const PORT = process.env.PORT || 8080;

async function forward(req, res) {
  try {
    const upstreamUrl = DING_BASE + req.originalUrl;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (!v) continue;
      const key = k.toLowerCase();
      if (["host","connection","content-length","accept-encoding"].includes(key)) continue;
      headers.set(k, Array.isArray(v) ? v.join(", ") : v);
    }
    if (DING_KEY && !headers.get("api_key")) headers.set("api_key", DING_KEY);
    if (!headers.get("accept")) headers.set("accept", "application/json");
    const init = { method: req.method, headers };
    if (!["GET","HEAD"].includes(req.method)) {
      const hasBody = req.body && (typeof req.body === "string" || Object.keys(req.body).length);
      if (hasBody) {
        init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        if (!headers.get("content-type")) headers.set("content-type", "application/json");
      }
    }
    const r = await fetch(upstreamUrl, init);
    console.log(`[upstream] ${r.status} ${req.method} ${req.originalUrl}`);
    res.status(r.status);
    r.headers.forEach((val, key) => {
      if (!["content-encoding","transfer-encoding","connection"].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    });
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    console.error("Proxy error:", e);
    res.status(502).json({ error: "proxy_failed", message: String(e) });
  }
}

app.get("/health", (_req, res) => res.json({ status: "ok", target: DING_BASE }));
app.all("*", forward);
app.listen(PORT, () => console.log(`ding proxy on :${PORT} -> ${DING_BASE}`));
