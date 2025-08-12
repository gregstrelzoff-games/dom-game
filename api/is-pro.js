import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const email = url.searchParams.get('email');
  if (!email) { res.status(400).json({ error: 'email required' }); return; }
  const flag = await kv.get(`pro:${email.toLowerCase()}`);
  res.status(200).json({ pro: Boolean(flag) });
}
