import { useEffect, useRef, useState } from 'react';
import { waLink, type Lang } from '@/copy';
import { getAttribution, trackMetric } from '@/lib/attribution';

type Message = { role: 'user' | 'assistant'; content: string };
const endpoint = import.meta.env.VITE_CHAT_ENDPOINT;
const leadEndpoint = import.meta.env.VITE_FORM_ENDPOINT;
const rawBookingUrl = import.meta.env.VITE_GOOGLE_BOOKING_URL;
const cleaningGuidance = [
  ['I need more inquiries', 'We start with your service area, ideal commercial accounts and current marketing. Then we plan a focused landing page and a small, measurable campaign. The growth plan helps decide whether ads are a sensible next step for your budget.'],
  ['I need better follow-up', 'We map what happens after an inquiry: who responds, how a walkthrough is arranged and who follows up on the proposal. A shared pipeline and reminders help your team keep the next action clear.'],
  ['Is this right for my company?', 'This offer is for owners of commercial cleaning businesses serving Miami-Dade, including companies that also do residential work. You should have capacity for more commercial accounts and someone who can respond to inquiries.'],
  ['What does it cost?', 'Pricing depends on the work and integrations you need. Advertising and software costs are separate from the project quote. Request a growth plan to discuss scope before committing; there are no guaranteed leads or contracts.'],
  ['Do I need AI?', 'No. Human follow-up may be the best starting point. AI chat or voice can be considered when useful, with clear consent and a way to reach a person. This guided chat uses prepared answers, not AI.'],
] as const;
function bookingUrl() {
  try {
    const url = new URL(rawBookingUrl || '');
    return url.protocol === 'https:' && ['calendar.google.com', 'calendar.app.google'].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}

export default function ChatWidget({ lang, context = 'homepage', openRequest = 0 }: { lang: Lang; context?: 'homepage' | 'commercial_cleaning'; openRequest?: number }) {
  const cleaning = context === 'commercial_cleaning';
  const chatEndpoint = endpoint;
  const guided = cleaning && !chatEndpoint;
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
  useEffect(() => { if (openRequest > 0) { setOpen(true); trackMetric('chat_started', lang, 'chat', context); } }, [openRequest, lang, context]);
  useEffect(() => { if (open) { if (guided) log.current?.focus(); else input.current?.focus(); } }, [open, guided]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages, busy]);
  if (!chatEndpoint && !guided) return null;

  function close() { setOpen(false); if (cleaning) document.getElementById('cleaning-chat-button')?.focus(); else toggle.current?.focus(); }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy || saving || !chatEndpoint) return;
    const next: Message[] = [...messages, { role: 'user', content: draft.trim() }];
    if (next.length > 23 || next.reduce((sum, m) => sum + m.content.length, 0) > 12000) {
      setError(es ? 'Sigamos por el formulario o WhatsApp.' : 'Please continue through the form or WhatsApp.'); return;
    }
    const message = draft.trim(); setDraft(''); setMessages(next); setBusy(true); setError('');
    try {
      const response = await fetch(chatEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, lang, context }), signal: AbortSignal.timeout(30000) });
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
          <div><p className="font-display font-semibold">Scotting</p><p className="text-xs">{guided ? 'Commercial cleaning guide' : es ? 'Asistente de IA' : 'AI assistant'}</p></div>
          <button type="button" onClick={close} className="rounded px-3 py-2 text-sm" aria-label={es ? 'Cerrar chat' : 'Close chat'}>×</button>
        </header>
        <div className="overflow-y-auto p-4">
          <p className="mb-3 text-xs text-ink/70">{guided ? 'Choose a topic for a prepared answer, or talk to Eduardo. This is a guided chat, not an AI conversation.' : es ? 'Tus mensajes se envían a nuestro proveedor de IA para responderte. No compartas datos sensibles.' : 'Messages are sent to our AI provider to answer you. Please avoid sensitive information.'}</p>
          <div ref={log} tabIndex={-1} role="log" aria-live="polite" aria-relevant="additions text" className="max-h-52 space-y-3 overflow-y-auto">
            <p className="text-sm">{cleaning ? 'Do you run a commercial cleaning business? I can explain how the marketing and follow-up system works. What would you like to improve?' : es ? '¿Qué te gustaría mejorar en tu página o en cómo recibes clientes?' : 'What would you like to improve about your website or how you receive inquiries?'}</p>
            {messages.map((m, i) => <p key={i} className={`whitespace-pre-wrap break-words rounded-xl p-3 text-sm ${m.role === 'user' ? 'bg-blue text-white' : 'bg-warm text-ink'}`}><span className="sr-only">{m.role === 'user' ? (es ? 'Tú: ' : 'You: ') : 'Scotting: '}</span>{m.content}</p>)}
            {busy && <p role="status" className="text-sm">{es ? 'Escribiendo…' : 'Writing…'}</p>}
          </div>
          {guided ? <div className="mt-3 flex flex-wrap gap-2" aria-label="Choose a topic">{cleaningGuidance.map(([question, answer]) => <button key={question} type="button" className="rounded-xl border border-ink/20 px-3 py-2 text-left text-sm focus:outline-2 focus:outline-blue" onClick={() => setMessages(previous => [...previous.slice(-18), { role: 'user', content: question }, { role: 'assistant', content: answer }])}>{question}</button>)}</div> : <form onSubmit={send} className="mt-3 flex gap-2">
            <input ref={input} value={draft} onChange={e => setDraft(e.target.value)} maxLength={1500} disabled={busy || saving} aria-label={es ? 'Tu mensaje' : 'Your message'} placeholder={es ? 'Escribe tu pregunta' : 'Ask a question'} className={field} />
            <button disabled={busy || saving || !draft.trim()} className="rounded-xl bg-blue px-3 py-2 text-sm text-white disabled:opacity-50">{es ? 'Enviar' : 'Send'}</button>
          </form>}
          {error && <p role="alert" className="mt-3 text-sm text-blue">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3 text-sm underline">
            {booking && <a href={booking} target="_blank" rel="noopener noreferrer" onClick={() => trackMetric('booking_click', lang, 'chat', context)}>{es ? 'Elegir una reunión' : 'Choose a meeting time'}</a>}
            {cleaning && <a href="#growth-plan" onClick={close}>Request my growth plan</a>}
            <a href={waLink(lang)} target="_blank" rel="noopener noreferrer">{es ? 'Hablar con Eduardo' : 'Talk to Eduardo'}</a>
          </div>
          {!cleaning && leadEndpoint && (saved ? <p role="status" className="mt-4 text-sm">{es ? 'Solicitud guardada. Eduardo podrá revisar tu proyecto.' : 'Request saved. Eduardo can review your project.'}</p> : <form onSubmit={capture} className="mt-4 space-y-2 border-t border-ink/10 pt-4">
            <p className="font-display text-sm font-semibold">{es ? 'Prefiero que me contacten' : 'Request a callback'}</p>
            <label className="block text-xs">{es ? 'Nombre (opcional)' : 'Name (optional)'}<input className={field} autoComplete="name" maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
            <label className="block text-xs">{es ? 'Email o teléfono' : 'Email or phone'}<input className={field} required maxLength={254} value={contact} onChange={e => setContact(e.target.value)} /></label>
            {messages.length > 0 && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={shareChat} onChange={e => setShareChat(e.target.checked)} />{es ? 'Incluir este chat para explicar mi proyecto.' : 'Include this chat to explain my project.'}</label>}
            <p className="text-xs text-ink/70">{es ? 'Usaremos estos datos para responder a tu solicitud. Si compartes el chat, podremos usar sus temas para mejorar el servicio.' : 'We use these details to respond to your request. If you share the chat, its themes may help us improve the service.'}</p>
            <button disabled={saving || busy} className="rounded-xl bg-blue px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? (es ? 'Guardando…' : 'Saving…') : (es ? 'Solicitar contacto' : 'Request contact')}</button>
          </form>)}
        </div>
      </section>}
      {!cleaning && <button ref={toggle} type="button" aria-expanded={open} onClick={() => { if (open) close(); else { setOpen(true); trackMetric('chat_started', lang, 'chat', context); } }} className="rounded-full bg-ink px-5 py-3 font-display text-sm text-white focus:outline-2 focus:outline-offset-2 focus:outline-blue">{es ? 'Pregúntale a Scotting' : 'Ask Scotting'}</button>}
    </div>
  );
}
