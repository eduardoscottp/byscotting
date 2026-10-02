import googleAds from '@/assets/google-ads.svg';
import aiAgent from '@/assets/ai-agent.svg';

export default function CleaningFlow() {
  return <div className="cl-managed-flow">
    <div className="cl-flow-ownership" aria-hidden="true"><span>SCOTTING · WE MANAGE</span><span>YOU RECEIVE</span></div>
    <ol className="cl-flow" aria-label="Scotting manages acquisition and follow-up. You receive leads to review and call.">
    <li><div className="cl-flow-icon cl-flow-google"><img src={googleAds} width="34" height="34" alt="" /></div><strong>Google Ads</strong><small>Attract prospects</small></li>
    <li><div className="cl-flow-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M7 6.5h.01M10 6.5h.01M7 13h6M7 16h10" /></svg></div><strong>Landing page</strong><small>Capture inquiries</small></li>
    <li><div className="cl-flow-icon cl-flow-agent"><img src={aiAgent} width="64" height="64" alt="" /></div><strong>AI Agents</strong><small>Answer & qualify</small></li>
    <li><div className="cl-flow-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14-5L3 9m0-5v5h5M4 13a8 8 0 0 0 14 5l3-3m0 5v-5h-5M12 8v4l3 2" /></svg></div><strong>Follow-up</strong><small>Keep in touch</small></li>
    <li className="cl-flow-client"><span className="cl-flow-client-label">YOU RECEIVE</span><div className="cl-flow-icon cl-flow-outcome"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m3 9 9 5 9-5m-6 9 2 2 4-4" /></svg></div><strong>Your leads</strong><small>Review & call</small></li>
    </ol>
    <div className="cl-flow-feedback">
      <svg className="cl-flow-loop" viewBox="0 0 880 100" preserveAspectRatio="none" aria-hidden="true"><path d="M792 2v42q0 16-16 16H104q-16 0-16-16V2" /><path d="m81 10 7-8 7 8" /></svg>
      <div className="cl-flow-optimizer"><div className="cl-flow-icon cl-flow-agent"><img src={aiAgent} width="64" height="64" alt="" /></div><div><span>SCOTTING · CONTINUOUS IMPROVEMENT</span><strong>Optimization Agent</strong><p>Reviews leads, non-leads & results.<br />Optimizes the campaign across the entire cycle.</p></div></div>
    </div>
  </div>;
}
