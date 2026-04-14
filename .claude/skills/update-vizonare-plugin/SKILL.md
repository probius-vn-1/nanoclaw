---
name: update-vizonare-plugin
description: Update the Vizonare Claude plugin and sync its skills into both Claude Code (this session) and NanoClaw container agents.
---

# Update Vizonare Plugin

This plugin serves two consumers that must both stay in sync:

1. **Claude Code sessions** (here, and any direct `claude` invocation) — via `~/.claude/plugins/`
2. **NanoClaw container agents** — via `container/skills/` in the repo, synced into each agent's `.claude/skills/` at runtime

## Step 1: Note current version

```bash
cat ~/.claude/plugins/installed_plugins.json | python3 -c "import sys,json; p=json.load(sys.stdin)['plugins']['vizonare@vizonare-marketplace'][0]; print(p['version'])"
```

Save this as `VERSION_BEFORE`.

## Step 2: Update the plugin

```bash
claude plugin update vizonare@vizonare-marketplace
```

## Step 3: Sync skills into container/skills/ (NanoClaw agents)

```bash
cat ~/.claude/plugins/installed_plugins.json
```

Extract the `installPath` for `vizonare@vizonare-marketplace`, then:

```bash
PLUGIN_SRC=<installPath>/skills
SKILLS_DST=./container/skills

for skill in "$PLUGIN_SRC"/*/; do
  name=$(basename "$skill")
  rm -rf "$SKILLS_DST/$name"
  cp -r "$skill" "$SKILLS_DST/$name"
done
```

## Step 4: Commit and push

If skills changed (new files, modified files), commit the `container/skills/` changes using the `/push` skill so NanoClaw agents on any machine pick up the update automatically.

## Step 5: Report

Show:
- Plugin version before → after (e.g., `1.4.1 → 1.5.0`, or "already up to date")
- Skills synced to `container/skills/` (list each name)
- **Claude Code**: updated in place — active in new sessions immediately. Current session needs `/restart` to reload skills.
- **NanoClaw agents**: no restart needed — skills are loaded fresh on every agent invocation.
