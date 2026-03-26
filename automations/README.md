# BlackSky AI Automations (Free Tools + API First)

This folder documents how each automation is designed to run using free or open‑source tooling. The UI sends requests to a local API (`backend/server.js`), which can forward payloads to n8n webhooks once connected.

## Stack
- **n8n (self‑hosted)** for workflow orchestration
- **Node.js** mock API server for setup + payment events
- **Postgres/Supabase** (optional) for production persistence
- **Open‑source LLM** (optional) for content generation

## Service Blueprints

### 1) Social Media (Post Only)
- Trigger: content already created (Google Drive / Notion / upload)
- Steps: fetch asset → platform formatting → post via official APIs → write log
- Outputs: post ID + platform analytics

### 2) Social Media (Generate + Post)
- Trigger: schedule or “new campaign”
- Steps: generate copy (open‑source LLM) → generate visuals (optional) → approval → post → analytics
- Outputs: caption + platform posts + KPIs

### 3) WhatsApp Automations
- Trigger: user opt‑in or new lead
- Steps: select approved template → send message → track delivery → escalate
- Outputs: delivery status + reply handling

### 4) Lead Generation + Cold Email
- Trigger: new lead list or form submission
- Steps: enrich → personalize → send sequence → track opens → handoff
- Outputs: reply intent + qualification score

### 5) AI Sales Call Manager
- Trigger: lead qualifies or form submission
- Steps: schedule call → send confirmation → log outcomes → follow‑up
- Outputs: call notes + outcome score

### 6) Tax Invoice Automation
- Trigger: payment captured
- Steps: generate PDF → email customer → store invoice
- Outputs: invoice link + tax record

## Free‑Tool Notes
- n8n is open‑source and free to self‑host.
- Content generation can use open‑source LLMs (local) to avoid paid APIs.
- Posting requires official platform APIs and account permissions.

## Next Step
Connect n8n webhook URLs to the API server so every setup/payment event triggers the correct workflow.
