import { useEffect, useRef, useState, type FormEvent } from 'react';
import ChatWidget from '@/components/ChatWidget';
import CleaningDemo from '@/components/CleaningDemo';
import { getAttribution, initializeAnalytics, initializeAttribution, trackMetric } from '@/lib/attribution';
import { waLink } from '@/copy';
import logo from '@/assets/scotting-wordmark-blue.png';
import portrait from '@/assets/eduardo-scott-ingeniero-miami.webp';
import '@/cleaning.css';

function Arrow() { return <span aria-hidden="true">↗</span>; }
export function GrowthForm({ callbackRequest = 0 }: { callbackRequest?: number } = {}) {
  const [channel, setChannel] = useState('email');
  const [mix, setMix] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const id = useRef(crypto.randomUUID());
  const started = useRef(false);
  const fit = mix === 'commercial' || mix === 'mixed';
  useEffect(() => { if (callbackRequest > 0) setChannel('callback'); }, [callbackRequest]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fit || state === 'saving') return;
    const fields = new FormData(e.currentTarget);
    setState('saving'); setError('');
    try {
      const response = await fetch(import.meta.env.VITE_FORM_ENDPOINT || '/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000), body: JSON.stringify({
        submission_id: id.current, name: fields.get('name'), contact: fields.get('email'), company: fields.get('company'), service_mix: mix, response_channel: channel, phone: fields.get('phone') || '',
        detail: fields.get('detail') || '', website_trap: fields.get('website_trap') || '', landing: 'commercial_cleaning', chips: ['Commercial cleaning growth plan'], lang: 'en', attribution: getAttribution(),
      }) });
      const result = await response.json();
      if (!response.ok || result.accepted !== true) throw new Error('not_saved');
      setState('saved'); trackMetric('generate_lead', 'en', 'form', 'commercial_cleaning');
    } catch { setState('error'); setError('Your request has not been saved. Please try again, or contact Eduardo using the link below.'); }
  }
  if (state === 'saved') return <div className="cl-success" role="status"><span className="cl-check">✓</span><p className="cl-eyebrow">REQUEST RECEIVED</p><h2>Let’s find your next priority.</h2><p>Your details have been saved for Eduardo to review. He’ll respond through your selected contact method.</p><p className="cl-small">A request is not a confirmed appointment. We’ll agree on a time together.</p></div>;
  return <form className="cl-form" onSubmit={submit} onFocus={() => { if (!started.current) { started.current = true; trackMetric('form_start', 'en', 'form', 'commercial_cleaning'); } }}>
    <div className="cl-form-heading"><h2>Get your cleaning growth plan.</h2><p>A short conversation. A clear next step.</p></div>
    <div className="cl-form-row"><label>Your name<input required name="name" autoComplete="name" maxLength={120} /></label><label>Company name<input required name="company" autoComplete="organization" maxLength={160} /></label></div>
    <label>Email<input required name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@company.com" /></label>
    <label>What kind of cleaning business do you run?<select required value={mix} onChange={e => setMix(e.target.value)}><option value="">Choose your service mix</option><option value="commercial">Commercial cleaning</option><option value="mixed">Commercial and residential</option><option value="residential">Residential only</option><option value="other">I’m looking for a cleaner or a job</option></select></label>
    {mix && !fit && <p className="cl-scope-note" role="status">This growth plan is for businesses with an active commercial cleaning operation. For other technology questions, you can <a href={waLink('en')}>contact Eduardo directly</a>.</p>}
    <fieldset><legend>How should we respond?</legend><div className="cl-radio-row"><label><input type="radio" name="channel" value="email" checked={channel === 'email'} onChange={() => setChannel('email')} /> Email me</label><label><input type="radio" name="channel" value="callback" checked={channel === 'callback'} onChange={() => setChannel('callback')} /> Call me</label></div></fieldset>
    {channel === 'callback' && <label>Phone number<input required name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="(305) 555-0123" /><span className="cl-field-note">A team member will call about this request.</span></label>}
    <div className="cl-trap" aria-hidden="true"><label>Leave this empty<input name="website_trap" tabIndex={-1} autoComplete="off" /></label></div>
    <p className="cl-consent">We’ll use your details to respond to this request. <a href="#privacy" onClick={() => document.getElementById('privacy')?.setAttribute('open', '')}>Privacy</a>.</p>
    {error && <p className="cl-error" role="alert">{error}</p>}
    <button className="cl-button cl-button-full" type="submit" disabled={state === 'saving' || Boolean(mix && !fit)}>{state === 'saving' ? 'Sending your request…' : 'Request My Growth Plan'}<Arrow /></button>
    {state === 'error' && <a className="cl-form-alternative" href={waLink('en')} target="_blank" rel="noopener noreferrer" onClick={() => trackMetric('whatsapp_click', 'en', 'whatsapp', 'commercial_cleaning')}>Chat with Eduardo on WhatsApp ↗</a>}
  </form>;
}

