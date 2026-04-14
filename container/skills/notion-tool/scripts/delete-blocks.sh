#!/bin/bash
# Delete Notion blocks by ID. Reads one block ID per line from stdin.
# Usage: echo -e "id1\nid2\nid3" | ./delete-blocks.sh
set -euo pipefail

# Load .env from project root (current working directory)
[ -f ".env" ] && source ".env"

if [ -z "${NOTION_API_TOKEN:-}" ]; then
  echo "Error: NOTION_API_TOKEN not set in .env" >&2
  exit 1
fi

while IFS= read -r BLOCK_ID; do
  [ -z "$BLOCK_ID" ] && continue
  curl -s -X DELETE "https://api.notion.com/v1/blocks/${BLOCK_ID}" \
    -H "Authorization: Bearer $NOTION_API_TOKEN" \
    -H "Notion-Version: 2022-06-28" > /dev/null
  echo "Deleted $BLOCK_ID"
done
