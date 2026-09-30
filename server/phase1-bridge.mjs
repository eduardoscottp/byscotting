import * as fs from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { phase1Chat } from './phase1.mjs';

const MAX_BODY = 32768;
const MINUTE = 60000;
// One local bridge process is the central admission point. Instances in this
// process sharing a budget path also share concurrency and client admission.
// The short on-disk lock protects reservations against another writer; it is
// deliberately NOT reclaimed automatically after a crash (fail closed).
const pools = new Map();
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const digest = value => createHash('sha256').update(value).digest();
const fault = status => Object.assign(new Error('bridge_request_failed'), { status });
function limit(env, name, fallback) {
  const value = env[name] === undefined ? fallback : Number(env[name]);
  if (!Number.isSafeInteger(value) || value < 1 || value > fallback) throw Error('bridge_configuration_invalid');
  return value;
}

function validBody(body) {
  if (!object(body) || Object.keys(body).some(k => !['message', 'action', 'slot', 'state', 'lang', 'context', 'attribution'].includes(k))) return false;
  if (Object.hasOwn(body, 'message') === Object.hasOwn(body, 'action')) return false;
  if (Object.hasOwn(body, 'message') && (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 1500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(body.message))) return false;
  if (Object.hasOwn(body, 'action') && !['start_capture', 'confirm_save', 'cancel_capture', 'start_booking', 'book_slot', 'refresh_slots', 'check_booking'].includes(body.action)) return false;
  if ((body.action === 'book_slot' || (body.action === 'check_booking' && Object.hasOwn(body, 'slot'))) ? (typeof body.slot !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(body.slot) || !Number.isFinite(Date.parse(body.slot)) || new Date(body.slot).toISOString() !== body.slot) : Object.hasOwn(body, 'slot')) return false;
  if (body.state !== undefined && (typeof body.state !== 'string' || body.state.length > 26000 || !/^[A-Za-z0-9_-]+$/.test(body.state))) return false;
  if (body.lang !== undefined && !['es', 'en'].includes(body.lang)) return false;
  if (body.context !== undefined && !['homepage', 'commercial_cleaning'].includes(body.context)) return false;
  if (body.attribution !== undefined && !object(body.attribution)) return false;
  // Phase1 owns encrypted-state verification and attribution sanitization. This
  // boundary checks transport/schema, not CRM consent or conversation state.
  return true;
}

function readBody(req, timeout) {
  return new Promise((accept, reject) => {
    let size = 0;
    const chunks = [];
    const finish = (error, body) => {
      clearTimeout(timer);
      req.off('data', data); req.off('end', end);
      req.off('error', failed); req.off('aborted', aborted);
      if (error) { req.pause(); reject(error); } else accept(body);
    };
    const data = chunk => {
      size += chunk.length;
      if (size > MAX_BODY) finish(fault(413)); else chunks.push(chunk);
    };
    const end = () => {
      try {
        const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
        finish(null, body);
      } catch { finish(fault(400)); }
    };
    const failed = () => finish(fault(400));
    const aborted = () => finish(fault(400));
    const timer = setTimeout(() => finish(fault(408)), timeout);
    timer.unref();
    req.on('data', data); req.once('end', end);
    req.once('error', failed); req.once('aborted', aborted);
  });
}

function validBudget(value) {
  if (!object(value) || Object.keys(value).sort().join(',') !== 'confirmSave,day,requests,v' || value.v !== 1) return false;
  if (typeof value.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.day)) return false;
  const date = new Date(value.day + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.day &&
    Number.isSafeInteger(value.requests) && value.requests >= 0 &&
    Number.isSafeInteger(value.confirmSave) && value.confirmSave >= 0 && value.confirmSave <= value.requests;
}

