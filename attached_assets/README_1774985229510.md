# vCon Ecosystem Spec Kit

A curated set of documents that help teams write code together across the vCon ecosystem. Use these as shared context for code generation, review, and maintenance.

## Document Index

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [vcon-ecosystem-speckit.md](vcon-ecosystem-speckit.md) | Architecture, data model, conventions, API patterns | Primary context for AI tools and code generation |
| [VCON_USAGE_GUIDE.md](VCON_USAGE_GUIDE.md) | Domain profiles, feature guidelines, adapter output schemas | Designing vCon structure for specific use cases |
| [CODE_STYLE_GUIDE.md](CODE_STYLE_GUIDE.md) | Formatting, naming, lint rules, language-specific standards | Before writing code, during code review |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branch strategy, PR process, review checklist | When contributing changes |
| [DEVELOPER_QUICK_REFERENCE.md](DEVELOPER_QUICK_REFERENCE.md) | One-page cheat sheet for common patterns | Quick lookup while coding |

## Related Documentation

The [background-docs](https://github.com/vcon-dev/background-docs) repository contains:

- **Developer guides**: [HOW_TO_CREATE_LINKS.md](https://github.com/vcon-dev/background-docs/blob/main/HOW_TO_CREATE_LINKS.md), [vcon_adapter_guide.md](https://github.com/vcon-dev/background-docs/blob/main/vcon_adapter_guide.md)
- **Library references**: vcon-lib, vcon-js READMEs
- **IETF drafts**: Core spec, extensions, privacy primer
- **CLAUDE.md**: AI assistant guidance for background-docs

## How to Use the Spec Kit

### For Developers

1. **Onboarding**: Read the speckit (sections 1-2) and the quick reference.
2. **Before coding**: Check the code style guide for your language.
3. **While coding**: Keep the speckit open as context. Use the quick reference for common patterns.
4. **Before PR**: Run the contribution checklist.

### For AI-Assisted Development

Provide the speckit as context when:

- Generating new links, adapters, or MCP tools
- Reviewing or refactoring existing code
- Adding analysis, dialog, or attachment handling
- Implementing vCon validation or serialization

The speckit is designed to be consumed as a single context window. For focused tasks, you can also reference specific sections (e.g., "Section 2: vCon Data Model" for validation logic).

### For Code Review

Use the speckit and code style guide to verify:

- Spec compliance (analysis `schema` not `schema_version`, `vendor` required, etc.)
- Naming conventions and stack alignment
- Error handling and logging patterns
- Test coverage expectations

## Repository Map (Summary)

| Repository | Language | Primary Use |
|------------|----------|-------------|
| vcon-lib | Python 3.12+ | Core vCon data model |
| vcon-server | Python 3.12+ | Processing pipeline (links, chains, storage) |
| vcon-mcp | TypeScript 5.9+ | MCP server for AI agents |
| conserver-extras | Python | Additional links (Claude, redaction, etc.) |
| Adapters | Python | Ingress: SIPREC, audio, fax, screen capture |
| portal | SvelteKit | Analytics web UI |

## Quick Links

- [IETF vCon Working Group](https://datatracker.ietf.org/group/vcon/documents/)
- [vCon Server](https://github.com/vcon-dev/vcon-server)
- [Awesome vCon](https://github.com/vcon-dev/awesome-vcon)
- [vCon Open Forum](https://vcons.org/)
