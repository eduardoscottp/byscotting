import { constants } from 'node:fs';
import { open, lstat, readdir, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { isAbsolute, join } from 'node:path';

// Server-only adapter. No client-supplied calendar, endpoint, credentials or URLs.
const CALENDAR = 'sales@keenkaya.com';
const ZONE = 'America/New_York';
const API = 'https://www.googleapis.com/calendar/v3';
const EVENTS = `/calendars/${encodeURIComponent(CALENDAR)}/events`;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const MINUTE = 60_000;
const BLOCK = 30 * MINUTE;
const CALL = 15 * MINUTE;
const NOTICE = 120 * MINUTE;
const HORIZON = 14 * 24 * 60 * MINUTE;
const TIMEOUT = 10_000;
const MAX_BODY = 1_048_576;
const utcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const rfc3339Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const eventPattern = /^s[a-f0-9]{64}$/;
const localFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = () => { throw new Error('Booking unavailable'); };
const unavailableSlots = () => ({ status: 'unavailable', slots: [] });
const iso = value => new Date(value).toISOString();
const slotsFor = start => ({ start: iso(start), end: iso(start + BLOCK), callEnd: iso(start + CALL) });
const owned = stat => typeof process.getuid !== 'function' || stat.uid === process.getuid();

function timestamp(value, utc = false) {
  if (typeof value !== 'string' || !(utc ? utcPattern : rfc3339Pattern).test(value)) return NaN;
  const ms = Date.parse(value);
  // RFC3339 wall dates must be real, including provider busy intervals with
  // offsets. Date.parse otherwise silently accepts dates such as February 30.
  const day = new Date(value.slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value.slice(0, 10) || Number(value.slice(11, 13)) > 23) return NaN;
  // Reject Date.parse's normalization of invalid UTC dates (e.g. February 30).
  if (utc && Number.isFinite(ms) && iso(ms) !== value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z')) return NaN;
  return ms;
}

function localParts(start) {
  return Object.fromEntries(localFormatter.formatToParts(new Date(start)).map(p => [p.type, p.value]));
}

function eligible(start, clock) {
  if (!Number.isFinite(clock) || !Number.isFinite(start) || start % MINUTE !== 0 || start < clock + NOTICE || start + BLOCK > clock + HORIZON) return false;
  const p = localParts(start);
  const minutes = Number(p.hour) * 60 + Number(p.minute);
  return !['Sat', 'Sun'].includes(p.weekday) && minutes >= 600 && minutes <= 930;
}

function cleanText(value, limit, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.length > limit || /[\x00-\x1f\x7f<>]/.test(value)) fail();
  const text = value.trim();
  if (required && !text) fail();
  return text;
}

function normalizedInput(input) {
  if (!input || typeof input !== 'object' || typeof input.sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(input.sessionId)) fail();
  const start = timestamp(input.start, true);
  if (!Number.isFinite(start)) fail();
  const email = cleanText(input.email, 254, true).toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email) || email === CALENDAR) fail();
  return {
    version: 1,
    eventId: `s${sha(`scotting-booking-v1\0${CALENDAR}\0${input.sessionId}`)}`,
    ...slotsFor(start),
    name: cleanText(input.name, 200, true), email,
    company: cleanText(input.company, 200),
    website: cleanText(input.website, 500),
    phone: cleanText(input.phone, 80),
  };
}

function sealIntent(data) {
  return { ...data, intentHash: sha(JSON.stringify(data)) };
}

function validateIntent(data, eventId) {
  if (!data || data.version !== 1 || !eventPattern.test(eventId) || data.eventId !== eventId) fail();
  const start = timestamp(data.start, true);
  if (!Number.isFinite(start) || data.end !== iso(start + BLOCK) || data.callEnd !== iso(start + CALL)) fail();
  const fields = {
    version: 1, eventId, ...slotsFor(start),
    name: cleanText(data.name, 200, true), email: cleanText(data.email, 254, true),
    company: cleanText(data.company, 200), website: cleanText(data.website, 500), phone: cleanText(data.phone, 80),
  };
  if (sealIntent(fields).intentHash !== data.intentHash) fail();
  return { ...fields, intentHash: data.intentHash };
}

