# Commercial cleaning landing page implementation plan

Goal: deliver the approved research as a usable first-draft landing page at https://byscotting.com/comercial_cleaning with GA4, existing Airtable capture, chatbot and human handoff. The user confirmed byscotting.com as the destination on September 27, 2026.

Architecture: extend the existing React/Vite website and Vercel endpoints in an isolated checkout, preserving both homepages. Reuse the live integration settings without exposing private tokens. Add campaign context to the existing chat, attribution and lead flow.

Visual direction: supplied Scotting blue/teal identity, large editorial headline, a clickable example sales workflow, generous white space and a human founder section using the existing photograph. One primary growth-plan form; optional chat and WhatsApp handoff.

- [x] Confirm destination domain. User confirmed byscotting.com; existing Vercel hosting and production configuration verified.
- [x] Test server acceptance, validation and campaign isolation for cleaning inquiries; test chat context.
- [x] Add the route, campaign form, demo, FAQ, privacy explanation and scoped responsive styles.
- [x] Extend analytics context without changing homepage defaults; use server-confirmed form success.
- [x] Produce initial route metadata and preserve homepage metadata.
- [x] Run existing and new tests, TypeScript and production build.
- [ ] Inspect desktop/mobile, keyboard controls, demo, form failure/success and chatbot.
- [ ] Publish to the confirmed existing host and verify live page and integrations.

Acceptance: no fake success, invented testimonials, prices or appointments; no changes to existing unrelated website content; no credentials in client assets; both old routes preserved; inquiry source clearly marked commercial_cleaning; correct public review URL returned only after verification.

## Draft verification — September 27, 2026

- 32 automated tests pass. Tests cover accepted and rejected form responses, campaign attribution, Airtable mapping, server validation, existing homepage behavior and bounded AI context.
- TypeScript and production Vite build pass. Generated campaign HTML has its own title, description and canonical path, plus noindex during draft review.
- Desktop 1440px and mobile 375px/320px inspected. No horizontal overflow. Interactive workflow, guided chat answers, chat-to-form handoff and form failure behavior checked in the browser.
- Production GA4 tag verified: G-0M55Y01EM0. Existing production Vercel settings provide GA and Airtable configuration. Local preview intentionally has no production credentials.
- Production leads endpoint rejects an invalid request with HTTP 400. A successful live campaign submission and Airtable readback still need to be tested after deployment; automated tests are not evidence of live delivery.
- Production AI endpoint returns HTTP 503; required OpenAI settings are absent. The cleaning page therefore provides clearly labeled guided chat with prepared answers and human handoff. Setting VITE_CHAT_ENDPOINT switches to the existing AI chat path only after server OPENAI_API_KEY and OPENAI_MODEL are configured and tested. No AI voice calling is enabled.
- Draft preview: http://127.0.0.1:5187/comercial_cleaning (available on this computer while its preview process runs).
- Domain now confirmed by the user. Next: deploy, verify live campaign form and CRM record, confirm analytics events, check existing homepages, then return the public URL.
