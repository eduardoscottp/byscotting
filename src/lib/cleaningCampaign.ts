export function contactChannel(value: string): 'email' | 'callback' | null {
  const contact = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return 'email';
  if (/^[+\d() .-]+$/.test(contact) && contact.replace(/\D/g, '').length >= 8 && contact.replace(/\D/g, '').length <= 15) return 'callback';
  return null;
}

export const cleaningHeadlines = {
  default: { title: 'Your next cleaning contract', emphasis: 'starts with a better system.', subtitle: 'Marketing, AI Agents and follow-up for commercial cleaning companies in Miami-Dade.' },
  'more-leads': { title: 'More commercial cleaning leads.', emphasis: 'A clear next step for every one.', subtitle: 'Connect targeted Google Ads, a focused landing page and AI Agents to turn interest into conversations.' },
  'follow-up': { title: 'Stop losing cleaning leads', emphasis: 'to slow follow-up.', subtitle: 'Give every inquiry a response, an owner and a next step—with AI Agents and your team.' },
  'ai-agents': { title: 'Let AI Agents answer first.', emphasis: 'Let your team win the work.', subtitle: 'Answer questions, capture inquiries and keep your cleaning team focused on walkthroughs and sales.' },
  walkthroughs: { title: 'Turn more cleaning inquiries', emphasis: 'into walkthroughs.', subtitle: 'Connect your ads, landing page and follow-up so your team can focus on the next sales conversation.' },
} as const;
export type CleaningHeadlineKey = keyof typeof cleaningHeadlines;
const campaignKeys: Record<string, CleaningHeadlineKey> = { 'cleaning-leads': 'more-leads', 'cleaning-follow-up': 'follow-up', 'cleaning-ai-agents': 'ai-agents', 'cleaning-walkthroughs': 'walkthroughs' };
export function selectCleaningHeadline(search: string): CleaningHeadlineKey {
  const params = new URLSearchParams(search);
  const content = (params.get('utm_content') || '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(cleaningHeadlines, content)) return content as CleaningHeadlineKey;
  const campaign = (params.get('utm_campaign') || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(campaignKeys, campaign) ? campaignKeys[campaign] : 'default';
}
