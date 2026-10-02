export function contactChannel(value: string): 'email' | 'callback' | null {
  const contact = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return 'email';
  if (/^[+\d() .-]+$/.test(contact) && contact.replace(/\D/g, '').length >= 8 && contact.replace(/\D/g, '').length <= 15) return 'callback';
  return null;
}

export const cleaningHeadlines = {
  'c01-h01': { title: 'Leads For Cleaning Companies', emphasis: 'A clear next step for every inquiry.', subtitle: 'Google Ads, a focused landing page and lead follow-up for commercial cleaning companies in Miami-Dade.' },
  'c01-h02': { title: 'For Commercial Cleaning Firms', emphasis: 'Marketing connected to your sales process.', subtitle: 'Connect inquiry capture and follow-up around the way your cleaning team sells.' },
  'c01-h03': { title: 'Commercial Cleaning Growth', emphasis: 'Start with a clearer sales process.', subtitle: 'Bring targeted Google Ads, lead capture and follow-up together for your commercial cleaning company.' },
  'c01-h04': { title: 'Google Ads And Follow-Up', emphasis: 'Connect the click to the next conversation.', subtitle: 'A focused landing page and an organized follow-up workflow for commercial cleaning owners.' },
  'c01-h05': { title: 'Built For Cleaning Owners', emphasis: 'More clarity. Less manual follow-up.', subtitle: 'Review your commercial cleaning goals and see how ads, inquiry capture and follow-up fit together.' },
  'c01-h06': { title: 'A Clear Next Step For Leads', emphasis: 'Give each inquiry an owner and a next action.', subtitle: 'Connect lead capture and follow-up so your commercial cleaning team can manage each opportunity.' },
  'c01-h07': { title: 'Connect Ads And Your Pipeline', emphasis: 'See what happens after the click.', subtitle: 'Bring Google Ads, your landing page and lead follow-up into a clear commercial cleaning sales workflow.' },
  'c01-h08': { title: 'Less Manual Follow-Up', emphasis: 'More time for sales conversations.', subtitle: 'Organize inquiry capture, reminders and proposal follow-up for your commercial cleaning team.' },
  'c01-h09': { title: 'See Your Sales Pipeline', emphasis: 'Know where each opportunity stands.', subtitle: 'See a sample workflow for commercial cleaning inquiries, walkthroughs and proposals.' },
  'c01-h10': { title: 'Request A Scotting Demo', emphasis: 'See a clearer cleaning sales workflow.', subtitle: 'Explore a sample system connecting Google Ads, inquiry capture and follow-up. Eduardo will arrange a time.' },
  'c01-h11': { title: 'Scotting Revenue Engine', emphasis: 'Marketing and follow-up, connected.', subtitle: 'A managed acquisition and follow-up system for commercial cleaning companies. Advertising spend is separate.' },
  'c01-h12': { title: 'Miami-Dade Business Owners', emphasis: 'Built for your commercial cleaning company.', subtitle: 'Discuss your cleaning business goals and see how Google Ads and lead follow-up can support your sales process.' },
  default: { title: 'Your next cleaning contract', emphasis: 'starts with a better system.', subtitle: 'Marketing, AI Agents and follow-up for commercial cleaning companies in Miami-Dade.' },
  'more-leads': { title: 'More commercial cleaning leads.', emphasis: 'A clear next step for every one.', subtitle: 'Connect targeted Google Ads, a focused landing page and AI Agents to turn interest into conversations.' },
  'follow-up': { title: 'Stop losing cleaning leads', emphasis: 'to slow follow-up.', subtitle: 'Give every inquiry a response, an owner and a next step—with AI Agents and your team.' },
  'ai-agents': { title: 'Let AI Agents answer first.', emphasis: 'Let your team win the work.', subtitle: 'Answer questions, capture inquiries and keep your cleaning team focused on walkthroughs and sales.' },
  walkthroughs: { title: 'Turn more cleaning inquiries', emphasis: 'into walkthroughs.', subtitle: 'Connect your ads, landing page and follow-up so your team can focus on the next sales conversation.' },
} as const;
export type CleaningHeadlineKey = keyof typeof cleaningHeadlines;
export function cleaningPageTitle(key: CleaningHeadlineKey): string {
  return key.startsWith('c01-h') ? `${cleaningHeadlines[key].title} | Scotting` : 'Marketing for Commercial Cleaning Companies | Scotting';
}
const campaignKeys: Record<string, CleaningHeadlineKey> = { 'sc_cleaning_leads_md_en': 'more-leads', 'cleaning-leads': 'more-leads', 'cleaning-follow-up': 'follow-up', 'cleaning-ai-agents': 'ai-agents', 'cleaning-walkthroughs': 'walkthroughs' };
export function selectCleaningHeadline(search: string): CleaningHeadlineKey {
  const params = new URLSearchParams(search);
  const content = (params.get('utm_content') || '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(cleaningHeadlines, content)) return content as CleaningHeadlineKey;
  const campaign = (params.get('utm_campaign') || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(campaignKeys, campaign) ? campaignKeys[campaign] : 'default';
}
