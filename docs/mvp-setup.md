# MVP setup and remaining activation work

## Implemented locally

- `src/components/ChatWidget.tsx`: bilingual assistant and callback form, optional transcript sharing, existing WhatsApp handoff, optional Google Calendar booking link.
- `api/chat.mjs`, `api/leads.mjs`: on-demand Node handlers; private credentials never enter the frontend.
- `server/mvp.mjs`: bounded stateless OpenAI Responses call and idempotent Airtable upsert. No agent action tools or background workers.
- `src/lib/attribution.ts`: first/last tagged touch; 90-day storage is optional and disabled by default. Current-page attribution works in memory. Direct visits preserve an existing eligible campaign.
- Existing contact form now includes a submission ID and attribution. Its previous WhatsApp fallback remains available.
- Sanitized metric hooks emit chat_started, booking_click and generate_lead through an existing gtag function if present. **This does not install GA4 or establish a reporting connection.**

## Airtable preparation completed

Added only three fields to existing Leads in Idddeas Agency CRM (`appzlRmQyj1x5whWw`, table `tblwEZIGfrWk7egUS`):

- Scotting Submission ID: `fldg3JHwBqoSPTB3L`
- Scotting Inquiry: `fldOknmoajGOTEoHO`
- Scotting Attribution: `fldPuQGXjYmVHr3Yh`

The backend uses these fields and existing Email/Phone/Contact First Name/Contact Last Name. It does not modify unrelated lead stages, audit information or source choices. Runtime Airtable credentials still need configuration. No test lead was written to the live CRM.

## Configuration

Use `.env.example` as the variable inventory. Secret values belong in private hosting settings or an ignored local `.env.local`; never paste them into chat or a `VITE_*` variable.

Public: set `VITE_CHAT_ENDPOINT=/api/chat`, `VITE_FORM_ENDPOINT=/api/leads` after the APIs work on the same host. A separate backend host can use HTTPS URLs and an exact origin allowlist. `VITE_GOOGLE_BOOKING_URL` accepts a real HTTPS Google Calendar booking-page URL, not an arbitrary calendar-management URL. Supported hosts: calendar.google.com and calendar.app.google. Keep blank until selected. `VITE_ATTRIBUTION_STORAGE=true` enables 90-day first/last-touch persistence under the chosen collection policy; default false uses memory only.

Private: configure `OPENAI_API_KEY`, a supported `OPENAI_MODEL`, scoped `AIRTABLE_TOKEN`, the base/table IDs and a random `LEAD_SIGNING_SECRET` of at least 32 characters. `SCOTTING_API_ENABLED` stays false until readiness checks pass. Set `SCOTTING_ALLOWED_ORIGINS` to exact frontend origins, comma separated; include localhost only in development.

No default model or paid subscription is selected. Verify model access and set an actual cost limit before enabling paid model calls. `store:false` avoids stored response state in this integration; it is not a promise of zero provider retention.

## Local development

With an ignored local configuration file and suitable Node version:

1. `node --env-file=.env.local scripts/dev-api.mjs` starts the API on loopback port 8787.
2. `npm run dev` starts Vite; its `/api` proxy forwards to that local API.
3. `npm test` runs tests without real provider requests.
4. `npm run build` builds the production site and localized English metadata.

Actual production hosting is still unverified. The repository contains Vercel configuration, but the user mentioned Bluehost. No deployment or DNS change was made.

## Intentional MVP limits

- No PostgreSQL, persistent worker, n8n or VPS requirement.
- Google hosts scheduling. A booking-link click is not a confirmed meeting. Calendar API synchronization is future work.
- Chat history is page-memory only until explicitly shared with an inquiry; reloading starts a new conversation. Shared messages are restricted CRM content. Redact contacts/identifying details before marketing analysis; automatic transcript mining is not implemented.
- No permanent retry queue. On CRM failure the form retains its input and offers retry/WhatsApp; no success is reported. Retry-safe upsert applies to the same submission payload/key. Real provider deduplication must be verified before launch.
- Basic request size/origin checks and in-memory per-instance limits exist. They are not a distributed abuse defense or guaranteed spending cap. Configure host-level rate limiting and provider cost controls before opening a public paid endpoint.
- The assistant has no tools to read other records, modify campaigns, book calendar events or publish pages. Its response quality still requires a real model evaluation after authorization.
- Existing portfolio/homepage copy is preserved. A dedicated premium offer landing page and full privacy/SEO review remain needed before campaign launch.
- Full GA4 installation, Ads/GA4/Search Console reporting authorization, confirmed-sale feedback and on-demand marketing data collection remain pending. The previous marketing-agent document is a specification, not an active job.

## Verification record

API tests use local response fixtures; no OpenAI charge, customer message, invitation or live CRM submission is generated. Browser preview uses disabled provider endpoints to verify honest unavailability and retained form input. The standard Vite config-bundling command was blocked by Windows access restrictions in this sandbox; a programmatic Vite build with equivalent plugins and aliases plus the same localized-HTML script succeeded in a workspace copy. TypeScript checks passed. Verify the ordinary build in the deployment environment before release.

## Next activation inputs

1. Confirm actual frontend hosting (Vercel or Bluehost) and deployment access.
2. Configure private AI/Airtable credentials in the selected host, with model/usage limits.
3. Supply or create the Google Calendar booking-page URL and configure available hours there.
4. Complete tracking configuration and the focused premium landing page; run one authorized real inquiry and chat test before any paid traffic.

No campaigns were activated. Google Ads remains limited to the previously agreed $200/month allowance when a campaign is eventually launched.
