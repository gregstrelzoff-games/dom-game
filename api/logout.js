import { kv } from '@vercel/kv';

function cookieExpired(){
  return 'sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax' + (process.env.VERCEL_URL?'; Secure':'');
}

function parseCookies(header){
  const out={}; if(!header) return out; header.split(';').forEach(p=>{ const [k,v] = p.trim().split('='); out[k]=decodeURIComponent(v||''); }); return out;
}

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.setHeader('Allow','POST'); res.status(405).end('Method Not Allowed'); return; }
  const cookies = parseCookies(req.headers.cookie || '');
  const sid = cookies.sid;
  if(sid){ await kv.del(`session:${sid}`); }
  res.setHeader('Set-Cookie', cookieExpired());
  res.status(200).json({ ok:true });
}
