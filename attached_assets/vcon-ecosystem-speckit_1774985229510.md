# vCon Ecosystem — Spec Kit for Code Generation & Maintenance

> Use this document as context when generating, reviewing, or maintaining code across the vCon ecosystem. It captures architecture, conventions, data models, integration points, and standards compliance requirements.

---

## 1. Ecosystem Overview

The vCon ecosystem implements the IETF vCon (Virtual Conversation) standard across a set of interconnected repositories. Together, they provide end-to-end conversation capture, processing, analysis, storage, and privacy-compliant access.

### Repository Map

| Repository | Language | Purpose | Role |
|---|---|---|---|
| **vcon-lib** | Python 3.12+ | Core vCon data model library | Canonical vCon object implementation |
| **vcon-server** | Python 3.12+ | Conversation processing pipeline | Event-driven processing engine with pluggable links and storage backends |
| **vcon-mcp** | TypeScript 5.9+ | MCP server for AI agent access | Model Context Protocol interface to vCon data |
| **conserver-extras** | Python | Additional processing links | Claude analysis, Llama analysis, redaction, translation |
| **vcon-fadapter** | Python 3.10+ | Fax/image file adapter | File system/S3 watcher that creates vCons from images |
| **vcon-siprec-adapter** | Python | SIP recording adapter | Converts SIPREC (RFC 7866) sessions to vCons |
| **laptop-vcon-adapter** | Python | Screen/audio capture adapter | Records agent desktop + audio into vCons |
| **vcon-mac-wtf** | Python/FastAPI | macOS transcription server | MLX Whisper on Apple Silicon, outputs WTF format |
| **vfun** | Python/PyTorch | GPU transcription pipeline | NeMo-based batch transcription with speaker diarization |
| **portal** | SvelteKit/Node | Analytics web portal | Conversation analytics, user management, AI chat |
| **vcon-right-to-know** | Python/Streamlit | Privacy rights portal | GDPR Right to Access / Right to Erasure demo |
| **conserver-pipeline-config** | Docker/YAML | Production pipeline config | 64-worker orchestration with GPU transcription |

### IETF Standards Documents

