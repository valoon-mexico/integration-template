# Valoon Integration Template

The starting point for building an integration for the [Valoon Marketplace](https://marketplace.valoon.crucerlabs.com) — a runnable reference implementation of the handoff protocol plus the full documentation for getting your integration listed.

Valoon turns WhatsApp site communication into structured construction documentation. The marketplace is its **catalog and registrar**: it lists your integration, walks the user through setup, and hands them over to *your* service with a one-time token. Your service does the rest — the marketplace stores no credentials and runs no integration code.

## Quickstart

```bash
git clone https://github.com/valoon-mexico/integration-template.git
cd integration-template
npm start          # → http://localhost:4810  (Node ≥ 20, zero dependencies)
```

## What's in here

| Path | What it is |
| --- | --- |
| [`server.js`](server.js) | Minimal reference integration: receives the marketplace redirect, claims the one-time handoff token server-side, verifies the Valoon API key, stores the connection behind a basic register/login. |
| [`integration.json`](integration.json) | This template's own listing manifest — copy it as the starting point for yours. |
| [`schema/integration.schema.json`](schema/integration.schema.json) | JSON Schema (2020-12) every manifest must validate against. |
| [`docs/getting-started.md`](docs/getting-started.md) | Build an integration from this template, step by step. |
| [`docs/manifest.md`](docs/manifest.md) | Field-by-field manifest reference. |
| [`docs/protocol.md`](docs/protocol.md) | The marketplace ↔ integration handoff protocol spec. |
| [`docs/submission.md`](docs/submission.md) | How submission, review and approval work. |

## The 60-second version

1. **One JSON file describes your listing.** Catalog copy in four languages, what data it touches, how it connects — all in a single manifest validated against the schema. Submitting that file is how listings are created and updated.
2. **The marketplace collects setup, then forgets.** When a user connects, the marketplace gathers their Valoon API key and your declared config fields, encrypts the bundle with a one-time token (10-minute TTL, single use) and redirects the user to your `redirect_url` with that token.
3. **Your backend claims the payload.** `POST /api/handoff/claim` with the token returns the credentials and config exactly once — the marketplace destroys its copy as it answers. You verify the key against the Valoon gateway, create the user's account on your side, and run the integration against the [Valoon API](https://gateway.app.valoon.chat).
4. **Partners request, Valoon approves.** Submissions go through the marketplace partner form and sit as *pending* until Valoon reviews and publishes them.

## License

MIT — see [LICENSE](LICENSE).
