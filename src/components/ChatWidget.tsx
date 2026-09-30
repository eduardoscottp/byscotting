import { useEffect, useRef, useState } from 'react';
import { waLink, type Lang } from '@/copy';
import { getAttribution, trackMetric } from '@/lib/attribution';
import eduardoPortrait from '@/assets/eduardo-hero-oficina.webp';

type Message = { role: 'user' | 'assistant'; content: string };
type Status = 'chat' | 'collecting' | 'confirmation_required' | 'saved' | 'booking_collecting' | 'booking_options' | 'booking_pending' | 'booked';
type Action = 'start_capture' | 'confirm_save' | 'cancel_capture' | 'start_booking' | 'book_slot' | 'refresh_slots' | 'check_booking';
type Appointment = { start: string; end: string; callEnd: string; meetUrl?: string; calendarUrl?: string };
type Slot = Pick<Appointment, 'start' | 'end' | 'callEnd'> & { id: string; label: string };
const endpoint = import.meta.env.VITE_CHAT_ENDPOINT || '/api/chat';
const statuses: Status[] = ['chat', 'collecting', 'confirmation_required', 'saved', 'booking_collecting', 'booking_options', 'booking_pending', 'booked'];
const maxFaqTurns = 24;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function isoTime(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z'));
}
function validTimes(value: Record<string, unknown>) {
  return isoTime(value.start) && isoTime(value.end) && isoTime(value.callEnd)
    && Date.parse(value.end) - Date.parse(value.start) === 30 * 60 * 1000
    && Date.parse(value.callEnd) - Date.parse(value.start) === 15 * 60 * 1000;
}
function validSlot(value: unknown): value is Slot {
  return record(value) && validTimes(value) && isoTime(value.id) && value.id === value.start
    && typeof value.label === 'string' && !!value.label.trim() && value.label.length <= 250;
}
function validAppointment(value: unknown): value is Appointment {
  return record(value) && validTimes(value) && ['meetUrl', 'calendarUrl'].every(key => value[key] === undefined
    || (typeof value[key] === 'string' && value[key].length <= 2048));
}
// Check the literal authority too: URL.port alone silently accepts explicit :443.
function appointmentLink(value: string | undefined, host: 'meet.google.com' | 'calendar.google.com') {
  try {
    if (!value || !value.startsWith(`https://${host}/`) || /[\s\\]/.test(value)) return '';
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === host && !url.username && !url.password && !url.port ? url.href : '';
  } catch { return ''; }
}
function validExtras(result: Record<string, unknown>) {
  return (result.lang === undefined || result.lang === 'es' || result.lang === 'en')
    && (result.crmSaved === undefined || typeof result.crmSaved === 'boolean')
    && (result.bookingAvailable === undefined || typeof result.bookingAvailable === 'boolean')
    && (result.slots === undefined ? result.status !== 'booking_options' : Array.isArray(result.slots)
      && result.slots.length <= 3 && result.slots.every(validSlot) && new Set(result.slots.map(slot => slot.id)).size === result.slots.length)
    && (result.appointment === undefined || validAppointment(result.appointment));
}