| Document | Status | Scope |
|---|---|---|
| **draft-ietf-vcon-vcon-core** | Working Group Draft | Core vCon specification ([authoritative repo](https://github.com/ietf-wg-vcon/draft-ietf-vcon-vcon-core)) |
| **draft-howe-vcon-lawful-basis** | Individual Draft | GDPR lawful basis extension |
| **draft-howe-vcon-lifecycle** | Individual Draft | Lifecycle management via SCITT |
| **privacy-primer-vcon** | Individual Draft | Privacy guidance for developers |

---

## 2. vCon Data Model (Canonical Reference)

All repositories MUST conform to this data model. When in doubt, defer to the IETF spec (`draft-ietf-vcon-vcon-core`).

### Core Structure

```json
{
  "vcon": "0.4.0",
  "uuid": "string (UUID)",
  "created_at": "ISO 8601 datetime (REQUIRED)",
  "updated_at": "ISO 8601 datetime (optional)",
  "subject": "string (optional)",
  "extensions": ["string (extension names)"],
  "critical": ["string (incompatible extension names)"],
  "redacted": { "uuid": "string", "type": "string", "url": "string", "content_hash": "string (sha512-base64url)" },
  "amended": { "uuid": "string", "url": "string", "content_hash": "string" },
  "parties": [],
  "dialog": [],
  "analysis": [],
  "attachments": []
}
```

**Notes (draft-02)**:
- `vcon` is DEPRECATED as of RFC publication; extension mechanism replaces schema versioning. For syntax in this document, use `"0.4.0"`.
- `extensions`: List of extension names used. SHOULD list all extensions for parameters not in core schema.
- `critical`: List of incompatible extension names. Implementations that do not support listed extensions MUST NOT process the vCon.
- `redacted` and `amended` are mutually exclusive with each other (and with `group`, which is reserved for future extension — do not use). `redacted` references a prior (less redacted) vCon; `amended` references a prior vCon that this version extends.

**vCon forms**: Unsigned (top-level object), signed (JWS General JSON Serialization with payload, signatures), encrypted (JWE with signed vCon as plaintext). Externally referenced files MUST use HTTPS and include `content_hash`. Inline files MUST have `body` and `encoding` (`base64url`, `json`, or `none`).

### Party Object

```json
{
  "tel": "string (E.164, tel: prefix optional)",
  "sip": "string (SIP URI)",
  "stir": "string (PASSporT JWS Compact)",
  "mailto": "string (mailto: prefix optional)",
  "name": "string (display name; 'anonymous' for unknown)",
  "did": "string (Decentralized Identifier)",
  "validation": "string (SHOULD provide if name provided)",
  "gmlpos": "string (PIDF-LO gml:pos format)",
  "civicaddress": "object (GEOPRIV: country, a1, a2, etc.)",
  "uuid": "string (cross-vCon tracking)",

  "jcard": "array (RFC 7095 vCard) — EXTENSION ONLY",
  "timezone": "string — EXTENSION ONLY",
  "role": "string — EXTENSION ONLY",
  "meta": "object — EXTENSION ONLY"
}
```

**Core party fields** (first 10 above) are defined in the authoritative spec. The last four (`jcard`, `timezone`, `role`, `meta`) are extension fields — they MUST be listed in the top-level `extensions` array when used.

**UUID (draft-02)**: SHOULD use version 8 UUID (timestamp-based with FQHN hash for uniqueness).

### Dialog Object

```json
{
  "type": "recording | text | transfer | incomplete",
  "start": "ISO 8601 datetime",
  "duration": "number (seconds)",
  "parties": "UnsignedInt | UnsignedInt[] | (UnsignedInt | UnsignedInt[])[]",
  "originator": "number (party index, optional)",
  "mediatype": "string (MIME type)",
  "filename": "string",
  "body": "string (inline or base64url)",
  "encoding": "base64url | json | none",
  "url": "string (external reference)",
  "content_hash": "ContentHash | ContentHash[] (sha512-base64url)",
  "disposition": "string (REQUIRED for incomplete)",
  "session_id": "SessionId | SessionId[] ({local: UUID, remote: UUID})",
  "application": "string",
  "message_id": "string",
  "party_history": "array of {party, event, time, button?}",
  "transferee": "number (transfer type only)",
  "transferor": "number (transfer type only)",
  "transfer_target": "number | number[] (transfer type only)",
  "original": "number | number[] (transfer type only)",
  "consultation": "number | number[] (transfer type only)",
  "target_dialog": "number | number[] (transfer type only)"
}
```

**Dialog types**: `recording`, `text`, `transfer`, `incomplete`
**Party history events**: `join`, `drop`, `hold`, `unhold`, `mute`, `unmute`, `keydown`, `keyup` (keydown/keyup require `button` parameter)
**Incomplete dispositions**: `no-answer`, `congestion`, `failed`, `busy`, `hung-up`, `voicemail-no-message`
**Transfer type**: Uses transferee, transferor, transfer_target, original, consultation, target_dialog to link dialog segments. MUST NOT have parties, originator, mediatype, filename, or Dialog Content.

### Analysis Object

```json
{
  "type": "string (report, sentiment, summary, transcript, translation, tts, etc.)",
  "dialog": "number or array (dialog indices, optional if not derived from dialog)",
  "mediatype": "string (MIME type)",
  "vendor": "string (REQUIRED - who produced this)",
  "product": "string (model name/version)",
  "schema": "string (schema identifier — NOT schema_version)",
  "body": "string (content — supports JSON, CSV, XML, plain text)",
  "encoding": "base64url | json | none",
  "url": "string (external reference)",
  "content_hash": "ContentHash | ContentHash[]"
}
```

**Analysis types (draft-02)**: `report`, `sentiment`, `summary`, `transcript`, `translation`, `tts`

### Attachment Object

```json
{
  "purpose": "string (e.g. 'tags', 'lawful_basis', 'wtf_transcription')",
  "start": "ISO 8601 datetime",
  "party": "number (party index, REQUIRED)",
  "dialog": "number (dialog index, REQUIRED)",
  "mediatype": "string (MIME type)",
  "filename": "string",
  "body": "string",
  "encoding": "base64url | json | none",
  "url": "string",
  "content_hash": "ContentHash | ContentHash[]"
}
```

**Note (draft-02)**: The core spec uses `purpose` (not `type`). Extensions may use `type` for compatibility; tags convention uses `purpose: "tags"`.

### Critical Spec Compliance Rules

These corrections apply across ALL repositories. Violations are spec-breaking bugs:

1. **Analysis `schema` field** — Use `schema`, NOT `schema_version`
2. **Analysis `vendor` is REQUIRED** — Every analysis MUST include a vendor string
3. **Analysis `body` is a string** — Even when content is JSON, the body field is a string type
4. **Party `uuid` field exists** — For cross-vCon party tracking
5. **Party `did` field exists** — Decentralized Identifier support
6. **Dialog includes `session_id`, `application`, `message_id`** — Session tracking fields. `session_id` is `{local: UUID, remote: UUID}` or array thereof
7. **Attachment includes `party` and `dialog`** — Both REQUIRED per draft-02. Use `purpose` (not `type`) for attachment purpose
8. **Externally referenced files** — MUST have both `url` and `content_hash`. ContentHash format: `sha512-` + Base64Url of SHA-512 digest
9. **`critical` extensions** — If a vCon lists extensions in `critical`, implementations that do not support them MUST NOT process the vCon
10. **`vcon` parameter** — DEPRECATED; use `0.4.0` for syntax. Extension mechanism replaces schema versioning

### Tags Convention

Tags are stored as attachments with `purpose: "tags"` (draft-02) or `type: "tags"` (legacy) and a JSON body. Per draft-02, attachments require `party` and `dialog` indices; use 0 for vCon-level tags when no specific party/dialog applies:

```json
{
  "purpose": "tags",
  "start": "2025-01-15T10:30:00Z",
  "party": 0,
  "dialog": 0,
  "body": "{\"department\": \"sales\", \"priority\": \"high\"}",
  "encoding": "json"
}
```

---

## 3. Architecture Patterns

### 3.1 vcon-server (Python Processing Pipeline)

**Pattern**: Event-driven pipeline with pluggable links and storage backends.

```
Ingress → [Link1] → [Link2] → [Link3] → [Storage1, Storage2] → Egress
           (tag)    (analyze)  (transcribe)  (postgres, s3)
```

**Core concepts**:
- **Links**: Processing modules that transform vCons (add tags, run analysis, transcribe, etc.)
- **Chains**: Ordered sequences of links defined in YAML config
- **Storages**: Pluggable backends (Redis, PostgreSQL, S3, MongoDB, Elasticsearch, Milvus, File, SFTP)
- **Ingress/Egress Queues**: Redis-backed queues for inter-service communication
- **Dead Letter Queue**: Failed processing goes to `DLQ:{ingress_list}`

**Link interface** — every link module must implement:

```python
async def run(vcon_uuid: str, link_config: dict) -> str | None:
    """Process a vCon. Return vcon_uuid to continue pipeline, None to stop."""
    pass
```

**Storage interface** — every storage module must extend:

```python
class Storage(ABC):
    async def save(self, vcon: dict) -> None: ...
    async def get(self, uuid: str) -> dict | None: ...
    async def delete(self, uuid: str) -> None: ...
```

**Configuration format** (YAML):

```yaml
links:
  my_link:
    module: links.my_link
    options:
      api_key: "${MY_API_KEY}"
      model: "claude-sonnet-4-20250514"

storages:
  postgres:
    module: storage.postgres
    options:
      connection_string: "${DATABASE_URL}"

chains:
  main_pipeline:
    links:
      - my_link
    storages:
      - postgres
    ingress_lists:
      - default
    egress_lists:
      - output
```

### 3.2 vcon-mcp (TypeScript MCP Server)

**Pattern**: Layered architecture with MCP protocol compliance.

```
Transport (STDIO/HTTP) → Server → Tool Handlers → Database (Supabase + Redis cache)
                                → Resource Handlers
                                → Prompt Handlers
```

**Key abstractions**:
- **ToolHandlerRegistry**: Centralized registration of 30+ MCP tools
- **PluginManager**: Lifecycle hooks (beforeCreate, afterCreate, beforeRead, afterRead, etc.)
- **TenantConfig**: Multi-tenant RLS via attachment-based tenant extraction
- **VConValidator**: Zod-based schema validation with IETF compliance checking

**Tool naming convention**: `snake_case` (e.g., `create_vcon`, `search_vcons_semantic`)

**Database**: Supabase PostgreSQL with:
- pgvector for semantic search (384-dimension embeddings)
- Full-text search via tsvector
- Row Level Security for multi-tenancy
- 41 migrations tracking schema evolution

### 3.3 vcon-lib (Python Library)

**Pattern**: Object-oriented data model with extension framework.

```python
from vcon import Vcon

v = Vcon.build_new()
v.set_party_parameter("tel", "+15551234567")
v.add_dialog_inline_text("Hello world", 0, [0, 1])
v.add_analysis("summary", "Summary text", vendor="OpenAI", product="GPT-4")
v.to_json()
```

**Extension framework**:
- `ExtensionRegistry` for registration and discovery
- `ExtensionValidator` base class for validation
- `ExtensionProcessor` base class for processing
- Built-in extensions: Lawful Basis (GDPR), WTF (World Transcription Format)

**Property handling modes**: `"default"` (keep all), `"strict"` (remove non-standard), `"meta"` (move non-standard to meta object)

### 3.4 Adapters (Ingress Pattern)

All adapters follow the same pattern:

```
Source (files, SIP, screen capture) → Parse/Convert → Build vCon → POST to conserver API
```

**POST target**: `POST /vcon?ingress_list={name}` with `x-conserver-api-token` header.

---

## 4. Technology Stack Reference

### Python Repositories

| Concern | Standard Choice |
|---|---|
| Web framework | FastAPI + Uvicorn |
| Database ORM | Peewee (vcon-server), direct SQL (others) |
| Cache/Queue | Redis (via `redis` package, redis-stack for JSON) |
| LLM providers | OpenAI SDK, Anthropic SDK, LiteLLM, Groq |
| Transcription | Deepgram SDK, HuggingFace Whisper, MLX Whisper, NeMo |
| Async | anyio, trio |
| Retry logic | tenacity (exponential backoff) |
| Config | python-dotenv + YAML |
| Logging | python-json-logger, structured JSON to stderr |
| Observability | OpenTelemetry (traces + metrics), Sentry (errors), Datadog (metrics) |
| Testing | pytest, pytest-asyncio, pytest-cov, Faker |
| Code quality | black (120 char lines), flake8, ruff |
| Packaging | Poetry (preferred), setuptools fallback |
| Python version | 3.12+ |

### TypeScript Repository (vcon-mcp)

| Concern | Standard Choice |
|---|---|
| Runtime | Node.js 18+ |
| Module system | ES modules (`"type": "module"`) |
| Framework | @modelcontextprotocol/sdk |
| Database | @supabase/supabase-js |
| Cache | ioredis |
| Validation | zod |
| Logging | pino (with OpenTelemetry context injection) |
| Observability | @opentelemetry/* |
| Testing | vitest |
| Build target | ES2022 |
| Strict mode | Enabled |

### SvelteKit Repository (portal)

| Concern | Standard Choice |
|---|---|
| Framework | SvelteKit 2.x, Svelte 4.x |
| Styling | TailwindCSS |
| ORM | Sequelize 6.x |
| Auth | Auth0 + JWT |
| Build | Vite 5.x |
| Testing | Playwright (E2E), Vitest (unit) |

---

## 5. Naming Conventions

### Cross-Repository Standards

| Element | Convention | Examples |
|---|---|---|
| Database columns | snake_case | `created_at`, `vcon_version`, `tenant_id` |
| Python modules | snake_case | `vcon_redis.py`, `llm_client.py` |
| Python classes | PascalCase | `Vcon`, `Storage`, `VConPeeWee` |
| Python functions | snake_case | `get_vcon()`, `add_tag()` |
| TypeScript types | PascalCase | `VCon`, `Dialog`, `Analysis` |
| TypeScript functions | camelCase | `getVcon()`, `addAnalysis()` |
| MCP tool names | snake_case | `create_vcon`, `search_vcons_semantic` |
| API endpoints | RESTful snake_case | `/vcon/{uuid}/analysis` |
| Environment vars | UPPER_SNAKE_CASE | `REDIS_URL`, `SUPABASE_URL` |
| Config keys | snake_case | `ingress_lists`, `api_key` |
| Docker services | lowercase hyphenated | `conserver`, `redis-stack` |
| IETF fields | snake_case | `created_at`, `content_hash`, `party_history` |

### UUID Convention

- vcon-lib generates UUID v8 (Unix timestamp-based) for new vCons
- All repositories accept UUIDs with or without dashes
- UUIDs are the primary identifier for all vCon operations

### Timestamp Convention

- Always ISO 8601 format with timezone info
- Example: `"2025-01-15T10:30:00Z"` or `"2025-01-15T10:30:00+00:00"`
- Database storage: `timestamptz` in PostgreSQL

---

## 6. API Patterns

### vcon-server REST API

**Auth**: `x-conserver-api-token` header (configurable via `CONSERVER_HEADER_NAME`)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/vcon` | Submit vCon to pipeline |
| POST | `/vcon?ingress_list={name}` | Submit to specific ingress |
| GET | `/vcon` | List vCon UUIDs (paginated) |
| GET | `/vcon/{uuid}` | Retrieve vCon |
| PUT | `/vcon/{uuid}` | Update vCon |
| DELETE | `/vcon/{uuid}` | Delete vCon |
| GET | `/vcon/{uuid}/analysis` | Get analysis results |
| POST | `/vcon/external-ingress?ingress_list={name}` | External partner submission |
| GET | `/vcon/egress?egress_list={name}&limit=10` | Pull from egress queue |
| GET | `/vcon/dlq/{ingress_list}` | Dead Letter Queue access |

**External ingress auth**: Scoped API keys per ingress list in config YAML.

### vcon-mcp MCP Tools (30+)

**CRUD**: `create_vcon`, `get_vcon`, `update_vcon`, `delete_vcon`, `add_analysis`, `add_dialog`, `add_attachment`, `create_vcon_from_template`

**Search (4 modes)**:
- `search_vcons` — Structured field queries
- `search_vcons_content` — Full-text keyword search
- `search_vcons_semantic` — AI embedding similarity (384-dim vectors)
- `search_vcons_hybrid` — Combined keyword + semantic

**Tags**: `manage_tag`, `get_tags`, `remove_all_tags`, `search_by_tags`, `get_unique_tags`

**Analytics**: `get_database_analytics`, `get_monthly_growth_analytics`, `get_attachment_analytics`, `get_tag_analytics`, `get_content_analytics`, `get_database_health_metrics`

**Database inspection**: `get_database_shape`, `get_database_stats`, `analyze_query`, `get_database_size_info`, `get_smart_search_limits`

**Schema/Templates**: `get_schema`, `get_examples`

**MCP Resources** (URI-based):
- `vcon://v1/vcons/recent` — Most recent vCons
- `vcon://v1/vcons/{uuid}` — Full vCon
- `vcon://v1/vcons/{uuid}/metadata` — Metadata only
- `vcon://v1/vcons/{uuid}/parties|dialog|analysis|attachments|transcript|summary|tags`

---

## 7. Database Schemas

### vcon-mcp (Supabase PostgreSQL)

```sql
-- Core tables (8 main tables, 25+ indexes)

CREATE TABLE vcons (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL,
  vcon_version TEXT,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  extensions JSONB,
  must_support JSONB,  -- ⚠️ BUG: spec field is `critical`, not `must_support`
  redacted JSONB,
  appended JSONB,      -- ⚠️ BUG: spec field is `amended`, not `appended`
  tenant_id TEXT
);

CREATE TABLE parties (
  id SERIAL PRIMARY KEY,
  vcon_id INTEGER REFERENCES vcons(id) ON DELETE CASCADE,
  party_index INTEGER NOT NULL,
  tel TEXT, sip TEXT, stir TEXT, mailto TEXT,
  name TEXT, did TEXT, uuid TEXT,
  validation TEXT, gmlpos TEXT, civicaddress JSONB,
  jcard JSONB,    -- extension field (not in core spec)
  timezone TEXT   -- extension field (not in core spec)
);

CREATE TABLE dialog (
  id SERIAL PRIMARY KEY,
  vcon_id INTEGER REFERENCES vcons(id) ON DELETE CASCADE,
  dialog_index INTEGER NOT NULL,
  type TEXT NOT NULL,
  start TIMESTAMPTZ, duration NUMERIC,
  parties JSONB, originator INTEGER,
  mediatype TEXT, filename TEXT,
  body TEXT, encoding TEXT, url TEXT,
  content_hash TEXT, disposition TEXT,
  session_id TEXT, application TEXT,
  message_id TEXT, party_history JSONB
);

CREATE TABLE analysis (
  id SERIAL PRIMARY KEY,
  vcon_id INTEGER REFERENCES vcons(id) ON DELETE CASCADE,
  analysis_index INTEGER NOT NULL,
  type TEXT NOT NULL,
  dialog JSONB, mediatype TEXT, filename TEXT,
  vendor TEXT NOT NULL,
  product TEXT, schema TEXT,
  body TEXT, encoding TEXT, url TEXT,
  content_hash TEXT,
  embedding VECTOR(384)  -- pgvector for semantic search
);

CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  vcon_id INTEGER REFERENCES vcons(id) ON DELETE CASCADE,
  attachment_index INTEGER NOT NULL,
  type TEXT,  -- draft-02 uses purpose; type retained for legacy/ecosystem
  start TIMESTAMPTZ,
  party INTEGER, dialog INTEGER,
  mediatype TEXT, filename TEXT,
  body TEXT, encoding TEXT, url TEXT,
  content_hash TEXT, created_at TIMESTAMPTZ
);
```

> **vcon-mcp spec compliance gaps** (as of this writing): The vcon-mcp database and TypeScript types use `appended` (should be `amended`) and `must_support` (should be `critical`) — field names inherited from the older container draft. When writing new code that interacts with vcon-mcp, use the DB column names above; when writing spec-compliant vCon JSON, use `amended` and `critical`.

### vcon-server (PostgreSQL via Peewee)

```python
class VConPeeWee(Model):
    id = UUIDField(primary_key=True)
    uuid = UUIDField(index=True)
    vcon = TextField()           # Raw JSON string
    vcon_json = BinaryJSONField() # JSONB for querying
    created_at = DateTimeField()
    updated_at = DateTimeField()
    subject = TextField(null=True)
```

### Redis Data Model (vcon-server)

```
vcon:{uuid}              → JSON document (full vCon)
vcons                    → Sorted set (uuid → timestamp score)
context:{vcon_uuid}      → OpenTelemetry trace context
DLQ:{ingress_list}       → List (failed vCon UUIDs)
{ingress_list}           → List (pending vCon UUIDs)
{egress_list}            → List (processed vCon UUIDs)
```

---

## 8. Extension System

### Lawful Basis Extension (GDPR Compliance)

Implemented in vcon-lib, referenced by IETF draft.

```python
v = Vcon.build_new()
v.add_lawful_basis_attachment(
    lawful_basis="consent",
    purpose_grants=[{
        "purpose": "quality_assurance",
        "granted": True,
        "conditions": "Recording for training purposes"
    }],
    party_index=0,
    proof_mechanism={"type": "verbal", "timestamp": "2025-01-15T10:00:00Z"}
)

# Check permission
has_permission = v.check_lawful_basis_permission("quality_assurance", party_index=0)
```

**Lawful bases**: `consent`, `contract`, `legal_obligation`, `vital_interests`, `public_task`, `legitimate_interests`

### WTF Extension (World Transcription Format)

Standardized transcription format with multi-provider support.

```python
v.add_wtf_transcription_attachment(
    transcript={
        "segments": [
            {"start": 0.0, "end": 2.5, "text": "Hello", "speaker": "Speaker_0", "confidence": 0.95}
        ],
        "speakers": [{"id": "Speaker_0", "name": "Agent"}],
        "metadata": {"provider": "whisper", "model": "large-v3"}
    },
    dialog_index=0
)
```

**Provider adapters**: Whisper, Deepgram, AssemblyAI
**Export formats**: SRT, WebVTT

---

## 9. Processing Link Development

### Creating a New Link (vcon-server)

```python
# server/links/my_link/link.py

import logging
from lib.logging_utils import init_logger

logger = init_logger(__name__)

default_options = {
    "model": "claude-sonnet-4-20250514",
    "prompt": "Summarize this conversation."
}

async def run(vcon_uuid: str, link_config: dict) -> str | None:
    """
    Process a vCon through this link.

    Args:
        vcon_uuid: UUID of the vCon to process
        link_config: Configuration options from YAML

    Returns:
        vcon_uuid to continue pipeline, None to stop
    """
    from lib.vcon_redis import VconRedis
    vcon_redis = VconRedis()

    options = {**default_options, **link_config.get("options", {})}

    vcon = await vcon_redis.get_vcon(vcon_uuid)
    if not vcon:
        logger.error(f"vCon not found: {vcon_uuid}")
        return None

    # Process the vCon...
    result = do_analysis(vcon, options)

    # Add analysis result
    vcon["analysis"].append({
        "type": "summary",
        "body": result,
        "vendor": "MyCompany",
        "product": options["model"],
        "encoding": "none"
    })

    await vcon_redis.set_vcon(vcon_uuid, vcon)
    return vcon_uuid
```

### Creating a New Storage Backend (vcon-server)

```python
# server/storage/my_storage/storage.py

from storage.base import Storage

class MyStorage(Storage):
    def __init__(self, options: dict):
        self.connection = connect(options["connection_string"])

    async def save(self, vcon: dict) -> None:
        self.connection.insert(vcon["uuid"], vcon)

    async def get(self, uuid: str) -> dict | None:
        return self.connection.find(uuid)

    async def delete(self, uuid: str) -> None:
        self.connection.remove(uuid)
```

---

## 10. Testing Patterns

### Python Testing (pytest)

```python
# Standard test structure
import pytest
from vcon import Vcon

class TestVconCreation:
    def test_build_new(self):
        v = Vcon.build_new()
        assert v.uuid is not None
        assert v.parties == []

    def test_add_party(self):
        v = Vcon.build_new()
        v.set_party_parameter("tel", "+15551234567")
        assert len(v.parties) == 1

    @pytest.mark.anyio
    async def test_async_operation(self):
        result = await async_function()
        assert result is not None
```

**Markers**: `@pytest.mark.slow`, `@pytest.mark.integration`, `@pytest.mark.anyio`
**Fixtures**: Use `conftest.py` for shared test setup, mock vCons via `generate_mock_vcon()`

### TypeScript Testing (vitest)

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('createVcon', () => {
  it('should create a vcon with required fields', async () => {
    const result = await createVcon({
      parties: [{ name: 'Alice', tel: '+15551234567' }],
      subject: 'Test call'
    });
    expect(result.uuid).toBeDefined();
    expect(result.parties).toHaveLength(1);
  });
});
```

**Config**: `vitest.config.ts` with Node environment, dotenv, v8 coverage.
**Separation**: Unit tests run by default; E2E tests via `test:e2e` script.

---

## 11. Observability & Logging

### Structured Logging

**Python** (pino-style via python-json-logger):
```python
from lib.logging_utils import init_logger
logger = init_logger(__name__)
logger.info("Processing vCon", extra={"vcon_uuid": uuid, "chain": chain_name})
```

**TypeScript** (pino):
```typescript
import { logger } from './observability/logger';
logger.info({ vconUuid: uuid, tool: 'create_vcon' }, 'Creating vCon');
```

### OpenTelemetry

Both vcon-server and vcon-mcp support OpenTelemetry with:
- **Traces**: Distributed tracing across pipeline links
- **Metrics**: Counters, gauges, histograms
- **Logs**: Automatic trace context correlation
- **Exporters**: Console (JSON) or OTLP

Environment variables:
```bash
OTEL_ENABLED=true
OTEL_EXPORTER_TYPE=otlp        # or "console"
OTEL_ENDPOINT=http://collector:4318
OTEL_SERVICE_NAME=vcon-server
```

---

## 12. Deployment & Infrastructure

### Docker Compose (Production Pipeline)

```yaml
services:
  conserver:
    build: ./vcon-server
    environment:
      - REDIS_URL=redis://redis
      - CONSERVER_CONFIG_FILE=./config.yml
    depends_on: [redis]
    deploy:
      replicas: 4

  api:
    build: ./vcon-server
    command: ["uvicorn", "server.api:app", "--host", "0.0.0.0", "--port", "8000"]
    ports: ["8000:8000"]

  redis:
    image: redis/redis-stack:latest
    volumes: [redis_data:/data]
    ports: ["6379:6379"]

  vfun:
    build: ./vfun
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Environment Variables (Common)

```bash
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
REDIS_URL=redis://localhost:6379

# Auth
CONSERVER_API_TOKEN=your-api-token

# LLM
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Observability
OTEL_ENABLED=true
LOG_LEVEL=INFO
SENTRY_DSN=https://...

# Multi-tenancy
RLS_ENABLED=false
TENANT_ATTACHMENT_TYPE=tenant
TENANT_JSON_PATH=tenant_id
```

---

## 13. Error Handling Patterns

### Python (vcon-server, links)

```python
# Return None to stop pipeline (non-fatal)
if not vcon:
    logger.warning(f"vCon not found: {vcon_uuid}")
    return None

# Dead Letter Queue for fatal errors
try:
    result = await process(vcon)
except Exception as e:
    logger.error(f"Processing failed: {e}", extra={"vcon_uuid": vcon_uuid})
    await dlq.push(vcon_uuid, str(e))
    return None
```

### TypeScript (vcon-mcp)

```typescript
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// MCP protocol errors
throw new McpError(ErrorCode.InvalidParams, 'UUID is required');
throw new McpError(ErrorCode.InternalError, 'Database connection failed');

// Validation errors (via Zod)
const result = schema.safeParse(input);
if (!result.success) {
  throw new McpError(ErrorCode.InvalidParams, result.error.message);
}
```

---

## 14. Security Considerations

### Authentication

- **vcon-server API**: Token-based via `x-conserver-api-token` header
- **External ingress**: Scoped API keys per ingress list
- **Portal**: Auth0 with JWT tokens
- **vcon-mcp**: Relies on MCP transport security (local STDIO or authenticated HTTP)

### Multi-Tenancy

- vcon-mcp supports PostgreSQL Row Level Security (RLS)
- Tenant ID extracted from vCon attachments (configurable path)
- All queries automatically filtered by tenant context

### Privacy

- Redaction link strips PII from vCons
- Lawful Basis extension tracks GDPR consent
- Right-to-Know portal provides data access/deletion
- Content hashing for integrity verification
- Digital signatures supported in vcon-lib

---

## 15. Code Generation Guidelines

When generating code for this ecosystem:

1. **Always check the spec** — Use the data model in Section 2 as the canonical reference (draft-ietf-vcon-vcon-core). Never use `schema_version` (it's `schema`). Always include `vendor` in analysis objects. Use `purpose` for attachment purpose (not `type` in core).

2. **Follow existing patterns** — Match the architecture of the target repository. Links return `vcon_uuid | None`. MCP tools use Zod validation. Python uses `init_logger(__name__)`.

3. **Use the right stack** — Python repos use FastAPI + Poetry + pytest. TypeScript uses ESM + Zod + Vitest. Don't mix conventions.

4. **Tags are attachments** — Tags are stored as `purpose: "tags"` (draft-02) attachments with JSON body. Legacy `type: "tags"` may still appear. Attachments require `party` and `dialog` indices.

5. **Handle encoding properly** — Body content uses `base64url`, `json`, or `none` encoding. Audio/video is typically base64url. JSON data uses `json` encoding. Plain text uses `none`.

6. **UUIDs everywhere** — All vCon operations are UUID-keyed. Accept with or without dashes. Generate v8 in vcon-lib.

7. **ISO 8601 timestamps** — Always include timezone. Use `Z` suffix or explicit offset.

8. **Structured logging** — Use key-value pairs, not string interpolation. Include `vcon_uuid` in all log entries related to vCon processing.

9. **Test thoroughly** — Unit tests for validation, integration tests for database operations, E2E tests for full workflows.

10. **Respect the pipeline** — In vcon-server, links are stateless processors. They read from Redis, modify, write back. Never hold state between invocations.
