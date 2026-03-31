# vCon Usage Guide

> Companion to [vcon-ecosystem-speckit.md](vcon-ecosystem-speckit.md). Where the speckit defines **what** the vCon data model is, this guide defines **how to use it** — for specific domains, feature-by-feature, and per adapter/link.

---

## Table of Contents

1. [Domain Profiles](#1-domain-profiles)
   - [Contact Center / Customer Service](#11-contact-center--customer-service)
   - [Healthcare / Medical Consultation](#12-healthcare--medical-consultation)
   - [Sales Outreach](#13-sales-outreach)
   - [Support / Help Desk](#14-support--help-desk)
   - [Legal / Lawful Interception](#15-legal--lawful-interception)
2. [Feature Usage Guidelines](#2-feature-usage-guidelines)
   - [Choosing a Dialog Type](#21-choosing-a-dialog-type)
   - [Analysis: When and How](#22-analysis-when-and-how)
   - [Attachments vs. Analysis](#23-attachments-vs-analysis)
   - [Party Identity and Roles](#24-party-identity-and-roles)
   - [Encoding Rules](#25-encoding-rules)
   - [Extensions and Critical Extensions](#26-extensions-and-critical-extensions)
3. [App-Specific Output Schemas](#3-app-specific-output-schemas)
   - [Adapters (Ingress)](#adapters-ingress)
   - [Processing Links](#processing-links)

---

## 1. Domain Profiles

Each profile defines the minimum required fields, recommended additions, and applicable extensions for a given use case. All profiles must conform to the canonical data model in [vcon-ecosystem-speckit.md Section 2](vcon-ecosystem-speckit.md#2-vcon-data-model-canonical-reference).

---

### 1.1 Contact Center / Customer Service

**Use case**: Inbound/outbound calls between a customer and one or more agents. May include call transfers, holds, and IVR interactions.

#### Required

| Element | Field | Value / Notes |
|---------|-------|---------------|
| `parties` | `tel` or `sip` | At minimum the customer; agent SIP URI preferred |
| `parties` | `role` | `"agent"` / `"customer"` (extension field) |
| `dialog` | `type` | `"recording"` for voice; `"text"` for chat/email |
| `dialog` | `start` | ISO 8601 with timezone |
| `dialog` | `parties` | Array of party indices |

#### Recommended

| Element | Field | Notes |
|---------|-------|-------|
| `parties` | `name` | Display name; include `validation` if provided |
| `parties` | `uuid` | For cross-vCon agent/customer tracking |
| `analysis` | `type: "transcript"` | Before adding summary or sentiment |
| `analysis` | `type: "summary"` | High-level call summary |
| `attachments` | `purpose: "tags"` | Include `department`, `queue`, `outcome` |
| Lawful basis | `draft-howe-vcon-lawful-basis` | Required if recording without exemption |

#### Transfer handling

Use `type: "transfer"` dialogs to link call segments. Transfer dialogs MUST NOT have `parties`, `body`, or media content — only linkage fields (`transferee`, `transferor`, `transfer_target`, `original`, `target_dialog`).

#### Example

```json
{
  "vcon": "0.4.0",
  "uuid": "...",
  "created_at": "2025-06-01T14:00:00Z",
  "parties": [
    { "tel": "+15551234567", "name": "Jane Smith", "validation": "verified", "role": "customer" },
    { "sip": "sip:agent1@contact-center.example", "name": "Bob Lee", "role": "agent" }
  ],
  "dialog": [
    {
      "type": "recording",
      "start": "2025-06-01T14:00:05Z",
      "duration": 185,
      "parties": [0, 1],
      "originator": 0,
      "mediatype": "audio/wav",
      "url": "https://storage.example/recordings/abc123.wav",
      "content_hash": "sha512-..."
    }
  ],
  "analysis": [
    { "type": "transcript", "dialog": 0, "vendor": "Deepgram", "product": "nova-2", "body": "...", "encoding": "none" },
    { "type": "summary",    "dialog": 0, "vendor": "Anthropic", "product": "claude-sonnet-4-20250514", "body": "...", "encoding": "none" }
  ],
  "attachments": [
    {
      "purpose": "tags",
      "start": "2025-06-01T14:00:00Z",
      "party": 0, "dialog": 0,
      "body": "{\"department\": \"billing\", \"queue\": \"inbound\", \"outcome\": \"resolved\"}",
      "encoding": "json"
    }
  ]
}
```

---

### 1.2 Healthcare / Medical Consultation

**Use case**: Clinical encounters — telehealth visits, patient calls, or administrative interactions subject to healthcare privacy regulations (HIPAA, GDPR health data).

#### Required

| Element | Field | Value / Notes |
|---------|-------|---------------|
| `parties` | `role` | `"clinician"` / `"patient"` / `"administrator"` |
| `parties` | `validation` | Required when `name` is present |
| Lawful basis | `draft-howe-vcon-lawful-basis` | **Mandatory** — must specify `consent` or `legal_obligation` |
| `extensions` | `"lawful_basis"` | List extension; add to `critical` if compliance is incompatible |

#### Required before any AI analysis

A redaction link MUST run before any AI analysis link to strip PII from the vCon that is sent to external LLM providers. The original unredacted vCon is preserved internally; the redacted form references it via the `redacted` field.

#### Recommended

| Element | Notes |
|---------|-------|
| `parties.uuid` | For longitudinal patient tracking across vCons |
| `parties.did` | When using decentralized identity for patient records |
| `attachments` with `purpose: "tags"` | Include `encounter_type`, `specialty`, `facility` |
| `analysis.type: "summary"` | Clinical note summary — only on redacted copy |
| Digital signature | Sign vCon with patient/provider keys via vcon-lib |

#### Example (redacted form)

```json
{
  "vcon": "0.4.0",
  "uuid": "...",
  "created_at": "2025-06-01T09:00:00Z",
  "extensions": ["lawful_basis"],
  "critical": ["lawful_basis"],
  "redacted": {
    "uuid": "original-uuid-here",
    "type": "de-identified"
  },
  "parties": [
    { "name": "Person 1", "role": "clinician" },
    { "name": "Person 2", "role": "patient" }
  ],
  "dialog": [
    {
      "type": "recording",
      "start": "2025-06-01T09:05:00Z",
      "duration": 1200,
      "parties": [0, 1],
      "mediatype": "audio/wav",
      "url": "https://secure-storage.example/enc-recording.wav",
      "content_hash": "sha512-..."
    }
  ],
  "analysis": [
    {
      "type": "summary",
      "dialog": 0,
      "vendor": "Anthropic",
      "product": "claude-sonnet-4-20250514",
      "schema": "clinical-summary-v1",
      "body": "Patient discussed ...",
      "encoding": "none"
    }
  ],
  "attachments": [
    {
      "purpose": "lawful_basis",
      "start": "2025-06-01T09:00:00Z",
      "party": 1, "dialog": 0,
      "body": "{\"lawful_basis\": \"consent\", \"proof\": {\"type\": \"electronic\", \"timestamp\": \"2025-06-01T08:55:00Z\"}}",
      "encoding": "json"
    }
  ]
}
```

---

### 1.3 Sales Outreach

**Use case**: Outbound sales calls or email/chat sequences where conversations are linked to CRM records. May include multiple touches across channels.

#### Required

| Element | Field | Notes |
|---------|-------|-------|
| `parties` | `tel` or `mailto` | Customer contact method |
| `dialog` | `type` | `"recording"` for calls; `"text"` for email/chat |

#### Recommended

| Element | Notes |
|---------|-------|
| `parties.uuid` | CRM contact ID for cross-vCon tracking |
| `parties.role` | `"prospect"` / `"rep"` |
| `analysis.type: "transcript"` | Before summary/sentiment |
| `analysis.type: "sentiment"` | Overall call tone |
| `analysis.type: "summary"` | Call outcome |
| Tags: `crm_id`, `campaign`, `outcome`, `stage` | Track sales pipeline state |

#### Multi-touch linking

`group` is reserved for future extension in the authoritative spec and MUST NOT be used. To link related vCons (e.g., initial call + follow-up email + demo call), use a shared tag value (e.g., `campaign_id` or `opportunity_id`) so they can be retrieved together by query.

#### Example (excerpt)

```json
{
  "parties": [
    { "tel": "+15559876543", "name": "Alex Chen", "uuid": "crm-contact-789", "role": "prospect", "validation": "crm" },
    { "tel": "+15551112222", "name": "Dana Park",  "uuid": "crm-rep-42",      "role": "rep" }
  ],
  "analysis": [
    { "type": "transcript", "dialog": 0, "vendor": "Deepgram",  "product": "nova-2",                  "body": "...", "encoding": "none" },
    { "type": "sentiment",  "dialog": 0, "vendor": "Anthropic", "product": "claude-haiku-4-5-20251001", "body": "{\"overall\": \"positive\", \"score\": 0.82}", "encoding": "json" },
    { "type": "summary",    "dialog": 0, "vendor": "Anthropic", "product": "claude-sonnet-4-20250514",  "body": "Prospect interested in enterprise plan. Follow up with pricing.", "encoding": "none" }
  ],
  "attachments": [
    {
      "purpose": "tags",
      "start": "2025-06-01T16:00:00Z",
      "party": 0, "dialog": 0,
      "body": "{\"campaign\": \"q2-outbound\", \"stage\": \"discovery\", \"outcome\": \"follow-up\", \"crm_id\": \"opp-1234\"}",
      "encoding": "json"
    }
  ]
}
```

---

### 1.4 Support / Help Desk

**Use case**: Customer support interactions via chat, email, or phone. Often multi-turn text exchanges. May escalate to voice or be transferred between agents.

#### Required

| Element | Field | Notes |
|---------|-------|-------|
| `parties` | `tel`, `mailto`, or `sip` | Customer contact; support agent |
| `dialog` | `type: "text"` | For chat and email; `"recording"` for escalated voice |
| `dialog` | `party_history` | Track joins/drops in multi-agent handoffs |

#### Recommended

| Element | Notes |
|---------|-------|
| Tags: `ticket_id`, `channel`, `priority`, `resolution` | Link to ticketing system |
| `dialog.message_id` | For email threads and chat message IDs |
| `dialog.application` | E.g., `"zendesk"`, `"intercom"`, `"email"` |
| `type: "transfer"` dialog | For agent-to-agent escalations |
| `analysis.type: "summary"` | Resolution summary for ticket closure |

#### Multi-turn text dialog

Each message exchange can be a separate text dialog entry, or the full transcript stored as a single dialog body. Use `party_history` with `join`/`drop` events to model agent handoffs.

#### Example (excerpt)

```json
{
  "parties": [
    { "mailto": "customer@example.com", "name": "Sam Rivera", "role": "customer" },
    { "sip": "sip:support1@helpdesk.example", "name": "Tier 1 Agent", "role": "agent" },
    { "sip": "sip:support2@helpdesk.example", "name": "Tier 2 Agent", "role": "agent" }
  ],
  "dialog": [
    {
      "type": "text",
      "start": "2025-06-01T10:00:00Z",
      "parties": [0, 1],
      "originator": 0,
      "mediatype": "text/plain",
      "application": "zendesk",
      "message_id": "ticket-98765",
      "body": "Hi, my invoice is incorrect.",
      "encoding": "none"
    },
    {
      "type": "transfer",
      "start": "2025-06-01T10:15:00Z",
      "transferee": 0,
      "transferor": 1,
      "transfer_target": 2,
      "original": 0,
      "target_dialog": 2
    }
  ],
  "attachments": [
    {
      "purpose": "tags",
      "start": "2025-06-01T10:00:00Z",
      "party": 0, "dialog": 0,
      "body": "{\"ticket_id\": \"98765\", \"channel\": \"chat\", \"priority\": \"high\", \"resolution\": \"escalated\"}",
      "encoding": "json"
    }
  ]
}
```

---

### 1.5 Legal / Lawful Interception

**Use case**: Court-ordered interception, regulated financial services recording, or law enforcement. Chain of custody is paramount.

#### Required

| Element | Notes |
|---------|-------|
| Digital signature | vCon MUST be signed (JWS, via vcon-lib) to establish authenticity |
| Lawful basis extension | `"legal_obligation"` basis with proof mechanism |
| `extensions: ["lawful_basis"]` | List in extensions |
| `critical: ["lawful_basis"]` | Mark critical — implementations not supporting it MUST NOT process |
| `content_hash` on all media | Every dialog with external media must have sha512-base64url hash |
| SCITT lifecycle | Reference `draft-howe-vcon-lifecycle` for chain-of-custody registration |

#### Recommended

| Element | Notes |
|---------|-------|
| `amended` | Reference prior vCon when adding analysis to an intercepted recording |
| `parties.stir` | PASSporT JWS Compact for identity verification |
| Immutable storage | Store in append-only backend; never overwrite |
| Audit tags | `authority`, `case_reference`, `intercept_date` in attachments |

#### Notes on processing

Processing links MUST NOT modify the original signed vCon. Instead, create an `amended` vCon that extends the original. The signed original must be retained with its hash intact.

---

## 2. Feature Usage Guidelines

Prescriptive rules for each vCon element. These complement the "what is it" descriptions in the speckit's data model and answer "when and how should I use this?"

---

### 2.1 Choosing a Dialog Type

| Type | Use when | Do NOT use when |
|------|----------|-----------------|
| `recording` | There is actual audio or video media (captured or referenced via URL) | Storing extracted transcripts (use analysis) |
| `text` | Conversation is text-native: chat, email, SMS, or an extracted transcript stored inline | There is audio/video — use `recording` instead |
| `transfer` | Linking two call-leg dialogs when a call was transferred | Representing actual content; transfer dialogs have NO body, parties, or media |
| `incomplete` | A call was attempted but never connected | Any call that connected, even briefly |

**`incomplete` disposition values**: `no-answer`, `congestion`, `failed`, `busy`, `hung-up`, `voicemail-no-message`

**Transfer linkage pattern**:
```json
{
  "type": "transfer",
  "start": "2025-06-01T14:03:00Z",
  "transferee": 0,
  "transferor": 1,
  "transfer_target": 2,
  "original": 0,
  "target_dialog": 2
}
```
Transfer dialogs MUST NOT include: `parties`, `originator`, `mediatype`, `filename`, `body`, `encoding`, `url`, or `content_hash`.

---

### 2.2 Analysis: When and How

#### Ordering convention

Always add analysis in dependency order. If a later analysis type depends on an earlier one, append in this sequence:

```
transcript → summary → sentiment → tts → translation
```

Never add `summary` or `sentiment` before `transcript` exists, unless the dialog is text-native (in which case transcript may be omitted).

#### Required fields (every analysis entry)

```json
{
  "type":    "summary",          // REQUIRED
  "vendor":  "Anthropic",        // REQUIRED — never omit
  "product": "claude-sonnet-4-20250514",   // strongly recommended
  "body":    "...",              // REQUIRED — always a string, even for JSON content
  "encoding": "none"             // REQUIRED — "none", "json", or "base64url"
}
```

- `schema` (not `schema_version`) — use when the body has a documented machine-readable format
- `dialog` — index of the source dialog; omit only if the analysis applies to the whole vCon

#### When to link analysis to a dialog

| Situation | `dialog` value |
|-----------|---------------|
| Analysis derived from one dialog | Integer index of that dialog |
| Analysis derived from multiple dialogs | Array of integer indices |
| Analysis of the whole vCon (e.g., overall sentiment) | Omit `dialog` |

#### Don't duplicate vendor analysis

Before appending analysis, check if an entry with the same `type` + `vendor` + `product` already exists. Idempotent links should skip re-processing.

---

### 2.3 Attachments vs. Analysis

This is the most commonly confused distinction:

| Use `analysis` for... | Use `attachments` for... |
|----------------------|--------------------------|
| AI-derived insights (transcript, summary, sentiment) | Metadata and tags (`purpose: "tags"`) |
| Machine-generated content derived from dialog | Legal documents (lawful basis, consent forms) |
| Outputs that have a `vendor` (who produced it) | Supporting files (PDFs, images, fax pages) |
| Searchable, structured results | Tenant/routing metadata |
| WTF transcription results via analysis type | WTF transcription format via attachment (both patterns valid) |

**Key rule**: If it was *produced by a model or algorithm* → `analysis`. If it is *associated metadata or a document* → `attachments`.

#### Attachment `purpose` field

Always use `purpose` (not `type`) for the attachment's semantic role. Legacy code may use `type`; treat as equivalent for read compatibility but write `purpose` for new code.

Common purpose values:

| Purpose | Meaning |
|---------|---------|
| `"tags"` | Key-value metadata for routing, filtering, CRM linkage |
| `"lawful_basis"` | GDPR lawful basis record |
| `"wtf_transcription"` | World Transcription Format transcript |
| `"document"` | Supporting document (PDF, image) |
| `"tenant"` | Multi-tenancy routing metadata |

---

### 2.4 Party Identity and Roles

#### Identity field priority

Choose the most specific identifier available:

```
did > stir > sip > tel > mailto
```

Use `uuid` (in addition to an identity field) whenever you need to track the same person across multiple vCons (e.g., repeat callers, CRM contacts, healthcare patients).

#### Validation

Always include `validation` when `name` is provided. Values vary by context:

| `validation` value | Meaning |
|-------------------|---------|
| `"verified"` | Identity confirmed by authentication system |
| `"crm"` | Name sourced from CRM record |
| `"self"` | Name provided by the party themselves (unverified) |
| `"anonymous"` | Name is unknown; use `"anonymous"` as the `name` value |

#### Role field

`role` is an extension field (not in core spec). Always list `"role"` in `extensions` if used:

```json
{
  "extensions": ["role"],
  "parties": [
    { "tel": "+15551234567", "role": "customer" }
  ]
}
```

Common role values: `"agent"`, `"customer"`, `"clinician"`, `"patient"`, `"rep"`, `"prospect"`, `"supervisor"`, `"system"`

---

### 2.5 Encoding Rules

| Content type | `encoding` value | Notes |
|-------------|-----------------|-------|
| Audio / video | `"base64url"` | Inline only for short clips; prefer external URL for production |
| Binary files (images, PDFs) | `"base64url"` | Embed only when external storage is not available |
| JSON data | `"json"` | Body is a JSON string; consumers parse it |
| Plain text | `"none"` | Body is UTF-8 text directly |
| External reference | N/A | Use `url` + `content_hash`; omit `body` and `encoding` |

#### Inline vs. external media

| Scenario | Recommendation |
|----------|---------------|
| Audio > 1 MB | External URL with `content_hash` |
| Audio ≤ 1 MB, archival | Inline `base64url` acceptable |
| Production pipeline | Always external URL — keeps vCon JSON small |
| Test fixtures | Inline acceptable |

External refs require HTTPS and `content_hash` in `sha512-<base64url-of-digest>` format.

---

### 2.6 Extensions and Critical Extensions

#### When to declare an extension

Any field not in the core spec MUST be listed in `extensions`. If you add `role` to parties, `jcard`, `timezone`, or any custom field, list its extension name:

```json
{
  "extensions": ["lawful_basis", "role", "wtf"],
  "parties": [{ "tel": "...", "role": "agent" }]
}
```

#### When to use `critical`

Add an extension to `critical` when implementations that do not support it MUST NOT process or act on the vCon. Examples:

- `"lawful_basis"` in regulated industries — a system that ignores consent must not process
- A proprietary encryption extension — a system that can't decrypt must not forward

```json
{
  "extensions": ["lawful_basis"],
  "critical":   ["lawful_basis"]
}
```

Do NOT put performance-optimization or cosmetic extensions in `critical`.

---

## 3. App-Specific Output Schemas

These schemas define what vCons look like **as produced** by each adapter or processing link in the ecosystem. Use them to:
- Validate adapter output before passing to a pipeline
- Know what fields downstream links can expect
- Write tests that match real-world structure

> **Note on field names**: Some adapters use legacy field names (`mimetype` instead of `mediatype`, `type` instead of `purpose` for attachments). Where noted, the spec-compliant form is preferred for new development.

---

### Adapters (Ingress)

#### `vcon-siprec-adapter`

Converts SIPREC (RFC 7866) sessions to vCon format.

**Parties**

| Field | Value |
|-------|-------|
| `name` | Participant name |
| `tel` | Phone number (E.164) |
| `mailto` | Email (optional) |
| `role` | `"caller"` or `"callee"` |
| `uuid` | Participant ID |
| `meta` | `{"domain": "...", "sip_uri": "..."}` |

**Dialog** (one per audio stream, plus one metadata dialog)

| Field | Value |
|-------|-------|
| `type` | `"recording"` (audio) or `"text"` (session metadata) |
| `start` | ISO 8601 session start |
| `parties` | `[0, 1]` |
| `mediatype` | `"audio/wav"` or similar |
| `body` | Base64-encoded audio or JSON string |
| `encoding` | `"base64url"` or `"none"` |
| `filename` | Original audio filename |

**Tags** (in attachments with `purpose: "tags"`)

```json
{
  "source": "siprec",
  "call_id": "<sip-call-id>",
  "recording_session_id": "...",
  "session_id": "...",
  "conversion_timestamp": "2025-06-01T14:00:00Z"
}
```

**Spec notes**: SIPREC adapter sets `session_id` via tags rather than `dialog.session_id`. Downstream links should check both locations.

---

#### `vcon-audio-adapter`

Converts audio files to vCon, extracting phone numbers from filenames.

**Parties**

| Field | Value |
|-------|-------|
| `tel` | Sender and receiver phone numbers |

Minimal party representation — no `name`, `role`, or `validation`.

**Dialog**

| Field | Value |
|-------|-------|
| `type` | `"recording"` (default) |
| `start` | File modification time (ISO 8601) |
| `parties` | `[0, 1]` |
| `originator` | `0` (sender) |
| `mediatype` | `"audio/wav"` or `"audio/mpeg"` etc. |
| `filename` | Original audio filename |
| `url` | `file:///path/to/audio.wav` (local file reference) |
| `duration` | Seconds (float) |

**Tags**

```json
{
  "source": "audio_adapter",
  "original_filename": "call-20250601.wav",
  "file_size": 4820480,
  "originating": "+15551234567",
  "destination": "+15559876543",
  "duration_seconds": "185.4",
  "trunk": "gateway-01"
}
```

**Spec notes**: Uses `file://` URLs (not HTTPS); does not include `content_hash`. For production pipelines that require spec-compliant external refs, add a link that uploads to HTTPS storage and sets `content_hash`.

---

#### `vcon-fadapter`

Converts fax image files (TIFF, JPEG, PNG) to vCon format.

**Parties**

| Field | Value |
|-------|-------|
| `tel` | Sender and receiver fax numbers |

**Dialog**: None. Fax content is stored in attachments, not dialog.

**Attachments**

| Field | Value |
|-------|-------|
| `type` | `"fax_image"` (legacy — use `purpose` for new code) |
| `body` | Base64-encoded image data |
| `encoding` | `"base64url"` |
| `filename` | Original image filename |
| `mediatype` | `"image/tiff"`, `"image/jpeg"`, or `"image/png"` |

**Tags**

```json
{
  "source": "fax_adapter",
  "original_filename": "fax-001.tiff",
  "file_size": 102400,
  "image_dimensions": "1728x2200",
  "sender": "+15551234567",
  "receiver": "+15559876543"
}
```

**Spec notes**: Uses `type` on attachments (legacy). When reading fadapter output, treat `type: "fax_image"` as `purpose: "fax_image"`. No dialog present — don't assume index 0 exists.

---

#### `laptop-vcon-adapter`

Records agent desktop screen and audio for quality assurance and compliance.

**Parties**

| Field | Value |
|-------|-------|
| `name` | Agent name |
| `mailto` | Agent email |
| `role` | `"agent"` |
| `uuid` | Agent ID |

A second system party may be added for the screen capture process.

**Dialog** (produced after session stops)

| Field | Value |
|-------|-------|
| `type` | `"recording"` |
| `start` | Session start timestamp |
| `duration` | Session duration in seconds |
| `parties` | `[0]` or `[0, 1]` |
| `mediatype` | `"video/mp4"` (screen) and/or `"audio/wav"` |
| `url` | Path to recording file |
| `application` | `"laptop_capture"` |

**Tags**

Session metadata from `SessionMetadata` is added as tags:

```json
{
  "agent_id": "...",
  "customer_id": "...",
  "customer_phone": "+15551234567",
  "session_id": "..."
}
```

Plus any custom tags from `SessionMetadata.tags`.

---

#### `vcon-pdf-adapter`

Converts PDF documents to vCon, extracting text content.

**Parties**

| Field | Value |
|-------|-------|
| `name` | `"PDF Adapter"` (system) and PDF filename (document) |
| `role` | `"system"` and `"document"` |

**Dialog**

| Field | Value |
|-------|-------|
| `type` | `"text"` |
| `start` | Processing timestamp (ISO 8601) |
| `parties` | `[0, 1]` |
| `originator` | `1` (document is originator) |
| `mediatype` | `"text/plain"` |
| `body` | Extracted PDF text content |
| `encoding` | `"none"` |

**Attachments**

| Field | Value |
|-------|-------|
| `type` | `"document"` (legacy — prefer `purpose: "document"`) |
| `body` | Base64-encoded raw PDF |
| `encoding` | `"base64url"` |
| `filename` | Original PDF filename |
| `mediatype` | `"application/pdf"` |

**Tags**

```json
{
  "source": "pdf_adapter",
  "original_filename": "invoice.pdf",
  "processed_at": "2025-06-01T14:00:00Z"
}
```

---

### Processing Links

#### Claude / LLM Analysis Link (`conserver-extras`)

Appends an AI-generated analysis using Claude or compatible LLM.

**Analysis appended**

| Field | Value |
|-------|-------|
| `type` | `"summary"` (default, configurable via `analysis_type` option) |
| `dialog` | Index of source dialog |
| `vendor` | `"anthropic"` |
| `body` | Analysis result text |
| `encoding` | `"none"` |
| `schema` | Not set by default |

The link also appends an `extra.vendor_schema` object with the model name and prompt used:

```json
{
  "type": "summary",
  "dialog": 0,
  "vendor": "anthropic",
  "body": "The customer called about a billing discrepancy...",
  "encoding": "none",
  "extra": {
    "vendor_schema": {
      "model": "claude-sonnet-4-20250514",
      "prompt": "Summarize this conversation."
    }
  }
}
```

**Input requirement**: Expects a prior `transcript` analysis with text accessible at the configured `source.text_location` JSON path (default: `body.paragraphs.transcript`).

**Idempotency**: Skips processing if an analysis with the same `type` already exists.

---

#### Redaction Link (`conserver-extras`)

Produces a de-identified vCon from an original, preserving the original for audit.

**Output vCon changes**

| Element | Change |
|---------|--------|
| `redacted` | Set to `{"uuid": "<original-uuid>", "type": "de-identified"}` |
| `parties.name` | Replaced with `"Person 1"`, `"Person 2"`, etc. (when `anonymize_parties: true`) |
| `dialog` (recording type) | Removed (when `remove_recordings: true`) |
| `dialog` (text type) | Bodies replaced with `"[REDACTED]"` (when `redact_personal_info: true`) |
| `analysis` bodies | Replaced with `"[REDACTED]"` (when `redact_personal_info: true`) |
| `attachments` bodies | Replaced with `"[REDACTED]"` (when `redact_personal_info: true`) |

**Default options**

```yaml
options:
  remove_recordings: true
  anonymize_parties: true
  redact_personal_info: true
```

**Important**: The redaction link creates a **new** vCon with a new UUID. The original is preserved in storage. The `redacted.uuid` field on the new vCon points back to the original.

---

#### Transcription Links (Deepgram, Whisper, NeMo)

Appends a `transcript` analysis to the vCon.

**Analysis appended**

| Field | Value |
|-------|-------|
| `type` | `"transcript"` |
| `dialog` | Index of the recording dialog |
| `vendor` | `"Deepgram"`, `"openai"` (Whisper), `"nvidia"` (NeMo), etc. |
| `product` | Model name (e.g., `"nova-2"`, `"large-v3"`) |
| `body` | Plain text transcript or JSON (provider-specific) |
| `encoding` | `"none"` or `"json"` |

When using WTF (World Transcription Format), the normalized transcript is also stored as an attachment:

```json
{
  "purpose": "wtf_transcription",
  "start": "2025-06-01T14:00:00Z",
  "party": 0, "dialog": 0,
  "body": "{\"segments\": [{\"start\": 0.0, \"end\": 2.5, \"text\": \"Hello\", \"speaker\": \"Speaker_0\", \"confidence\": 0.95}], ...}",
  "encoding": "json"
}
```

---

#### Tag Link

Appends structured metadata as a `tags` attachment.

**Attachment appended**

```json
{
  "purpose": "tags",
  "start": "<processing-timestamp>",
  "party": 0,
  "dialog": 0,
  "body": "{\"key\": \"value\", ...}",
  "encoding": "json"
}
```

For vCon-level tags (not tied to a specific party/dialog), use index `0` for both `party` and `dialog`. This is the spec-compliant approach per draft-02, which requires both fields even when the attachment applies to the whole vCon.
