import { put, list } from '@vercel/blob';

const PATHNAME = 'jm-dashboard-cards.json';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: PATHNAME });
      const found = blobs.find((b) => b.pathname === PATHNAME);
      if (!found) {
        res.status(200).json(null);
        return;
      }
      const fileRes = await fetch(found.url, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      });
      const data = await fileRes.json();
      res.status(200).json(data);
      return;
    }

    if (req.method === 'POST') {
      await put(PATHNAME, JSON.stringify(req.body), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
