# Agent Session

Work directly with a NanoClaw sub-agent in Claude Code, then sync what was learned back to NanoClaw.

Triggers on: "agent session", "work with agent", "open agent"

## Step 1: Pick the agent

List available agents:

```bash
ls groups/slack_main/agents/ groups/slack_main/.claude/agents/ 2>/dev/null
```

If the user already specified an agent, match it. Otherwise, use AskUserQuestion to let them pick.

## Step 2: Pick the group context

The agent needs a group folder for persistent memory. AskUserQuestion:

1. **Main group** — use `groups/slack_main/` (shared with Slack Probius)
2. **Dedicated workspace** — create or use `groups/agent_{name}/` (isolated)

If dedicated and the folder doesn't exist, create it with a basic CLAUDE.md.

## Step 3: Become the agent

Do NOT launch a subprocess or a new `claude` session. Instead, **adopt the agent's persona and instructions right here in this conversation.**

Read the agent file:

```bash
cat groups/slack_main/agents/{agent}.md
```

Read the group's CLAUDE.md for context:

```bash
cat groups/{folder}/CLAUDE.md
```

Read the group's memory files if they exist:

```bash
ls groups/{folder}/
```

Then tell the user:

> Switching to {Agent Name}. Working directory: `groups/{folder}/`
>
> I have access to {agent's capabilities}. What would you like to work on?

From this point forward:
- Follow the agent's persona and instructions from the agent file
- Read/write files in `groups/{folder}/` for persistence
- Use the agent's skills as listed in the agent file
- Any files you create or knowledge you capture goes directly into the group folder — it's automatically available to the NanoClaw container agent next time it runs

## Step 4: Ending the session

When the user says they're done, or switches topics:

1. Summarize what was done and what files were created/modified
2. List any new knowledge that should persist
3. Drop back to normal Claude Code mode

Tell the user:

> Session ended. Everything I created is in `groups/{folder}/` and will be available to {Agent Name} in NanoClaw.

## Key advantage

Files written to the group folder during this session are bind-mounted into the NanoClaw container. No manual sync needed — the agent picks them up on the next container run.
