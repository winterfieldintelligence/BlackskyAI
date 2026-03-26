const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const CONFIG = window.BS_CONFIG || {};
const PLACEHOLDER = (value) => !value || String(value).includes("PASTE_");
const SUBMISSIONS_KEY = "blacksky_submissions";
const DRAFTS_KEY = "blacksky_form_drafts";

const getSubmissions = () => storage.get(SUBMISSIONS_KEY, []);
const saveSubmissions = (list) => storage.set(SUBMISSIONS_KEY, list);
const findSubmission = (id) => getSubmissions().find((item) => item.id === id);
const updateSubmission = (id, updates) => {
  const list = getSubmissions();
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  saveSubmissions(list);
  return list[idx];
};

const getDrafts = () => storage.get(DRAFTS_KEY, {});
const saveDrafts = (drafts) => storage.set(DRAFTS_KEY, drafts);

const saveFormDraft = (serviceKey, data) => {
  if (!serviceKey) return;
  const drafts = getDrafts();
  drafts[serviceKey] = { ...(drafts[serviceKey] || {}), ...data };
  saveDrafts(drafts);
};

const populateFormDraft = (form, serviceKey) => {
  const drafts = getDrafts();
  const draft = drafts[serviceKey];
  if (!draft) return;
  Array.from(form.elements).forEach((el) => {
    if (!el.name || draft[el.name] === undefined) return;
    const value = draft[el.name];
    if (el.type === "checkbox") {
      el.checked = value === true || value === "on" || value === el.value;
    } else if (el.type === "radio") {
      el.checked = value === el.value;
    } else if (el.tagName === "SELECT" && el.multiple && Array.isArray(value)) {
      Array.from(el.options).forEach((opt) => {
        opt.selected = value.includes(opt.value);
      });
    } else {
      el.value = value;
    }
  });
};

const bindDraftToForm = (form) => {
  const serviceKey = form.dataset.service;
  if (!serviceKey) return;
  populateFormDraft(form, serviceKey);
  const capture = () => {
    const data = Object.fromEntries(new FormData(form).entries());
    saveFormDraft(serviceKey, data);
  };
  form.addEventListener("input", capture);
  form.addEventListener("change", capture);
};

window.captureFormDraft = (form) => {
  if (!form) return;
  const serviceKey = form.dataset.service;
  if (!serviceKey) return;
  const data = Object.fromEntries(new FormData(form).entries());
  saveFormDraft(serviceKey, data);
};

window.bindBlueprintDrafts = (root = document) => {
  root.querySelectorAll(".blueprint-form").forEach((form) => {
    bindDraftToForm(form);
  });
};

function postToWebhook(url, payload) {
  if (PLACEHOLDER(url)) {
    return Promise.resolve({ skipped: true });
  }
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

const navToggle = document.querySelector("#navToggle");
if (navToggle) {
  navToggle.addEventListener("click", () => {
    document.querySelector(".nav-links")?.classList.toggle("active");
  });
}

document.querySelectorAll("[data-service-switch]").forEach((select) => {
  select.addEventListener("change", () => {
    if (select.value) {
      window.location.href = select.value;
    }
  });
});

const SERVICE_PAGE_MAP = [
  { key: "social_generate", label: "Social Media (Generate + Post)", file: "setup-social-generate.html" },
  { key: "social_post", label: "Social Media (Post Only)", file: "setup-social-post.html" },
  { key: "whatsapp", label: "WhatsApp Automation", file: "setup-whatsapp.html" },
  { key: "lead_email", label: "Lead Generation & Cold Email", file: "setup-leads.html" },
  { key: "sales_call", label: "AI Sales Call Manager", file: "setup-sales-call.html" },
  { key: "tax_invoice", label: "Tax Invoice Automation", file: "setup-tax-invoice.html" }
];

const normalizeSelectedServices = () => {
  const raw = storage.get("selectedServices", []);
  if (!Array.isArray(raw)) return [];
  const normalized = raw
    .map((label) => SERVICE_PAGE_MAP.find((item) => item.label === label))
    .filter(Boolean)
    .map((item) => item.label);
  if (normalized.length !== raw.length) {
    storage.set("selectedServices", normalized);
  }
  return normalized;
};

const serviceParam = new URLSearchParams(window.location.search).get("service");
if (serviceParam) {
  const match = SERVICE_PAGE_MAP.find((item) => item.key === serviceParam);
  if (match) {
    storage.set("selectedServices", [match.label]);
  }
}

const selectedServices = normalizeSelectedServices();
if (selectedServices.length) {
  const allowed = new Set(selectedServices);

  // Filter service switcher options on setup pages
  document.querySelectorAll("[data-service-switch]").forEach((select) => {
    Array.from(select.options).forEach((opt) => {
      if (!allowed.has(opt.text.trim())) {
        opt.remove();
      }
    });

    if (select.options.length && !allowed.has(select.selectedOptions[0]?.text.trim())) {
      select.selectedIndex = 0;
      window.location.href = select.value;
    }
  });

  // Filter sidebar service links on setup pages
  const navLinks = document.querySelectorAll(".sidebar nav a");
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const match = SERVICE_PAGE_MAP.find((item) => item.file === href);
    if (match && !allowed.has(match.label)) {
      link.style.display = "none";
    }
  });
}

