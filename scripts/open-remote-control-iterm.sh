#!/bin/bash
# Opens an iTerm window with tabs:
#   - Status tab (temporary): shows startup progress, closes once ready
#   - Claude tab: interactive claude session with remote control
#   - Logs tab: NanoClaw logs (tail -f)
# Launched at login via com.nanoclaw.claude-remote-control LaunchAgent.

export PATH="/usr/local/bin:/usr/bin:/bin:/Users/probius/.local/bin"
export HOME="/Users/probius"

osascript <<'EOF'
tell application "iTerm"
    activate

    set newWindow to (create window with default profile)

    -- Status tab (shown first while things load)
    set statusTab to current tab of newWindow
    set statusSession to current session of statusTab
    tell statusSession
        write text "for i in 5 4 3 2 1; do printf \"\\r  Probius VN-1 is waking up... (${i}s)\"; sleep 1; done"
    end tell

    -- Claude tab
    set claudeTab to (create tab with default profile of newWindow)
    set claudeSession to current session of claudeTab
    tell claudeSession
        write text "cd /Users/probius/VN-1-Probius/nanoclaw && claude"
    end tell

    -- Logs tab
    set logsTab to (create tab with default profile of newWindow)
    tell current session of logsTab
        write text "tail -f /Users/probius/VN-1-Probius/nanoclaw/logs/nanoclaw.log"
    end tell

    -- Show status tab while claude loads
    select statusTab
    delay 5

    -- Enable remote control on claude session
    tell claudeSession
        write text "/remote-control --name vn-1-probius-nanoclaw"
    end tell

    -- Close status tab and land on claude (now tab 1 after status closes)
    close statusTab
    select (tab 1 of newWindow)
end tell
EOF
