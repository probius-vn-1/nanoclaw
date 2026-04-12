---
name: push
description: Commit any staged/unstaged changes and push the current branch to origin. Use when user wants to save or publish their work.
---

# Push to Origin

Optionally commit, then push the current branch to `origin`.

## Step 1: Status check

Run:
```bash
git status --porcelain
git diff --stat HEAD
git log --oneline origin/$(git branch --show-current)..HEAD 2>/dev/null
```

Gather:
- Which files changed (modified, added, deleted, untracked)
- Commits already made but not yet pushed

## Step 2: Handle uncommitted changes

If the working tree has changes (staged or unstaged):

1. Read the diffs to understand what changed:
   ```bash
   git diff HEAD
   git diff --cached
   ```

2. Draft a commit message following this format:
   - Semicolon-separated list of changes, each starting with a verb (Add, Fix, Update, Remove, Refactor, etc.)
   - Plain English — describe what was done, not how
   - One line only, no body
   - End with a period
   - No AI attribution, co-authored-by trailers, or any AI credit
   - Example: `Add Slack channel support; Update bot name to Probius.`

3. Show the user a summary:
   - Files to be committed (from `git status`)
   - The proposed commit message

4. Use AskUserQuestion:
   - **Commit and push** — "Commit with the message above and push."
   - **Edit message** — "I'll provide a different commit message."
   - **Push existing commits only** — "Leave working tree as-is, only push commits already made."
   - **Abort** — "Stop here."

   If "Edit message": ask for the new message in plain text and wait for reply.

   If "Commit and push" or after "Edit message":
   ```bash
   git add -A
   git commit -m "<message>"
   ```

   If "Abort": stop.

If there are no uncommitted changes but there are unpushed commits, show them and proceed to push.

If there are no uncommitted changes and nothing to push, tell the user and stop.

## Step 3: Push

```bash
git push origin $(git branch --show-current)
```

If the push is rejected (non-fast-forward), tell the user and offer two options via AskUserQuestion:
- **Pull and rebase first** — "Run `/pull-nanoclaw` to rebase on upstream, then push."
- **Force push** — "Overwrite the remote branch. Only safe if you're the sole author of this branch."

If force push: confirm once more with AskUserQuestion (Yes / No), then:
```bash
git push --force-with-lease origin $(git branch --show-current)
```

## Step 4: Summary

Show:
- Branch pushed
- New HEAD: `git rev-parse --short HEAD`
- Remote URL: `git remote get-url origin`
