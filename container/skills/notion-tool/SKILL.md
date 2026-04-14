---
name: notion-tool
description: "Formatting conventions and helper scripts for creating or editing Notion pages. Use before writing substantial page content (new pages, rewrites, reorganizations)."
argument-hint: "[describe the page or content you want to create/edit]"
---

# Notion Page Conventions

Follow these rules when creating or editing Notion pages.

## Token Budget

Be deliberate about how much data you pull into context.

- **Read only what you need.** Use `get-children.sh` to get the page outline first (type + text preview). Only drill into specific sections that are relevant to the task.
- **Never read an entire page at once.** Read the top-level structure, then expand one section at a time.
- **Estimate before fetching.** If a page has 20+ top-level blocks, each with children, reading everything will easily exceed 10K tokens. Ask the user which sections they care about.
- **Ask before large reads.** If a fetch is likely to return >10K tokens (e.g. reading all children of a large page, querying a database with many rows), tell the user the estimated size and ask to confirm or narrow scope.
- **Prefer `--ids-only` for writes.** When deleting or reorganizing, you only need block IDs — don't fetch full content.
- **Batch writes, not reads.** It's fine to write many blocks in one `append-blocks.sh` call. But reads should be incremental — fetch the outline, then drill down.
- **Edit blocks, don't rewrite pages.** Use `mcp__notion__API-update-a-block` to update individual blocks in place. Only delete and recreate a section when the structure itself is changing — not just the content.
- **Database queries:** always use filters to limit results. Never dump an entire database.

## Tool Priority

1. **MCP first** — use `mcp__notion__*` tools for anything they support (search, read pages, read/create/delete blocks with `paragraph` and `bulleted_list_item` types, database queries, page properties).
2. **API scripts** — for block types MCP can't create, use the helper scripts in `${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/`. These call the Notion REST API directly using `NOTION_API_TOKEN` from `.env` or from the OAuth-connected Notion integration.
3. **Raw curl** — only if a script doesn't exist yet for the operation. After using curl for a new pattern, save it as a reusable script and update this skill.

## Page Structure

Every substantial page (not a database row) must follow this top-level structure:

1. **Callout block** (info icon) — one-liner describing the page's purpose and audience.
2. **Table of Contents block** — immediately below the callout.
3. **Heading 3 (toggleable)** — for each content section. All section content lives inside the toggle as children of the heading block.

This keeps long pages scannable. Readers expand only what they need.

## Formatting Rules

- Use **bold paragraph text** for sub-sections only when inside a toggle. Prefer H3 toggles for top-level grouping.
- Use **bulleted lists** for sets of related points. **Numbered lists** only when order matters.
- Use **empty paragraphs** sparingly — max one between sections, never two in a row.
- Keep paragraphs to 3-4 sentences max. Break longer ones into bullets.

## Helper Scripts

All scripts live in `${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/` and read `NOTION_API_TOKEN` from `.env` (or from the environment if Notion is connected via OAuth).

### `append-blocks.sh <parent_id> [--after <block_id>]`
Append arbitrary block children to any block or page. Reads a JSON array of block objects from stdin. Supports all Notion block types.

Use `--after <block_id>` to insert blocks at a specific position (after a sibling block) instead of at the end.

```bash
# Create page skeleton (callout + TOC + toggleable H3s)
echo '[
  {"type":"callout","callout":{"icon":{"type":"emoji","emoji":"ℹ️"},"rich_text":[{"type":"text","text":{"content":"Page description here"}}]}},
  {"type":"table_of_contents","table_of_contents":{"color":"default"}},
  {"type":"heading_3","heading_3":{"rich_text":[{"type":"text","text":{"content":"Section Name"}}],"is_toggleable":true}}
]' | ${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/append-blocks.sh <page_id>
```

Insert a block at a specific position:
```bash
echo '[{"type":"heading_3","heading_3":{"rich_text":[{"type":"text","text":{"content":"New Section"}}],"is_toggleable":true}}]' \
  | ${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/append-blocks.sh <page_id> --after <toc_block_id>
```

Add content inside a toggle heading (use the heading's block ID as parent):
```bash
echo '[
  {"type":"paragraph","paragraph":{"rich_text":[{"type":"text","text":{"content":"Content inside the toggle."}}]}}
]' | ${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/append-blocks.sh <heading_block_id>
```

### `delete-blocks.sh`
Bulk-delete blocks. Reads one block ID per line from stdin.

```bash
# Delete all children of a page
${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/get-children.sh <page_id> --ids-only | ${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/delete-blocks.sh
```

### `get-children.sh <block_id> [--ids-only]`
List all children of a block/page with pagination. Default output is a summary table (index, ID, type, text preview). With `--ids-only`, prints one block ID per line (useful for piping to delete-blocks.sh).

```bash
# See page structure
${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/get-children.sh <page_id>

# Get just IDs for scripting
${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/get-children.sh <page_id> --ids-only
```

## Workflow for Building a New Page

1. Find or create the page via MCP (`mcp__notion__API-post-search` or `mcp__notion__API-post-page`).
2. If the page has existing content to clear: `get-children.sh <page_id> --ids-only | delete-blocks.sh`
3. Create the skeleton (callout + TOC + toggle H3s) via `append-blocks.sh`.
4. For each toggle H3, append its content via `append-blocks.sh <heading_block_id>` — use MCP `patch-block-children` when content is only paragraphs and bullets, use `append-blocks.sh` when you need other block types.
5. Read back with `get-children.sh` to verify.

## When to Use This Skill

- Before creating a new Notion page with multiple sections
- Before doing a major rewrite of an existing page
- When the user asks to "clean up" or "organize" a Notion page
