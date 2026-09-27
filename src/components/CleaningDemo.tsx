import { useState } from 'react';

const examples = {
  office: { label: 'Office cleaning', company: 'Biscayne Office — sample', need: '6,000 sq ft · 3 evenings per week', request: 'We need recurring office cleaning. Can someone arrange a walkthrough?', reply: 'Thanks for your office-cleaning inquiry. Our team will contact you to confirm the scope and arrange a walkthrough.' },
  warehouse: { label: 'Warehouse cleaning', company: 'Doral Warehouse — sample', need: '18,000 sq ft · weekly service', request: 'We need weekly warehouse cleaning. Could you review the space and provide a quote?', reply: 'Thanks for your warehouse-cleaning inquiry. Our team will contact you to discuss the space and arrange a walkthrough before quoting.' },
} as const;
type Example = keyof typeof examples;

export default function CleaningDemo() {
  const [choice, setChoice] = useState<Example>('office');
  const [preview, setPreview] = useState<Example>('office');
  const [run, setRun] = useState(false);
  const sample = examples[preview];
  return <section className="cl-demo-section" id="how-it-works" aria-labelledby="demo-title">
    <div className="cl-wrap">
      <div className="cl-demo-heading"><div><p className="cl-eyebrow">SEE THE PROCESS, NOT JUST THE PROMISE</p><h2 id="demo-title">One inquiry. A clear next move.</h2><p>Try a sample request. See what your cleaning team would receive.</p></div><span className="cl-sample-badge">Interactive preview · sample data</span></div>
      <div className="cl-demo-workspace">
        <div className="cl-demo-input">
          <p className="cl-step-title"><span>01</span> A prospect gets in touch</p>
          <label htmlFor="sample-service">Sample inquiry</label>
          <select id="sample-service" value={choice} onChange={e => { setChoice(e.target.value as Example); setRun(false); }}>
            <option value="office">Office cleaning</option><option value="warehouse">Warehouse cleaning</option>
          </select>
          <blockquote>“{examples[choice].request}”</blockquote>
          <button type="button" className="cl-demo-run" onClick={() => { setPreview(choice); setRun(true); }}>Show the follow-up <span aria-hidden="true">→</span></button>
          <p className="cl-demo-note">Try either example. No contact details needed.</p>
        </div>
        <div className="cl-demo-output" aria-live="polite" aria-atomic="true">
          <div className="cl-demo-output-heading"><p className="cl-step-title"><span>02</span> Your team gets the details</p><span className="cl-demo-status">{run ? 'Preview updated' : 'Sample preview'}</span></div>
          <h3>{sample.company}</h3><p className="cl-demo-need">{sample.need}</p>
          <dl className="cl-demo-fields"><div><dt>Source</dt><dd>Cleaning landing page</dd></div><div><dt>Assigned to</dt><dd>Your sales contact</dd></div><div><dt>Stage</dt><dd>New inquiry</dd></div></dl>
          <div className="cl-demo-next">
            <div><p className="cl-step-title"><span>03</span> Follow-up has an owner</p><strong>Call to arrange a walkthrough</strong><p>Task for your sales contact · Time to be confirmed</p></div>
            <details><summary>View the response draft</summary><p>{sample.reply}</p><span>Example draft for your team to review.</span></details>
          </div>
        </div>
      </div>
      <div className="cl-demo-bottom"><p>Illustrative workflow, not a client result. This preview sends no messages. Your team confirms visits, prices the work and closes the sale.</p><a href="#growth-plan">Get a plan for my business <span aria-hidden="true">↗</span></a></div>
    </div>
  </section>;
}
