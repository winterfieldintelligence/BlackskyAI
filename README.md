# BlackSky AI Website

This is a responsive, premium multi‑page website for the BlackSky AI automation suite.

## Pages
- `index.html` — Home + service selection
- `setup-social-generate.html` — Social Media (Generate + Post) setup
- `setup-social-post.html` — Social Media (Post Only) setup
- `setup-whatsapp.html` — WhatsApp automation setup
- `setup-leads.html` — Lead Gen + Cold Email setup
- `setup-sales-call.html` — AI Sales Call Manager setup
- `setup-tax-invoice.html` — Tax Invoice automation setup
- `dashboard.html` — Automation dashboard view
- `admin.html` — Admin inbox for manual activation

## Local Demo
Open the HTML files directly in a browser, or run the mock API server:

```bash
node backend/server.js
```

Then open `index.html` to run the full flow.

## Notes
- The UI is fully responsive with luxury styling.
- This project supports Make.com + Google Sheets (no 24/7 laptop needed).
- See `MAKE_SETUP.md` to connect webhooks + sheet data.
- Admin inbox supports manual activation and CSV export.
- Each service setup page generates a Make.com blueprint JSON for import.
