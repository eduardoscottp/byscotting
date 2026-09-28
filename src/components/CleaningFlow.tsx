import googleAds from '@/assets/google-ads.svg';
import aiAgent from '@/assets/ai-agent.svg';

export default function CleaningFlow() {
  return <ol className="cl-flow" aria-label="From Google Ads to a cleaning walkthrough">
    <li><div className="cl-flow-icon cl-flow-google"><img src={googleAds} width="34" height="34" alt="" /></div><strong>Google Ads</strong><small>Attract prospects</small></li>
    <li><div className="cl-flow-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M7 6.5h.01M10 6.5h.01M7 13h6M7 16h10" /></svg></div><strong>Landing page</strong><small>Capture inquiries</small></li>
    <li><div className="cl-flow-icon cl-flow-agent"><img src={aiAgent} width="64" height="64" alt="" /></div><strong>AI Agents</strong><small>Answer & qualify</small></li>
    <li><div className="cl-flow-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14-5L3 9m0-5v5h5M4 13a8 8 0 0 0 14 5l3-3m0 5v-5h-5M12 8v4l3 2" /></svg></div><strong>Follow-up</strong><small>Keep in touch</small></li>
    <li><div className="cl-flow-icon cl-flow-outcome"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18m-13 5 3 3 5-5" /></svg></div><strong>Site visit</strong><small>Walkthrough & quote</small></li>
  </ol>;
}
