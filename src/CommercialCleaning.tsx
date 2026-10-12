import { useEffect, useRef, useState, type FormEvent } from 'react';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import CleaningDemo from '@/components/CleaningDemo';
import CleaningFlow from '@/components/CleaningFlow';
import { contactChannel, cleaningHeadlines, cleaningPageTitle, selectCleaningHeadline, type CleaningHeadlineKey } from '@/lib/cleaningCampaign';
import { getAttribution, initializeAnalytics, initializeAttribution, trackMetric } from '@/lib/attribution';
import { waLink } from '@/copy';
import logo from '@/assets/scotting-wordmark-blue.png';
import eduardoHero from '@/assets/eduardo-hero-oficina.webp';
import '@/cleaning.css';

type ChatContext = { serviceMix?: 'commercial' | 'mixed'; summary?: string };

export function GrowthForm({ chatContext, clearChatContext, headline = 'default' }: { chatContext?: ChatContext; clearChatContext?: () => void; headline?: CleaningHeadlineKey } = {}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const id = useRef(crypto.randomUUID());
  const started = useRef(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === 'saving') return;
    const fields = new FormData(e.currentTarget);
    const name = String(fields.get('name') || '').trim();
    const contact = String(fields.get('contact') || '').trim();
    const channel = contactChannel(contact);
    if (!name || !channel) {
      setState('error');
      setError(!name ? 'Please enter your full name.' : 'Enter a valid email address or phone number, including the area code.');
      return;
    }
    setState('saving'); setError('');
    try {
      const response = await fetch(import.meta.env.VITE_FORM_ENDPOINT || '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000), body: JSON.stringify({
        submission_id: id.current, name, contact, ...(chatContext ? { service_mix: chatContext.serviceMix } : {}), response_channel: channel,
        request_kind: 'contact', headline_variant: headline,
        detail: chatContext?.summary || '', website_trap: fields.get('website_trap') || '', landing: 'commercial_cleaning', capture_surface: 'form', chips: ['Commercial cleaning growth plan'], lang: 'en', attribution: getAttribution(),
      }) });
      const result = await response.json();
      if (!response.ok || result.accepted !== true) throw new Error('not_saved');
      setState('saved'); trackMetric('generate_lead', 'en', 'form', 'commercial_cleaning', { headline_variant: headline });
    } catch { setState('error'); setError('Your request has not been saved. Please try again, or contact Eduardo on WhatsApp.'); }
  }
  if (state === 'saved') return <div className="cl-dock-success" role="status"><span aria-hidden="true">✓</span><div><strong>Request received.</strong><p>Eduardo will contact you in less than 5 minutes using the details you provided.</p></div></div>;
  return <form className="cl-dock-form" onSubmit={submit} onFocus={() => { if (!started.current) { started.current = true; trackMetric('form_start', 'en', 'form', 'commercial_cleaning'); } }}>
    <p className="cl-dock-response">We will contact you in less than 5 min.</p>
    <div className="cl-dock-fields">
      <label>Full name<input id="cleaning-contact-name" required name="name" autoComplete="name" maxLength={120} placeholder="Your full name" /></label>
      <label>Phone number or email<input required name="contact" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={254} placeholder="Phone or email" aria-describedby={error ? 'cleaning-form-error' : undefined} /></label>
      <button className="cl-dock-submit" type="submit" name="request_kind" value="contact" disabled={state === 'saving'}>{state === 'saving' ? 'Sending…' : 'Contact me'} <span aria-hidden="true">↗</span></button>
    </div>
    <div className="cl-trap" aria-hidden="true"><label>Leave this empty<input name="website_trap" tabIndex={-1} autoComplete="off" /></label></div>
    <div className="cl-dock-notes"><p><a href="#privacy" onClick={() => document.getElementById('privacy')?.setAttribute('open', '')}>Privacy</a>.</p>{chatContext && <p>Chat choices included. <button type="button" onClick={clearChatContext}>Remove</button></p>}</div>
    {error && <p id="cleaning-form-error" className="cl-dock-error" role="alert">{error}</p>}
    {state === 'error' && error.startsWith('Your request') && <a className="cl-dock-alternative" href={waLink('en')} target="_blank" rel="noopener noreferrer">Contact Eduardo on WhatsApp ↗</a>}
  </form>;
}

