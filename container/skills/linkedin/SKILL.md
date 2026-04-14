---
name: linkedin
description: "Use LinkedIn via Chrome to research people, companies, or connections."
argument-hint: "[what to do — e.g. 'find directors at CBRE', 'check connections of John Smith']"
model: opus
---

# LinkedIn

Use Chrome to perform LinkedIn tasks — searching for people, viewing profiles, exploring connections, researching companies.

## Input

`$ARGUMENTS` — what the user wants to do on LinkedIn. If missing, ask.

If the task requires understanding Vizonare's positioning or target customers, run `/vizonare:vizonare-context review` first to get up-to-date context.

## Using LinkedIn via Chrome

Navigate LinkedIn using the Chrome browser tools. If given a URL, go directly. If given a name or query, use LinkedIn's search.

- **Always use filters.** Never rely on a bare keyword search — apply every relevant filter (title, company, location, industry, connections of, etc.) to get precise results and avoid wading through noise.
- **Run multiple narrow searches** rather than one broad one. Vary keywords and filter combinations to cover different angles.
- **Use Boolean operators** in the search box (`AND`, `OR`, `NOT`, quotes for exact phrases) to refine results when filters alone aren't enough.

## Token Budget

LinkedIn pages are dense. Be deliberate about what you pull into context.

- **Skim before reading.** Use page text or search results to find what's relevant — don't read entire profiles or long lists upfront.
- **One result set at a time.** Process the current page of search results before loading more.
- **Skip noise.** Activity feeds, endorsements, recommendations, and "People also viewed" sections are rarely useful — ignore them unless the user asks.
- **Summarize as you go.** Extract the relevant facts (name, title, company, key details) and work from your summary rather than re-reading the page.
