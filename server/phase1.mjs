import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { chat, saveLead, sanitizeAttribution, sanitizeWebsite } from './mvp.mjs';
import { createBookingService } from './booking.mjs';

const TTL = 60 * 60 * 1000;
const SLOT_TTL = 5 * 60 * 1000;
// Same invitation-address boundary as the calendar adapter; callback capture
// still accepts its existing broader contact syntax independently.
const emailOK = v => typeof v === 'string' && v.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(v) && v.toLowerCase() !== 'sales@keenkaya.com';
const MAX_STATE_BYTES = 26000;
const fail = (status, error) => ({ status, body: { error } });
const clean = (v, max) => typeof v === 'string' && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v) ? v.trim() : null;
const sensitive = v => /(?:\b(?:sk-|pat)[A-Za-z0-9_-]{16,}|-----BEGIN .*PRIVATE KEY-----|\b(?:\d[ -]?){13,19}\b|\b\d{3}-\d{2}-\d{4}\b)/u.test(v);
const contactOK = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || (/^[+\d() .-]+$/.test(v) && v.replace(/\D/g, '').length >= 8 && v.replace(/\D/g, '').length <= 15);
const keyFor = env => createHash('sha256').update('scotting-phase1-state-v1\0' + env.LEAD_SIGNING_SECRET).digest();
function seal(state, env) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', keyFor(env), iv);
  cipher.setAAD(Buffer.from('scotting-chat-phase1'));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(state), 'utf8'), cipher.final()]);
  const token = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
  // Bound the actual UTF-8 wire representation, including encryption/base64 overhead.
  // History/attribution budgets are only optimizations, not this final safety boundary.
  if (Buffer.byteLength(token, 'utf8') > MAX_STATE_BYTES) throw Error('state_too_large');
  return token;
}
function unseal(token, env, now) {
  if (typeof token !== 'string' || Buffer.byteLength(token, 'utf8') > MAX_STATE_BYTES || !/^[A-Za-z0-9_-]+$/.test(token)) throw Error('invalid');
  const bytes = Buffer.from(token, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', keyFor(env), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from('scotting-chat-phase1')); decipher.setAuthTag(bytes.subarray(12, 28));
  const state = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
  if (state.v !== 1 || !Number.isFinite(state.expires) || state.expires < now || state.expires > now + TTL) throw Error('expired');
  return state;
}
const copy = {
  es: {
    name: 'Con gusto. Para que Eduardo te contacte en un máximo de 24 horas después de confirmar tu solicitud, déjanos tu nombre completo y un teléfono o email. Antes de guardar tus datos te pediré confirmación. ¿Cuál es tu nombre completo?',
    invalidName: 'Escribe tu nombre completo (hasta 100 caracteres), sin datos sensibles. ¿Cómo te llamas?',
    contact: '¿A qué email o teléfono prefieres que respondamos a tu solicitud?',
    invalidContact: 'Necesito un email válido o un teléfono con código de país. No compartas tarjetas, contraseñas ni códigos de verificación.',
    company: '¿Cuál es el nombre de tu empresa?',
    invalidCompany: 'Escribe el nombre de tu empresa (hasta 160 caracteres), sin contraseñas ni datos sensibles.',
    website: '¿Cuál es la web de tu empresa? Puedes responder «no tiene». No abriremos ni consultaremos esa dirección.',
    invalidWebsite: 'Escribe una dirección web válida (hasta 300 caracteres) o «no tiene», sin contraseñas ni datos sensibles.',
    bookingName: 'Para preparar una llamada de 15 minutos por Google Meet con sales@keenkaya.com, primero recogeré tus datos y pediré permiso para guardarlos en el CRM. Después elegirás y confirmarás un horario (bloque de 30 minutos). ¿Cuál es tu nombre completo?',
    bookingEmail: 'Para enviar la invitación de Google Meet necesitamos un email válido, aunque tu contacto preferido sea por teléfono. Se compartirá con Google Calendar y sales@keenkaya.com solo cuando pulses «Reservar». ¿Cuál es tu email?',
    bookingDisabled: 'Las reservas dentro del chat no están habilitadas. Puedes dejar tus datos para que Eduardo te contacte en un máximo de 24 horas después de confirmar tu solicitud.',
    options: 'Elige un horario para una llamada de 15 minutos por Google Meet con sales@keenkaya.com (bloque de 30 minutos). Horarios de Miami, America/New_York: lunes a viernes, 10:00–16:00, próximos 14 días y mínimo 2 horas de anticipación. Al pulsar «Reservar» confirmas el horario y autorizas compartir tu nombre, email, empresa y web con Google Calendar y sales@keenkaya.com para crear la invitación. No hay ninguna cita confirmada todavía.',
    noSlots: 'No puedo ofrecer horarios ahora. Tu solicitud de contacto sigue guardada; puedes volver a consultar disponibilidad.',
    expiredSlots: 'Los horarios han caducado. Consulta las opciones actualizadas y vuelve a pulsar «Reservar» para confirmar.',
    busySlot: 'Ese horario no está disponible. Te ofrezco otras opciones; ninguna cita se ha confirmado.',
    datePrompt: 'Indica fecha y hora de Miami sin ambigüedad: DD/MM/YYYY HH:mm o YYYY-MM-DD HH:mm; también «mañana HH:mm» o «próximo lunes HH:mm». Escribir una fecha no reserva: después deberás pulsar «Reservar».',
    dateRange: 'Ese horario está fuera del rango permitido: lunes a viernes, 10:00–16:00 en Miami, con bloque de 30 minutos completo, mínimo 2 horas y hasta 14 días de anticipación.',
    pendingBooking: 'Estoy verificando el resultado de la reserva. Podría existir ya una cita: no puedo cancelar ni intentar otro horario hasta reconciliar esta misma solicitud. Pulsa «Verificar reserva». Cerrar el chat no elimina eventos del calendario.',
    booked: 'Tu llamada de 15 minutos por Google Meet con sales@keenkaya.com está confirmada para',
    bookedCancel: 'Cerrar la captura no cancela ni elimina esta cita. Contacta a sales@keenkaya.com si necesitas cambiarla.',
    need: '¿Qué te gustaría mejorar en tu negocio? Escribe una descripción breve, sin datos sensibles; puedes responder «omitir».',
    invalidNeed: 'Resume tu necesidad en hasta 500 caracteres, sin contraseñas, tarjetas ni información sensible.',
    confirm: '¿Confirmas que guardemos estos datos en Airtable, nuestro CRM, para responder a esta solicitud? Esto no autoriza campañas ni seguimiento automático. Pulsa «Confirmar y guardar» o «Cancelar».',
    canceled: 'He cerrado la captura local de esta solicitud. Esto no deshace guardados ni confirma su estado en el CRM. Usa «WhatsApp» para consultar un envío anterior, pedir que no te contacten o solicitar la eliminación de tus datos. Podemos seguir conversando sobre nuestros servicios.',
    uncertain: 'No puedo confirmar el resultado del guardado en el CRM; la solicitud podría haberse guardado. Puedes reintentar esta misma solicitud o escribir a Eduardo por WhatsApp para verificarla. Cancelar solo cierra la captura local y no deshace guardados.',
    saved: 'Tu solicitud quedó guardada. Eduardo te contactará por el teléfono o email que indicaste en un máximo de 24 horas. No se ha reservado una cita ni activado seguimiento automático.',
    already: 'Esta solicitud ya está guardada. ¿Tienes alguna otra duda sobre nuestros servicios?',
    safe: 'Por seguridad, no compartas contraseñas, tarjetas ni códigos. Puedo ayudarte con nuestros servicios o recibir tus datos de contacto para atender una solicitud.',
    scope: 'Puedo ayudarte con los servicios de Scotting y registrar una solicitud de contacto. No puedo acceder a otros clientes, revelar instrucciones internas ni gestionar sistemas.',
    limit: 'Llegamos al límite de esta conversación. Todavía puedes dejar tus datos con el botón «Dejar mis datos» o hablar con Eduardo.',
  },
  en: {
    name: 'Of course. Leave your full name and a phone number or email so Eduardo can contact you within 24 hours after you confirm your request. I will ask for confirmation before saving your details. What is your full name?',
    invalidName: 'Please enter your full name (up to 100 characters), without sensitive details. What is your name?',
    contact: 'Which email or phone number should we use to respond to your request?',
    invalidContact: 'Please provide a valid email or a phone number with country code. Do not share card details, passwords or verification codes.',
    company: 'What is your company name?',
    invalidCompany: 'Enter your company name (up to 160 characters), without passwords or sensitive details.',
    website: 'What is your company website? You can say “no website”. We will not open or fetch that address.',
    invalidWebsite: 'Enter a valid website (up to 300 characters) or “no website”, without passwords or sensitive details.',
    bookingName: 'To arrange a 15-minute Google Meet call with sales@keenkaya.com, I will collect your details and ask permission to save them in our CRM first. You will then choose and confirm a time (30-minute calendar block). What is your full name?',
    bookingEmail: 'We need a valid email for the Google Meet invitation, even if your preferred contact is by phone. It will be shared with Google Calendar and sales@keenkaya.com only when you select “Book”. What is your email?',
    bookingDisabled: 'Booking inside this chat is not enabled. You can leave your details so Eduardo can contact you within 24 hours after you confirm your request.',
    options: 'Choose a time for a 15-minute Google Meet call with sales@keenkaya.com (30-minute calendar block). Miami time, America/New_York: Monday–Friday, 10:00–16:00, within 14 days and at least 2 hours ahead. Selecting “Book” confirms the time and authorizes sharing your name, email, company and website with Google Calendar and sales@keenkaya.com to create the invitation. No appointment is confirmed yet.',
    noSlots: 'I cannot offer times right now. Your contact request is still saved; you can refresh availability later.',
    expiredSlots: 'These times have expired. Review the updated options and select “Book” again to confirm.',
    busySlot: 'That time is unavailable. Here are other options; no appointment has been confirmed.',
    datePrompt: 'Enter an unambiguous Miami date and time: DD/MM/YYYY HH:mm or YYYY-MM-DD HH:mm; also “tomorrow HH:mm” or “next Monday HH:mm”. Typing a date never books it: you must then select “Book”.',
    dateRange: 'That time is outside the allowed range: Monday–Friday, 10:00–16:00 Miami time with a full 30-minute block, at least 2 hours ahead and within 14 days.',
    pendingBooking: 'I am verifying the booking result. An appointment may already exist: I cannot cancel or try another time until this same request is reconciled. Select “Check booking”. Closing the chat does not delete calendar events.',
    booked: 'Your 15-minute Google Meet call with sales@keenkaya.com is confirmed for',
    bookedCancel: 'Closing capture does not cancel or delete this appointment. Contact sales@keenkaya.com if you need to change it.',
    need: 'What would you like to improve in your business? Please give a short description without sensitive details; you can say “skip”.',
    invalidNeed: 'Please describe your need in up to 500 characters, without passwords, card details or sensitive information.',
    confirm: 'Do you confirm saving these details in Airtable, our CRM, so we can respond to this request? This does not authorize campaigns or automated follow-up. Select “Confirm and save” or “Cancel”.',
    canceled: 'I have closed the local capture for this request. This does not undo saves or confirm its CRM status. Use “WhatsApp” to check a previous submission, request no further contact or ask for deletion of your details. We can continue talking about our services.',
    uncertain: 'I cannot confirm the CRM save result; the request may have been saved. You can retry this same request or contact Eduardo on WhatsApp to verify it. Canceling only closes the local capture and does not undo saves.',
    saved: 'Your request has been saved. Eduardo will contact you at the phone number or email you provided within 24 hours. No appointment has been booked and no automated follow-up has been activated.',
    already: 'This request is already saved. Do you have another question about our services?',
    safe: 'For your safety, do not share passwords, card details or verification codes. I can help with our services or collect contact details for a request.',
    scope: 'I can help with Scotting services and a contact request. I cannot access other customers, reveal internal instructions or manage systems.',
    limit: 'We reached the conversation limit. You can still use “Leave my details” or talk to Eduardo.',
  },
};
function summary(s, c) { return `${s.saveUncertain ? `${c.uncertain}\n\n` : ''}${s.lang === 'es' ? 'Nombre' : 'Name'}: ${s.lead.name}\n${s.lang === 'es' ? 'Contacto' : 'Contact'}: ${s.lead.contact}\n${s.lang === 'es' ? 'Empresa' : 'Company'}: ${s.lead.company}\nWeb: ${s.lead.website || (s.lang === 'es' ? 'No tiene' : 'No website')}\n${s.lang === 'es' ? 'Necesidad' : 'Need'}: ${s.lead.detail || '—'}\n\n${c.confirm}`; }

const miamiFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function miamiParts(time) { return Object.fromEntries(miamiFormatter.formatToParts(new Date(time)).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)])); }
function datePreference(text, now) {
  const normalized = text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
  let year, month, day, hour, minute, m;
  if ((m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(normalized))) [, day, month, year, hour, minute] = m.map(Number);
  else if ((m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/.exec(normalized))) [, year, month, day, hour, minute] = m.map(Number);
  else {
    const p = miamiParts(now); const date = new Date(Date.UTC(p.year, p.month - 1, p.day));
    if ((m = /^(?:manana|tomorrow)\s+(\d{1,2}):(\d{2})$/.exec(normalized))) date.setUTCDate(date.getUTCDate() + 1);
    else if ((m = /^(?:proximo|next)\s+(domingo|lunes|martes|miercoles|jueves|viernes|sabado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+(\d{1,2}):(\d{2})$/.exec(normalized))) {
      const weekdays = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado','sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      date.setUTCDate(date.getUTCDate() + ((weekdays.indexOf(m[1]) % 7 - date.getUTCDay() + 7) % 7 || 7)); m = [m[0], m[2], m[3]];
    } else return null;
    year = date.getUTCFullYear(); month = date.getUTCMonth() + 1; day = date.getUTCDate(); hour = Number(m[1]); minute = Number(m[2]);
  }
  if (hour > 23 || minute > 59 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  // Test both Miami offsets; reject nonexistent or ambiguous DST wall times.
  const matches = [4, 5].map(offset => wall + offset * 3600000).filter(time => {
    const p = miamiParts(time); return p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute;
  });
  return matches.length === 1 ? new Date(matches[0]).toISOString() : null;
}
function permittedStart(start, now) {
  const time = Date.parse(start); if (!Number.isFinite(time) || time % 60000 !== 0 || time < now + 7200000 || time + 1800000 > now + 14 * 86400000) return false;
  const p = miamiParts(time); const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return weekday >= 1 && weekday <= 5 && p.hour >= 10 && p.hour * 60 + p.minute <= 15 * 60 + 30;
}
function vettedSlot(slot) {
  if (!slot || !['start','end','callEnd'].every(key => typeof slot[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(slot[key]) && Number.isFinite(Date.parse(slot[key])))) return null;
  if (Date.parse(slot.end) - Date.parse(slot.start) !== 1800000 || Date.parse(slot.callEnd) - Date.parse(slot.start) !== 900000) return null;
  return { start: slot.start, end: slot.end, callEnd: slot.callEnd };
}
function slotLabel(start, lang) { return `${new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { timeZone: 'America/New_York', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(start))} (Miami)`; }
function approvedLink(value, hosts) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || !hosts.includes(u.hostname) || u.username || u.password || u.port || u.hash || u.href.length > 1500) return undefined;
    if (u.hostname === 'meet.google.com') return /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(u.pathname) && !u.search ? u.href : undefined;
    return u.pathname.startsWith('/calendar/') ? u.href : undefined;
  } catch { return undefined; }
}

