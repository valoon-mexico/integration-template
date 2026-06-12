/**
 * Valoon integration template — minimal reference implementation of the
 * marketplace handoff protocol (docs/protocol.md). Dependency-free Node ≥ 20.
 *
 * Flow implemented here:
 *   GET  /valoon/connect?handoff_token=vmh_…  ← marketplace redirects the user here
 *        Shows a register/login form; the token rides along in a hidden field.
 *   POST /valoon/complete                      ← form submit
 *        Claims the token server-side (single use!), verifies the Valoon API
 *        key against the gateway, stores the account, shows a success page.
 *   GET  /                                     status page with account count.
 *
 * Everything here is intentionally naive (SHA-256 passwords, JSON-file store,
 * inline HTML). Replace auth, storage and runtime with your real stack —
 * docs/getting-started.md lists what to swap.
 */
import { createServer } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const PORT = Number(process.env.PORT ?? 4810);
const MARKETPLACE_URL = (process.env.MARKETPLACE_URL ?? "https://marketplace.valoon.crucerlabs.com").replace(/\/$/, "");
const VALOON_GATEWAY_URL = (process.env.VALOON_GATEWAY_URL ?? "https://gateway.app.valoon.chat").replace(/\/$/, "");
const DATA_FILE = process.env.DATA_FILE ?? "data/store.json";

// --- demo persistence (replace with a real database) -------------------------

function loadStore() {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { accounts: {} };
  }
}

function saveStore(store) {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// --- protocol: claim the one-time handoff token ------------------------------

/**
 * Exchanges a handoff token for the setup payload. Exactly one claim per token
 * succeeds; the marketplace destroys the data as it answers. Returns the
 * payload or null when the token is invalid, expired or already claimed.
 */
async function claimHandoff(token) {
  const res = await fetch(`${MARKETPLACE_URL}/api/handoff/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) return null;
  return res.json();
}

/** One cheap authenticated call to prove the API key pair works. */
async function verifyValoonCredentials({ clientId, secret }) {
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  try {
    const res = await fetch(`${VALOON_GATEWAY_URL}/api/Projects?$top=1`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- tiny html helpers --------------------------------------------------------

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  body{font:16px/1.6 system-ui,sans-serif;max-width:520px;margin:8vh auto;padding:0 20px;color:#1c2422}
  h1{font-size:1.4rem} code{background:#f0f2f1;padding:2px 6px;border-radius:4px;font-size:.85em}
  label{display:block;margin:14px 0 4px;font-weight:600;font-size:.9rem}
  input{width:100%;padding:10px 12px;border:1px solid #c8cfcc;border-radius:8px;font-size:1rem;box-sizing:border-box}
  button{margin-top:18px;padding:11px 22px;border:0;border-radius:999px;background:#0e6f5c;color:#fff;font-size:1rem;cursor:pointer}
  .muted{color:#5d6a66;font-size:.9rem} .err{color:#a3331f} .ok{color:#0e6f5c}
</style></head><body>${body}</body></html>`;
}

// --- http server ----------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const send = (status, html) => {
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  };

  // Status page — proves the service is up and shows demo state.
  if (req.method === "GET" && url.pathname === "/") {
    const count = Object.keys(loadStore().accounts).length;
    return send(
      200,
      page(
        "Integration template",
        `<h1>Valoon integration template</h1>
         <p>This service implements the <a href="https://github.com/valoon-mexico/integration-template">marketplace handoff protocol</a>.</p>
         <p class="muted">Connected accounts: <strong>${count}</strong> · Marketplace: <code>${esc(MARKETPLACE_URL)}</code></p>`
      )
    );
  }

  // Step 1 of the handoff on our side: the marketplace redirected the user
  // here with a one-time token. We do NOT claim yet — first the user gets an
  // account with us, so they can come back and manage the connection later.
  if (req.method === "GET" && url.pathname === "/valoon/connect") {
    const token = url.searchParams.get("handoff_token") ?? "";
    if (!token.startsWith("vmh_")) {
      return send(400, page("Missing token", `<h1>Missing handoff token</h1>
        <p class="err">This page is the landing target of the Valoon Marketplace connect flow. Start from your listing's <strong>Connect</strong> button.</p>`));
    }
    return send(
      200,
      page(
        "Finish connecting",
        `<h1>Almost there</h1>
         <p>Create an account (or sign in) to finish connecting your Valoon workspace. You'll use it to manage this integration later.</p>
         <form method="post" action="/valoon/complete">
           <input type="hidden" name="handoff_token" value="${esc(token)}">
           <label for="email">Email</label>
           <input id="email" name="email" type="email" required placeholder="you@company.com">
           <label for="password">Password</label>
           <input id="password" name="password" type="password" required minlength="8" placeholder="min. 8 characters">
           <button type="submit">Complete connection</button>
         </form>
         <p class="muted">Existing account with this email? Same form — your password signs you in.</p>`
      )
    );
  }

  // Step 2: user authenticated with us → claim the token (single use),
  // verify the credentials, store the connection.
  if (req.method === "POST" && url.pathname === "/valoon/complete") {
    const form = new URLSearchParams(await readBody(req));
    const token = form.get("handoff_token") ?? "";
    const email = (form.get("email") ?? "").trim().toLowerCase();
    const password = form.get("password") ?? "";
    if (!token.startsWith("vmh_") || !email || password.length < 8) {
      return send(400, page("Invalid request", `<h1>Invalid request</h1><p class="err">Go back and fill in all fields.</p>`));
    }

    const store = loadStore();
    const existing = store.accounts[email];
    if (existing) {
      const a = Buffer.from(existing.password_hash);
      const b = Buffer.from(sha256(password));
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return send(401, page("Wrong password", `<h1>Wrong password</h1><p class="err">An account with this email exists — sign in with its password, or use another email.</p>`));
      }
    }

    const payload = await claimHandoff(token);
    if (!payload) {
      return send(
        410,
        page("Link expired", `<h1>This connection link expired</h1>
          <p class="err">Handoff tokens are single-use and valid for 10 minutes. Start again from the marketplace connect flow.</p>`)
      );
    }

    const credentialsOk = await verifyValoonCredentials(payload.credentials);

    store.accounts[email] = {
      password_hash: existing?.password_hash ?? sha256(password),
      // Real integrations: encrypt this at rest and never log it.
      valoon: payload.credentials,
      config: payload.config ?? {},
      listing: payload.slug,
      locale: payload.locale,
      credentials_verified: credentialsOk,
      connected_at: new Date().toISOString(),
    };
    saveStore(store);

    return send(
      200,
      page(
        "Connected",
        `<h1 class="ok">Connected ✓</h1>
         <p>Your Valoon workspace is now linked to <strong>${esc(email)}</strong>.</p>
         <p class="${credentialsOk ? "ok" : "err"}">${
           credentialsOk
             ? "API key verified against the Valoon gateway."
             : "Warning: the API key could not be verified against the Valoon gateway — check it in Valoon under workspace settings → API Keys."
         }</p>
         ${
           Object.keys(payload.config ?? {}).length
             ? `<p class="muted">Setup received from the marketplace: <code>${esc(JSON.stringify(payload.config))}</code></p>`
             : ""
         }
         <p class="muted">The marketplace has already destroyed its copy of this data. From here on, this integration is where you manage the connection.</p>`
      )
    );
  }

  send(404, page("Not found", `<h1>404</h1><p class="muted">Nothing here.</p>`));
});

server.listen(PORT, () => {
  console.log(`integration-template listening on http://localhost:${PORT}`);
  console.log(`marketplace: ${MARKETPLACE_URL}`);
});
