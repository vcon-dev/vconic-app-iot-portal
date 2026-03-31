# Contributing to the vCon Ecosystem

This guide covers how to contribute code and documentation across vCon repositories. Individual repos may have additional rules; check their README or CONTRIBUTING files.

## Before You Start

1. Read the [vcon-ecosystem-speckit.md](vcon-ecosystem-speckit.md) (at least sections 1-2 and 15).
2. Skim the [CODE_STYLE_GUIDE.md](CODE_STYLE_GUIDE.md) for your language.
3. Identify which repository your change belongs in (see speckit section 1).

## Development Workflow

### Branch Strategy

- **main**: Stable, deployable state. Protected.
- **Feature branches**: `feature/short-description` or `fix/issue-description`
- **Hotfix**: `hotfix/critical-fix-description` when needed

Create a branch from `main` for each change. Keep branches short-lived and focused.

### Commit Messages

Use conventional commit format:

```
type(scope): brief description

Optional longer explanation. Reference issues with #123.
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:

```
feat(links): add sentiment analysis link
fix(mcp): correct analysis schema field name
docs(speckit): update CODE_STYLE_GUIDE logging section
```

### Pull Request Process

1. **Create PR** against `main` (or the target branch for the repo).
2. **Description**: Summarize the change, link related issues, note any breaking changes.
3. **Self-review**: Run the checklist below before requesting review.
4. **Address feedback**: Respond to comments and update the PR.
5. **Merge**: Squash or merge per repo policy. Delete branch after merge.

## Pre-Submit Checklist

Run this before requesting review:

### All Changes

- [ ] Code follows [CODE_STYLE_GUIDE.md](CODE_STYLE_GUIDE.md)
- [ ] Tests pass locally
- [ ] No new lint or type errors
- [ ] Documentation updated if behavior or API changed

### vCon Data Model Changes

- [ ] Uses `schema` not `schema_version` for analysis
- [ ] Analysis includes `vendor` (required)
- [ ] Attachment uses `purpose` and includes `party` and `dialog`
- [ ] Tags use `purpose: "tags"` with JSON body
- [ ] Timestamps are ISO 8601 with timezone
- [ ] External references have `url` and `content_hash`

### New Links (vcon-server)

- [ ] Implements `async def run(vcon_uuid, link_config) -> str | None`
- [ ] Uses `init_logger(__name__)` for logging
- [ ] Merges options with defaults
- [ ] Handles missing vCon (returns None, logs warning)
- [ ] Stores updated vCon back to Redis
- [ ] Unit tests with mocked VconRedis

### New MCP Tools (vcon-mcp)

- [ ] Tool name in snake_case
- [ ] Input validated with Zod
- [ ] Uses McpError for protocol errors
- [ ] Logs with structured context

### New Adapters

- [ ] Follows adapter pattern (extract, transform, validate)
- [ ] Produces spec-compliant vCons
- [ ] Validates output with `vcon.is_valid()`
- [ ] Handles errors and retries appropriately

## Code Review Expectations

Reviewers will check:

1. **Spec compliance**: vCon field names, required fields, encoding
2. **Conventions**: Naming, logging, error handling
3. **Tests**: Adequate coverage for new behavior
4. **Security**: No hardcoded secrets, safe handling of user data
5. **Performance**: No obvious inefficiencies for expected workloads

## Where to Contribute

| Change Type | Target Repository |
|-------------|-------------------|
| Spec kit, style guide, contributing docs | vcon-speckit (this repo) |
| Core vCon data model, validation | vcon-lib |
| Processing links, pipeline config | vcon-server, conserver-extras |
| MCP tools, Supabase schema | vcon-mcp |
| Adapters (SIPREC, audio, etc.) | Respective adapter repos |
| IETF drafts | background-docs or draft repos |

## Getting Help

- **vCon Open Forum**: https://vcons.org/
- **GitHub Discussions**: Check the relevant repo
- **IETF vCon WG**: https://datatracker.ietf.org/group/vcon/
