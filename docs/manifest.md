# The listing manifest

Everything the Valoon Marketplace knows about your app or integration lives in **one JSON file**. You write it, submit it, Valoon reviews it, and on approval it becomes your catalog entry — the detail page, the card, the connect flow, all of it is rendered from this document. Updating your listing means submitting an updated manifest.

The machine-readable contract is [`schema/integration.schema.json`](../schema/integration.schema.json) (JSON Schema 2020-12). Point your editor at it for instant validation:

```json
{ "$schema": "https://raw.githubusercontent.com/valoon-mexico/integration-template/main/schema/integration.schema.json" }
```

## Complete example

```json
{
  "$schema": "https://raw.githubusercontent.com/valoon-mexico/integration-template/main/schema/integration.schema.json",
  "manifest_version": 1,
  "slug": "acme-folder-sync",
  "type": "integration",
  "category": "sync",
  "availability": "available",
  "made_by": "partner",
  "icon": "https://acme.example.com/icon.svg",
  "works_with": ["projects", "media", "files"],
  "external_service": "Acme Cloud",
  "stack": "Node.js · Express · PostgreSQL",
  "links": {
    "repo": "https://github.com/acme/folder-sync",
    "docs": "https://docs.acme.example.com/valoon"
  },
  "i18n": {
    "en": {
      "name": "Acme Folder Sync",
      "tagline": "Mirror Valoon media into Acme Cloud folders, automatically.",
      "description": "Connects your Valoon account to Acme Cloud and mirrors every photo and document from your construction sites into the folder structure your office already uses. Runs continuously, no manual exports.",
      "highlights": [
        "Per-project folder mapping",
        "Syncs photos, documents and reports within minutes"
      ],
      "prerequisites": [
        "An Acme Cloud account",
        "A Valoon API key (Client ID + Secret)"
      ]
    },
    "de": { "name": "…", "tagline": "…", "description": "…" },
    "es": { "name": "…", "tagline": "…", "description": "…" },
    "fr": { "name": "…", "tagline": "…", "description": "…" }
  },
  "connection": {
    "method": "handoff",
    "redirect_url": "https://valoon.acme.example.com/valoon/connect",
    "config_fields": [
      {
        "key": "root_folder",
        "type": "text",
        "required": true,
        "i18n": {
          "en": { "label": "Acme Cloud root folder", "placeholder": "/Construction", "help": "Folder under which project folders are created." },
          "de": { "label": "Acme-Cloud-Stammordner", "placeholder": "/Bauprojekte" },
          "es": { "label": "Carpeta raíz en Acme Cloud", "placeholder": "/Obras" },
          "fr": { "label": "Dossier racine Acme Cloud", "placeholder": "/Chantiers" }
        }
      }
    ]
  },
  "contact": { "name": "Acme GmbH", "email": "dev@acme.example.com" },
  "sort_order": 400
}
```

## Field reference

### Identity

| Field | Required | Notes |
| --- | --- | --- |
| `manifest_version` | ✓ | Always `1` for now. |
| `slug` | ✓ | Kebab-case, 3–48 chars, unique across the marketplace. It is your URL (`/listing/<slug>`) and your upsert key — re-submitting the same slug updates the listing. |
| `type` | ✓ | `app` (runs on the user's machine — installers, MCP servers) or `integration` (runs as your service, connects to the user's Valoon account). |
| `category` | | Catalog filter slug: `communication`, `sync`, `time-tracking`, `ai`, `export`, `automation`, … New categories are fine; keep them kebab-case. |
| `availability` | | `available` or `coming_soon`. Coming-soon entries appear in the catalog without an active connect flow — useful to announce before you ship. |
| `made_by` | | `partner` (default). Partner submissions are registered as `partner` regardless of this value. |
| `certified` | | Valoon sets this during review; leave it out. |
| `sort_order` | | Ordering hint, lower = earlier. Valoon may adjust. |

### Presentation

| Field | Required | Notes |
| --- | --- | --- |
| `icon` | | HTTPS URL, square SVG/PNG ≥128px. Without it the marketplace shows an initials placeholder. |
| `works_with` | | Valoon entities you read/write: `projects`, `tickets`, `reports`, `users`, `time-entries`, `media`, `files`, `labels`. Shown as chips and in the connect flow's "data it works with". Be honest — it's the user's consent surface. |
| `platforms` | | Apps only: `Windows`, `macOS`, `Linux`, `Web`, … |
| `external_service` | | Integrations only: the service you bridge (`WhatsApp`, `Google Drive`, `SAP`, …). |
| `stack` | | One human-readable line, ` · ` separated. |
| `links` | | `repo`, `docs`, `download`, `releases`, `mcp`. All optional, rendered only when present. `mcp` makes the install flow render MCP client config snippets. |

### Copy (`i18n`)

Per-locale catalog text. **`en` is required**; `de`, `es`, `fr` are strongly recommended — the marketplace serves the DACH market first and falls back `requested locale → en → de`.

Each locale block: `name` (2–60), `tagline` (8–120, the card sentence), `description` (40–1200, plain text), optional `highlights` (≤6 bullets) and `prerequisites` (≤6 bullets).

### Connection

`connection.method` decides the whole flow:

- **`handoff`** — the full protocol ([protocol.md](protocol.md)). Requires `redirect_url` (HTTPS endpoint of your backend). Optional `config_fields` (≤12) are collected by the marketplace and delivered in the handoff payload.
- **`api_key`** — the marketplace walks the user through creating a Valoon API key and shows your instructions; the key never leaves the user. For apps (MCP clients, desktop tools that ask for the key themselves).
- **`none`** — nothing to connect; the flow shows download/instructions only.

Each `config_field`:

| Field | Required | Notes |
| --- | --- | --- |
| `key` | ✓ | snake_case; becomes the key in the payload's `config` object. |
| `type` | ✓ | `text`, `textarea`, `select`, `password` (masked, never logged). |
| `required` | | Marketplace blocks submit until filled. |
| `options` | select | The selectable values, sent verbatim. |
| `i18n` | ✓ | `label` (required in `en`), optional `placeholder` and `help`, per locale. |

Keep `config_fields` minimal — only what you need before first contact. Everything else belongs in **your** UI after the handoff, where the user already has an account with you.

### Contact

`contact.email` (plus optional `name`) is how Valoon reaches you about review, incidents or policy. Never shown publicly. Required for partner submissions.

## Validating locally

Any JSON Schema 2020-12 validator works, e.g.:

```bash
npx ajv-cli@5 validate --spec=draft2020 -s schema/integration.schema.json -d integration.json
```

The marketplace runs the same structural checks (plus content review) when you submit.
