import { put, list } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

const PATHNAME = 'jm-dashboard-cards.json';

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

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
      const text = await fileRes.text();
      res.status(200).setHeader('Content-Type', 'application/json; charset=utf-8').send(text);
    } catch (err) {
      res.status(200).json(null);
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const raw = await readRawBody(req);
      const body = JSON.parse(raw);
      await put(PATHNAME, JSON.stringify(body), {
        access: 'private',
        contentType: 'application/json; charset=utf-8',
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
