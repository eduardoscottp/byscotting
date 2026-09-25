import { useEffect, useRef, useState } from 'react';
import { waLink, type Lang } from '@/copy';
import { getAttribution, trackMetric } from '@/lib/attribution';

type Message = { role: 'user' | 'assistant'; content: string };
const endpoint = import.meta.env.VITE_CHAT_ENDPOINT;
const leadEndpoint = import.meta.env.VITE_FORM_ENDPOINT;
const rawBookingUrl = import.meta.env.VITE_GOOGLE_BOOKING_URL;
function bookingUrl() {
  try {
    const url = new URL(rawBookingUrl || '');
    return url.protocol === 'https:' && ['calendar.google.com', 'calendar.app.google'].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}

export default function ChatWidget({ lang }: { lang: Lang }) {
  const es = lang === 'es';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [shareChat, setShareChat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const submissionId = useRef<string>('');
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const booking = bookingUrl();
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages, busy]);
  if (!endpoint) return null;

  function close() { setOpen(false); toggle.current?.focus(); }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy || saving) return;
    const next: Message[] = [...messages, { role: 'user', content: draft.trim() }];
    if (next.length > 23 || next.reduce((sum, m) => sum + m.content.length, 0) > 12000) {
      setError(es ? 'Sigamos por el formulario o WhatsApp.' : 'Please continue through the form or WhatsApp.'); return;
    }
    const message = draft.trim(); setDraft(''); setMessages(next); setBusy(true); setError('');
    try {
      const response = await fetch(endpoint!, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, lang }), signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok || typeof result.reply !== 'string' || !result.reply.trim()) throw Error('Unavailable');
      setMessages([...next, { role: 'assistant', content: result.reply }]);
    } catch {
      setMessages(messages); setDraft(message);
      setError(es ? 'El asistente no está disponible. Puedes dejar tu contacto o escribir por WhatsApp.' : 'The assistant is unavailable. Leave your contact details or use WhatsApp.');
    } finally { setBusy(false); }
  }
  async function capture(event: React.FormEvent) {
    event.preventDefault();
    if (!contact.trim() || saving || busy || !leadEndpoint) return;
    if (!submissionId.current) submissionId.current = crypto.randomUUID();
    setSaving(true); setError('');
    try {
      const response = await fetch(leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000), body: JSON.stringify({
        submission_id: submissionId.current, name, contact, detail: es ? 'Solicitud de contacto desde el asistente.' : 'Callback requested from the website assistant.',
        chips: ['Website and lead capture'], lang, attribution: getAttribution(), share_chat: shareChat && messages.length > 0, ...(shareChat && messages.length ? { messages } : {}),
      }) });
      const result = await response.json();
      if (!response.ok || result.accepted !== true) throw Error('Not accepted');
      setSaved(true); trackMetric('generate_lead', lang, 'chat');
    } catch { setError(es ? 'No pudimos guardar tu solicitud. Reintenta o usa WhatsApp.' : 'Your request could not be saved. Retry or use WhatsApp.'); }
    finally { setSaving(false); }
  }

  const field = 'w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-blue';
  return (
    <div className="fixed bottom-24 left-4 z-50 sm:left-5" onKeyDown={e => { if (e.key === 'Escape') close(); }}>
      {open && <section aria-label={es ? 'Asistente de Scotting' : 'Scotting assistant'} className="mb-3 flex max-h-[75dvh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-ink/15 bg-white text-ink shadow-lg">
        <header className="flex items-center justify-between bg-ink px-4 py-3 text-white">
          <div><p className="font-display font-semibold">Scotting</p><p className="text-xs">{es ? 'Asistente de IA' : 'AI assistant'}</p></div>
          <button type="button" onClick={close} className="rounded px-3 py-2 text-sm" aria-label={es ? 'Cerrar chat' : 'Close chat'}>×</button>
        </header>
        <div className="overflow-y-auto p-4">
          <p className="mb-3 text-xs text-ink/70">{es ? 'Tus mensajes se envían a nuestro proveedor de IA para responderte. No compartas datos sensibles.' : 'Messages are sent to our AI provider to answer you. Please avoid sensitive information.'}</p>
          <div ref={log} role="log" aria-live="polite" aria-relevant="additions text" className="max-h-52 space-y-3 overflow-y-auto">
            <p className="text-sm">{es ? '¿Qué te gustaría mejorar en tu página o en cómo recibes clientes?' : 'What would you like to improve about your website or how you receive inquiries?'}</p>
            {messages.map((m, i) => <p key={i} className={`whitespace-pre-wrap break-words rounded-xl p-3 text-sm ${m.role === 'user' ? 'bg-blue text-white' : 'bg-warm text-ink'}`}><span className="sr-only">{m.role === 'user' ? (es ? 'Tú: ' : 'You: ') : 'Scotting: '}</span>{m.content}</p>)}
            {busy && <p role="status" className="text-sm">{es ? 'Escribiendo…' : 'Writing…'}</p>}
          </div>
          <form onSubmit={send} className="mt-3 flex gap-2">
            <input ref={input} value={draft} onChange={e => setDraft(e.target.value)} maxLength={1500} disabled={busy || saving} aria-label={es ? 'Tu mensaje' : 'Your message'} placeholder={es ? 'Escribe tu pregunta' : 'Ask a question'} className={field} />
            <button disabled={busy || saving || !draft.trim()} className="rounded-xl bg-blue px-3 py-2 text-sm text-white disabled:opacity-50">{es ? 'Enviar' : 'Send'}</button>
          </form>
          {error && <p role="alert" className="mt-3 text-sm text-blue">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3 text-sm underline">
            {booking && <a href={booking} target="_blank" rel="noopener noreferrer" onClick={() => trackMetric('booking_click', lang, 'chat')}>{es ? 'Elegir una reunión' : 'Choose a meeting time'}</a>}
            <a href={waLink(lang)} target="_blank" rel="noopener noreferrer">{es ? 'Hablar con Eduardo' : 'Talk to Eduardo'}</a>
          </div>
          {leadEndpoint && (saved ? <p role="status" className="mt-4 text-sm">{es ? 'Solicitud guardada. Eduardo podrá revisar tu proyecto.' : 'Request saved. Eduardo can review your project.'}</p> : <form onSubmit={capture} className="mt-4 space-y-2 border-t border-ink/10 pt-4">
            <p className="font-display text-sm font-semibold">{es ? 'Prefiero que me contacten' : 'Request a callback'}</p>
            <label className="block text-xs">{es ? 'Nombre (opcional)' : 'Name (optional)'}<input className={field} autoComplete="name" maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
            <label className="block text-xs">{es ? 'Email o teléfono' : 'Email or phone'}<input className={field} required maxLength={254} value={contact} onChange={e => setContact(e.target.value)} /></label>
            {messages.length > 0 && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={shareChat} onChange={e => setShareChat(e.target.checked)} />{es ? 'Incluir este chat para explicar mi proyecto.' : 'Include this chat to explain my project.'}</label>}
            <p className="text-xs text-ink/70">{es ? 'Usaremos estos datos para responder a tu solicitud. Si compartes el chat, podremos usar sus temas para mejorar el servicio.' : 'We use these details to respond to your request. If you share the chat, its themes may help us improve the service.'}</p>
            <button disabled={saving || busy} className="rounded-xl bg-blue px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? (es ? 'Guardando…' : 'Saving…') : (es ? 'Solicitar contacto' : 'Request contact')}</button>
          </form>)}
        </div>
      </section>}
      <button ref={toggle} type="button" aria-expanded={open} onClick={() => { if (open) close(); else { setOpen(true); trackMetric('chat_started', lang, 'chat'); } }} className="rounded-full bg-ink px-5 py-3 font-display text-sm text-white focus:outline-2 focus:outline-offset-2 focus:outline-blue">{es ? 'Pregúntale a Scotting' : 'Ask Scotting'}</button>
    </div>
  );
}
