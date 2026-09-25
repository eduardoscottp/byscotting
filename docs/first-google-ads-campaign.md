# First Google Ads campaign: Scotting website leads

## Status

Do not activate this campaign yet. The Google Ads account is currently canceled, so Keyword Planner does not return click, CPC, or conversion forecasts. Analytics and conversion measurement must be live before spending the $200 monthly budget.

## Planner facts saved on September 25, 2026

- Plan: `Byscotting research - Local website buyers - 2026-09-25`
- Locations: Broward County, Florida, plus two saved local areas
- Language: English
- Network: Google Search
- Keyword match type: Phrase
- Bid strategy: Maximize clicks
- Planned daily budget: $6.57, approximately $200/month

## Campaign to create after measurement is verified

| Setting | Value |
| --- | --- |
| Campaign name | `S1_Search_Local_Website_Leads` |
| Goal | `generate_lead` from the callback form |
| Secondary signal | `whatsapp_click` |
| Landing page | `https://byscotting.com/en` with campaign UTMs |
| Initial audience | Searchers in the saved local areas with an active need for a business website |
| Initial bid strategy | Maximize clicks; review after enough conversion data exists |
| Daily budget | $6.57 |

## Required tracking

GA4 must receive these events before activation:

1. `generate_lead` after the CRM accepts a form.
2. `whatsapp_click` for every public WhatsApp link.
3. `page_view` for each landing-page visit.

Mark `generate_lead` as a GA4 key event. Import that key event into Google Ads after linking the Google Ads account to GA4. Keep `whatsapp_click` as a secondary conversion until its lead quality is known.

## UTM convention

Use one stable value per experiment. The site stores first and last campaign touch in Airtable when `VITE_ATTRIBUTION_STORAGE=true`.

```text
utm_source=google
utm_medium=cpc
utm_campaign=s1_local_website_leads
utm_content=<ad_message_variant>
utm_term={keyword}
landing_id=homepage
offer_id=premium_lead_site_v1
experiment_id=s1
variant_id=<landing_or_ad_variant>
```

## Launch review

Before creating ads, confirm the GA4 Realtime report shows a page view, a WhatsApp click, and a form lead from a controlled test. Then use the updated Keyword Planner forecast to decide the first keyword set and negatives.
