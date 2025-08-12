import { kv } from '@vercel/kv';
import crypto from 'crypto';

function cookie(name, value, opts={}){
  const parts = [`${name}=${value}`];
  if(opts.maxAge!=null) parts.push(`Max-Age=${opts.maxAge}`);
  if(opts.path) parts.push(`Path=${opts.path}`); else parts.push('Path=/');
  parts.push('HttpOnly');
  parts.push('SameSite=Lax');
  if(process.env.VERCEL_URL) parts.push('Secure');
  return parts.join('; ');
}

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.setHeader('Allow','POST'); res.status(405).end('Method Not Allowed'); return; }
  try{
    const chunks=[]; for await (const c of req){ chunks.push(c); }
    const { email, code } = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    if(!email || !code){ res.status(400).json({ error:'email and code required' }); return; }

    const key = `otp:${email.toLowerCase()}`;
    const expected = await kv.get(key);
    if(!expected || String(expected) !== String(code)){
      res.status(401).json({ error:'invalid or expired code' });
      return;
    }

    await kv.del(key);

    const sid = crypto.randomUUID();
    const ttl = 60*60*24*30; // 30 days
    await kv.set(`session:${sid}`, { email, createdAt: Date.now() }, { ex: ttl });

    res.setHeader('Set-Cookie', cookie('sid', sid, { maxAge: ttl }));
    res.status(200).json({ ok:true, email });
  }catch(e){
    res.status(500).json({ error:'server error' });
  }
}
