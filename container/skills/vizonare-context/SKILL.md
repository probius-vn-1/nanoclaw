---
name: vizonare-context
description: "Review and update Vizonare's foundational Notion pages (company profile, competitive landscape, and user personas) with new context."
argument-hint: "[new context, pitch update, competitor info, or 'review']"
---

# Update Vizonare Context

Maintain two foundational Notion pages that serve as the source of truth for the team and AI agents.

## Pages

| Page | ID | Purpose |
|---|---|---|
| What is Vizonare | `24db7a5e-822a-8039-9d0d-e7bf150d94b6` | Company, product, positioning, business model |
| Competitive landscape | `337b7a5e-822a-8004-857d-e18199e8abf4` | FM tools, 3D platforms, how we compare |
| User Personas | `33cb7a5e-822a-80ff-ab3a-f41171ff2ad9` | Who our users are — archetypes, roles, pain points, platforms |

## How to decide which page to update

Read the new context the user provides and determine:
- **Company profile** — if it's about Vizonare's positioning, product, team, customers, business model, what we do/don't do
- **Competitive landscape** — if it's about competitors, their features, pricing, positioning, market categories, how we compare
- **User personas** — if it's about who uses Vizonare, their roles, pain points, workflows, or how they interact with the product
- **Both / multiple** — if the context touches more than one page (e.g. a pitch that compares us to competitors, or user research that informs both personas and positioning)
- **Neither** — if the context doesn't warrant changes to any page. Say so and explain why.

## Workflow (same for both pages)

### Step 1: Read the current page

```bash
${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/get-children.sh <page_id>
# Then for each heading with children:
${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/get-children.sh <heading_block_id>
```

### Step 2: Understand the new context

The user provides new context — a pitch, VC Q&A, competitor discovery, product change, market research, etc.

- If it's a URL, fetch it
- If it references a document, read it
- If it's unclear, ask follow-up questions
- Research online if needed (verify claims, check competitor positioning, confirm market stats)
- Be selective — most input contains more than what belongs on these pages

### Step 3: Identify what to change

Compare new context against the current page. Look for:
- **Outdated info** — facts no longer accurate
- **Missing info** — important new context that should be added
- **Tone/framing shifts** — if the pitch has evolved, pages should reflect that
- **Redundancies** — if new info makes existing content repetitive

Do NOT rewrite sections that are still accurate. Surgical edits only.

### Step 4: Propose changes and confirm

Present a clear summary:
- Which page(s) and sections will be updated
- What's being added, removed, or reworded
- Why

**Ask the user to confirm before writing to Notion.**

### Step 5: Apply changes

Use `/vizonare:notion-tool` skill conventions (MCP first, API scripts for advanced blocks):

```bash
# Delete old blocks inside a section
${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/get-children.sh <heading_id> --ids-only | ${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/delete-blocks.sh

# Add new content
echo '[...]' | ${CLAUDE_PLUGIN_ROOT}/skills/notion-tool/scripts/append-blocks.sh <heading_id>
```

### Step 6: Verify

Read back updated sections to confirm.

## Quality bar

- **Concise** — no filler, no marketing fluff. Every sentence earns its place.
- **Precise** — specific claims over vague ones.
- **Current** — reflects the latest pitch, positioning, and facts.
- **Non-obvious** — focus on context that helps the team and AI make better decisions, not what's obvious from the website.
- **Stable structure** — section headings rarely change. Content within them evolves.

## Company profile sections

| Section | Purpose |
|---|---|
| Company | Who we are, backers, team, stage |
| The Problem We Solve | Pain points in FM that justify our existence |
| The Product | What we build — modules and capabilities |
| What Makes Us Different | Positioning vs. competition, the data flywheel |
| What We Focus On | Target users, geographies, personas, GTM |
| What We Don't Do | Explicit boundaries — what we are NOT |
| Business Model | Revenue model and sales motion |

## Competitive landscape page

This page contains a database of competitors/tools (`337b7a5e-822a-8055-b829-c70bda9b3735`) and contextual notes.

### Working with the database

Before adding or updating entries, always query the database schema first to get current property names, types, and option values:

```bash
[ -f .env ] && source .env
# Get schema (property names, types, options)
curl -s "https://api.notion.com/v1/databases/337b7a5e-822a-8055-b829-c70bda9b3735" \
  -H "Authorization: Bearer $NOTION_API_TOKEN" \
  -H "Notion-Version: 2022-06-28"

# Add or update entries via curl (MCP doesn't handle select/multi_select well)
curl -s -X POST "https://api.notion.com/v1/pages" ...   # new entry
curl -s -X PATCH "https://api.notion.com/v1/pages/<id>" ...  # update
```

Use the actual property names from the schema — they may be renamed over time.

### When adding or updating competitors
- Always research the company's website first (use Chrome extension if WebFetch fails)
- Fill in ALL properties — never leave any empty
- Reuse existing select/multi_select option values where possible; only create new ones when nothing fits
- Keep it factual — what they do, not opinions about quality

## User Personas page

This page contains an inline database of user personas (`33cb7a5e-822a-80ff-a145-c60bc06bc480`).

### Working with the database

Query the database schema first to get current property names and option values:

```bash
[ -f .env ] && source .env
curl -s "https://api.notion.com/v1/databases/33cb7a5e-822a-80ff-a145-c60bc06bc480" \
  -H "Authorization: Bearer $NOTION_API_TOKEN" \
  -H "Notion-Version: 2022-06-28"
```

### When updating personas
- Each row is a named persona archetype (e.g. Mario = Maintenance Staff)
- Categories: Operator, FM Services, Vendor
- Update properties surgically — don't overwrite fields that already have good data
- When adding Pain Points or Key Features multi-select values, reuse existing options first
- Quotes should sound like something a real person in that role would say
