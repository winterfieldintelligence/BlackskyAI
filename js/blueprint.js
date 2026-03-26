const BLUEPRINT_CONFIG = {
  social_generate: {
    name: "Social Media (Generate + Post)",
    apiUrl: "https://api.social-platform.com/generate-and-post",
    fields: [
      "business_name",
      "business_category",
      "website",
      "location",
      "contact_name",
      "contact_email",
      "brand_voice",
      "target_audience",
      "product_description",
      "content_pillars",
      "key_offers",
      "language",
      "cta_preference",
      "competitors",
      "platforms",
      "posting_frequency",
      "approval_mode",
      "instagram_id",
      "instagram_token",
      "facebook_page_id",
      "facebook_token",
      "linkedin_org_id",
      "linkedin_token",
      "youtube_channel_id",
      "youtube_refresh_token",
      "x_handle",
      "x_token",
      "pinterest_account_id",
      "pinterest_token"
    ]
  },
  social_post: {
    name: "Social Media (Post Only)",
    apiUrl: "https://api.social-platform.com/post-only",
    fields: [
      "business_name",
      "business_category",
      "website",
      "location",
      "contact_name",
      "contact_email",
      "brand_voice",
      "target_audience",
      "platforms",
      "posting_frequency",
      "content_source",
      "hashtags",
      "approval_mode",
      "instagram_id",
      "instagram_token",
      "facebook_page_id",
      "facebook_token",
      "linkedin_org_id",
      "linkedin_token",
      "youtube_channel_id",
      "youtube_refresh_token",
      "x_handle",
      "x_token",
      "pinterest_account_id",
      "pinterest_token"
    ]
  },
  whatsapp: {
    name: "WhatsApp Automation",
    apiUrl: "https://graph.facebook.com/v19.0/{{2.phone_number_id}}/messages",
    fields: [
      "business_name",
      "business_category",
      "contact_name",
      "contact_email",
      "whatsapp_business_name",
      "phone_number_id",
      "whatsapp_token",
      "template_names",
      "opt_in_method",
      "use_cases",
      "hours_of_operation",
      "escalation_contact"
    ]
  },
  lead_email: {
    name: "Lead Generation & Cold Email",
    apiUrl: "https://api.email-sender.com/v1/sequences",
    fields: [
      "business_name",
      "business_category",
      "website",
      "contact_name",
      "contact_email",
      "ideal_customer_profile",
      "lead_sources",
      "sender_domain",
      "sender_inboxes",
      "daily_sending_limit",
      "sequence_steps",
      "personalization_fields",
      "unsubscribe_method"
    ]
  },
  sales_call: {
    name: "AI Sales Call Manager",
    apiUrl: "https://api.voice-platform.com/v1/calls",
    fields: [
      "business_name",
      "business_category",
      "contact_name",
      "contact_email",
      "sales_goal",
      "product_summary",
      "faq_objections",
      "call_tone",
      "call_window",
      "crm_destination"
    ]
  },
  tax_invoice: {
    name: "Tax Invoice Automation",
    apiUrl: "https://api.invoice-platform.com/v1/invoices",
    fields: [
      "business_name",
      "legal_name",
      "tax_id",
      "invoice_prefix",
      "address",
      "contact_email",
      "logo_url",
      "bank_details",
      "default_tax_rate",
      "payment_terms",
      "invoice_notes"
    ]
  }
};

