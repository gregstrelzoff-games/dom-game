import { kv } from '@vercel/kv';

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const top = await kv.zrevrange('leaderboard', 0, 19, { withScores: true });
    res.status(200).json({ top });
    return;
  }

  if (req.method === 'POST') {
    const { userId, score } = await readJson(req);
    if (!userId || score == null) {
      res.status(400).json({ error: 'userId and score required' });
      return;
    }
    await kv.zadd('leaderboard', { score: Number(score), member: String(userId) });
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}