export default function ChatWidget({ lang, context = 'homepage', openRequest = 0, suggestedMessage }: { lang: Lang; context?: 'homepage' | 'commercial_cleaning'; openRequest?: number; suggestedMessage?: string }) {
  const cleaning = context === 'commercial_cleaning';
  const [chatLang, setChatLang] = useState<Lang>(lang);
  const es = chatLang === 'es';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<Status>('chat');
  const [saveUncertain, setSaveUncertain] = useState(false);
  const [bookingAvailable, setBookingAvailable] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointment, setAppointment] = useState<Appointment>();
  // Also guard stale click handlers before React rerenders. Never persist a booking attempt.
  const bookingUncertain = useRef(false);
  // Keep the chosen slot until a complete response supplies a post-book token.
  // A read-only check can then recover a lost response using the old token.
  const recoverySlot = useRef<string>();
  const bookingPanel = useRef<HTMLDivElement>(null);

  // The server token is opaque: never decode it or persist it outside this mounted widget.
  const state = useRef<string>();
  const inFlight = useRef(false);
  const faqTurns = useRef(0);
  const leadTracked = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const checkButton = useRef<HTMLButtonElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const capturing = status === 'collecting' || status === 'confirmation_required' || status === 'booking_collecting';
  const bookingFlow = status.startsWith('booking_') || status === 'booked';
  const pending = status === 'booking_pending';
  const meetUrl = appointmentLink(appointment?.meetUrl, 'meet.google.com');
  const calendarUrl = appointmentLink(appointment?.calendarUrl, 'calendar.google.com');
  const consent = es
    ? 'Al confirmar, autorizas guardar tu nombre, contacto, empresa, web y resumen de la solicitud únicamente para responder a tu solicitud, no para marketing futuro.'
    : 'By confirming, you consent to storing your name, contact details, company, website and request summary only to respond to your request, not for future marketing.';
  useEffect(() => {
    if (openRequest > 0) {
      setOpen(true);
      // The CTA prepares an editable message only. Never send or replace an active conversation.
      if (suggestedMessage && !draft && messages.length === 0 && status === 'chat') setDraft(suggestedMessage.slice(0, 1500));
      trackMetric('chat_started', lang, 'chat', context);
    }
  }, [openRequest, lang, context]);
  useEffect(() => { if (open && !busy) { if (status === 'confirmation_required') confirmButton.current?.focus(); else if (pending) checkButton.current?.focus(); else input.current?.focus(); } }, [open, busy, status]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages, busy]);
  useEffect(() => { if (open && !busy && bookingFlow) bookingPanel.current?.scrollIntoView?.({ block: 'start' }); }, [open, busy, status, slots]);

  function close() { setOpen(false); toggle.current?.focus(); }
  async function request(action?: Action, slot?: string, suggestedText?: string) {
    if (inFlight.current || busy) return;
    if (bookingUncertain.current && action !== 'check_booking') return;
    if (suggestedText && (capturing || bookingFlow)) return;
    if (action === 'confirm_save' && status !== 'confirmation_required') return;
    if (action === 'start_capture' && (capturing || bookingFlow)) return;
    if (action === 'cancel_capture' && !capturing) return;
    if (action === 'start_booking' && (!bookingAvailable || capturing || bookingFlow || saveUncertain)) return;
    if (action === 'book_slot' && (!bookingAvailable || status !== 'booking_options' || !slots.some(option => option.id === slot))) return;
    if (action === 'refresh_slots' && (!bookingAvailable || status !== 'booking_options')) return;
    if (action === 'check_booking' && !bookingUncertain.current) return;
    const message = action ? undefined : (suggestedText ?? draft).trim();
    if (!action && !message) return;
    if (message && message.length > 1500) {
      setError(es ? 'Usa un máximo de 1500 caracteres por mensaje.' : 'Use no more than 1500 characters per message.'); return;
    }
    if (!action && !capturing && !bookingFlow && faqTurns.current >= maxFaqTurns) {
      setError(es ? 'Llegaste al límite de 24 preguntas. Puedes dejar tus datos o hablar con Eduardo.' : 'You reached the 24-question limit. You can leave your details or talk to Eduardo.'); return;
    }
    inFlight.current = true; setBusy(true); setError('');
    // A sent confirmation can succeed even if its HTTP response is lost.
    if (action === 'confirm_save') setSaveUncertain(true);
    if (action === 'book_slot') {
      recoverySlot.current = slot;
      bookingUncertain.current = true; setStatus('booking_pending');
    }
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(action ? { action } : { message }),
          ...(action === 'book_slot' ? { slot } : action === 'check_booking' && recoverySlot.current ? { slot: recoverySlot.current } : {}),
          state: state.current, lang, context, attribution: getAttribution() ?? undefined }),
        signal: AbortSignal.timeout(60000),
      });
      const result = await response.json();
      if (response.status === 409 && result?.error === 'chat_session_expired') {
        // Do not offer a fresh booking when the previous result may have been lost.
        if (bookingUncertain.current) throw Error('Booking unverified');
        state.current = undefined; setStatus('chat'); faqTurns.current = 0; leadTracked.current = false; setMessages([]);
        setBookingAvailable(false); setSlots([]); setAppointment(undefined);
        setError(es ? 'La sesión caducó. Inicia de nuevo; si estabas confirmando, consulta con Eduardo antes de repetir la solicitud.' : 'Your session expired. Start again; if you were confirming a save, check with Eduardo before resubmitting.');
        return;
      }
      if (!response.ok || !record(result) || typeof result.reply !== 'string' || !result.reply.trim()
        || typeof result.state !== 'string' || !result.state || !statuses.includes(result.status as Status) || !validExtras(result)) throw Error('Unavailable');
      if (bookingUncertain.current && !['booking_pending', 'booking_options', 'booked'].includes(result.status as string)) throw Error('Booking unverified');
      // Commit only a complete, successful response. Failures keep the draft and the prior token for retries.
      state.current = result.state;
      recoverySlot.current = undefined;
      setBookingAvailable(result.bookingAvailable === true);
      setSlots(result.status === 'booking_options' ? result.slots as Slot[] : []);
      const receipt = result.status === 'booked' ? result.appointment as Appointment | undefined : undefined;
      setAppointment(receipt ? { ...receipt, meetUrl: appointmentLink(receipt.meetUrl, 'meet.google.com'), calendarUrl: appointmentLink(receipt.calendarUrl, 'calendar.google.com') } : undefined);
      bookingUncertain.current = result.status === 'booking_pending';

      if (result.lang === 'es' || result.lang === 'en') setChatLang(result.lang);
      if (!capturing && (result.status === 'collecting' || result.status === 'confirmation_required')) leadTracked.current = false;
      if (message && !capturing && !bookingFlow && !String(result.status).startsWith('booking_') && result.status !== 'booked') faqTurns.current += 1;
      setStatus(result.status as Status);
      if (result.crmSaved === true || result.status === 'saved') setSaveUncertain(false);
      const reply = result.reply;
      setMessages(previous => [...previous, ...(message ? [{ role: 'user' as const, content: message }] : []), { role: 'assistant', content: reply }]);
      if (message && !suggestedText) setDraft('');
      if ((result.crmSaved === true || result.status === 'saved') && !leadTracked.current) {
        leadTracked.current = true;
        trackMetric('generate_lead', lang, 'chat', context);
      }
    } catch {
      setError(bookingUncertain.current
        ? (es ? 'No pudimos verificar la reserva: puede haberse completado. Consulta su estado o escribe a Eduardo por WhatsApp antes de intentar otra. Cerrar el chat no cancela la cita.' : 'We could not verify the booking: it may have completed. Check its status or contact Eduardo on WhatsApp before trying another. Closing the chat does not cancel the appointment.')
        : action === 'confirm_save'
        ? (es ? 'No pudimos confirmar el guardado: puede haberse completado. Reintenta la misma confirmación o escribe a Eduardo por WhatsApp. Cancelar no borra registros.' : 'We could not confirm the save: it may have completed. Retry the same confirmation or contact Eduardo on WhatsApp. Canceling does not delete records.')
        : (es ? 'El asistente no está disponible. Reintenta o escribe a Eduardo por WhatsApp.' : 'The assistant is unavailable. Retry or contact Eduardo on WhatsApp.'));
    } finally { inFlight.current = false; setBusy(false); }
  }
  function send(event: React.FormEvent) {
    event.preventDefault();
    return request();
  }

  const field = 'w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-blue';
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50" onKeyDown={e => { if (e.key === 'Escape') close(); }}>
      {open && <section id={`scotting-chat-${context}`} aria-label={es ? 'Asistente de Eduardo' : 'Eduardo’s assistant'} className="pointer-events-auto absolute bottom-[calc(100%+0.75rem)] right-4 flex w-[calc(100vw-2rem)] max-w-sm max-h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] flex-col overflow-hidden rounded-2xl border border-ink/15 bg-white text-ink shadow-lg sm:right-6">
        <header className="flex items-center justify-between bg-ink px-4 py-3 text-white">
          <div className="flex items-center gap-3"><span className="h-10 w-10 shrink-0 overflow-hidden rounded-full"><img src={eduardoPortrait} alt="Eduardo Scott" className="h-full w-full origin-top scale-[1.65] object-cover object-top" /></span><p className="font-display font-semibold">{es ? 'Asistente de Eduardo' : 'Eduardo’s assistant'}</p></div>
          <button type="button" onClick={close} className="rounded px-3 py-2 text-sm" aria-label={es ? 'Cerrar chat' : 'Close chat'}>×</button>
        </header>
        <div className="overflow-y-auto p-4">
          <p className="mb-3 text-xs text-ink/70">{es ? 'Este asistente usa IA para responderte. No compartas datos sensibles. Guardaremos tu solicitud solo cuando la confirmes.' : 'This assistant uses AI to answer you. Please avoid sensitive information. We will save your request only when you confirm.'}</p>
          <div ref={log} tabIndex={-1} role="log" aria-live="polite" aria-relevant="additions text" className="max-h-52 space-y-3 overflow-y-auto">
            <p className="text-sm">{cleaning ? (es ? '¡Hola! Soy el asistente de Eduardo. ¿Cómo puedo ayudarte con tu negocio hoy?' : 'Hi! I’m Eduardo’s assistant. How can I help with your business today?') : es ? '¿Qué te gustaría mejorar en tu página o en cómo recibes clientes?' : 'What would you like to improve about your website or how you receive inquiries?'}</p>
            {messages.map((m, i) => <p key={i} className={`whitespace-pre-wrap break-words rounded-xl p-3 text-sm ${m.role === 'user' ? 'bg-blue text-white' : 'bg-warm text-ink'}`}><span className="sr-only">{m.role === 'user' ? (es ? 'Tú: ' : 'You: ') : 'Scotting: '}</span>{m.content}</p>)}
            {busy && <p role="status" className="text-sm">{es ? 'Escribiendo…' : 'Writing…'}</p>}
          </div>
          <form onSubmit={send} className="mt-3 flex gap-2">
            <input ref={input} value={draft} onChange={e => setDraft(e.target.value)} maxLength={1500} disabled={busy || pending} aria-label={es ? 'Tu mensaje' : 'Your message'} placeholder={capturing ? (es ? 'Escribe tu respuesta' : 'Type your answer') : status === 'booking_options' ? 'DD/MM/AAAA HH:mm' : (es ? 'Escribe tu pregunta' : 'Ask a question')} className={field} />
            <button disabled={busy || pending || !draft.trim()} className="rounded-xl bg-blue px-3 py-2 text-sm text-white disabled:opacity-50">{es ? 'Enviar' : 'Send'}</button>
          </form>
          {error && <p role="alert" className="mt-3 text-sm text-blue">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3 text-sm underline">
            {cleaning && <button type="button" disabled={busy || capturing || bookingFlow} className="disabled:opacity-50" onClick={() => request(undefined, undefined, es ? 'Me gustaría un plan de crecimiento para mi empresa de limpieza comercial. ¿Cómo podemos empezar?' : 'I would like a growth plan for my commercial cleaning business. How can we get started?')}>{es ? 'Solicitar mi plan de crecimiento' : 'Request my growth plan'}</button>}
            <button type="button" disabled={busy || capturing || bookingFlow} onClick={() => request('start_capture')} className="disabled:opacity-50">{es ? 'Hablar con Eduardo' : 'Talk to Eduardo'}</button>
            <a href={waLink(lang)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            {bookingAvailable && !bookingFlow && !capturing && <button type="button" disabled={busy || saveUncertain} onClick={() => request('start_booking')} className="disabled:opacity-50">{es ? 'Agendar llamada' : 'Book a call'}</button>}
          </div>
          {status === 'booking_options' && bookingAvailable && <div ref={bookingPanel} className="mt-3 space-y-2 rounded-xl bg-warm p-3 text-sm">
            <p>{es ? 'Llamada de 15 minutos, bloque de 30 minutos. Hora de Miami (America/New_York), de lunes a viernes de 10:00 a 16:00.' : '15-minute call, 30-minute block. Miami time (America/New_York), Monday through Friday, 10:00–16:00.'}</p>
            <p id={`booking-consent-${context}`} className="text-xs">{es ? 'Al pulsar Reservar, confirmas compartir tu nombre, datos de contacto, email y resumen con Google Calendar/Meet y enviar la invitación a tu email, solo para esta llamada, no para marketing.' : 'By clicking Book, you consent to sharing your name, contact details, email and summary with Google Calendar/Meet and sending the invitation to your email, only for this call, not for marketing.'}</p>
            {slots.map(slot => <button key={slot.id} type="button" disabled={busy} aria-describedby={`booking-consent-${context}`} onClick={() => request('book_slot', slot.id)} className="block w-full rounded-xl bg-blue px-3 py-2 text-left text-sm text-white disabled:opacity-50">{`${es ? 'Reservar' : 'Book'} ${slot.label}`}</button>)}
            {!slots.length && <p>{es ? 'No hay horarios verificados para mostrar. Puedes actualizar o proponer otro.' : 'No verified times to show. Refresh or suggest another time.'}</p>}
            <p className="text-xs">{es ? '¿Otro horario? Escríbelo en el chat como DD/MM/AAAA HH:mm, hora de Miami. La reserva solo se confirma cuando el sistema lo indique.' : 'Prefer another time? Type it in the chat as DD/MM/AAAA HH:mm (day/month/year), Miami time. The booking is only confirmed when the system says so.'}</p>
            <button type="button" disabled={busy} onClick={() => request('refresh_slots')} className="underline disabled:opacity-50">{es ? 'Actualizar horarios' : 'Refresh times'}</button>
          </div>}
          {pending && <div ref={bookingPanel} className="mt-3 space-y-2 rounded-xl bg-warm p-3 text-sm">
            <p>{es ? 'La reserva está pendiente de verificación. Consulta el estado antes de intentar otra. Cerrar el chat no cancela la cita ni crea otra reserva.' : 'The booking is awaiting verification. Check its status before trying another. Closing the chat does not cancel the appointment or create another booking.'}</p>
            <button ref={checkButton} type="button" disabled={busy} onClick={() => request('check_booking')} className="rounded-xl bg-blue px-3 py-2 text-white disabled:opacity-50">{es ? 'Consultar estado' : 'Check booking status'}</button>
          </div>}
          {status === 'booked' && <div ref={bookingPanel} className="mt-3 space-y-2 rounded-xl bg-warm p-3 text-sm">
            <p>{es ? 'Reserva confirmada por el sistema.' : 'Booking confirmed by the system.'}</p>
            {appointment && <p>{new Intl.DateTimeFormat(es ? 'es-US' : 'en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(appointment.start))} — {es ? 'hora de Miami · llamada de 15 minutos / bloque de 30 minutos' : 'Miami time · 15-minute call / 30-minute block'}</p>}
            {meetUrl && <a href={meetUrl} target="_blank" rel="noopener noreferrer" className="block underline">{es ? 'Abrir Google Meet' : 'Open Google Meet'}</a>}
            {calendarUrl && <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className="block underline">{es ? 'Ver cita en Google Calendar' : 'View appointment in Google Calendar'}</a>}
          </div>}
          <div className="mt-4 space-y-2 border-t border-ink/10 pt-4">
            {saveUncertain && <p role="status" className="text-xs font-semibold text-ink/80">{es ? 'Guardado sin verificar. Cancelar solo cierra la captura; no borra una solicitud que pudo guardarse.' : 'Save unverified. Canceling only closes collection; it does not delete a request that may have been saved.'}</p>}
            {status === 'saved' && <p role="status" className="text-sm">{es ? 'Solicitud guardada. Eduardo podrá revisar tu proyecto.' : 'Request saved. Eduardo can review your project.'}</p>}
            {status === 'confirmation_required' && <>
              <p className="text-xs text-ink/70">{consent}</p>
              <button ref={confirmButton} type="button" disabled={busy} onClick={() => request('confirm_save')} aria-label={`${es ? 'Confirmar y guardar' : 'Confirm and save'}. ${consent}`} className="rounded-xl bg-blue px-4 py-2 text-sm text-white disabled:opacity-50">{es ? 'Confirmar y guardar' : 'Confirm and save'}</button>
            </>}
            {capturing
              ? <button type="button" disabled={busy} onClick={() => request('cancel_capture')} className="ml-2 rounded-xl border border-ink/20 px-4 py-2 text-sm disabled:opacity-50">{es ? 'Cancelar' : 'Cancel'}</button>
              : !bookingFlow && <button type="button" disabled={busy} onClick={() => request('start_capture')} className="rounded-xl bg-blue px-4 py-2 text-sm text-white disabled:opacity-50">{es ? 'Dejar mis datos' : 'Leave my details'}</button>}
          </div>
        </div>
      </section>}
      <div data-chat-bar role="region" aria-label={es ? 'Barra de chat' : 'Chat bar'} className="pointer-events-auto border-t border-ink/10 bg-white/95 shadow-[0_-8px_30px_-16px_rgba(15,23,42,0.3)] backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex min-h-20 max-w-[1180px] items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full sm:h-12 sm:w-12"><img src={eduardoPortrait} alt="Eduardo Scott" className="h-full w-full origin-top scale-[1.65] object-cover object-top" /></span>
            <p className="max-w-28 font-display text-sm font-bold leading-tight text-ink sm:max-w-none sm:text-base">{es ? 'Asistente de Eduardo' : 'Eduardo’s assistant'}</p>
          </div>
          <p className="hidden text-sm text-ink/65 lg:block">{es ? 'Cuéntame qué necesita tu negocio.' : 'Tell me what your business needs.'}</p>
          <button ref={toggle} type="button" aria-expanded={open} aria-controls={`scotting-chat-${context}`} onClick={() => { if (open) close(); else { setOpen(true); trackMetric('chat_started', lang, 'chat', context); } }} className="ml-auto inline-flex min-h-12 flex-1 items-center justify-between gap-2 rounded-full bg-blue px-4 py-3 text-left font-display text-sm font-semibold text-white transition-colors hover:bg-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue sm:max-w-md sm:px-6">
            {es ? 'Abrir chat' : 'Let’s chat'}
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0"><path d={open ? 'm6 9 6 6 6-6' : 'M7 17 17 7M7 7h10v10'} /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
