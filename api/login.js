import { readRawBody, expectedToken } from './_lib.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const raw = await readRawBody(req);
    const { password } = JSON.parse(raw);
    const expected = process.env.DASHBOARD_PASSWORD;

    if (!expected || password !== expected) {
      res.status(401).json({ error: '비밀번호가 올바르지 않습니다' });
      return;
    }

    const token = expectedToken();
    const maxAge = 60 * 60 * 24 * 180; // 180일
    res.setHeader('Set-Cookie', `dashboard_auth=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
