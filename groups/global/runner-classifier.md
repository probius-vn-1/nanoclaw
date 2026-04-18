# Runner Classifier Rules

These rules determine whether an incoming message is routed to the **host runner**
(claude CLI running natively on macOS) or the **container runner** (sandboxed Linux container).

## Use the host runner when the task needs:

- A real web browser — live browsing, clicking, form submission, screenshots of live pages
- **LinkedIn browsing** — the `/linkedin` skill requires Chrome with a logged-in session; always route to host
- macOS GUI apps — Finder, System Settings, AppleScript, menu bar, Dock, desktop automation
- Local user files outside the project workspace — ~/Downloads, ~/Desktop, ~/Documents, ~/Pictures
- Screen capture or window control
- Any capability that requires the physical macOS desktop environment

## Use the container runner for everything else:

- Writing, editing, or explaining code
- Analysis, research, or general knowledge questions
- API calls or web requests that don't require a real browser session
- File operations within the project workspace
- Scheduled tasks and background jobs
- Any task that works in a headless Linux environment
