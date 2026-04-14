---
name: chrome
description: "Browse the web — uses Chrome extension for authenticated/interactive sites, WebFetch for simple public pages."
argument-hint: "[URL or description of what to look up]"
model: opus
---

# Chrome

Browse the web to research, read, or interact with websites.

## Input

`$ARGUMENTS` — a URL to visit or a description of what to find. If missing, ask.

## Choosing the Right Tool

| Use | When |
|---|---|
| **WebFetch** | Public pages, docs, articles, APIs — anything that doesn't need a login or JS rendering |
| **WebSearch** | Finding URLs or answers first, before fetching a specific page |
| **Chrome extension** | Sites that require login (LinkedIn, internal tools), JS-heavy apps, forms, multi-step interactions |

**Default to WebFetch** — it's faster and cheaper on tokens. Escalate to Chrome only when WebFetch fails, returns a login wall, or the task requires interaction (clicking, filling forms, navigating between pages).

## Chrome Extension Basics

1. **Start with `tabs_context_mcp`** to see existing tabs.
2. **Create a new tab** with `tabs_create_mcp` — don't reuse tabs from prior sessions.
3. **Navigate** with `navigate` — pass the URL and tab ID.
4. **Read pages** with `get_page_text` for content or `read_page` for structure and interactive elements.
5. **Interact** with `computer` (click, type), `form_input` (fill fields), or `find` (locate elements).

## Token Budget

Web pages are heavy. Be deliberate about what you pull into context.

- **Use `get_page_text` first** — it's lighter than `read_page` and sufficient for reading content.
- **Use `read_page` with limited depth** when you need to interact with elements. Start with `depth: 4` or `5` and increase only if needed.
- **Scope reads with `ref_id`** — once you know which section of the page matters, read only that subtree.
- **Don't read full pages repeatedly.** Extract what you need, summarize, then work from the summary.
- **Skip boilerplate** — navbars, footers, ads, cookie banners, sidebars are rarely useful.