export default function CommercialCleaning() {
  const [chatRequest, setChatRequest] = useState(0);
  const [callbackRequest, setCallbackRequest] = useState(0);
  useEffect(() => {
    initializeAttribution(import.meta.env.VITE_ATTRIBUTION_STORAGE === 'true');
    initializeAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID);
    document.documentElement.lang = 'en';
    document.title = 'Marketing for Commercial Cleaning Companies | Scotting';
    const description = 'Connect your cleaning company’s marketing, inquiries and follow-up. Get a practical growth plan for your Miami-Dade business.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${window.location.origin}/comercial_cleaning`);
  }, []);
  return <div className="cleaning-page">
    <a className="cl-skip" href="#main">Skip to content</a>
    <header className="cl-header cl-wrap"><img src={logo} alt="Scotting" width="150" height="42" /><a href="#growth-plan" onClick={() => setCallbackRequest(n => n + 1)}>Request a call <Arrow /></a></header>
    <main id="main"><div className="cl-wrap cl-main">
      <section className="cl-pitch" aria-labelledby="cleaning-title">
        <p className="cl-eyebrow">FOR COMMERCIAL CLEANING OWNERS IN MIAMI-DADE</p>
        <h1 id="cleaning-title">Still chasing your next <em>cleaning contract?</em></h1>
        <p className="cl-description">Build a clearer path from inquiry to walkthrough—with targeted ads, a focused landing page and follow-up, connected for you.</p>
        <ol className="cl-mini-process" aria-label="What Scotting connects"><li><span>01</span><strong>Attract</strong><small>Ads + landing page</small></li><li><span>02</span><strong>Respond</strong><small>Capture + qualify</small></li><li><span>03</span><strong>Follow up</strong><small>Walkthrough + quote</small></li></ol>
        <a className="cl-demo-link" href="#how-it-works">See a sample inquiry in action <span aria-hidden="true">↓</span></a>
        <a className="cl-mobile-cta" href="#growth-plan">Get My Growth Plan <Arrow /></a>
        <div className="cl-contact-options">
          <button id="cleaning-chat-button" type="button" onClick={() => setChatRequest(n => n + 1)}>Chat now <Arrow /></button>
          <a href="#growth-plan" onClick={() => setCallbackRequest(n => n + 1)}>Request a call <Arrow /></a>
        </div>
        <div className="cl-person"><img src={portrait} width="38" height="38" alt="Eduardo Scott" /><p><strong>Built with Eduardo Scott</strong><span>Your local contact in Miami</span></p></div>
      </section>
      <section id="growth-plan" className="cl-form-panel" aria-label="Request your cleaning growth plan"><GrowthForm callbackRequest={callbackRequest} /></section>
    </div>
    <section className="cl-wrap cl-reassurance" aria-label="Before you commit"><div><strong>Start with what you have.</strong><p>We review your current tools first.</p></div><div><strong>See the costs upfront.</strong><p>Scope, ads and software priced separately.</p></div><div><strong>Keep a person in control.</strong><p>Your team handles quotes and sales decisions.</p></div></section>
    <CleaningDemo />
    </main>
    <footer className="cl-wrap cl-footer">
      <p>Scope and pricing agreed first. Advertising and software costs are separate.</p>
      <details id="privacy"><summary>Privacy & contact</summary><div>
        <p>Scotting stores the details you submit in Airtable to review and respond to your request by your chosen channel. This does not enroll you in SMS or AI voice marketing.</p>
        <p>The guided chat uses prepared answers in your browser. If AI chat is enabled, it identifies itself and explains that messages go to our AI provider. Chat transcripts are not attached to this form.</p>
        <p>Google Analytics measures page activity and campaign interactions. Our custom events exclude names, contact details and form text. Campaign identifiers may accompany your inquiry.</p>
        <p>To correct or remove your details or stop further contact, <a href={waLink('en')} target="_blank" rel="noopener noreferrer">contact Eduardo on WhatsApp</a>.</p>
      </div></details>
    </footer>
    <ChatWidget lang="en" context="commercial_cleaning" openRequest={chatRequest} />
  </div>;
}