function bookingIntent(text) {
  const value = text.normalize('NFKD').replace(/[\p{M}\p{Cf}]/gu, '').toLowerCase();
  if (/\b(?:no quiero|no necesito|no deseo|no hace falta|don't want|do not want|don't need|do not need)\b/u.test(value)) return false;
  return /\b(?:quiero|quisiera|necesito|me gustaria|podemos|puedo|want to|would like to|can i|can we)\b.{0,45}\b(?:agendar|reservar|programar|book|schedule)\b/u.test(value) || /^(?:agendar|reservar|programar|book|schedule)\s+(?:una?\s+|a\s+)?(?:llamada|cita|reunion|call|appointment|meeting)\b/u.test(value);
}

function humanHandoff(text) {
  const normalized = text.normalize('NFKD').replace(/[\p{M}\p{Cf}]/gu, '').toLowerCase();
  if (/\b(?:no quiero|no necesito|no hace falta|no es necesario|do not want|don't want|don't need|do not need)\b/u.test(normalized)) return false;
  return /\b(?:(?:hablar|pasar|comunicarme|comunicarte)\s+con\s+(?:(?:un|una)\s+)?(?:eduardo|humano|humana|persona|asesor|asesora)|atencion humana|(?:talk|speak)\s+(?:to|with)\s+(?:a\s+)?(?:eduardo|human|person|agent)|human (?:support|agent))\b/u.test(normalized);
}

