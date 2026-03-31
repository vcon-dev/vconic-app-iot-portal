# vCon Ecosystem Code Style Guide

Use this guide for consistent formatting, naming, and conventions across all vCon repositories. When a repository has its own style config (e.g., pyproject.toml, .eslintrc), follow it; this document defines the ecosystem baseline.

## Naming Conventions

| Element | Convention | Examples |
|---------|------------|----------|
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
| IETF/vCon fields | snake_case | `created_at`, `content_hash`, `party_history` |

## Python

### Formatting

- **Formatter**: black
- **Line length**: 120 characters
- **Linters**: flake8, ruff
- **Import order**: isort (stdlib, third-party, local)

### Structure

```python
# Standard module layout
"""Module docstring."""

from __future__ import annotations

import logging
from typing import Optional

from lib.vcon_redis import VconRedis
from lib.logging_utils import init_logger

logger = init_logger(__name__)

default_options = {"model": "default"}


async def run(vcon_uuid: str, link_config: dict) -> str | None:
    """Process a vCon. Return uuid to continue, None to stop."""
    pass
```

### Logging

- Use `init_logger(__name__)` from `lib.logging_utils`
- Structured logging: key-value pairs, not string interpolation
- Always include `vcon_uuid` in log entries for vCon processing

```python
logger.info("Processing vCon", extra={"vcon_uuid": uuid, "chain": chain_name})
logger.error("vCon not found", extra={"vcon_uuid": uuid})
```

### Type Hints

- Use type hints for public functions and link/storage interfaces
- Prefer `str | None` over `Optional[str]` (Python 3.10+)
- Use `dict` and `list` for generic collections (Python 3.9+)

### Docstrings

- Use Google-style or NumPy-style consistently within a repo
- Document Args, Returns, Raises for public functions
- Include at least a one-line summary for link `run()` functions

## TypeScript

### Formatting

- **Module system**: ES modules (`"type": "module"`)
- **Build target**: ES2022
- **Strict mode**: Enabled
- **Linter**: ESLint with TypeScript plugin

### Structure

```typescript
// Standard module layout
import { z } from 'zod';
import { logger } from './observability/logger.js';

const inputSchema = z.object({
  uuid: z.string().uuid(),
});

export async function createVcon(input: z.infer<typeof inputSchema>) {
  logger.info({ uuid: input.uuid }, 'Creating vCon');
  // ...
}
```

### Validation

- Use Zod for input validation
- Validate at API boundaries before processing
- Return clear error messages for invalid params

### Logging

- Use pino with structured fields
- Include context (vconUuid, tool name) in log objects

```typescript
logger.info({ vconUuid: uuid, tool: 'create_vcon' }, 'Creating vCon');
```

## vCon-Specific Rules

### Spec Compliance

These are non-negotiable. Violations are spec-breaking:

1. **Analysis**: Use `schema`, not `schema_version`. `vendor` is REQUIRED.
2. **Analysis body**: Always a string type, even when content is JSON.
3. **Attachment**: Use `purpose` (not `type` in core). `party` and `dialog` are REQUIRED.
4. **Tags**: Stored as attachments with `purpose: "tags"`, JSON body. Use `party: 0`, `dialog: 0` for vCon-level tags.
5. **External references**: MUST have both `url` and `content_hash` (sha512-base64url).
6. **Timestamps**: ISO 8601 with timezone (e.g., `2025-01-15T10:30:00Z`).
7. **UUIDs**: Accept with or without dashes. Generate v8 in vcon-lib.

### Encoding

- `base64url`: Audio, video, binary inline content
- `json`: Structured data (tags, analysis body)
- `none`: Plain text

## Error Handling

### Python (vcon-server, links)

- Return `None` to stop pipeline (non-fatal, e.g., vCon not found)
- Push to Dead Letter Queue for fatal errors
- Log with context before returning or raising

```python
if not vcon:
    logger.warning("vCon not found", extra={"vcon_uuid": vcon_uuid})
    return None

try:
    result = await process(vcon)
except Exception as e:
    logger.error("Processing failed", extra={"vcon_uuid": vcon_uuid}, exc_info=True)
    await dlq.push(vcon_uuid, str(e))
    return None
```

### TypeScript (vcon-mcp)

- Use `McpError` with `ErrorCode` for MCP protocol errors
- Validate with Zod; throw `McpError(ErrorCode.InvalidParams, message)` on failure

## Testing

### Python

- Framework: pytest, pytest-asyncio
- Markers: `@pytest.mark.slow`, `@pytest.mark.integration`, `@pytest.mark.anyio`
- Fixtures: Use `conftest.py` for shared setup
- Mock vCons: Use `generate_mock_vcon()` or equivalent

### TypeScript

- Framework: vitest
- Config: Node environment, dotenv, v8 coverage
- E2E: Separate script (`test:e2e`)

## Pre-Commit Checklist

Before submitting a PR:

- [ ] Code follows naming conventions for the language
- [ ] Logging uses structured format with context
- [ ] vCon fields use correct names (`schema`, `vendor`, `purpose`)
- [ ] Tests pass
- [ ] No new lint violations