const selectedServicesRoot = document.querySelector("#selectedServicesRoot");
if (selectedServicesRoot) {
  const note = document.querySelector("#selectedServicesNote");
  const tabs = document.querySelector("#selectedServicesTabs");
  const formWrap = document.querySelector("#selectedServiceForm");
  const selected = normalizeSelectedServices();

  const selectedMatches = selected
    .map((label) => SERVICE_PAGE_MAP.find((item) => item.label === label))
    .filter(Boolean);

  const loadForm = async (match) => {
    if (!match || !formWrap) return;
    formWrap.innerHTML = `<p class="notice">Loading ${match.label} setup...</p>`;
    try {
      const res = await fetch(match.file);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const form = doc.querySelector("form.blueprint-form");
      if (!form) throw new Error("Form not found");
      formWrap.innerHTML = form.outerHTML;
      if (window.attachBlueprintForms) {
        window.attachBlueprintForms(formWrap);
      }
      if (window.bindBlueprintDrafts) {
        window.bindBlueprintDrafts(formWrap);
      }
    } catch (err) {
      formWrap.innerHTML = `<p class="notice">Unable to load setup for ${match.label}. Please refresh.</p>`;
    }
  };

  if (tabs) {
    tabs.innerHTML = selectedMatches
      .map(
        (item, idx) => `
          <button class="tab-pill ${idx === 0 ? "active" : ""}" type="button" data-tab="${item.key}">
            ${item.label}
          </button>
        `
      )
      .join("");
    tabs.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-tab]");
      if (!btn) return;
      tabs.querySelectorAll(".tab-pill").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      const match = selectedMatches.find((item) => item.key === btn.dataset.tab);
      loadForm(match);
    });
  }

  if (selectedMatches.length) {
    loadForm(selectedMatches[0]);
  }

  if (note) {
    note.textContent = selected.length
      ? `You selected ${selected.length} service${selected.length === 1 ? "" : "s"}. Complete each setup below.`
      : "No services selected. Go back and select at least one service.";
  }
}

const serviceCards = document.querySelectorAll(".service-card");
if (serviceCards.length) {
  const selected = new Set(normalizeSelectedServices());

  serviceCards.forEach((card) => {
    const service = card.dataset.service;
    const checkbox = card.querySelector(".service-check");
    if (selected.has(service)) {
      card.classList.add("selected");
      if (checkbox) checkbox.checked = true;
    }

    if (checkbox) {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selected.add(service);
          card.classList.add("selected");
        } else {
          selected.delete(service);
          card.classList.remove("selected");
        }
        storage.set("selectedServices", Array.from(selected));
        updateSelectedCount(selected.size);
      });
    }

    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button, input, select, label")) return;
      if (!checkbox) return;
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  updateSelectedCount(selected.size);

  const continueBtn = document.querySelector("#continueServices");
  if (continueBtn) {
    continueBtn.addEventListener("click", (event) => {
      const checked = Array.from(document.querySelectorAll(".service-check:checked"))
        .map((input) => input.closest(".service-card")?.dataset.service)
        .filter(Boolean);
      if (!checked.length) {
        event.preventDefault();
        updateSelectedCount(0);
        return;
      }
      storage.set("selectedServices", checked);
    });
  }
}

