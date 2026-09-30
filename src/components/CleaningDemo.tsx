import { useEffect, useRef, useState, type ReactNode } from 'react';
import googleAds from '@/assets/google-ads.svg';
import aiAgent from '@/assets/ai-agent.svg';
import '@/cleaning-simulation.css';

const steps = [
  { label: 'Google search', title: 'Be there when they search.', detail: 'An office manager looks for a commercial cleaning company in Miami.' },
  { label: 'Landing page', title: 'Give the click a clear next step.', detail: 'Your ad brings them to a focused page about the cleaning service they need.' },
  { label: 'Short form', title: 'Make getting in touch easy.', detail: 'They leave their name and preferred contact. No long questionnaire.' },
  { label: 'AI conversation', title: 'Turn an inquiry into a conversation.', detail: 'The AI Agent reads the request, asks about the space and helps find a suitable next step.' },
  { label: 'Appointment', title: 'Agree on a walkthrough.', detail: 'With a connected calendar, the agent offers an available time and the prospect confirms.' },
  { label: 'CRM handoff', title: 'Keep the details in one place.', detail: 'Your CRM gets the contact, conversation summary, appointment and next action.' },
  { label: 'Your sales call', title: 'You take it from here.', detail: 'Your team calls, completes the walkthrough, sends a quote and works to win the account.' },
];

function Scene({ step }: { step: number }) {
  if (step === 0) return <div className="cl-sim-search"><div className="cl-sim-google">Google <span>Search example</span></div><div className="cl-sim-searchbar"><span aria-hidden="true">⌕</span><span className="cl-sim-query">office cleaning company miami</span></div><div className="cl-sim-ad"><small><img src={googleAds} alt="" width="20" height="20" /> Sponsored · Sample cleaning company</small><h4>Reliable office cleaning in Miami</h4><p>A cleaner workplace. A schedule that fits. Request a walkthrough.</p><span className="cl-sim-cursor" aria-hidden="true">↖</span></div></div>;
  if (step === 1) return <div className="cl-sim-site"><div className="cl-sim-company">YOUR CLEANING COMPANY <span>Miami, FL</span></div><div className="cl-sim-sitebody"><small>COMMERCIAL CLEANING</small><h4>A clean office.<br />One less thing to manage.</h4><p>Reliable cleaning for your workplace, on your schedule.</p><div className="cl-sim-fakebutton">Request a walkthrough <span>→</span></div></div></div>;
  if (step === 2) return <div className="cl-sim-form"><span className="cl-sim-tag">Sample inquiry</span><h4>Let’s talk about your space.</h4><div className="cl-sim-field"><span>Full name</span><strong>Sofia Rivera</strong></div><div className="cl-sim-field"><span>Email</span><strong>sofia@example.invalid</strong></div><div className="cl-sim-fakebutton">Request a walkthrough <span>✓</span></div><p className="cl-sim-confirm">✓ Request captured — simulation</p></div>;
  if (step === 3) return <div className="cl-sim-chat"><div className="cl-sim-agent"><img src={aiAgent} alt="" width="40" height="40" /><div><strong>Your AI Agent</strong><small>Sample conversation</small></div></div><p className="cl-sim-bubble">Hi Sofia! I saw your office-cleaning request. How large is the space, and how often do you need cleaning?</p><p className="cl-sim-bubble cl-sim-person">About 6,000 sq ft. Three evenings a week.</p><p className="cl-sim-bubble">Thanks. Would you like to choose a walkthrough time so the team can prepare a quote?</p></div>;
  if (step === 4) return <div className="cl-sim-booking"><span className="cl-sim-tag">Connected calendar · example</span><h4>Choose a walkthrough time.</h4><div className="cl-sim-slots"><span>Tue · 10:00 AM</span><span className="cl-sim-selected">Wed · 2:00 PM ✓</span><span>Thu · 11:00 AM</span></div><p className="cl-sim-bubble cl-sim-person">Wednesday at 2 works for me.</p><div className="cl-sim-booked"><span>✓</span><div><strong>Walkthrough booked</strong><small>Wednesday · 2:00 PM · Sample booking</small></div></div></div>;
  if (step === 5) return <div className="cl-sim-crm"><div className="cl-sim-crmhead"><span>YOUR CRM</span><span className="cl-sim-tag">Saved · sample record</span></div><h4>Sofia Rivera</h4><p>sofia@example.invalid</p><dl><div><dt>Source</dt><dd>Google Ads → website</dd></div><div><dt>Needs</dt><dd>6,000 sq ft · 3 evenings / week</dd></div><div><dt>Appointment</dt><dd>Wednesday · 2:00 PM</dd></div><div><dt>Owner</dt><dd>Your sales team</dd></div></dl><div className="cl-sim-task">↗ Next action: call Sofia before the visit</div></div>;
  return <div className="cl-sim-close"><div className="cl-sim-call"><span aria-hidden="true">☎</span><div><strong>Your team + Sofia</strong><small>A personal conversation</small></div></div><div className="cl-sim-salessteps"><span>Call & confirm ✓</span><span>Walkthrough & quote ✓</span><span className="cl-sim-won">Agreement signed ✓</span></div><h4>A new cleaning account.</h4><p>Illustrative outcome. Your team handles pricing, the proposal and the close.</p><span className="cl-sim-tag">Sample outcome · not a guarantee</span></div>;
}

export default function CleaningDemo({ children }: { children?: ReactNode } = {}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(false);
  const [restart, setRestart] = useState(0);
  const player = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    if (player.current) observer.observe(player.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing || !visible) return;
    const timer = window.setTimeout(() => {
      if (step === steps.length - 1) setPlaying(false);
      else setStep(step + 1);
    }, 5500);
    return () => window.clearTimeout(timer);
  }, [playing, visible, step, restart]);
  function select(next: number) { setStep(next); setRestart(value => value + 1); setPlaying(true); }
  return <section className="cl-demo-section" id="how-it-works" aria-labelledby="demo-title">
    <div className="cl-wrap">
      <div className="cl-demo-heading"><h2 id="demo-title">Let’s turn a simple Google search into your next client.</h2></div>
      <div className="cl-sim-layout">
        <div className="cl-sim-timeline" aria-label="Simulation steps">{steps.map((item, index) => <button key={item.label} type="button" aria-current={step === index ? 'step' : undefined} className={step === index ? 'is-active' : index < step ? 'is-done' : ''} onClick={() => select(index)}><span>{index < step ? '✓' : `0${index + 1}`}</span>{item.label}</button>)}</div>
        <div ref={player} className="cl-sim-player">
          <div className="cl-sim-window"><span aria-hidden="true">● ● ●</span><span>Customer journey preview</span><span>DEMO</span></div>
          <div key={`${step}-${restart}`} className="cl-sim-scene"><Scene step={step} /></div>
          <div className="cl-sim-caption" aria-live="polite" aria-atomic="true"><span>STEP {step + 1} OF {steps.length}</span><h3>{steps[step].title}</h3><p>{steps[step].detail}</p></div>
          <div className="cl-sim-controls"><button type="button" className="cl-sim-play" onClick={() => { if (!playing && step === steps.length - 1) select(0); else setPlaying(!playing); }}>{playing ? 'Pause' : step === steps.length - 1 ? 'Replay' : 'Play simulation'} <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span></button><div><button type="button" disabled={step === 0} onClick={() => select(step - 1)} aria-label="Previous simulation step">←</button><button type="button" disabled={step === steps.length - 1} onClick={() => select(step + 1)} aria-label="Next simulation step">→</button></div></div>
        </div>
      </div>
      {children}
    </div>
  </section>;
}