async function readPrivateJSON(filename, maxBytes = 32_768, credential = false) {
  const handle = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || !owned(stat) || ![0o600, ...(credential ? [0o400] : [])].includes(stat.mode & 0o777) || stat.nlink !== 1 || stat.size > maxBytes) fail();
    const text = await handle.readFile('utf8');
    if (Buffer.byteLength(text) > maxBytes) fail();
    return JSON.parse(text);
  } finally { await handle.close(); }
}

async function stateDirectory(directory) {
  if (!isAbsolute(directory)) fail();
  const before = await lstat(directory);
  if (!before.isDirectory() || !owned(before) || (before.mode & 0o077) !== 0) fail();
  const handle = await open(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  const stat = await handle.stat();
  if (stat.ino !== before.ino || stat.dev !== before.dev) { await handle.close(); fail(); }
  return handle;
}

async function acquireLock(directory, directoryHandle) {
  const path = join(directory, '.booking.lock');
  // Exclusive creation is cross-process. NEVER time-expire or steal a lock: a
  // paused worker could still INSERT. A crash requires operator recovery with
  // all workers stopped, checking the durable intent and Google event first.
  const handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  const nonce = randomUUID();
  let stat;
  const assertOwned = async () => {
    const current = await lstat(path);
    if (!current.isFile() || current.ino !== stat.ino || current.dev !== stat.dev || (await readPrivateJSON(path)).nonce !== nonce) fail();
  };
  try {
    await handle.chmod(0o600);
    stat = await handle.stat();
    await handle.writeFile(JSON.stringify({ version: 1, nonce }));
    await handle.sync();
    await directoryHandle.sync();
  } catch (error) {
    // Leave even an incompletely initialized lock in place, fail closed.
    await handle.close();
    throw error;
  }
  return {
    assertOwned,
    async release() {
      try {
        await assertOwned();
        await unlink(path);
        await directoryHandle.sync();
      } catch { /* Never delete an unrecognized/replaced lock, or log internals. */ }
      finally { await handle.close(); }
    },
  };
}

async function loadIntent(directory, eventId) {
  try { return validateIntent(await readPrivateJSON(join(directory, `${eventId}.json`)), eventId); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function localBusy(directory) {
  const intervals = [];
  for (const filename of await readdir(directory)) {
    if (!/^s[a-f0-9]{64}\.json$/.test(filename)) continue;
    const data = await loadIntent(directory, filename.slice(0, -5));
    // Even uncertain intents reserve their block locally. External deletion or
    // local corruption must not silently make a previously attempted slot free.
    if (!data) fail();
    intervals.push({ start: timestamp(data.start), end: timestamp(data.end) });
  }
  return intervals;
}

async function persistIntent(directory, directoryHandle, intent) {
  const handle = await open(join(directory, `${intent.eventId}.json`), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    await handle.chmod(0o600);
    await handle.writeFile(JSON.stringify(intent));
    await handle.sync();
  } finally { await handle.close(); }
  // The intention and its directory entry must reach disk BEFORE the write to
  // Google. Never overwrite/delete it, even if the response is lost or an error.
  await directoryHandle.sync();
}

function allowedLink(value, meet = false) {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return undefined;
    if (meet) return url.hostname === 'meet.google.com' && /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url.pathname) && !url.search ? url.href : undefined;
    if (!['calendar.google.com', 'www.google.com'].includes(url.hostname) || !url.pathname.startsWith('/calendar/')) return undefined;
    // Google commonly returns www.google.com/calendar/event links. Canonicalize
    // before passing the narrowly allowlisted public receipt through the gateway.
    url.hostname = 'calendar.google.com';
    return url.href;
  } catch { return undefined; }
}

function eventResult(event, intent) {
  const uncertain = { status: 'uncertain', ...slotsFor(timestamp(intent.start)), eventId: intent.eventId };
  if (!event || event.id !== intent.eventId || event.status !== 'confirmed' || event.transparency !== 'opaque' ||
      event.organizer?.email?.toLowerCase() !== CALENDAR || event.recurrence || event.recurringEventId ||
      timestamp(event.start?.dateTime) !== timestamp(intent.start) || timestamp(event.end?.dateTime) !== timestamp(intent.end) ||
      event.extendedProperties?.private?.scottingIntent !== intent.intentHash ||
      !Array.isArray(event.attendees) || event.attendees.length !== 1 || event.attendees[0]?.email?.toLowerCase() !== intent.email || event.attendeesOmitted) return uncertain;
  const conference = event.conferenceData;
  if (conference?.createRequest?.requestId !== intent.eventId) return uncertain;
  const status = conference.createRequest.status?.statusCode;
  const base = { ...slotsFor(timestamp(intent.start)), eventId: intent.eventId };
  const calendarUrl = allowedLink(event.htmlLink);
  if (calendarUrl) base.calendarUrl = calendarUrl;
  if (status === 'pending') return { status: 'pending', ...base };
  if (status !== 'success' || conference.conferenceSolution?.key?.type !== 'hangoutsMeet') return uncertain;
  const meetUrl = Array.isArray(conference.entryPoints) && conference.entryPoints
    .filter(entry => entry?.entryPointType === 'video')
    .map(entry => allowedLink(entry.uri, true)).find(Boolean);
  return meetUrl ? { status: 'booked', ...base, meetUrl } : uncertain;
}

function eventBody(intent) {
  return {
    id: intent.eventId,
    summary: 'Scotting — llamada de diagnóstico',
    description: [
      'Llamada de 15 minutos + 15 minutos de margen reservado (bloque total de 30 minutos).',
      `Nombre: ${intent.name}`, `Empresa: ${intent.company}`, `Web: ${intent.website}`, `Teléfono: ${intent.phone}`,
    ].join('\n'),
    start: { dateTime: intent.start, timeZone: ZONE },
    end: { dateTime: intent.end, timeZone: ZONE },
    transparency: 'opaque', visibility: 'private',
    attendees: [{ email: intent.email }],
    guestsCanInviteOthers: false, guestsCanModify: false, guestsCanSeeOtherGuests: false,
    extendedProperties: { private: { scottingIntent: intent.intentHash } },
    conferenceData: { createRequest: { requestId: intent.eventId, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
  };
}

/**
 * Public contract: { enabled, listSlots({preferredStart}?), book(input) }.
 * UTC ISO strings; listSlots returns available (1–3 options) or unavailable ([]).
 * book returns booked | pending | conflict | uncertain | unavailable. Only
 * booked contains a validated Meet URL. No status asserts email delivery.
 *
 * Deployment prerequisites: existing private (0700) directory on a durable
 * local filesystem shared by EVERY connector worker, same OS user; private
 * (0600) authorized_user OAuth JSON. No ephemeral/serverless state directories.
 * All paths/parents must be administratively controlled. Do not delete intents.
 * A leftover lock is deliberately NOT auto-recovered after a crash.
 *
 * Google has no atomic freeBusy+insert transaction: external calendar edits
 * can still race this connector, despite its own global lock and recheck.
 */
export function createBookingService({ env = process.env, fetch = globalThis.fetch, now = () => Date.now() } = {}) {
  const directory = env.SCOTTING_BOOKING_STATE_DIR;
  const tokenFile = env.SCOTTING_GOOGLE_TOKEN_FILE;
  const enabled = env.SCOTTING_BOOKING_ENABLED === 'true' && typeof directory === 'string' && directory.trim() !== '' && typeof tokenFile === 'string' && tokenFile.trim() !== '';
  let cachedToken;
  let verifiedCredential;
  let refreshPromise;

  async function request(url, init) {
    // URL allowlist is defense in depth: all callers use fixed Google routes.
    const parsed = new URL(url);
    if (parsed.origin !== 'https://www.googleapis.com' && url !== TOKEN_URL) fail();
    if (parsed.username || parsed.password || parsed.hash) fail();
    const abort = new AbortController();
    let timer;
    try {
      return await Promise.race([
        (async () => {
          const response = await fetch(url, { ...init, redirect: 'error', signal: abort.signal });
          if (response.redirected || (response.url && response.url !== url)) fail();
          if (response.status === 404) return { status: 404, data: null };
          if (!response.ok) fail();
          if (Number(response.headers?.get('content-length')) > MAX_BODY) fail();
          const text = await response.text();
          if (Buffer.byteLength(text) > MAX_BODY) fail();
          return { status: response.status, data: JSON.parse(text) };
        })(),
        new Promise((_, reject) => {
          timer = setTimeout(() => { abort.abort(); reject(new Error('Booking unavailable')); }, TIMEOUT);
        }),
      ]);
    } finally { clearTimeout(timer); }
  }

  async function accessToken() {
    if (cachedToken && cachedToken.expiresAt > now() + MINUTE) return cachedToken.value;
    if (!refreshPromise) refreshPromise = (async () => {
      if (!isAbsolute(tokenFile)) fail();
      const credential = await readPrivateJSON(tokenFile, 32_768, true);
      if (credential.type !== 'authorized_user' || !['client_id', 'client_secret', 'refresh_token'].every(key => typeof credential[key] === 'string' && credential[key].length > 0)) fail();
      // Ignore token_uri from the file. Never send refresh secrets to other hosts.
      const response = await request(TOKEN_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', client_id: credential.client_id, client_secret: credential.client_secret, refresh_token: credential.refresh_token }).toString(),
      });
      const token = response.data;
      if (typeof token?.access_token !== 'string' || !token.access_token || /[\r\n]/.test(token.access_token) || token.token_type?.toLowerCase() !== 'bearer' || !Number.isFinite(token.expires_in) || token.expires_in <= 60) fail();
      cachedToken = { value: token.access_token, expiresAt: now() + Math.min(token.expires_in, 3600) * 1000 };
      return cachedToken.value;
    })().finally(() => { refreshPromise = undefined; });
    return refreshPromise;
  }

  async function api(route, method = 'GET', body) {
    await accessToken();
    // A refreshed OAuth token must be identity-checked before any calendar call,
    // even when the refresh happened halfway through a booking operation.
    if (route !== '/users/me/calendarList/primary' && verifiedCredential !== cachedToken) await verifyIdentity();
    const token = cachedToken.value;
    return request(`${API}${route}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  async function verifyIdentity() {
    const { data } = await api('/users/me/calendarList/primary');
    if (data?.id !== CALENDAR || data.primary !== true || data.accessRole !== 'owner' ||
        !Array.isArray(data.conferenceProperties?.allowedConferenceSolutionTypes) ||
        !data.conferenceProperties.allowedConferenceSolutionTypes.includes('hangoutsMeet')) fail();
    verifiedCredential = cachedToken;
  }

  async function freeBusy(start, end) {
    const { data } = await api('/freeBusy', 'POST', { timeMin: iso(start), timeMax: iso(end), timeZone: ZONE, items: [{ id: CALENDAR }] });
    const calendar = data?.calendars?.[CALENDAR];
    if (!data || data.error !== undefined || data.errors !== undefined || !Number.isFinite(timestamp(data.timeMin)) || !Number.isFinite(timestamp(data.timeMax)) ||
        timestamp(data.timeMin) > start || timestamp(data.timeMax) < end || !calendar || calendar.error !== undefined ||
        (calendar.errors !== undefined && (!Array.isArray(calendar.errors) || calendar.errors.length !== 0)) ||
        !Array.isArray(calendar.busy) || calendar.busy.length > 10_000) fail();
    return calendar.busy.map(item => {
      const a = timestamp(item?.start), b = timestamp(item?.end);
      if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) fail();
      return { start: a, end: b };
    });
  }

  async function listSlots({ preferredStart } = {}) {
    if (!enabled) return unavailableSlots();
    let handle;
    try {
      handle = await stateDirectory(directory);
      const clock = now();
      if (!Number.isFinite(clock)) fail();
      await verifyIdentity();
      const busy = [...await freeBusy(clock + NOTICE, clock + HORIZON), ...await localBusy(directory)];
      const free = start => eligible(start, clock) && busy.every(b => start + BLOCK <= b.start || start >= b.end);
      const preferred = timestamp(preferredStart, true);
      const selected = [];
      const candidates = [];
      if (free(preferred)) selected.push(preferred);
      for (let start = Math.ceil((clock + NOTICE) / BLOCK) * BLOCK; start + BLOCK <= clock + HORIZON; start += BLOCK) {
        if (free(start) && start !== preferred) candidates.push(start);
      }
      const dayKey = start => { const p = localParts(start); return `${p.year}-${p.month}-${p.day}`; };
      const days = new Set(selected.map(dayKey));
      for (const start of candidates) {
        if (selected.length === 3) break;
        if (!days.has(dayKey(start))) { selected.push(start); days.add(dayKey(start)); }
      }
      for (const start of candidates) {
        if (selected.length === 3) break;
        if (!selected.includes(start)) selected.push(start);
      }
      return {
        status: selected.length ? 'available' : 'unavailable', slots: selected.map(slotsFor),
        ...(preferredStart !== undefined ? { preferredAvailable: selected.includes(preferred) } : {}),
      };
    } catch { return unavailableSlots(); }
    finally { if (handle) await handle.close().catch(() => {}); }
  }

  async function book(input, { reconcileOnly = false } = {}) {
    if (!enabled) return { status: 'unavailable' };
    let directoryHandle, lock, intent;
    let persisted = false;
    try {
      const requested = normalizedInput(input);
      directoryHandle = await stateDirectory(directory);
      try { lock = await acquireLock(directory, directoryHandle); }
      catch { return { status: 'uncertain' }; }
      const existing = await loadIntent(directory, requested.eventId);
      if (existing) {
        persisted = true;
        intent = existing;
        if (existing.start !== requested.start || existing.email !== requested.email) return { status: 'uncertain' };
        await verifyIdentity();
        await lock.assertOwned();
        // Once an intention exists, all retries are read-only, including 404.
        // A crash between fsync and INSERT sacrifices availability, not safety.
        const { data } = await api(`${EVENTS}/${intent.eventId}`);
        return eventResult(data, intent);
      }
      if (!reconcileOnly && !eligible(timestamp(requested.start), now())) return { status: 'unavailable' };
      await verifyIdentity();
      await lock.assertOwned();
      const { status: lookupStatus } = await api(`${EVENTS}/${requested.eventId}`);
      // No local record + existing Google ID is not safe to take over or replace.
      if (lookupStatus !== 404) return { status: 'uncertain' };
      // Recovery from a lost response is lookup-only. A missing durable intent
      // and missing Google event cannot authorize creating an appointment.
      if (reconcileOnly) return { status: 'unavailable' };
      const start = timestamp(requested.start);
      const local = await localBusy(directory);
      const busy = [...await freeBusy(start, start + BLOCK), ...local];
      if (busy.some(b => start < b.end && start + BLOCK > b.start)) return { status: 'conflict' };
      // Network delay must not turn an originally valid slot into short notice.
      if (!eligible(start, now())) return { status: 'unavailable' };
      await lock.assertOwned();
      intent = sealIntent(requested);
      // Treat even a failed disk write as uncertain: it could have partly reached
      // disk. Do not remove the record, rotate the ID, or attempt INSERT again.
      persisted = true;
      await persistIntent(directory, directoryHandle, intent);
      await lock.assertOwned();
      try {
        const { data } = await api(`${EVENTS}?conferenceDataVersion=1&sendUpdates=all`, 'POST', eventBody(intent));
        return eventResult(data, intent);
      } catch {
        // Lost response / duplicate / HTTP error: reconcile the SAME ID by GET.
        const { data } = await api(`${EVENTS}/${intent.eventId}`);
        return eventResult(data, intent);
      }
    } catch {
      return { status: persisted ? 'uncertain' : 'unavailable' };
    } finally {
      if (lock) await lock.release().catch(() => {});
      if (directoryHandle) await directoryHandle.close().catch(() => {});
    }
  }

  return Object.freeze({ enabled, listSlots, book });
}