function modelActionLanguage(reply) {
  const normalized = reply.normalize('NFKD').replace(/[\p{M}\p{Cf}]/gu, '').toLowerCase();
  // Defense in depth, NOT a semantic guarantee. The UI/controller's verified
  // status remains authoritative. Match completed actions and first-person action
  // promises, not nouns like CRM/booking or ordinary descriptions of web services.
  const completed = /\b(?:guardad[oa]s?|registrad[oa]s?|almacenad[oa]s?|agendad[oa]s?|reservad[oa]s?|programad[oa]s?|confirmad[oa]s?|anotad[oa]s?|apuntad[oa]s?|enviad[oa]s?|recibid[oa]s?|guarde|registre|almacene|agende|reserve|programe|confirme|anote|apunte|envie|saved|stored|recorded|registered|booked|scheduled|confirmed|submitted|received|sent|done|listo)\b|\ball\s+set\b/u;
  const promise = /\b(?:i|we)\s+(?:(?:can|will|have|already|just)\s+){1,3}(?:save|store|record|register|book|schedule|submit|send)\b|\b(?:puedo|podemos|voy a|vamos a|ya|acabo de|acabamos de)\s+(?:guardar|registrar|agendar|reservar|enviar|guardamos|registramos|agendamos|reservamos|enviamos)\b/u;
  const createdRecord = /\b(?:cread[oa]s?|created)\b.{0,60}\b(?:solicitud|registro|lead|request|record|cita|appointment)\b|\b(?:solicitud|registro|lead|request|record|cita|appointment)\b.{0,60}\b(?:cread[oa]s?|created)\b/u;
  const passive = /\bse\s+(?:guardo|registro|almaceno|agendo|reservo|programo|confirmo|envio)\b/u;
  const inSystem = /\b(?:request|details|information|solicitud|datos)\b.{0,50}\b(?:is|are|esta|estan|quedo|quedaron)\b.{0,30}\b(?:crm|airtable|sistema|system)\b/u;
  return completed.test(normalized) || promise.test(normalized) || createdRecord.test(normalized) || passive.test(normalized) || inSystem.test(normalized);
}

