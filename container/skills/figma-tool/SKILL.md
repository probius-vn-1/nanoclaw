---
name: figma-tool
description: Router for Figma operations. Analyzes the user's request and delegates to the appropriate specialized figma skill.
user_invocable: true
arguments: Figma URL or description of what to do
---

You are the Figma router. Analyze the user's request and delegate to the correct specialized skill.

## Available sub-skills

| Skill | When to use |
|---|---|
| `/figma-read` | User shares a Figma URL and wants to extract a design spec, inspect components, or prepare for a compliance check |

## Token Budget

Figma responses can be very large. Before delegating to a sub-skill, check whether the user's request targets a specific frame or a broad page/section. If broad, ask the user to narrow scope first — don't pass a full-page URL to `figma-read` without confirming.

## Routing rules

1. Parse the user's message for: a Figma URL, an action verb, and any extra context.
2. Match against the table above. If exactly one skill fits, invoke it immediately via the Skill tool — pass the user's arguments through.
3. If no skill fits, tell the user what is available and ask them to clarify.
4. If the request is ambiguous between multiple skills, list the candidates and ask which one they mean.

## Creating a new Figma sub-skill

If the user asks to create a new Figma skill (e.g. "create a figma-rename skill"), do all of the following:

1. **Create the skill directory and file** — write `.claude/skills/figma-<name>/SKILL.md` with proper frontmatter (`name`, `description`, `user_invocable: true`, `arguments`).
2. **Update this router** — add a row to the "Available sub-skills" table above with the new skill name and a short "when to use" description. Use the Edit tool on this file (`.claude/skills/figma-tool/SKILL.md`).
3. **Confirm** — tell the user the skill was created and registered in the router.

Always keep the table sorted alphabetically by skill name.

## Pass-through

Do not re-implement any logic that a sub-skill already handles. Your only job is to pick the right skill and call it with the right arguments. Do not add commentary before or after — let the sub-skill do the talking.
