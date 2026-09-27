import { useEffect, useRef, useState, type FormEvent } from 'react';
import ChatWidget from '@/components/ChatWidget';
import { getAttribution, initializeAnalytics, initializeAttribution, trackMetric } from '@/lib/attribution';
import { waLink } from '@/copy';
import logo from '@/assets/scotting-wordmark-blue.png';
import portrait from '@/assets/eduardo-scott-ingeniero-miami.webp';
import '@/cleaning.css';

const stages = [
  { name: 'Inquiry', title: 'A real inquiry. A clear owner.', label: 'NEW OPPORTUNITY', note: 'A facility manager requests recurring office cleaning.', details: [['Service', 'Recurring office cleaning'], ['Location', 'Miami-Dade'], ['Next step', 'Assign a callback']], task: 'Your team receives the inquiry and its source.' },
  { name: 'Walkthrough', title: 'Make the next step easy.', label: 'READY TO CONNECT', note: 'Your team confirms the scope and arranges a site visit.', details: [['Contact', 'Facility decision-maker'], ['Need', 'Office cleaning assessment'], ['Next step', 'Confirm a walkthrough']], task: 'The booking is confirmed by your team or connected calendar.' },
  { name: 'Proposal', title: 'A proposal with a follow-up.', label: 'KEEP IT MOVING', note: 'Your team prices the work. The system keeps the next action visible.', details: [['Proposal', 'Prepared by your team'], ['Owner', 'Your sales contact'], ['Next step', 'Follow up on the decision']], task: 'Track the outcome. A proposal is not a won contract.' },
];
const faqs = [
  ['Do you sell leads or cleaning contracts?', 'We build a marketing and follow-up system around your business. Your scope may include advertising to attract inquiries. We do not sell guaranteed contracts or promise a fixed number of leads. Your team still visits the site, quotes the work and closes the sale.'],
  ['What does the service cost?', 'We first review what you have and what needs to improve. Your proposal separates setup, ongoing service, advertising spend and software costs. You see the scope and price before deciding.'],
  ['Do I need to replace my current software?', 'Not necessarily. We start with the tools you already use and check whether they can support the process. Any new tools or integrations are agreed as part of your scope.'],
  ['Is AI required?', 'No. A focused page, a timely human response and clear follow-up may be the right starting point. A chatbot or voice assistant is an option when it genuinely helps your team.'],
  ['What if I need more inquiries, not more software?', 'That is exactly what we need to establish first. We review your current acquisition channels, service area and capacity before recommending an advertising test. Follow-up software alone does not create demand.'],
  ['How soon will I see results?', 'Setup depends on access, your tools and the agreed scope. Sales take time, so we measure inquiries, qualified conversations, walkthroughs and proposals separately. We do not guarantee revenue by a fixed date.'],
];
function Arrow() { return <span aria-hidden="true">↗</span>; }
export function GrowthForm() {
  const [channel, setChannel] = useState('email');
  const [mix, setMix] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const id = useRef(crypto.randomUUID());
  const started = useRef(false);
  const fit = mix === 'commercial' || mix === 'mixed';
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
  if (state === 'saved') return <div className="cl-success" role="status"><span className="cl-check">✓</span><p className="cl-eyebrow">REQUEST RECEIVED</p><h3>Let’s find your next priority.</h3><p>Your details have been saved for Eduardo to review. He’ll respond through your selected contact method.</p><p className="cl-small">A request is not a confirmed appointment. We’ll agree on a time together.</p></div>;
  return <form className="cl-form" onSubmit={submit} onFocus={() => { if (!started.current) { started.current = true; trackMetric('form_start', 'en', 'form', 'commercial_cleaning'); } }}>
    <div className="cl-form-heading"><span className="cl-eyebrow">LET’S START WITH YOUR BUSINESS</span><h3>Get your cleaning growth plan.</h3><p>A short conversation. A practical next step.</p></div>
    <div className="cl-form-row"><label>Your name<input required name="name" autoComplete="name" maxLength={120} placeholder="First and last name" /></label><label>Company name<input required name="company" autoComplete="organization" maxLength={160} placeholder="Your cleaning company" /></label></div>
    <label>Email<input required name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@company.com" /></label>
    <label>What kind of cleaning business do you run?<select required value={mix} onChange={e => setMix(e.target.value)}><option value="">Choose your service mix</option><option value="commercial">Commercial cleaning</option><option value="mixed">Commercial and residential</option><option value="residential">Residential only</option><option value="other">I’m looking for a cleaner or a job</option></select></label>
    {mix && !fit && <p className="cl-scope-note" role="status">This growth plan is for businesses with an active commercial cleaning operation. For other technology questions, you can <a href={waLink('en')}>contact Eduardo directly</a>.</p>}
    <label>What would you most like to improve? <span>(optional)</span><textarea name="detail" maxLength={1600} rows={3} placeholder="More commercial inquiries, faster responses, following up on quotes…" /></label>
    <fieldset><legend>How should we respond?</legend><div className="cl-radio-row"><label><input type="radio" name="channel" value="email" checked={channel === 'email'} onChange={() => setChannel('email')} /> Email me</label><label><input type="radio" name="channel" value="callback" checked={channel === 'callback'} onChange={() => setChannel('callback')} /> Call me</label></div></fieldset>
    {channel === 'callback' && <label>Phone number<input required name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="(305) 555-0123" /><span className="cl-field-note">A team member will call about this request.</span></label>}
    <div className="cl-trap" aria-hidden="true"><label>Leave this empty<input name="website_trap" tabIndex={-1} autoComplete="off" /></label></div>
    <p className="cl-consent">We use these details to respond to your request. No automatic enrollment in AI calls or text marketing. <a href="#privacy">Privacy details</a>.</p>
    {error && <p className="cl-error" role="alert">{error}</p>}
    <button className="cl-button cl-button-full" type="submit" disabled={state === 'saving' || !fit}>{state === 'saving' ? 'Sending your request…' : 'Request My Growth Plan'}<Arrow /></button>
    <a className="cl-form-alternative" href={waLink('en')} target="_blank" rel="noopener noreferrer" onClick={() => trackMetric('whatsapp_click', 'en', 'whatsapp', 'commercial_cleaning')}>Prefer a conversation? Talk to Eduardo on WhatsApp ↗</a>
  </form>;
}

