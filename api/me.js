import { kv } from '@vercel/kv';

function parseCookies(header){
  const out={};
  if(!header) return out;
  header.split(';').forEach(p=>{ const [k,v] = p.trim().split('='); out[k]=decodeURIComponent(v||''); });
  return out;
}

export default async function handler(req, res){
  const cookies = parseCookies(req.headers.cookie || '');
  const sid = cookies.sid;
  if(!sid){ res.status(401).json({ error:'not logged in' }); return; }
  const session = await kv.get(`session:${sid}`);
  if(!session){ res.status(401).json({ error:'session expired' }); return; }
  res.status(200).json({ email: session.email, userId: session.email });
}
