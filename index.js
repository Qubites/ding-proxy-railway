import express from 'express';
const app = express();
app.use(express.raw({ type:'*/*', limit:'10mb' }));
const PORT = process.env.PORT || 8080;
const TARGET = process.env.DING_BASE || 'https://api.dingconnect.com';
app.get('/health', (_req,res)=>res.json({status:'ok', target: TARGET}));
app.use(async (req,res)=>{ try{
  const url = new URL(req.originalUrl, TARGET).toString();
  const h = new Headers();
  for (const [k,v] of Object.entries(req.headers))
    if (!['host','content-length'].includes(k.toLowerCase()))
      h.set(k, Array.isArray(v)? v.join(', '): v);
  const r = await fetch(url,{ method:req.method, headers:h,
    body: ['GET','HEAD'].includes(req.method.toUpperCase()) ? undefined : req.body });
  for (const [k,v] of r.headers)
    if (!['content-encoding','transfer-encoding'].includes(k.toLowerCase()))
      res.setHeader(k,v);
  res.setHeader('Access-Control-Allow-Origin','*');
  res.status(r.status);
  if (r.body) { for await (const c of r.body) res.write(c); }
  res.end();
} catch(e){ res.status(502).json({error:'bad_gateway', detail:String(e)}); }});
app.listen(PORT, ()=>console.log('listening', PORT, '->', TARGET));