function buildBlueprint(serviceKey, data) {
  const config = BLUEPRINT_CONFIG[serviceKey];
  if (!config) return null;
  const variables = config.fields.map((field) => ({
    name: field,
    value: data[field] || ""
  }));

  return {
    name: `BlackSky AI - ${config.name}`,
    flow: [
      {
        id: 1,
        module: "gateway:CustomWebHook",
        version: 1,
        parameters: {
          hook: 1,
          maxResults: 1
        },
        mapper: {},
        metadata: {
          designer: {
            x: 0,
            y: 0,
            name: "Webhook Trigger"
          },
          parameters: [
            {
              name: "hook",
              type: "hook:gateway-webhook",
              label: "Webhook",
              required: true
            },
            {
              name: "maxResults",
              type: "number",
              label: "Maximum number of results"
            }
          ]
        }
      },
      {
        id: 2,
        module: "util:SetVariables",
        version: 1,
        parameters: {},
        mapper: {
          scope: "roundtrip",
          variables
        },
        metadata: {
          designer: {
            x: 300,
            y: 0,
            name: "Capture Setup Data"
          }
        }
      },
      {
        id: 3,
        module: "http:ActionSendData",
        version: 3,
        parameters: {
          handleErrors: true,
          useNewZLibDeCompress: true
        },
        mapper: {
          url: config.apiUrl,
          serializeUrl: false,
          method: "post",
          headers: [
            {
              name: "content-type",
              value: "application/json"
            }
          ],
          qs: [],
          bodyType: "raw",
          parseResponse: true,
          authUser: "",
          authPass: "",
          timeout: "",
          shareCookies: false,
          ca: "",
          rejectUnauthorized: true,
          followRedirect: true,
          useQuerystring: false,
          gzip: true,
          useMtls: false,
          contentType: "application/json",
          data: JSON.stringify({
            service: config.name,
            business_name: "{{2.business_name}}",
            business_category: "{{2.business_category}}",
            contact_email: "{{2.contact_email}}",
            payload: "{{2}}"
          }),
          followAllRedirects: false
        },
        metadata: {
          designer: {
            x: 600,
            y: 0,
            name: "Call Automation API"
          }
        }
      }
    ],
    metadata: {
      version: 1
    }
  };
}

function downloadBlueprint(serviceKey, data) {
  const blueprint = buildBlueprint(serviceKey, data);
  if (!blueprint) return;
  return blueprint;
}

function attachBlueprintForms(root = document) {
  root.querySelectorAll(".blueprint-form").forEach((form) => {
    if (form.dataset.bound === "true") return;
    form.dataset.bound = "true";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (window.captureFormDraft) {
        window.captureFormDraft(form);
      }
      const formData = Object.fromEntries(new FormData(form).entries());
      const serviceKey = form.dataset.service;
      const blueprint = downloadBlueprint(serviceKey, formData);
      const serviceName = BLUEPRINT_CONFIG[serviceKey]?.name || serviceKey;
      const id = `biz_${Date.now()}`;
      const submissions = JSON.parse(localStorage.getItem("blacksky_submissions") || "[]");
      const serviceSubmissionMap = JSON.parse(localStorage.getItem("serviceSubmissionMap") || "{}");
      const submission = {
        id,
        serviceKey,
        serviceName,
        createdAt: new Date().toISOString(),
        status: "setup_complete",
        formData,
        blueprint: JSON.stringify(blueprint, null, 2),
        blueprintFileName: `blacksky_${serviceKey}_blueprint.json`
      };
      submissions.push(submission);
      localStorage.setItem("blacksky_submissions", JSON.stringify(submissions));
      serviceSubmissionMap[serviceName] = id;
      localStorage.setItem("serviceSubmissionMap", JSON.stringify(serviceSubmissionMap));
      localStorage.setItem("activeSubmissionId", id);
      const statusEl = form.querySelector("#blueprintStatus") || document.querySelector("#blueprintStatus");
      if (statusEl) {
        statusEl.textContent = "Setup saved. Preparing next step...";
      }
      const selectedRoot = document.querySelector("#selectedServicesRoot");
      if (selectedRoot) {
        const selectedLabels = JSON.parse(localStorage.getItem("selectedServices") || "[]");
        const labelMap = Object.entries(BLUEPRINT_CONFIG).map(([key, cfg]) => ({
          key,
          label: cfg.name
        }));
        const selectedKeys = selectedLabels
          .map((label) => labelMap.find((item) => item.label === label)?.key)
          .filter(Boolean);
        const currentIndex = selectedKeys.indexOf(serviceKey);
        const nextKey = currentIndex !== -1 ? selectedKeys[currentIndex + 1] : null;
        const tabs = document.querySelector("#selectedServicesTabs");
        const nextTab = nextKey ? tabs?.querySelector(`[data-tab="${nextKey}"]`) : null;
        if (nextTab) {
          if (statusEl) {
            statusEl.textContent = "Setup saved. Loading next service...";
          }
          setTimeout(() => {
            nextTab.click();
          }, 400);
          return;
        }
      }
      setTimeout(() => {
        window.location.href = `plan.html?submission=${id}`;
      }, 600);
    });
  });
}

window.attachBlueprintForms = attachBlueprintForms;
attachBlueprintForms();