export default function CommercialCleaning() {
  const [contactExpanded, setContactExpanded] = useState(false);
  const [headline] = useState(() => selectCleaningHeadline(window.location.search));
  const copy = cleaningHeadlines[headline];
  const page = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      page.current?.style.setProperty('--cl-contact-height', entry.target.getBoundingClientRect().height + 'px');
    });
    if (dock.current) observer.observe(dock.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    initializeAttribution(import.meta.env.VITE_ATTRIBUTION_STORAGE === 'true');
    document.documentElement.lang = 'en';
    document.title = cleaningPageTitle(headline);
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy.subtitle);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${window.location.origin}/landingpage_leads`);
    initializeAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID);
  }, [copy.subtitle, headline]);
  return <div ref={page} className="cleaning-page" onClick={e => {
    const link = (e.target as Element).closest('a[href]');
    if (link && new URL(link.getAttribute('href') || '', window.location.href).hostname === 'wa.me') {
      trackMetric('whatsapp_click', 'en', 'whatsapp', 'commercial_cleaning', { headline_variant: headline });
    }
  }}>
    <a className="cl-skip" href="#main">Skip to content</a>
    <header className="cl-header cl-wrap"><img src={logo} alt="Scotting" width="150" height="42" /><a id="cleaning-chat-button" href={waLink('en')} target="_blank" rel="noopener noreferrer">Chat with us <span aria-hidden="true">↗</span></a></header>
    <main id="main">
      <section className="cl-hero cl-wrap" aria-labelledby="cleaning-title">
        <div className="cl-hero-copy"><h1 id="cleaning-title">{copy.title}<em>{copy.emphasis}</em></h1></div>
        <div className="cl-implementation"><p className="cl-implementation-label">HOW WE HELP BRING CUSTOMERS TO YOU</p><CleaningFlow /><p className="cl-hero-subtitle">{copy.subtitle}</p><div className="cl-hero-contact"><a href={waLink('en')} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="h-5 w-5" />Contact us on WhatsApp <span aria-hidden="true">↗</span></a></div></div>
      </section>
      <CleaningDemo />
      <section className="cl-wrap cl-about" aria-labelledby="about-title">
        <img src={eduardoHero} alt="Eduardo Scott of Scotting in his Miami office" loading="lazy" width="800" height="640" />
        <div><h2 id="about-title">Who we are.</h2><p>I’m <strong>Eduardo Scott</strong>, a Miami-based engineer with 15 years of experience in software, including a decade working with data and leading technology teams. I also have experience in digital sales and helping businesses grow their revenue.</p><p>At Scotting, I bring that experience to your business. You work directly with me to connect your landing page, AI Agents and follow-up into a practical system for reaching new customers.</p></div>
      </section>
    </main>
    <footer className="cl-wrap cl-footer"><details id="privacy"><summary>Privacy & contact</summary><div>
      <p>Scotting stores the details you submit in Airtable to review and respond to your request. We detect whether you provided an email address or phone number. This does not enroll you in SMS or AI voice marketing.</p>
      <p>The website assistant uses the Scotting AI agent to answer your questions. Full chat transcripts are not automatically attached to your form request.</p>
      <p>Google Analytics measures page activity and campaign interactions. Our custom events exclude names, contact details and form text. Campaign identifiers and the headline version may accompany your inquiry.</p>
      <p>To correct or remove your details or stop further contact, <a href={waLink('en')} target="_blank" rel="noopener noreferrer">contact Eduardo on WhatsApp</a>.</p>
    </div></details></footer>
    <section ref={dock} id="growth-plan" className="cl-contact-fixed" aria-label="Contact Scotting"><div className="cl-wrap cl-contact-options">
      <button className="cl-contact-toggle" type="button" aria-expanded={contactExpanded} aria-controls="cleaning-contact-panel" onClick={() => setContactExpanded(expanded => !expanded)}>
        <span>{contactExpanded ? 'Close form' : 'Contact me'} <span className="cl-contact-time">— less than 5 min.</span></span><span aria-hidden="true">{contactExpanded ? '⌄' : '⌃'}</span>
      </button>
      <div id="cleaning-contact-panel" className={contactExpanded ? 'cl-contact-panel is-expanded' : 'cl-contact-panel'}><GrowthForm headline={headline} /></div>
      <a className="cl-contact-whatsapp" href={waLink('en')} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="h-5 w-5" /><span><span className="cl-contact-whatsapp-desktop">Contact us on </span>WhatsApp</span></a>
    </div></section>
  </div>;
}
