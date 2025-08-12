import { kv } from '@vercel/kv';

function code6(){
  return String(Math.floor(100000 + Math.random()*900000));
}

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.setHeader('Allow','POST'); res.status(405).end('Method Not Allowed'); return; }
  try{
    const chunks=[]; for await (const c of req){ chunks.push(c); }
    const { email } = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    if(!email || !/.+@.+\..+/.test(email)){ res.status(400).json({ error:'valid email required' }); return; }

    const code = code6();
    await kv.set(`otp:${email.toLowerCase()}`, code, { ex: 600 }); // 10 minutes

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.FROM_EMAIL || 'no-reply@example.com';
    if(apiKey){
      // Try to send email via Resend
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: email,
          subject: 'Your login code',
          text: `Your code is ${code}. It expires in 10 minutes.`
        })
      }).catch(()=>{});
      res.status(200).json({ ok:true });
    }else{
      // Dev mode: surface code if no mailer configured
      res.status(200).json({ ok:true, devCode: code });
    }
  }catch(e){
    res.status(500).json({ error:'server error' });
  }
}