// The model has no CRM authority. Only this finite-state controller can save a
// server-validated, explicitly confirmed request. Encrypted state is opaque to
// the browser; it never appears in analytics, URLs or server logs.
export async function phase1Chat(body, deps = {}) {
  const env = deps.env || process.env; const now = deps.now ?? Date.now();
  const booking = deps.booking || createBookingService({ env, fetch: deps.fetch || globalThis.fetch, now: () => now });
  const bookingAvailable = booking.enabled === true;
  if ((env.LEAD_SIGNING_SECRET?.length || 0) < 32) return fail(503, 'chat_unavailable');
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['message', 'action', 'state', 'lang', 'context', 'attribution', 'slot'].includes(k))) return fail(400, 'invalid_request');
  if (body.message !== undefined && body.action !== undefined) return fail(400, 'invalid_request');
  const message = body.message === undefined ? '' : clean(body.message, 1500);
  let action = body.action;
  if (message === null || (!message && !action) || (action && !['start_capture', 'confirm_save', 'cancel_capture', 'start_booking', 'book_slot', 'refresh_slots', 'check_booking'].includes(action))) return fail(400, 'invalid_request');
  if ((body.slot !== undefined && !['book_slot', 'check_booking'].includes(action)) || (action === 'book_slot' && (typeof body.slot !== 'string' || body.slot.length > 40))) return fail(400, 'invalid_request');
  let s;
  if (body.state !== undefined) {
    try { s = unseal(body.state, env, now); } catch { return fail(409, 'chat_session_expired'); }
  } else {
    if (action && !['start_capture', 'start_booking'].includes(action)) return fail(409, 'confirmation_required');
    s = { v: 1, id: randomUUID(), expires: now + TTL, lang: body.lang === 'es' ? 'es' : 'en', context: body.context === 'commercial_cleaning' ? 'commercial_cleaning' : 'homepage', stage: 'chat', history: [], lead: {}, attribution: sanitizeAttribution(body.attribution) };
  }
  // CRM capture IDs rotate independently; booking identity survives cancellation
  // and recapture. The adapter durably enforces it across old-token replays too.
  s.bookingId ||= s.id;
  // A clear request opens collection only, never implicit CRM consent/reservation.
  if (!action && ['chat', 'saved'].includes(s.stage) && bookingIntent(message)) action = 'start_booking';
  if (Buffer.byteLength(JSON.stringify(s.attribution)) > 2000) s.attribution = {};
  // Mirror the visitor's language when it is explicit, regardless of page locale.
  if (message && /\b(hola|quiero|necesito|gracias|español|cuánto|cómo|pueden|servicios)\b/iu.test(message)) s.lang = 'es';
  else if (message && /\b(hello|please|english|thank|would|services|pricing)\b/iu.test(message)) s.lang = 'en';
  const c = copy[s.lang];
  const respond = (reply, status = s.intent === 'booking' ? 'booking_collecting' : 'collecting', httpStatus = 200, error) => {
    const slots = s.stage === 'booking_options' && s.slotsExpires > now ? (s.slots || []).map(slot => ({ id: slot.start, ...slot, label: slotLabel(slot.start, s.lang) })) : [];
    try { return { status: httpStatus, body: { reply, state: seal(s, env), status, lang: s.lang, bookingAvailable, crmSaved: s.crmSaved === true, slots, ...(s.stage === 'booked' ? { appointment: s.appointment } : {}), ...(error ? { error } : {}) } }; }
    catch { return fail(503, 'chat_state_unavailable'); }
  };
  const showSlots = async (prefix = '', preferredStart) => {
    let result;
    try { if (bookingAvailable) result = await booking.listSlots(preferredStart ? { preferredStart } : {}); } catch { /* Availability failures never authorize a booking. */ }
    const seen = new Set();
    s.slots = result?.status === 'available' && Array.isArray(result.slots) ? result.slots.map(vettedSlot).filter(slot => slot && permittedStart(slot.start, now) && !seen.has(slot.start) && seen.add(slot.start)).slice(0, 3) : [];
    s.stage = 'booking_options'; s.slotsExpires = now + SLOT_TTL;
    if (preferredStart && result?.preferredAvailable === false) prefix = c.busySlot;
    return respond([prefix, s.slots.length ? c.options : c.noSlots].filter(Boolean).join('\n\n'), 'booking_options');
  };
  const continueBooking = async () => {
    // A legacy uncertain save must retain its original payload for CRM retries.
    // If that accepted payload predates company/site, start_booking will collect
    // a fresh, explicitly consented capture rather than book incomplete details.
    if (!s.lead.company || s.lead.website === undefined) { s.stage = 'saved'; return respond(c.saved, 'saved'); }
    if (!emailOK(s.lead.email) && emailOK(s.lead.contact)) s.lead.email = s.lead.contact;
    if (!emailOK(s.lead.email)) { s.stage = 'booking_email'; return respond(c.bookingEmail, 'booking_collecting'); }
    return showSlots();
  };
  const bookedReply = () => respond(`${c.booked} ${slotLabel(s.appointment.start, s.lang)}.\n${c.bookedCancel}`, 'booked');
  const attemptBooking = async (reconcileOnly = false) => {
    let result;
    // Only book_slot establishes bookingStart; check_booking can retry only that
    // exact signed request. Unknown/invalid outcomes stay locked, never restart.
    try { result = await booking.book({ sessionId: s.bookingId, start: s.bookingStart, name: s.lead.name, email: s.lead.email, company: s.lead.company, website: s.lead.website, ...(emailOK(s.lead.contact) ? {} : { phone: s.lead.contact }) }, { reconcileOnly }); } catch { /* The event may exist already. */ }
    const slot = vettedSlot(result);
    const meetUrl = approvedLink(result?.meetUrl, ['meet.google.com']);
    if (result?.status === 'booked' && slot && meetUrl) {
      const calendarUrl = approvedLink(result.calendarUrl, ['calendar.google.com', 'www.google.com']);
      s.stage = 'booked'; s.appointment = { ...slot, meetUrl, ...(calendarUrl ? { calendarUrl } : {}) }; s.slots = [];
      return bookedReply();
    }
    if (result?.status === 'conflict' && s.stage !== 'booking_pending') {
      delete s.bookingStart; return showSlots(c.busySlot);
    }
    if (result?.status === 'unavailable' && s.stage !== 'booking_pending') {
      delete s.bookingStart; return showSlots(c.noSlots);
    }
    s.stage = 'booking_pending'; s.slots = [];
    return respond(c.pendingBooking, 'booking_pending');
  };
  if (s.stage === 'booked') return bookedReply();
  if (s.stage === 'booking_pending') {
    if (action === 'check_booking' && bookingAvailable && s.bookingStart && s.crmSaved) return attemptBooking();
    return respond(c.pendingBooking, 'booking_pending');
  }
  if (action === 'check_booking') {
    // The browser can lose the reservation response, retaining only the signed
    // pre-book options token. Recover that exact offered slot READ-ONLY, even
    // after its display TTL; no new insert is authorized by this action.
    if (!bookingAvailable || s.stage !== 'booking_options' || !s.crmSaved || !emailOK(s.lead.email) || !s.slots?.some(slot => slot.start === body.slot)) return fail(409, 'booking_confirmation_required');
    s.bookingStart = body.slot;
    return attemptBooking(true);
  }
  if (action === 'book_slot') {
    if (!bookingAvailable || s.stage !== 'booking_options' || !s.crmSaved || !emailOK(s.lead.email) || !s.lead.company || s.lead.website === undefined) return fail(409, 'booking_confirmation_required');
    if (!s.slots?.some(slot => slot.start === body.slot)) return fail(409, 'invalid_booking_slot');
    if (!(s.slotsExpires > now) || !permittedStart(body.slot, now)) return showSlots(c.expiredSlots);
    s.bookingStart = body.slot;
    return attemptBooking();
  }
  if (action === 'refresh_slots') {
    if (s.stage !== 'booking_options' || !s.crmSaved) return fail(409, 'booking_confirmation_required');
    return showSlots();
  }
  const optOut = /^(?:cancel(?:ar)?|no gracias|no thanks|stop|do not contact me|don't contact me|no (?:me )?contact(?:en|es|ar)|no quiero (?:que me contacten|dejar mis datos))[.!\s]*$/iu.test(message);
  if (action === 'cancel_capture' || optOut) {
    s.id = randomUUID(); s.stage = 'chat'; s.lead = {}; s.history = [];
    delete s.consentRequestedAt; delete s.saveUncertain;
    delete s.intent; delete s.crmSaved; delete s.slots; delete s.slotsExpires; delete s.bookingStart;
    return respond(c.canceled, 'chat');
  }
  if (action === 'start_booking') {
    if (!bookingAvailable) return respond(c.bookingDisabled, s.stage === 'saved' ? 'saved' : s.stage === 'chat' ? 'chat' : s.stage === 'confirm' ? 'confirmation_required' : 'collecting');
    s.intent = 'booking';
    if (s.stage === 'booking_options') return showSlots();
    if (s.stage === 'booking_email') return respond(c.bookingEmail);
    if (s.stage === 'saved' && s.lead.name && s.lead.contact && s.lead.company && s.lead.website !== undefined) { s.crmSaved = true; return continueBooking(); }
    if (s.stage === 'chat' || s.stage === 'saved') {
      if (s.stage === 'saved') s.id = randomUUID();
      s.stage = 'name'; s.lead = {}; s.history = []; delete s.crmSaved; delete s.consentRequestedAt;
    }
    return respond(s.stage === 'confirm' ? summary(s, c) : s.stage === 'name' ? c.bookingName : c[s.stage], s.stage === 'confirm' ? 'confirmation_required' : 'booking_collecting');
  }
  if (s.stage === 'booking_email') {
    if (action) return respond(c.bookingEmail);
    if (!emailOK(message) || sensitive(message)) return respond(c.bookingEmail);
    s.lead.email = message; return continueBooking();
  }
  if (s.stage === 'booking_options') {
    if (action) return respond(c.options, 'booking_options');
    const preferredStart = datePreference(message, now);
    if (!preferredStart) return respond(c.datePrompt, 'booking_options');
    if (!permittedStart(preferredStart, now)) return respond(c.dateRange, 'booking_options');
    return showSlots('', preferredStart);
  }
  // Finish missing company/site in old signed capture tokens before a new
  // explicit consent. Preserve an uncertain legacy payload exactly for retries.
  if (s.stage === 'confirm' && (!s.lead.company || s.lead.website === undefined) && !s.saveUncertain) {
    s.stage = !s.lead.company ? 'company' : 'website';
    return respond(c[s.stage]);
  }
  if (action === 'confirm_save') {
    if (s.stage === 'saved') return respond(c.already, 'saved');
    if (s.stage !== 'confirm') return fail(409, 'confirmation_required');
    if (env.AIRTABLE_BASE_ID !== 'appzlRmQyj1x5whWw' || env.AIRTABLE_LEADS_TABLE_ID !== 'tblwEZIGfrWk7egUS') return fail(503, 'lead_capture_unavailable');
    let result;
    try { result = await (deps.saveLead || saveLead)({
      submission_id: s.id, name: s.lead.name, contact: s.lead.contact, detail: s.lead.detail,
      ...(s.lead.company !== undefined ? { company: s.lead.company } : {}), ...(s.lead.website !== undefined ? { website: s.lead.website } : {}),
      chips: ['Landing page / chat web'], lang: s.lang, attribution: s.attribution,
    }, { env, fetch: deps.fetch || globalThis.fetch, chatConsent: { version: 'phase1-v1', confirmed: true, method: 'explicit_confirmation_action', requested_at: s.consentRequestedAt, purpose: 'respond_to_request', marketing: false, context: s.context, capture_surface: 'conversational_chat' } }); }
    catch { /* A thrown/invalid response cannot establish whether a write happened. */ }
    if (result?.status !== 200 || result?.body?.accepted !== true) {
      s.saveUncertain = true;
      return respond(c.uncertain, 'confirmation_required', 502, 'lead_capture_uncertain');
    }
    s.stage = 'saved'; s.crmSaved = true; s.history = []; s.attribution = {}; s.expires = now + TTL;
    delete s.saveUncertain;
    return s.intent === 'booking' ? continueBooking() : respond(c.saved, 'saved');
  }
  if (action === 'start_capture' || (s.stage === 'chat' && (humanHandoff(message) || /(?:\b(?:contactarme|contáctenme|contacten|contacto|cotización|cotizacion|presupuesto|registrarme)\b|\b(?:contact|call|email) me\b|\b(?:quote|sign up)\b|(?:quiero|quisiera|puedo) (?:dejar|guardar|dar)(?:les)? (?:mis )?datos)/iu.test(message)))) {
    if (s.stage === 'saved') { s.id = randomUUID(); s.stage = 'chat'; delete s.consentRequestedAt; delete s.crmSaved; }
    if (s.stage === 'chat') { s.stage = 'name'; s.history = []; s.lead = {}; delete s.intent; }
    return respond(s.stage === 'confirm' ? summary(s, c) : c[s.stage], s.stage === 'confirm' ? 'confirmation_required' : s.intent === 'booking' ? 'booking_collecting' : 'collecting');
  }
  if (s.stage === 'name') {
    const name = message.replace(/^(?:me llamo|mi nombre es|my name is|i am)\s+/iu, '').trim();
    if (!name || name.length > 100 || !/^[\p{L}\p{M} .’'\-]+$/u.test(name) || name.split(/\s+/).length < 2 || name.split(/\s+/).length > 8) return respond(c.invalidName);
    s.lead.name = name; s.stage = 'contact'; return respond(c.contact);
  }
  if (s.stage === 'contact') {
    if (message.length > 254 || !contactOK(message) || /^\d{3}-\d{2}-\d{4}$/.test(message)) return respond(c.invalidContact);
    s.lead.contact = message; s.stage = 'company'; return respond(c.company);
  }
  if (s.stage === 'company') {
    if (!message || message.length > 160 || /[<>\r\n\t]/u.test(message) || sensitive(message)) return respond(c.invalidCompany);
    s.lead.company = message; s.stage = 'website'; return respond(c.website);
  }
  if (s.stage === 'website') {
    const website = /^(?:no(?: tiene| tengo| tenemos| website| tengo web)?|ningun[ao]|sin (?:web|sitio web)|none|n\/a|don't have (?:one|a website))$/iu.test(message) ? '' : sanitizeWebsite(message);
    if (website === null || sensitive(message) || !message) return respond(c.invalidWebsite);
    s.lead.website = website;
    if (s.lead.detail !== undefined) { s.stage = 'confirm'; s.consentRequestedAt = new Date(now).toISOString(); return respond(summary(s, c), 'confirmation_required'); }
    s.stage = 'need'; return respond(c.need);
  }
  if (s.stage === 'need') {
    if (message.length > 500 || sensitive(message)) return respond(c.invalidNeed);
    s.lead.detail = /^(omitir|skip)$/iu.test(message) ? '' : message;
    if (!s.lead.company || s.lead.website === undefined) { s.stage = !s.lead.company ? 'company' : 'website'; return respond(c[s.stage]); }
    s.stage = 'confirm'; s.consentRequestedAt = new Date(now).toISOString();
    return respond(summary(s, c), 'confirmation_required');
  }
  if (s.stage === 'confirm') return respond(summary(s, c), 'confirmation_required');
  if (sensitive(message)) return respond(c.safe, s.stage === 'saved' ? 'saved' : 'chat');
  if (/(?:system prompt|prompt del sistema|instrucciones internas|ignore (?:all|previous)|ignora (?:todas|las)|api.?key|credenciales|otros (?:leads|clientes)|other (?:leads|customers)|run (?:a |the )?(?:command|code)|ejecuta (?:código|codigo|comandos))/iu.test(message)) return respond(c.scope, s.stage === 'saved' ? 'saved' : 'chat');
  if ((s.turns || 0) >= 24) return respond(c.limit, s.stage === 'saved' ? 'saved' : 'chat');
  const messages = [...s.history, { role: 'user', content: message }];
  const result = await (deps.chat || chat)({ messages }, { env, fetch: deps.fetch || globalThis.fetch, sessionId: `scotting-${s.id}` });
  if (result.status !== 200) return result;
  // Only verified saveLead acceptance changes the controller status to saved.
  // The heuristic below additionally reduces false action claims in model prose.
  let reply = result.body.reply;
  if (typeof reply !== 'string' || !reply.trim()) return fail(502, 'chat_unavailable');
  if (s.stage === 'chat' && humanHandoff(reply) && !modelActionLanguage(reply)) {
    s.stage = 'name'; s.history = []; s.lead = {};
    return respond(c.name);
  }
  if (modelActionLanguage(reply)) reply = s.stage === 'saved' ? c.already : (s.lang === 'es' ? 'Puedo ayudarte a preparar una solicitud de contacto. Pulsa «Dejar mis datos» para iniciar. La confirmación autoriza un intento de guardado; no acredita su resultado. ' : 'I can help you prepare a contact request. Select “Leave my details” to start. Confirmation authorizes a save attempt; it does not establish the outcome. ') + (bookingAvailable ? (s.lang === 'es' ? 'Puedes usar «Agendar llamada» para consultar horarios y confirmar explícitamente tu reserva.' : 'Use “Book a call” to check times and explicitly confirm your booking.') : c.bookingDisabled);
  if (reply.length > 3000) reply = reply.slice(0, 3000);
  s.history = [...messages, { role: 'assistant', content: reply }];
  s.turns = (s.turns || 0) + 1;
  while (s.history.length > 20 || Buffer.byteLength(JSON.stringify(s.history)) > 8000) s.history.splice(0, 2);
  return respond(reply, s.stage === 'saved' ? 'saved' : 'chat');
}