if (document.querySelector(".blueprint-form")) {
  if (window.bindBlueprintDrafts) {
    window.bindBlueprintDrafts(document);
  }
}

function updateSelectedCount(count) {
  const countEl = document.querySelector("#selectedCount");
  if (countEl) {
    countEl.textContent = `${count} service${count === 1 ? "" : "s"} selected`;
  }
}

const setupServicesEl = document.querySelector("#setupSelectedServices");
if (setupServicesEl) {
  const selected = storage.get("selectedServices", []);
  setupServicesEl.innerHTML = selected.length
    ? selected.map((item) => `<span class="badge">${item}</span>`).join("")
    : `<span class="badge">All services enabled by default</span>`;
}

const setupForm = document.querySelector("#setupForm");
if (setupForm) {
  setupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(setupForm).entries());
    const id = `biz_${Date.now()}`;
    const payload = {
      id,
      ...formData,
      services: storage.get("selectedServices", []).join(", "),
      status: "pending",
      createdAt: new Date().toISOString()
    };
    storage.set("businessProfile", payload);
    postToWebhook(CONFIG.makeSubmitWebhook, payload).catch(() => {});

    const planSection = document.querySelector("#planSection");
    planSection?.classList.remove("hidden");
    setStep(2);
    planSection?.scrollIntoView({ behavior: "smooth" });
  });
}

function setStep(step) {
  document.querySelectorAll(".step").forEach((el, idx) => {
    if (idx + 1 === step) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });
}

