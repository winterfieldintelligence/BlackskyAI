# Make.com + Google Sheets Setup (No Laptop 24/7)

This setup removes the local server. Your website sends data to Make.com, which stores it in Google Sheets. The Admin Inbox reads from the sheet.

## 1) Create the Google Sheet (CRM)
Create a sheet named `BlackSky CRM` with these columns (exact names):

```
id,business_name,business_category,website,location,contact_name,contact_email,brand_voice,target_audience,social_mode,platforms,services,status,createdAt,posts_generated,posts_published,instagram_posts,youtube_posts,linkedin_posts,x_posts,pinterest_posts,facebook_posts,whatsapp_sent,leads_captured,emails_sent,calls_booked,invoices_generated,last_run
```

## 2) Make.com Scenario — New Submission
1. In Make.com, create a new scenario
2. Add **Webhooks → Custom webhook**
3. Copy the webhook URL
4. Add **Google Sheets → Add a Row** and map fields to the columns
5. Turn the scenario **ON**

## 3) Make.com Scenario — Activate Business (Optional)
1. Create a second scenario
2. Trigger: **Webhooks → Custom webhook**
3. Action: **Google Sheets → Search Rows** (by `id`)
4. Action: **Google Sheets → Update a Row** (set `status` to `active`)

## 4) Secure tokens (recommended)
When you collect access tokens in the setup form, **do not store them in the public sheet**.  
Store them in **Make Data Store** (private) and only keep a reference (like `id`) in the sheet.

## 5) Publish the Sheet for Admin Inbox
In Google Sheets:
- File → Share → **Publish to web**
- Choose `Comma-separated values (.csv)`
- Copy the public CSV link

## 6) Paste links in config
Open `js/config.js` and paste:
- `makeSubmitWebhook`
- `makeActivateWebhook` (optional)
- `sheetCsvUrl`

That’s it — no laptop or server required.

## Multi‑tenant service scenarios (recommended)
Create one scenario per service (not per business).  
Each scenario can:
1. Read rows where `status=active`
2. Use the row data + Data Store tokens
3. Run the automation
4. Update metrics columns (posts, messages, leads, etc.)
