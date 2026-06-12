# Submitting to the marketplace

The marketplace is a **registrar**: listings only enter the catalog through an approved manifest. Partners cannot publish directly — you *request* a listing, Valoon reviews, and approval is what publishes it.

## The flow

```
You                              Valoon
 │ partner form + manifest JSON   │
 │ ─────────────────────────────▶ │  submission stored as "pending"
 │                                │  review: schema, copy, security,
 │                                │  redirect_url ownership, live test
 │ ◀───────────────────────────── │  questions / change requests (email)
 │ updated manifest (if needed)   │
 │ ─────────────────────────────▶ │
 │                                │  approve → listing published
 │ ◀───────────────────────────── │  (or reject, with reasons)
```

1. **Prepare** your manifest ([manifest.md](manifest.md)) and validate it against the schema.
2. **Submit** it on the marketplace partner page (`/partners`): fill in your name, contact email and paste the manifest JSON. The marketplace validates the structure on the spot and stores the submission as **pending** — this is the only thing a partner can do; nothing becomes public yet.
3. **Review.** Valoon checks the manifest content, that the `redirect_url` is yours and serves HTTPS, and runs a live handoff against your endpoint. Expect questions at the `contact.email` you provided.
4. **Approval** registers the manifest in the catalog: your listing goes live at `/listing/<slug>` with the connect flow active. Rejections come with reasons; fix and resubmit.

## Updating a published listing

Same channel: submit the updated manifest (same `slug`) through the partner form. Approval overwrites the previous version. Changes to `redirect_url` are scrutinized — that URL is where users' credentials are handed off, so re-verification of ownership is part of the review.

## Review checklist

What we look at before approving — save a round-trip by checking it yourself:

- Manifest validates against the schema; all four locales filled (en required, de/es/fr expected for production listings).
- `works_with` honestly lists every entity you touch.
- `redirect_url` is HTTPS, owned by you, and claims tokens **server-side** (we test that the token is consumed exactly once).
- Your landing page lets the user create an account / log in, so they can come back and manage the connection.
- Credentials are verified against the Valoon gateway before being stored, and stored encrypted.
- `config_fields` are minimal — setup that can happen in your own UI after the handoff shouldn't be collected by the marketplace.
- `contact.email` is monitored.

## While you wait

`availability: "coming_soon"` is a valid first submission: your listing appears in the catalog as "coming soon" without an active flow — useful to announce while you finish the backend. Submit again with `"available"` (and a working `redirect_url`) when you're ready.