const planCards = document.querySelectorAll(".plan-card");
if (planCards.length && document.querySelector("#planSection")) {
  const storedPlan = storage.get("selectedPlan", null);
  if (storedPlan) {
    planCards.forEach((card) => {
      if (card.dataset.plan === storedPlan) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
  } else {
    const defaultPlan = Array.from(planCards).find((card) => card.classList.contains("selected"));
    if (defaultPlan) {
      storage.set("selectedPlan", defaultPlan.dataset.plan);
    }
  }

  planCards.forEach((card) => {
    card.addEventListener("click", () => {
      planCards.forEach((el) => el.classList.remove("selected"));
      card.classList.add("selected");
      storage.set("selectedPlan", card.dataset.plan);
    });
  });
}

const activateButtons = document.querySelectorAll(".activate-now");
if (activateButtons.length) {
  activateButtons.forEach((button) => {
    button.addEventListener("click", () => {
    const statusEl = document.querySelector("#paymentStatus");
    const business = storage.get("businessProfile", {});
    const payload = {
      id: business.id,
      business,
      services: storage.get("selectedServices", []).join(", "),
      plan: storage.get("selectedPlan", "Executive"),
      status: "active",
      savedAt: new Date().toISOString()
    };
    storage.set("activation", { status: "pending_payment", ...payload });
    postToWebhook(CONFIG.makeActivateWebhook, payload).catch(() => {});

    if (statusEl) {
      statusEl.textContent = "Setup saved. Redirecting to dashboard preview...";
    }

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);
    });
  });
}

const dashboardRoot = document.querySelector("#dashboardRoot");
if (dashboardRoot) {
  const params = new URLSearchParams(window.location.search);
  const submissionId = params.get("submission") || localStorage.getItem("activeSubmissionId");
  const submission = submissionId ? findSubmission(submissionId) : null;
  const business = submission?.formData || storage.get("businessProfile", { business_name: "BlackSky Client" });
  const businessId = submission?.id || business.id;
  const services = submission?.serviceName
    ? [submission.serviceName]
    : storage.get("selectedServices", [
        "Social Media",
        "WhatsApp",
        "Lead Generation",
        "AI Sales Calls",
        "Tax Invoices"
      ]);
  const plan = submission?.plan?.name || storage.get("selectedPlan", "Executive");

  document.querySelector("#businessName").textContent = business.business_name || "BlackSky Client";
  document.querySelector("#activePlan").textContent = plan;
  document.querySelector("#serviceCount").textContent = `${services.length} automations active`;

  const notice = document.querySelector("#automationNotice");
  if (notice) {
    if (submission?.paymentStatus === "confirmed") {
      notice.textContent = "Payment confirmed. Automation will activate soon.";
    } else if (submission?.paymentStatus === "pending_confirmation") {
      notice.textContent = "Payment submitted. Awaiting admin confirmation.";
    } else {
      notice.textContent = "Automation will activate soon.";
    }
  }

  const serviceTable = document.querySelector("#serviceTable");
  const postsGeneratedEl = document.querySelector("#postsGenerated");
  const postsPublishedEl = document.querySelector("#postsPublished");

  const renderServiceTable = (row) => {
    if (!serviceTable) return;
    const metrics = {
      "Social Media": Number(row?.posts_published || row?.posts_generated || 0),
      "WhatsApp": Number(row?.whatsapp_sent || 0),
      "Lead Generation": Number(row?.leads_captured || 0),
      "AI Sales Calls": Number(row?.calls_booked || 0),
      "Tax Invoices": Number(row?.invoices_generated || 0)
    };
    serviceTable.innerHTML = services
      .map((service) => {
        const volume = metrics[service] ?? 0;
        const status = row?.status ? row.status : "pending";
        return `
          <tr>
            <td>${service}</td>
            <td>${volume}</td>
            <td>${status}</td>
          </tr>`;
      })
      .join("");
  };

  renderServiceTable(null);

  if (!PLACEHOLDER(CONFIG.sheetCsvUrl)) {
    fetch(CONFIG.sheetCsvUrl)
      .then((res) => res.text())
      .then((csv) => {
        const rows = parseCsv(csv);
        const match = rows.find((row) => row.id === businessId) || rows[rows.length - 1];
        if (!match) return;

        if (match) {
          const statusText = match.status ? match.status : "pending";
          const lastRun = match.last_run ? match.last_run : "Not yet";
          document.querySelector("#serviceCount").textContent = `Status: ${statusText} · Last run: ${lastRun}`;
        }

        const postsGenerated = Number(match.posts_generated || 0);
        const postsPublished = Number(match.posts_published || 0);
        if (postsGeneratedEl) postsGeneratedEl.textContent = postsGenerated;
        if (postsPublishedEl) postsPublishedEl.textContent = postsPublished;

        renderServiceTable(match);

        const platformCounts = {
          ig: Number(match.instagram_posts || 0),
          yt: Number(match.youtube_posts || 0),
          li: Number(match.linkedin_posts || 0),
          x: Number(match.x_posts || 0),
          pin: Number(match.pinterest_posts || 0),
          fb: Number(match.facebook_posts || 0)
        };
        const maxVal = Math.max(1, ...Object.values(platformCounts));

        updatePlatform("igCount", platformCounts.ig, maxVal);
        updatePlatform("ytCount", platformCounts.yt, maxVal);
        updatePlatform("liCount", platformCounts.li, maxVal);
        updatePlatform("xCount", platformCounts.x, maxVal);
        updatePlatform("pinCount", platformCounts.pin, maxVal);
        updatePlatform("fbCount", platformCounts.fb, maxVal);
      })
      .catch(() => {});
  }
}

const proofLinks = document.querySelectorAll(".proof-link");
const lightbox = document.querySelector("#proofLightbox");
if (proofLinks.length && lightbox) {
  const lightboxImg = lightbox.querySelector("img");
  const closeTargets = lightbox.querySelectorAll("[data-lightbox-close]");

  proofLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const full = link.getAttribute("data-full");
      if (lightboxImg && full) {
        lightboxImg.src = full;
      }
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
    });
  });

  const closeLightbox = () => {
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    if (lightboxImg) {
      lightboxImg.src = "";
    }
  };

  closeTargets.forEach((target) => {
    target.addEventListener("click", closeLightbox);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("open")) {
      closeLightbox();
    }
  });
}

