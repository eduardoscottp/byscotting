// These per-instance limits are defense in depth, not a distributed spending cap.
const buckets = new Map();
export async function serve(req, res, handler, env = process.env) {
  const send = (status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(JSON.stringify(body));
  };
  if (env.SCOTTING_API_ENABLED !== 'true') return send(503, { error: 'service_unavailable' });
  const origins = (env.SCOTTING_ALLOWED_ORIGINS || 'https://byscotting.com').split(',').map(s => s.trim());
  const origin = req.headers.origin;
  if (!origin || !origins.includes(origin)) return send(403, { error: 'origin_not_allowed' });
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return send(204, {});
  }
  if (req.method !== 'POST') return send(405, { error: 'method_not_allowed' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return send(415, { error: 'json_required' });
  const now = Date.now();
  for (const [key, item] of buckets) if (item.expires < now) buckets.delete(key);
  // Use the platform-controlled forwarding header only on Vercel; direct Node uses the socket.
  const ip = env.VERCEL ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : req.socket?.remoteAddress || 'unknown';
  const bucket = buckets.get(ip) || { count: 0, expires: now + 60000 };
  if (bucket.count >= 12 || (!buckets.has(ip) && buckets.size >= 1000)) return send(429, { error: 'try_again_later' });
  bucket.count++; buckets.set(ip, bucket);
  try {
    let body = req.body;
    if (body === undefined) {
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += Buffer.byteLength(chunk);
        if (size > 32768) return send(413, { error: 'request_too_large' });
        chunks.push(Buffer.from(chunk));
      }
      body = Buffer.concat(chunks).toString('utf8');
    }
    if (Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body)) > 32768) return send(413, { error: 'request_too_large' });
    if (typeof body === 'string') body = JSON.parse(body);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400, { error: 'invalid_request' });
    const result = await handler(body, { env });
    return send(result.status, result.body);
  } catch { return send(400, { error: 'invalid_request' }); }
}
