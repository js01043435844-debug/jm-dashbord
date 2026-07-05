import { put, list } from '@vercel/blob';

const PATHNAME = 'jm-dashboard-cards.json';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: PATHNAME });
      const found = blobs.find((b) => b.pathname === PATHNAME);
      if (!found) {
        res.status(200).json(null);
        return;
      }
      const fileRes = await fetch(found.url, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      });
      if (!fileRes.ok) {
        res.status(200).json(null);
        return;
      }
      const data = await fileRes.json();
      res.status(200).json(data);
    } catch (err) {
      res.status(200).json(null);
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      await put(PATHNAME, JSON.stringify(req.body), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
