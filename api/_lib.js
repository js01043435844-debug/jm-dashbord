import crypto from 'crypto';

export function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

export function expectedToken() {
  return crypto.createHash('sha256').update(String(process.env.DASHBOARD_PASSWORD || '')).digest('hex');
}

export function isAuthed(req) {
  if (!process.env.DASHBOARD_PASSWORD) return true;
  const cookies = parseCookies(req);
  return cookies.dashboard_auth === expectedToken();
}
