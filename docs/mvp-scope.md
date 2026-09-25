# Scotting MVP — current scope

This supersedes the earlier PostgreSQL/worker architecture for the first experiment.

Keep the existing site, add a bilingual chat/callback widget, two on-demand private functions (chat and CRM intake), and a Google Calendar booking-page link. Airtable is the only persistent business store. Chat history remains in page memory and is shared with the inquiry only when the visitor explicitly chooses to include it. No standalone database, workflow queue, VPS or n8n dependency.

Marketing analysis remains on demand using connected source reports and redacted CRM/chat insights. Automatic campaign changes and WhatsApp API replies are later stages. The $200/month allowance is Google Ads spend only.

Implementation order: tests for private functions and safe attribution; functions; widget and existing-form attribution; production build and UI validation. Missing credentials must return unavailable, never a fake success. No live provider call, deployment, model spend or campaign activation occurs during local tests.

Backend code uses ordinary Node request/response handlers compatible with the repository's Vercel setup, plus a local development runner. Actual production hosting still needs verification before deployment. Do not replace current user edits or publish automatically.

Google Calendar booking is a real Google-hosted booking page selected by Eduardo. A click is measured as booking_click, never booking_confirmed. Programmatic availability/event creation and confirmed-booking reporting are deferred until calendar authorization and business hours are configured.

Release requires: verified host/routing; server-side AI and Airtable credentials; supported model selected; Google booking URL; host-level abuse controls and model cost limits; successful real CRM/chat tests; sanitized GA4 validation; privacy/retention configuration. Missing configuration leaves the chat hidden or API disabled.
