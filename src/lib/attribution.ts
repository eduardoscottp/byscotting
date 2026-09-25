export type Touch = Record<string, string>;
export type Attribution = { first: Touch; last: Touch } | null;
const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid', 'adgroup_id', 'landing_id', 'offer_id', 'experiment_id', 'variant_id'];
const ttl = 90 * 86400000;
const storageKey = 'scotting-attribution-v1';
let current: Attribution = null;

export function updateAttribution(previous: Attribution, href: string, now = Date.now()): Attribution {
  const valid = (touch: Touch | undefined) => touch && Number.isFinite(Date.parse(touch.at)) && now - Date.parse(touch.at) >= 0 && now - Date.parse(touch.at) < ttl;
  const retained = valid(previous?.first) && valid(previous?.last) ? previous : null;
  const url = new URL(href);
  const touch: Touch = {};
  for (const key of keys) {
    const value = url.searchParams.get(key);
    if (value && value.length <= 250) touch[key] = value;
  }
  if (!Object.keys(touch).some(key => key.startsWith('utm_') || ['gclid', 'gbraid', 'wbraid'].includes(key))) return retained;
  touch.at = new Date(now).toISOString();
  return { first: retained?.first || touch, last: touch };
}

export function initializeAttribution(persist: boolean) {
  if (typeof window === 'undefined') return;
  let saved: Attribution = current;
  try { if (persist) saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { saved = null; }
  current = updateAttribution(saved, window.location.href);
  try {
    if (persist && current) localStorage.setItem(storageKey, JSON.stringify(current));
    else localStorage.removeItem(storageKey);
  } catch { /* Memory attribution still works when storage is blocked. */ }
}

export function getAttribution() { return current; }

type Metric = 'chat_started' | 'generate_lead' | 'booking_click' | 'form_start';
export function trackMetric(name: Metric, language: string, surface: 'chat' | 'form') {
  const data = { language: language === 'es' ? 'es' : 'en', surface, landing_id: 'homepage', offer_id: 'premium_quote_v1' };
  // Deliberately excludes message text, contacts, URLs, UTMs and click IDs.
  const analytics = window as Window & { gtag?: (...args: unknown[]) => void };
  try {
    analytics.gtag?.('event', name, data);
    window.dispatchEvent(new CustomEvent('scotting:metric', { detail: { name, ...data } }));
  } catch { /* Analytics failures must not turn a saved inquiry into a failed one. */ }
}