const adminRoot = document.querySelector("#adminRoot");
if (adminRoot) {
  const adminTable = document.querySelector("#adminSubmissions");
  const adminEmpty = document.querySelector("#adminEmpty");

  const renderTable = () => {
    const items = getSubmissions();
    if (!adminTable) return;
    if (!items.length) {
      adminTable.innerHTML = "";
      if (adminEmpty) adminEmpty.style.display = "block";
      return;
    }
    if (adminEmpty) adminEmpty.style.display = "none";
    adminTable.innerHTML = items
      .map((item) => {
        const business = item.formData?.business_name || "Untitled";
        const service = item.serviceName || item.serviceKey || "-";
        const planName = item.plan?.name || "-";
        const amount = item.plan?.subtotal ? `₹${item.plan.subtotal}` : "-";
        const paymentStatus = item.paymentStatus || "pending";
        const paymentLabel =
          paymentStatus === "confirmed"
            ? "Confirmed"
            : paymentStatus === "pending_confirmation"
            ? "Awaiting approval"
            : "Awaiting payment";
        const paymentTime = item.paymentSubmittedAt
          ? new Date(item.paymentSubmittedAt).toLocaleString()
          : "";
        const blueprintAction = item.blueprint
          ? `<button class="button ghost" data-download="${item.id}">Download JSON</button>`
          : "-";
        const action =
          paymentStatus === "pending_confirmation"
            ? `<button class="button ghost" data-confirm="${item.id}">Confirm</button>`
            : paymentStatus === "confirmed"
            ? "Confirmed"
            : "-";
        return `
          <tr>
            <td>
              <strong>${business}</strong><br />
              <span style="color: var(--muted); font-size: 0.85rem;">${item.formData?.contact_email || "-"}</span>
            </td>
            <td>${service}</td>
            <td>${planName}</td>
            <td>${amount}</td>
            <td>
              ${paymentLabel}
              ${paymentTime ? `<br /><span style="color: var(--muted); font-size: 0.8rem;">${paymentTime}</span>` : ""}
            </td>
            <td>${blueprintAction}</td>
            <td>${action}</td>
          </tr>`;
      })
      .join("");
  };

  const downloadBlueprint = (item) => {
    const blob = new Blob([item.blueprint || ""], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = item.blueprintFileName || `blacksky_${item.serviceKey}_blueprint.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  adminRoot.addEventListener("click", (event) => {
    const downloadBtn = event.target.closest("[data-download]");
    const confirmBtn = event.target.closest("[data-confirm]");
    if (downloadBtn) {
      const id = downloadBtn.getAttribute("data-download");
      const item = findSubmission(id);
      if (item) downloadBlueprint(item);
    }
    if (confirmBtn) {
      const id = confirmBtn.getAttribute("data-confirm");
      updateSubmission(id, {
        paymentStatus: "confirmed",
        confirmedAt: new Date().toISOString(),
        status: "payment_confirmed"
      });
      renderTable();
    }
  });

  const exportBtn = document.querySelector("#exportCsv");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const items = getSubmissions();
      const rows = [
        ["Business Name", "Service", "Plan", "Amount", "Payment Status", "Submitted At"],
        ...items.map((item) => [
          item.formData?.business_name || "Untitled",
          item.serviceName || item.serviceKey || "-",
          item.plan?.name || "",
          item.plan?.subtotal || "",
          item.paymentStatus || "pending",
          item.createdAt || ""
        ])
      ];
      const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "blacksky_submissions.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  renderTable();

  window.addEventListener("storage", (event) => {
    if (event.key === SUBMISSIONS_KEY) {
      renderTable();
    }
  });
}

const planRoot = document.querySelector("#planRoot");
if (planRoot) {
  const selectedLabels = normalizeSelectedServices();
  const planServiceNote = document.querySelector("#planServiceNote");
  const planServiceList = document.querySelector("#planServiceList");
  const summaryText = document.querySelector("#planSummaryText");
  const subtotalEl = document.querySelector("#planSubtotal");
  const proceedBtn = document.querySelector("#proceedPayment");
  const submissions = getSubmissions();
  const serviceSubmissionMap = storage.get("serviceSubmissionMap", {});
  const planSelections = storage.get("planSelections", {});

  const PLAN_PRICES = {
    Starter: 999,
    Growth: 6999,
    Elite: 14999
  };

  const PLAN_VALIDITY = {
    Starter: "30 days",
    Growth: "1 year",
    Elite: "2 years"
  };

  const PLAN_OFFERS = {
    Growth: "40% off",
    Elite: "50% off"
  };

  const SERVICE_PLAN_FEATURES = {
    social_generate: [
      "30 AI-generated posts",
      "30 scheduled publishes",
      "30 captions + hashtags",
      "30 creative prompts"
    ],
    social_post: [
      "30 scheduled publishes",
      "30 captions + hashtags",
      "30 content approvals",
      "30 platform reports"
    ],
    whatsapp: [
      "30 WhatsApp campaigns",
      "30 template broadcasts",
      "30 auto replies",
      "30 customer follow-ups"
    ],
    lead_email: [
      "30 lead lists",
      "30 cold email sequences",
      "30 lead qualification steps",
      "30 CRM updates"
    ],
    sales_call: [
      "30 AI call bookings",
      "30 call reminders",
      "30 call summaries",
      "30 lead score updates"
    ],
    tax_invoice: [
      "30 invoices generated",
      "30 invoices emailed",
      "30 GST summaries",
      "30 payment follow-ups"
    ]
  };

  const findLatestSubmissionByService = (label) => {
    const mappedId = serviceSubmissionMap[label];
    if (mappedId) {
      const match = findSubmission(mappedId);
      if (match) return match;
    }
    const matches = submissions.filter((item) => item.serviceName === label);
    return matches.length ? matches[matches.length - 1] : null;
  };

  if (!selectedLabels.length) {
    planRoot.innerHTML = `<p class="notice">No setup found. Please complete a service setup first.</p>`;
  } else {
    if (planServiceNote) {
      planServiceNote.textContent = `You selected ${selectedLabels.length} service${selectedLabels.length === 1 ? "" : "s"}: ${selectedLabels.join(" · ")}`;
    }

    const services = selectedLabels
      .map((label) => {
        const serviceKey = SERVICE_PAGE_MAP.find((item) => item.label === label)?.key;
        const submission = findLatestSubmissionByService(label);
        return {
          label,
          serviceKey,
          submission
        };
      })
      .filter((item) => item.serviceKey);

    const allowedKeys = new Set(services.map((service) => service.serviceKey));
    Object.keys(planSelections).forEach((key) => {
      if (!allowedKeys.has(key)) {
        delete planSelections[key];
      }
    });
    storage.set("planSelections", planSelections);

    if (planServiceList) {
      planServiceList.innerHTML = services
        .map((service) => {
          const features = SERVICE_PLAN_FEATURES[service.serviceKey] || [
            "30 automated actions",
            "30 scheduled tasks",
            "30 report updates",
            "30 workflow runs"
          ];
          return `
            <section class="plan-service" data-service="${service.serviceKey}">
              <div class="plan-service-head">
                <div>
                  <h2 class="plan-service-name">${service.label}</h2>
                  <p class="plan-service-meta">Business: ${service.submission?.formData?.business_name || "Your business"}</p>
                </div>
                <span class="badge">${service.submission ? "Setup complete" : "Setup missing"}</span>
              </div>
              <div class="plan-grid">
                ${Object.entries(PLAN_PRICES)
                  .map(([planName, price]) => {
                    const offer = PLAN_OFFERS[planName];
                    const validity = PLAN_VALIDITY[planName] || "30 days";
                    return `
                      <div class="plan-card plan-option" data-service="${service.serviceKey}" data-plan="${planName}" data-price="${price}">
                        <div class="plan-card-head">
                          <h4>${planName}</h4>
                          ${offer ? `<span class="plan-offer">${offer}</span>` : ""}
                        </div>
                        <div class="price">₹${price}</div>
                        <div class="plan-validity">Validity: ${validity}</div>
                        <ul>${features.map((item) => `<li>${item}</li>`).join("")}</ul>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </section>
          `;
        })
        .join("");
    }

    const updateSummary = () => {
      const lines = [];
      let total = 0;
      services.forEach((service) => {
        const selection = planSelections[service.serviceKey];
        if (selection) {
          total += Number(selection.price || 0);
          lines.push(`${service.label}: ${selection.name} (₹${selection.price})`);
        }
      });
      if (summaryText) {
        summaryText.innerHTML = lines.length
          ? lines.join("<br>")
          : "Select a plan for each service to see subtotal.";
      }
      if (subtotalEl) subtotalEl.textContent = `₹${total}`;
      const allSelected = services.every((service) => planSelections[service.serviceKey]);
      const allSetup = services.every((service) => service.submission);
      if (proceedBtn) {
        proceedBtn.disabled = !(allSelected && allSetup);
      }
    };

    const planCards = planRoot.querySelectorAll(".plan-option");
    planCards.forEach((card) => {
      const serviceKey = card.dataset.service;
      const planName = card.dataset.plan;
      if (planSelections[serviceKey]?.name === planName) {
        card.classList.add("selected");
      }
      card.addEventListener("click", () => {
        planRoot
          .querySelectorAll(`.plan-option[data-service="${serviceKey}"]`)
          .forEach((el) => el.classList.remove("selected"));
        card.classList.add("selected");
        planSelections[serviceKey] = {
          name: planName,
          price: Number(card.dataset.price || 0)
        };
        storage.set("planSelections", planSelections);
        updateSummary();
      });
    });

    updateSummary();

    if (proceedBtn) {
      proceedBtn.addEventListener("click", () => {
        const allSelected = services.every((service) => planSelections[service.serviceKey]);
        const allSetup = services.every((service) => service.submission);
        if (!allSelected || !allSetup) return;

        const bundle = {
          createdAt: new Date().toISOString(),
          services: services.map((service) => {
            const selection = planSelections[service.serviceKey];
            return {
              submissionId: service.submission?.id || "",
              serviceKey: service.serviceKey,
              serviceName: service.label,
              planName: selection?.name || "",
              price: selection?.price || 0
            };
          })
        };
        bundle.subtotal = bundle.services.reduce((sum, item) => sum + Number(item.price || 0), 0);

        bundle.services.forEach((item) => {
          if (!item.submissionId) return;
          updateSubmission(item.submissionId, {
            plan: {
              name: item.planName,
              price: item.price,
              subtotal: item.price
            }
          });
        });

        storage.set("planBundle", bundle);
        window.location.href = "payment.html?bundle=1";
      });
    }
  }
}

const paymentRoot = document.querySelector("#paymentRoot");
if (paymentRoot) {
  const params = new URLSearchParams(window.location.search);
  const submissionId = params.get("submission") || localStorage.getItem("activeSubmissionId");
  const allSubmissions = getSubmissions();
  let submission = submissionId ? findSubmission(submissionId) : null;
  if (!submission && allSubmissions.length) {
    submission = allSubmissions[allSubmissions.length - 1];
  }

  const serviceNameEl = document.querySelector("#paymentServiceName");
  const planNameEl = document.querySelector("#paymentPlanName");
  const amountLabel = document.querySelector("#paymentAmountLabel");
  const amountInput = document.querySelector("#paymentAmount");
  const statusEl = document.querySelector("#paymentStatus");
  const screenshotInput = document.querySelector("#paymentScreenshot");
  const previewImg = document.querySelector("#paymentPreview");
  const submitBtn = document.querySelector("#submitPayment");
  const bundle = storage.get("planBundle", null);

  if (bundle?.services?.length) {
    const amount = bundle.subtotal || 0;
    if (serviceNameEl) serviceNameEl.textContent = `${bundle.services.length} services`;
    if (planNameEl) {
      planNameEl.textContent = bundle.services
        .map((item) => `${item.serviceName}: ${item.planName}`)
        .join(" | ");
    }
    if (amountLabel) amountLabel.textContent = `₹${amount}`;
    if (amountInput) amountInput.value = amount;

    if (screenshotInput && previewImg) {
      screenshotInput.addEventListener("change", () => {
        const file = screenshotInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          previewImg.src = reader.result;
          previewImg.style.display = "block";
        };
        reader.readAsDataURL(file);
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        const file = screenshotInput?.files?.[0];
        if (!file) {
          if (statusEl) statusEl.textContent = "Please upload the UPI payment screenshot.";
          return;
        }
        const paidAmount = Number(amountInput?.value || 0);
        if (paidAmount !== amount) {
          if (statusEl) statusEl.textContent = "Amount does not match the selected plan total.";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const submittedAt = new Date().toISOString();
          bundle.services.forEach((item) => {
            if (!item.submissionId) return;
            updateSubmission(item.submissionId, {
              paymentStatus: "pending_confirmation",
              paymentAmount: paidAmount,
              paymentSubmittedAt: submittedAt,
              paymentScreenshot: reader.result
            });
          });
          if (statusEl) statusEl.textContent = "Payment submitted. Awaiting admin confirmation.";
          const firstId = bundle.services[0]?.submissionId || "";
          setTimeout(() => {
            window.location.href = `dashboard.html?submission=${firstId}`;
          }, 1200);
        };
        reader.readAsDataURL(file);
      });
    }
  } else if (!submission) {
    paymentRoot.innerHTML = `<p class="notice">No plan selected. Please complete setup and choose a plan first.</p>`;
  } else {
    if (submission?.id) {
      localStorage.setItem("activeSubmissionId", submission.id);
    }

    const amount = submission.plan?.subtotal || 0;
    if (serviceNameEl) serviceNameEl.textContent = submission.serviceName || "Unknown service";
    if (planNameEl) planNameEl.textContent = submission.plan?.name || "No plan selected";
    if (amountLabel) amountLabel.textContent = `₹${amount}`;
    if (amountInput) amountInput.value = amount;

    if (screenshotInput && previewImg) {
      screenshotInput.addEventListener("change", () => {
        const file = screenshotInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          previewImg.src = reader.result;
          previewImg.style.display = "block";
        };
        reader.readAsDataURL(file);
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        if (!submissionId || !submission) return;
        const file = screenshotInput?.files?.[0];
        if (!file) {
          if (statusEl) statusEl.textContent = "Please upload the UPI payment screenshot.";
          return;
        }
        const paidAmount = Number(amountInput?.value || 0);
        if (paidAmount !== amount) {
          if (statusEl) statusEl.textContent = "Amount does not match the selected plan total.";
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          updateSubmission(submissionId, {
            paymentStatus: "pending_confirmation",
            paymentAmount: paidAmount,
            paymentSubmittedAt: new Date().toISOString(),
            paymentScreenshot: reader.result
          });
          if (statusEl) statusEl.textContent = "Payment submitted. Awaiting admin confirmation.";
          setTimeout(() => {
            window.location.href = `dashboard.html?submission=${submissionId}`;
          }, 1200);
        };
        reader.readAsDataURL(file);
      });
    }
  }
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
    return row;
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function updatePlatform(id, value, maxVal) {
  const el = document.querySelector(`#${id}`);
  if (!el) return;
  el.textContent = value;
  const percent = Math.max(8, Math.round((value / maxVal) * 100));
  const bar = el.closest(".platform-item")?.querySelector(".progress span");
  if (bar) {
    bar.style.width = `${percent}%`;
  }
}
