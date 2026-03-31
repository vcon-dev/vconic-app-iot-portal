# vCon Developer Quick Reference

One-page cheat sheet for common patterns. For full details, see [vcon-ecosystem-speckit.md](vcon-ecosystem-speckit.md).

## Spec Compliance (Must-Have)

| Rule | Correct | Wrong |
|------|---------|-------|
| Analysis schema | `schema` | `schema_version` |
| Analysis vendor | Required | Omitted |
| Analysis body | String (even for JSON) | Object |
| Attachment purpose | `purpose` | `type` (in core) |
| Attachment indices | `party`, `dialog` required | Omitted |
| Tags | `purpose: "tags"`, JSON body | Top-level tags object |
| External refs | `url` + `content_hash` | Either missing |
| Timestamps | ISO 8601 + timezone | No timezone |

## Link Interface (vcon-server)

```python
async def run(vcon_uuid: str, link_config: dict) -> str | None:
    vcon_redis = VconRedis()
    vcon = await vcon_redis.get_vcon(vcon_uuid)
    if not vcon:
        logger.warning("vCon not found", extra={"vcon_uuid": vcon_uuid})
        return None
    # Process...
    await vcon_redis.set_vcon(vcon_uuid, vcon)
    return vcon_uuid  # None to stop chain
```

## Add Analysis

```python
vcon["analysis"].append({
    "type": "summary",
    "dialog": 0,
    "vendor": "MyVendor",      # REQUIRED
    "product": "gpt-4",
    "schema": "v1",
    "body": json.dumps(result),
    "encoding": "json"
})
```

## Add Tags (draft-02)

```python
vcon["attachments"].append({
    "purpose": "tags",
    "start": "2025-01-15T10:30:00Z",
    "party": 0,
    "dialog": 0,
    "body": json.dumps({"department": "sales"}),
    "encoding": "json"
})
```

## Storage Interface (vcon-server)

```python
class MyStorage(Storage):
    async def save(self, vcon: dict) -> None: ...
    async def get(self, uuid: str) -> dict | None: ...
    async def delete(self, uuid: str) -> None: ...
```

## Logging

**Python**: `logger.info("msg", extra={"vcon_uuid": uuid})`  
**TypeScript**: `logger.info({ vconUuid: uuid }, "msg")`

## API Auth

- vcon-server: `x-conserver-api-token` header
- POST target: `POST /vcon?ingress_list={name}`

## Common Env Vars

```
REDIS_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
CONSERVER_API_TOKEN, OPENAI_API_KEY, ANTHROPIC_API_KEY
OTEL_ENABLED, LOG_LEVEL
```

## Stack by Repo

| Repo | Lang | Framework | Test |
|------|------|-----------|------|
| vcon-lib, vcon-server | Python | FastAPI, Poetry | pytest |
| vcon-mcp | TypeScript | MCP SDK, Zod | vitest |
| portal | SvelteKit | Svelte 4, Tailwind | Playwright |

## UUID / Timestamp

- UUID: v8 preferred, accept with/without dashes
- Timestamp: `2025-01-15T10:30:00Z` or `+00:00` offset

## Usage Patterns (see [VCON_USAGE_GUIDE.md](VCON_USAGE_GUIDE.md))

| Question | Answer |
|----------|--------|
| Dialog type for audio/video | `"recording"` |
| Dialog type for chat/email/SMS | `"text"` |
| Dialog type to link call transfer | `"transfer"` (no body/parties) |
| Analysis vs. attachment | AI output → analysis; metadata/docs → attachments |
| Analysis order | transcript → summary → sentiment |
| Party UUID | Cross-vCon tracking (CRM ID, patient ID) |
| Tags | Attachment with `purpose: "tags"`, `party: 0`, `dialog: 0` |
| Lawful basis | Required for healthcare, legal interception; add to `critical` |
