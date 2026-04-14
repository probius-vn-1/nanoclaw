---
name: update-vizonare-plugin
description: Update the Vizonare Claude plugin and sync its skills into NanoClaw container agents.
---

# Update Vizonare Plugin

Pulls the latest version of the Vizonare plugin and copies its skills into `container/skills/` so all NanoClaw agents pick them up.

## Step 1: Update the plugin

```bash
claude plugin update vizonare@vizonare-marketplace
```

Note the version before and after to detect whether anything actually changed.

## Step 2: Sync skills into container/skills/

Find the installed plugin path:

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

## Step 3: Report

Show:
- Plugin version before → after (e.g., `1.4.1 → 1.5.0`, or "already up to date")
- Skills synced (list each name)
- Reminder: no restart needed — skills are loaded fresh on every agent invocation
