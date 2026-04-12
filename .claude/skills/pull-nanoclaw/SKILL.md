---
name: pull-nanoclaw
description: Fetch upstream NanoClaw changes and rebase the current branch on top. Use when user wants to sync with the latest upstream without merging.
---

# Pull NanoClaw (Rebase)

Fetch the latest upstream NanoClaw changes and rebase your branch on top, preserving a linear history.

## Step 0: Preflight

Run:
- `git status --porcelain`

If the working tree is dirty, stop and tell the user to commit or stash their changes first.

Confirm the `upstream` remote exists:
- `git remote get-url upstream 2>/dev/null || echo "missing"`

If missing, add it:
```bash
git remote add upstream https://github.com/qwibitai/nanoclaw.git
```

## Step 1: Fetch

```bash
git fetch upstream --prune
```

## Step 2: Preview

Show what's incoming:
```bash
BASE=$(git merge-base HEAD upstream/main)
git log --oneline $BASE..upstream/main
```

If there are no new commits, tell the user they're already up to date and stop.

Show local commits since the base (your customizations):
```bash
git log --oneline $BASE..HEAD
```

## Step 3: Conflict preview (dry run)

Run a dry-run merge to check for conflicts before rebasing:
```bash
git merge --no-commit --no-ff upstream/main 2>&1; git diff --name-only --diff-filter=U; git merge --abort 2>/dev/null
```

If conflicted files are listed, warn the user and ask via AskUserQuestion:
- **Proceed** — "Rebase and resolve conflicts file by file."
- **Abort** — "Stop here, I'll resolve manually."

If no conflicts: proceed automatically.

## Step 4: Rebase

```bash
git rebase upstream/main
```

If conflicts occur during rebase:
- Run `git status` to identify conflicted files.
- For each conflicted file:
  - Read the file and resolve conflict markers.
  - Preserve your local customizations; incorporate upstream changes.
  - Do not refactor surrounding code.
  - `git add <file>`
- Continue: `git rebase --continue`
- Repeat until rebase completes.

If the rebase becomes unresolvable (more than 3 rounds of conflicts):
- `git rebase --abort`
- Tell the user and suggest running `/update-nanoclaw` for a merge-based approach instead.

## Step 5: Install and build

```bash
npm install
npm run build
```

If the build fails, show the error. Only fix issues clearly introduced by the rebase (missing imports, type changes). If unclear, ask the user.

## Step 6: Sync credentials and restart

If `.env` was changed during the rebase:
```bash
mkdir -p data/env && cp .env data/env/env
```

If the service is running, restart it:
```bash
launchctl kickstart -k gui/$(id -u)/com.nanoclaw 2>/dev/null || systemctl --user restart nanoclaw 2>/dev/null || echo "Restart the service manually."
```

## Step 7: Summary

Show:
- Commits pulled from upstream (count)
- Your commits rebased on top (count)
- Conflicts resolved (list files, if any)
- New HEAD: `git rev-parse --short HEAD`

Remind the user: if they've previously pushed this branch, they'll need to force-push (`/push` handles this).
