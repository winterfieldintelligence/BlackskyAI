const http = require("http");
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "db.json");

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch (err) {
    return { businesses: [], payments: [], automationLogs: [] };
  }
}

function writeDb(db) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

function send(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    return send(res, 200, { ok: true });
  }

  if (req.url === "/api/setup" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const payload = JSON.parse(body || "{}");
      const db = readDb();
      const id = `biz_${Date.now()}`;
      db.businesses.push({
        id,
        ...payload,
        status: "pending",
        createdAt: new Date().toISOString()
      });
      writeDb(db);
      send(res, 200, { id, status: "pending" });
    });
    return;
  }

  if (req.url === "/api/payment" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const payload = JSON.parse(body || "{}");
      const db = readDb();
      db.payments.push({ id: `pay_${Date.now()}`, ...payload, status: "paid" });
      if (payload.business?.id) {
        const business = db.businesses.find((item) => item.id === payload.business.id);
        if (business) {
          business.status = "active";
        }
      }
      writeDb(db);
      send(res, 200, { status: "active" });
    });
    return;
  }

  if (req.url === "/api/submissions" && req.method === "GET") {
    const db = readDb();
    return send(res, 200, { submissions: db.businesses || [] });
  }

  if (req.url === "/api/activate" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const payload = JSON.parse(body || "{}");
      const db = readDb();
      const business = db.businesses.find((item) => item.id === payload.id);
      if (business) {
        business.status = payload.status || "active";
        business.activatedAt = new Date().toISOString();
        writeDb(db);
        return send(res, 200, { ok: true, status: business.status });
      }
      return send(res, 404, { error: "Business not found" });
    });
    return;
  }

  if (req.url.startsWith("/api/dashboard") && req.method === "GET") {
    const db = readDb();
    const total = db.businesses.length || 0;
    const active = db.businesses.filter((b) => b.status === "active").length;
    const pending = total - active;
    const payload = {
      totalActions: 1240,
      successRate: 92,
      servicesActive: active || 0,
      totalBusinesses: total,
      pendingBusinesses: pending
    };
    return send(res, 200, payload);
  }

  send(res, 404, { error: "Not found" });
});

server.listen(8080, () => {
  console.log("BlackSky AI mock server running at http://localhost:8080");
});
