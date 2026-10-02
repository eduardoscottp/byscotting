import googleAds from '@/assets/google-ads.svg';
import aiAgent from '@/assets/ai-agent.svg';

export default function CleaningFlow() {
  return <div className="cl-managed-flow">
    <div className="cl-flow-feedback">
      <svg className="cl-flow-loop" viewBox="0 0 880 110" preserveAspectRatio="none" aria-hidden="true"><path d="M770 108V36q0-16-16-16H126q-16 0-16 16v72" /><path d="m103 100 7 8 7-8" /></svg>
      <div className="cl-flow-optimizer" aria-label="Optimization Agent reviews leads, non-leads and results to improve the campaign."><div className="cl-flow-icon cl-flow-agent"><img src={aiAgent} width="64" height="64" alt="" /></div><strong>Optimization Agent</strong></div>
    </div>
    <div className="cl-flow-groups">
      <section className="cl-flow-scotting" aria-label="Scotting manages your acquisition system">
        <p className="cl-flow-owner">SCOTTING · WE MANAGE</p>
        <ol className="cl-flow" aria-label="Google Ads to landing page to AI Agents">
          <li><div className="cl-flow-icon cl-flow-google"><img src={googleAds} width="34" height="34" alt="" /></div><strong>Google Ads</strong><small>Attract prospects</small></li>
          <li><div className="cl-flow-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M7 6.5h.01M10 6.5h.01M7 13h6M7 16h10" /></svg></div><strong>Landing page</strong><small>Capture inquiries</small></li>
          <li><div className="cl-flow-icon cl-flow-agent"><img src={aiAgent} width="64" height="64" alt="" /></div><strong>AI Agents</strong><small>Answer & qualify</small></li>
        </ol>
      </section>
      <section className="cl-flow-client" aria-label="You receive leads to review and call">
        <p className="cl-flow-owner">YOU RECEIVE</p>
        <div className="cl-flow-icon cl-flow-outcome"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m3 9 9 5 9-5m-6 9 2 2 4-4" /></svg></div><strong>Your leads</strong><small>Review & call</small>
      </section>
    </div>
  </div>;
}
