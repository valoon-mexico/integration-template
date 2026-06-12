# Marketplace handoff protocol

How the Valoon Marketplace hands a user — and their one-time setup data — over to your integration. The marketplace is a **catalog and registrar only**: it never stores credentials at rest, never proxies traffic, and is out of the picture the moment the handoff completes. Your integration owns the relationship from then on.

## Actors

| Actor | Role |
| --- | --- |
| **User** | A Valoon customer connecting your integration from the marketplace UI. |
| **Marketplace** | `https://marketplace.valoon.crucerlabs.com` — renders your listing, collects the setup data your manifest declares, issues the one-time handoff token. |
| **Integration** | Your service. Receives the redirect, claims the token server-side, creates/links the user's account, talks to the Valoon API directly. |

## Sequence

```
User                    Marketplace                       Integration backend
 │  open /listing/<slug>/connect  │                              │
 │ ─────────────────────────────▶ │                              │
 │  steps: overview → Valoon API  │                              │
 │  key → your config_fields      │                              │
 │ ─────────────────────────────▶ │                              │
 │                                │ 1. encrypt payload with the  │
 │                                │    token, store hash, 10-min │
 │                                │    TTL, single use           │
 │  302 → redirect_url            │                              │
 │      ?handoff_token=vmh_…      │                              │
 │ ───────────────────────────────────────────────────────────▶  │
 │                                │   2. POST /api/handoff/claim │
 │                                │ ◀──────────────────────────  │
 │                                │   3. payload returned, row   │
 │                                │      destroyed atomically    │
 │                                │ ──────────────────────────▶  │
 │  register / log in on YOUR UI, integration verifies the API   │
 │  key against the Valoon gateway and stores it on its side     │
 │ ◀───────────────────────────────────────────────────────────  │
```

## Step by step

### 1. The marketplace collects setup data

When a user clicks **Connect** on a listing whose manifest declares `connection.method: "handoff"`, the marketplace walks them through:

1. **Overview** — what the integration does and which Valoon entities it touches.
2. **Valoon API key** — Client ID (`ak_…`) + Secret. Users create these in Valoon under workspace settings → API Keys.
3. **Your `config_fields`** — whatever inputs your manifest declared (group names, project, region, …).

### 2. Token issued, payload sealed

On submit, the marketplace:

- generates a token: `vmh_` + 48 hex chars (24 random bytes),
- encrypts the payload **with the token itself as the key** (PGP symmetric) and stores only the token's SHA-256 hash next to the ciphertext — the marketplace cannot read the payload back without the token, and the token exists only in the redirect,
- sets a **10 minute** expiry and a **single-use** guarantee,
- redirects the browser to your manifest's `redirect_url` with the token appended:

```
https://your-service.example.com/valoon/connect?handoff_token=vmh_3f9c…
```

If your `redirect_url` already has a query string, the parameter is appended with `&`.

### 3. Your backend claims the payload

**Server-side only.** The token reaches your frontend via the URL, but the claim must come from your backend — never claim from browser JavaScript, and never log the token.

```http
POST /api/handoff/claim HTTP/1.1
Host: marketplace.valoon.crucerlabs.com
Content-Type: application/json

{ "token": "vmh_3f9c…" }
```

**200 OK** — exactly once per token:

```json
{
  "slug": "my-integration",
  "locale": "de",
  "issued_at": "2026-06-11T18:03:11.219Z",
  "credentials": { "clientId": "ak_1c2d…", "secret": "•••" },
  "config": { "whatsapp_group": "Site A — Foremen" }
}
```

| Field | Meaning |
| --- | --- |
| `slug` | The listing the user connected — lets one backend serve several listings. |
| `locale` | UI locale the user was in (`de`/`en`/`es`/`fr`). Use it to localize your onboarding. |
| `issued_at` | When the token was created. |
| `credentials` | The user's Valoon API key pair. **This is the only copy — the marketplace just destroyed its row.** |
| `config` | Values for your manifest's `config_fields`, keyed by `key`. |

**404 Not Found** — `{ "error": "invalid_or_expired_token" }`. The token is unknown, older than 10 minutes, or was already claimed. Recovery: send the user back to the marketplace connect flow; there is nothing to retry on your side.

The read is destructive and atomic (a `DELETE … RETURNING` under the hood): two concurrent claims can never both succeed.

### 4. Account creation on your side

What the template does, and what we recommend:

1. **Verify the credentials** before storing anything — one cheap authenticated call:

   ```http
   GET https://gateway.app.valoon.chat/api/Projects?$top=1
   Authorization: Basic base64(clientId:secret)
   ```

2. **Register or log in the user on your own UI** at the redirect landing page, so they can return later to manage or re-connect the integration without going through the marketplace again.
3. **Store the credentials encrypted at rest**, tied to that user account.
4. Run your integration against the Valoon API (OData under `https://gateway.app.valoon.chat/api/{EntitySet}` — Projects, Tickets, Reports, Users, TimeEntries, Media, …).

> Order matters with single-use tokens: claim **after** the user has authenticated on your side (keep the token in the form/session until then), or claim immediately and persist the payload yourself. The template keeps the token in the registration form and claims on submit.

## Security properties — and your obligations

| Marketplace guarantees | Your obligations |
| --- | --- |
| Token is 24 random bytes, single-use, 10-min TTL | Claim server-side only; never log or persist the token |
| Payload encrypted with the token; only a hash stored | Encrypt the credentials at rest |
| Row destroyed atomically on claim | Verify credentials before trusting them |
| Redirect target comes from your **approved** manifest, never from request input | Serve `redirect_url` over HTTPS with a valid certificate |

Rotating your `redirect_url` requires re-submitting your manifest for approval — that review is what keeps tokens flowing only to URLs Valoon has vetted.

## Connection methods other than handoff

- `api_key` — the marketplace only walks the user through their Valoon API key and shows your instructions (used by apps such as MCP clients where the key stays with the user). No token, no claim.
- `none` — plain download/instructions, nothing to connect.

See [manifest.md](manifest.md) for how to declare each.
