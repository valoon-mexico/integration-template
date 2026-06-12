# Getting started

Build a Valoon integration from this template in four steps: run the example, point it at the marketplace, make the handoff work end to end, then replace the example logic with yours.

## What you're building

A Valoon **integration** is a service you run. The marketplace lists it, collects the user's Valoon API key and your declared setup fields, and hands everything to your backend with a one-time token ([protocol.md](protocol.md)). From that moment the user is *your* user: they authenticate with you, you store their Valoon credentials, and you talk to the Valoon API directly.

```
Marketplace (catalog + registrar)        Your service (runtime)
┌──────────────────────────┐             ┌───────────────────────────┐
│ listing page             │   handoff   │ /valoon/connect (landing) │
│ connect flow             │ ──────────▶ │ register / login          │
│ one-time token issuing   │   claim     │ store credentials         │
└──────────────────────────┘ ◀────────── │ run against Valoon API    │
                                         └───────────────────────────┘
```

## 1. Run the template

Requires Node.js ≥ 20 (no other runtime dependencies — the example uses only the standard library).

```bash
git clone https://github.com/valoon-mexico/integration-template.git
cd integration-template
npm start
```

Open `http://localhost:4810`. You'll see the status page with zero connected accounts.

Configuration is via environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4810` | HTTP port. |
| `MARKETPLACE_URL` | `https://marketplace.valoon.crucerlabs.com` | Marketplace origin used for the claim call. |
| `VALOON_GATEWAY_URL` | `https://gateway.app.valoon.chat` | Valoon API gateway, used to verify claimed credentials. |
| `DATA_FILE` | `data/store.json` | Where the demo persists accounts. Replace with a real database. |

## 2. Walk through the handoff locally

You can exercise the full protocol without a deployed marketplace listing:

1. Start the template (`npm start`).
2. From the marketplace connect flow of a listing whose `redirect_url` points at your instance, complete the steps — the marketplace redirects to `http://localhost:4810/valoon/connect?handoff_token=vmh_…`.
3. The landing page asks for email + password (the template's stand-in for your real auth). On submit, the backend claims the token, verifies the Valoon credentials against the gateway, and stores the account in `data/store.json`.
4. Reload `/` — the account counter ticks up. Claiming the same token twice fails by design.

During development, expose your local port with a tunnel (e.g. `cloudflared tunnel --url http://localhost:4810` or `ngrok http 4810`) and use that HTTPS URL as `redirect_url` in your manifest.

## 3. Write your manifest

Copy [`integration.json`](../integration.json), change the `slug`, copy and connection details, fill the four locales. Field-by-field reference: [manifest.md](manifest.md). Validate before submitting:

```bash
npx ajv-cli@5 validate --spec=draft2020 -s schema/integration.schema.json -d integration.json
```

## 4. Replace the example logic

`server.js` is ~250 lines of dependency-free Node and intentionally naive. For a real integration:

- **Auth**: replace the email+SHA-256 demo with your real registration/login (or SSO). The landing page is the right place — users return there to manage or reconnect.
- **Storage**: replace the JSON file with a database; encrypt the Valoon secret at rest.
- **Runtime**: add your actual sync/notify/whatever logic against the Valoon OData API (`GET {gateway}/api/Projects`, `Tickets`, `Reports`, `TimeEntries`, `Media`, … with `Authorization: Basic base64(clientId:secret)`).
- **Operations**: HTTPS, logging that never prints tokens or secrets, monitoring.

## 5. Submit

See [submission.md](submission.md) — short version: send your manifest through the partner form on the marketplace, Valoon reviews, approval publishes your listing.
