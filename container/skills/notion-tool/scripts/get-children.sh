#!/bin/bash
# Get all children of a Notion block/page, with pagination.
# Usage: ./get-children.sh <block_id> [--ids-only]
# --ids-only: print only block IDs, one per line
set -euo pipefail

BLOCK_ID="$1"
IDS_ONLY="${2:-}"

# Load .env from project root (current working directory)
[ -f ".env" ] && source ".env"

if [ -z "${NOTION_API_TOKEN:-}" ]; then
  echo "Error: NOTION_API_TOKEN not set in .env" >&2
  exit 1
fi

ALL_RESULTS="[]"
CURSOR=""

while true; do
  URL="https://api.notion.com/v1/blocks/${BLOCK_ID}/children?page_size=100"
  [ -n "$CURSOR" ] && URL="${URL}&start_cursor=${CURSOR}"

  RESPONSE=$(curl -s -X GET "$URL" \
    -H "Authorization: Bearer $NOTION_API_TOKEN" \
    -H "Notion-Version: 2022-06-28")

  ALL_RESULTS=$(echo "$ALL_RESULTS" "$RESPONSE" | python3 -c "
import json, sys
parts = sys.stdin.read().split('{\"object\":\"list\"')
existing = json.loads(parts[0])
new_data = json.loads('{\"object\":\"list\"' + parts[1])
existing.extend(new_data.get('results', []))
print(json.dumps(existing))
" 2>/dev/null || echo "$ALL_RESULTS")

  HAS_MORE=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('has_more', False))")
  if [ "$HAS_MORE" = "True" ]; then
    CURSOR=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('next_cursor',''))")
  else
    break
  fi
done

if [ "$IDS_ONLY" = "--ids-only" ]; then
  echo "$ALL_RESULTS" | python3 -c "
import json, sys
for b in json.load(sys.stdin):
    print(b['id'])
"
else
  echo "$ALL_RESULTS" | python3 -c "
import json, sys
for i, b in enumerate(json.load(sys.stdin)):
    bt = b['type']
    rt = b.get(bt, {}).get('rich_text', [])
    text = ' '.join(t.get('plain_text','') for t in rt)[:80]
    hc = ' [+children]' if b.get('has_children') else ''
    print(f'{i:3d}. {b[\"id\"]} | {bt:25s} | {text}{hc}')
"
fi
