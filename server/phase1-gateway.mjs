import { createHmac } from 'node:crypto';
import { phase1Chat } from './phase1.mjs';
const unavailable = () => ({ status: 503, body: { error: 'chat_unavailable' } });
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const iso = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
function times(v) { return object(v) && iso(v.start) && iso(v.end) && iso(v.callEnd) && Date.parse(v.end) - Date.parse(v.start) === 1800000 && Date.parse(v.callEnd) - Date.parse(v.start) === 900000; }
function googleLink(value, host) {
  try { const u = new URL(value); return typeof value === 'string' && value.length <= 2000 && u.protocol === 'https:' && u.hostname === host && !u.username && !u.password && !u.port; }
  catch { return false; }
}
function bookingMetadata(data) {
  const out = {};
  if (data.crmSaved !== undefined) {
    if (typeof data.crmSaved !== 'boolean') throw Error('invalid_metadata');
    out.crmSaved = data.crmSaved;
  }
  if (data.bookingAvailable !== undefined) {
    if (typeof data.bookingAvailable !== 'boolean') throw Error('invalid_metadata');
    out.bookingAvailable = data.bookingAvailable;
  }
  if (data.slots !== undefined) {
    if (!Array.isArray(data.slots) || data.slots.length > 3 || data.slots.some(s => !times(s) || s.id !== s.start || typeof s.label !== 'string' || !s.label.trim() || s.label.length > 250) || new Set(data.slots.map(s=>s.id)).size !== data.slots.length) throw Error('invalid_metadata');
    out.slots = data.slots.map(({id,start,end,callEnd,label}) => ({id,start,end,callEnd,label}));
  }
  if (data.appointment !== undefined) {
    const a = data.appointment;
    if (data.status !== 'booked' || !times(a) || !googleLink(a.meetUrl, 'meet.google.com') || (a.calendarUrl !== undefined && !googleLink(a.calendarUrl, 'calendar.google.com'))) throw Error('invalid_metadata');
    out.appointment = {start:a.start,end:a.end,callEnd:a.callEnd,meetUrl:a.meetUrl,...(a.calendarUrl ? {calendarUrl:a.calendarUrl} : {})};
  }
  if (data.status === 'booked' && !out.appointment) throw Error('invalid_metadata');
  return out;
}

// Vercel has only a narrow bridge credential, never the Hermes administrative key.
export async function phase1Gateway(body, { env = process.env, clientAddress = 'unknown', fetch: request = globalThis.fetch } = {}) {
  if (!env.SCOTTING_CHAT_BRIDGE_URL && !env.VERCEL) return phase1Chat(body, { env, fetch: request });
  const secret = env.SCOTTING_CHAT_BRIDGE_KEY;
  let url;
  try { url = new URL(env.SCOTTING_CHAT_BRIDGE_URL); } catch { return unavailable(); }
  if (url.protocol !== 'https:' || url.hostname !== 'chat.srv1237793.hstgr.cloud' || url.pathname !== '/v1/lead-chat' || url.port || url.search || url.hash || url.username || url.password || typeof secret !== 'string' || secret.length < 32) return unavailable();
  try {
    const response = await request(url.toString(), {
      method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: ['Bearer', secret].join(' '), 'X-Scotting-Client-ID': createHmac('sha256', secret).update(clientAddress).digest('hex') },
      body: JSON.stringify(body), signal: AbortSignal.timeout(55000),
    });
    if (response.status === 429) return { status: 429, body: { error: 'try_again_later' } };
    if (response.status === 409) return { status: 409, body: { error: 'chat_session_expired' } };
    if (response.status === 400) return { status: 400, body: { error: 'invalid_request' } };
    if (!response.ok) return unavailable();
    const data = await response.json();
    if (typeof data?.reply !== 'string' || !data.reply.trim() || data.reply.length > 8000 || typeof data.state !== 'string' || !data.state || data.state.length > 26000 || !['chat','collecting','confirmation_required','saved','booking_collecting','booking_options','booking_pending','booked'].includes(data.status)) return unavailable();
    return { status: 200, body: { reply: data.reply, state: data.state, status: data.status, ...bookingMetadata(data), ...(['es','en'].includes(data.lang) ? { lang: data.lang } : {}) } };
  } catch { return unavailable(); }
}