export default function CommercialCleaning() {
  const [stage, setStage] = useState(0);
  const current = stages[stage];
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
    <header className="cl-header"><div className="cl-wrap cl-header-inner"><a href="/en" aria-label="Scotting home"><img src={logo} alt="Scotting" width="160" height="44" /></a><nav aria-label="Page navigation"><a href="#system">The system</a><a href="#questions">Questions</a><a className="cl-nav-cta" href="#growth-plan">Let’s talk <Arrow /></a></nav></div></header>
    <main id="main">
      <section className="cl-hero cl-wrap">
        <div className="cl-hero-copy"><p className="cl-eyebrow"><span className="cl-label-line" /> FOR MIAMI-DADE CLEANING BUSINESS OWNERS</p><h1>More opportunities.<br /><em>Fewer loose ends.</em></h1><p className="cl-lead">Give every commercial cleaning inquiry a clear next step.</p><p className="cl-hero-body">Connect your marketing, landing page and follow-up so your team can respond, arrange walkthroughs and keep proposals moving.</p><a className="cl-button" href="#growth-plan">Get My Cleaning Growth Plan <Arrow /></a><p className="cl-small">Built around your business. Scope and costs agreed first.</p></div>
        <div className="cl-workflow" aria-label="Sample cleaning sales workflow"><div className="cl-workflow-top"><span>FROM INQUIRY TO NEXT STEP</span><span className="cl-sample">Interactive example</span></div><div className="cl-stage-tabs" role="tablist" aria-label="Explore a sample sales process">{stages.map((s, i) => <button key={s.name} role="tab" id={`stage-${i}`} aria-selected={stage === i} aria-controls="workflow-panel" tabIndex={stage === i ? 0 : -1} onKeyDown={e => { if (['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (stage + (e.key === 'ArrowRight' ? 1 : 2)) % 3; setStage(next); document.getElementById(`stage-${next}`)?.focus(); } }} onClick={() => setStage(i)}><span>0{i + 1}</span>{s.name}</button>)}</div><div className="cl-workflow-panel" id="workflow-panel" role="tabpanel" aria-labelledby={`stage-${stage}`}><span className="cl-panel-label">{current.label}</span><h2>{current.title}</h2><p>{current.note}</p><dl>{current.details.map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><div className="cl-task"><span aria-hidden="true">↳</span><p>{current.task}</p></div></div><p className="cl-demo-disclaimer">Sample data. Your workflow is tailored to your team.</p></div>
      </section>
      <div className="cl-context-band"><div className="cl-wrap"><p>For established <strong>commercial cleaning companies.</strong></p><span>Marketing + lead capture + follow-up</span></div></div>
      <section className="cl-section cl-wrap cl-problem"><div><p className="cl-eyebrow">START WITH THE REAL BOTTLENECK</p><h2>More leads only help<br />if the next step happens.</h2></div><div className="cl-problem-copy"><p>You might need more of the right inquiries. Or you might already have quotes sitting in an inbox and prospects waiting for a response.</p><p>We look at where opportunities get stuck before recommending more advertising or another tool.</p><a href="#growth-plan" className="cl-text-link">Find your next priority <Arrow /></a></div></section>
      <section className="cl-system-section" id="system"><div className="cl-wrap cl-section"><div className="cl-section-heading"><p className="cl-eyebrow">THE SCOTTING REVENUE ENGINE</p><h2>One connected process.<br />A clear owner at every step.</h2><p>Start with what matters to your business. Connect the rest as it becomes useful.</p></div><div className="cl-system-grid">{[
        ['01', 'Attract the right inquiry', 'Focused ads and a landing page explain your commercial services and collect the details your team needs.', 'Marketing + landing page'],
        ['02', 'Respond and qualify', 'Route inquiries to the right person. Use a clear form, a human callback or a helpful chat flow.', 'Lead capture + routing'],
        ['03', 'Keep the sale moving', 'Give walkthroughs, proposals and follow-ups a place in your pipeline — and someone responsible for the next action.', 'Calendar + follow-up'],
        ['04', 'See what is working', 'Connect marketing to qualified conversations, proposals and won business. See the stages separately.', 'Measurement + review'],
      ].map(([n,title,body,label]) => <article key={n}><span className="cl-step-number">{n}</span><h3>{title}</h3><p>{body}</p><span className="cl-step-label">{label}</span></article>)}</div><p className="cl-system-footnote">You handle the cleaning, pricing and sales decisions. We help the process work better.</p></div></section>
      <section className="cl-section cl-wrap cl-fit"><div><p className="cl-eyebrow">A GOOD FIT MATTERS</p><h2>Built for a business<br />ready for its next contract.</h2><p>This is for companies already serving commercial clients in Miami-Dade, with room to take on more work.</p></div><div className="cl-fit-list"><div><span>✓</span><p>You have an active commercial cleaning operation.</p></div><div><span>✓</span><p>Someone on your team can respond and attend walkthroughs.</p></div><div><span>✓</span><p>You want a repeatable process and clear costs.</p></div><p className="cl-fit-note">Starting from zero, looking for cleaning work or expecting guaranteed contracts? This is probably not the right first step.</p></div></section>
      <section className="cl-human-section"><div className="cl-wrap cl-human"><img src={portrait} width="440" height="440" loading="lazy" alt="Eduardo Scott, founder of Scotting, at his desk" /><div><p className="cl-eyebrow">TECHNOLOGY, WITH A PERSON BEHIND IT</p><h2>Hi, I’m Eduardo.<br />Let’s make this practical.</h2><p>I’m based in Miami. I build websites, applications and automations around the way a business actually works.</p><p>We’ll start with your current process, agree on the priority and show you what we’re building. AI is an option. A useful system is the goal.</p><a className="cl-text-link" href="#growth-plan">Tell me about your business <Arrow /></a></div></div></section>
      <section className="cl-section cl-wrap cl-faq" id="questions"><div><p className="cl-eyebrow">BEFORE WE TALK</p><h2>Fair questions.<br />Straight answers.</h2></div><div>{faqs.map(([q,a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
      <section className="cl-conversion" id="growth-plan"><div className="cl-wrap cl-conversion-inner"><div className="cl-conversion-copy"><p className="cl-eyebrow">YOUR NEXT STEP</p><h2>Let’s find the gap.<br /><span>Then build the right fix.</span></h2><p>Tell us about your cleaning business. We’ll review your current process and arrange a short conversation about what to improve first.</p><ol><li><span>1</span>Share a few details.</li><li><span>2</span>Talk through your current process.</li><li><span>3</span>Get a clear recommendation and scope.</li></ol><p className="cl-cost-note">No fixed price before we understand the work. Your proposal separates service, advertising and software costs.</p></div><GrowthForm /></div></section>
      <section className="cl-wrap cl-privacy" id="privacy"><details><summary>How we use your information</summary><div><p>Scotting uses the contact and business details you submit to review and respond to your request. Inquiries are stored in our Airtable CRM. We do not automatically enroll you in text messages or AI voice calls.</p><p>The guided chat provides prepared answers in your browser and does not save a transcript to your lead record. If AI chat is enabled, the assistant identifies itself and explains that messages are sent to our AI provider. Avoid sharing confidential or sensitive information.</p><p>Google Analytics helps measure page and interaction activity when configured. Form text, names, email addresses and phone numbers are not included in our custom analytics events. Campaign identifiers may accompany your inquiry so we can understand which marketing brought it.</p><p>You can ask Eduardo to correct or remove your inquiry details, or stop contacting you, through our <a href={waLink('en')} target="_blank" rel="noopener noreferrer">business WhatsApp contact</a>.</p></div></details></section>
    </main>
    <footer className="cl-footer cl-wrap"><a href="/en"><img src={logo} alt="Scotting" width="135" height="38" /></a><p>There’s a smarter way.</p><span>Miami, Florida · © {new Date().getFullYear()} Scotting</span></footer>
    <ChatWidget lang="en" context="commercial_cleaning" />
  </div>;
}