function reserve(file, pool, day, confirm, limits, io) {
  if (pool.failed) throw fault(503);
  const parent = dirname(file);
  let lock, temp, fd, dirfd, status;
  try {
    // The directory must already exist. Never create it or follow budget/lock
    // symlinks. Budget data is small and contains counters only, never IDs/PII.
    dirfd = io.openSync(parent, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
    lock = io.openSync(file + '.lock', fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    let current;
    try {
      // O_NONBLOCK lets fstat reject a FIFO rather than hang admission.
      fd = io.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    } catch (error) {
      if (error.code !== 'ENOENT' || pool.seen) throw error;
    }
    if (fd !== undefined) {
      const stat = io.fstatSync(fd);
      if (!stat.isFile() || (stat.mode & 0o777) !== 0o600 || stat.size > 4096) throw Error('invalid_budget');
      current = JSON.parse(io.readFileSync(fd, 'utf8'));
      io.closeSync(fd); fd = undefined;
      if (!validBudget(current)) throw Error('invalid_budget');
      pool.seen = true;
      // A backward UTC date must not grant a second daily allowance.
      if (current.day > day) throw Error('invalid_budget_date');
    }
    if (!current || current.day < day) current = { v: 1, day, requests: 0, confirmSave: 0 };
    if (current.requests >= limits.daily || (confirm && current.confirmSave >= limits.saves)) {
      status = 429;
    } else {
      current.requests++;
      if (confirm) current.confirmSave++;
      temp = resolve(parent, `.${basename(file)}.${randomUUID()}.tmp`);
      fd = io.openSync(temp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
      io.fchmodSync(fd, 0o600);
      io.writeFileSync(fd, JSON.stringify(current) + '\n', 'utf8');
      io.fsyncSync(fd);
      io.closeSync(fd); fd = undefined;
      io.renameSync(temp, file); temp = undefined;
      io.fsyncSync(dirfd);
      pool.seen = true;
    }
  } catch {
    pool.failed = true;
    status = 503;
  } finally {
    // Cleanup errors also deny dispatch: even an uncertain write is not free.
    try {
      if (fd !== undefined) io.closeSync(fd);
      if (temp !== undefined) io.unlinkSync(temp);
      if (lock !== undefined) { io.closeSync(lock); io.unlinkSync(file + '.lock'); }
      if (dirfd !== undefined) io.closeSync(dirfd);
    } catch { pool.failed = true; status = 503; }
  }
  if (status) throw fault(status);
}

function clientSlot(pool, id, time, maximum, cap) {
  // Only digests and rolling admission timestamps live in this bounded map.
  for (const [key, times] of pool.clients) {
    const live = times.filter(t => t > time - MINUTE);
    if (live.length) pool.clients.set(key, live); else pool.clients.delete(key);
  }
  if (!id) return null;
  const key = digest(id).toString('hex');
  const times = pool.clients.get(key);
  if ((times && times.length >= maximum) || (!times && pool.clients.size >= cap)) throw fault(429);
  return { key, times: times || [] };
}

/**
 * Local-only HTTP adapter; no user identity, tools, CORS, or extra routes.
 * env is local trusted configuration; request data can never extend deps.
 * now is a millisecond clock. fsImpl is solely for deterministic I/O tests.
 * Optional SCOTTING_CHAT_{DAILY_LIMIT,CONFIRM_SAVE_DAILY_LIMIT,
 * MAX_CONCURRENCY,CLIENT_PER_MINUTE,CLIENT_MAP_CAP,READ_TIMEOUT_MS} can only
 * lower defaults (1000, 50, 4, 60, 1000, 10000). Budget errors latch closed
 * until process restart after operator repair. Use one listener/process.
 */
export function createBridge({ env = process.env, handler = phase1Chat, now = Date.now, fsImpl = fs } = {}) {
  const key = env.SCOTTING_CHAT_BRIDGE_KEY;
  if (typeof key !== 'string' || key.length < 32 || /[\s\u0000-\u001f\u007f]/u.test(key) || typeof env.SCOTTING_CHAT_BUDGET_FILE !== 'string' || !env.SCOTTING_CHAT_BUDGET_FILE.trim() || typeof handler !== 'function' || typeof now !== 'function') throw Error('bridge_configuration_invalid');
  const expected = digest(key);
  const file = resolve(env.SCOTTING_CHAT_BUDGET_FILE);
  const limits = {
    daily: limit(env, 'SCOTTING_CHAT_DAILY_LIMIT', 1000),
    saves: limit(env, 'SCOTTING_CHAT_CONFIRM_SAVE_DAILY_LIMIT', 50),
    concurrent: limit(env, 'SCOTTING_CHAT_MAX_CONCURRENCY', 4),
    client: limit(env, 'SCOTTING_CHAT_CLIENT_PER_MINUTE', 60),
    cap: limit(env, 'SCOTTING_CHAT_CLIENT_MAP_CAP', 1000),
    read: limit(env, 'SCOTTING_CHAT_READ_TIMEOUT_MS', 10000),
  };
  if (!pools.has(file)) pools.set(file, { active: 0, clients: new Map(), seen: false, failed: false, lastTime: 0 });
  const pool = pools.get(file);
  return async function bridge(req, res) {
    let admitted = false;
    const send = (status, body) => {
      // Serialize before writing headers so malformed handler results cannot
      // produce a partial success or leak an exception.
      const json = JSON.stringify(body);
      if (json === undefined) throw Error('invalid_result');
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Connection': 'close', 'X-Content-Type-Options': 'nosniff' });
      res.end(json);
    };
    try {
      if (req.url !== '/v1/lead-chat') throw fault(404);
      if (req.method !== 'POST') throw fault(405);
      const auth = req.headers.authorization;
      const duplicate = name => req.rawHeaders.filter((_, i) => i % 2 === 0 && req.rawHeaders[i].toLowerCase() === name).length > 1;
      const match = typeof auth === 'string' ? /^Bearer ([^\s]+)$/.exec(auth) : null;
      // Hash both sides to fixed-size buffers before timing-safe comparison.
      const authenticated = timingSafeEqual(expected, digest(match?.[1] || ''));
      if (!match || !authenticated || duplicate('authorization')) throw fault(401);
      if (duplicate('content-type') || !/^application\/json(?:\s*;\s*charset=utf-8)?\s*$/i.test(req.headers['content-type'] || '') || req.headers['content-encoding']) throw fault(415);
      if (req.headers['content-length'] && Number(req.headers['content-length']) > MAX_BODY) throw fault(413);
      const id = req.headers['x-scotting-client-id'];
      if (duplicate('x-scotting-client-id') || (id !== undefined && (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)))) throw fault(400);
      if (pool.active >= limits.concurrent) throw fault(429);
      pool.active++; admitted = true;
      const body = await readBody(req, limits.read);
      if (!validBody(body)) throw fault(400);
      const time = now();
      if (!Number.isSafeInteger(time) || time < 0) throw fault(503);
      const day = new Date(time).toISOString().slice(0, 10);
      // Clock rollback never expires a client's previous admissions early.
      pool.lastTime = Math.max(time, pool.lastTime);
      const slot = clientSlot(pool, id, pool.lastTime, limits.client, limits.cap);
      // Shared durable write-attempt budget covers CRM and Calendar, including
      // reconciliation that may safely retry a previously authorized write.
      reserve(file, pool, day, ['confirm_save', 'book_slot', 'check_booking'].includes(body.action), limits, fsImpl);
      if (slot) { slot.times.push(pool.lastTime); pool.clients.set(slot.key, slot.times); }
      // Persisted reservations are never refunded, including errors/disconnects.
      const result = await handler(body, { env, now: time });
      if (!result || !Number.isInteger(result.status) || result.status < 200 || result.status > 599) throw Error('invalid_result');
      send(result.status, result.body);
    } catch (error) {
      const status = [400, 401, 404, 405, 408, 413, 415, 429, 503].includes(error?.status) ? error.status : 503;
      const codes = { 400: 'invalid_request', 401: 'unauthorized', 404: 'not_found', 405: 'method_not_allowed', 408: 'request_timeout', 413: 'body_too_large', 415: 'unsupported_media_type', 429: 'rate_limited', 503: 'chat_unavailable' };
      send(status, { error: codes[status] });
    } finally {
      if (admitted) pool.active--;
    }
  };
}
