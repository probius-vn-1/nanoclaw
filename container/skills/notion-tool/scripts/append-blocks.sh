#!/bin/bash
# Append arbitrary block children to a Notion block/page.
# Usage: echo '<json_children_array>' | ./append-blocks.sh <parent_block_id> [--after <block_id>]
# --after: insert children after a specific sibling block (for positioning)
set -euo pipefail

PARENT_ID="$1"
shift
AFTER_ID=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --after) AFTER_ID="$2"; shift 2 ;;
    *) shift ;;
  esac
done

CHILDREN=$(cat)

# Load .env from project root (current working directory)
[ -f ".env" ] && source ".env"

if [ -z "${NOTION_API_TOKEN:-}" ]; then
  echo "Error: NOTION_API_TOKEN not set in .env" >&2
  exit 1
fi

BODY="{\"children\": $CHILDREN"
if [ -n "$AFTER_ID" ]; then
  BODY="$BODY, \"after\": \"$AFTER_ID\""
fi
BODY="$BODY}"

curl -s -X PATCH "https://api.notion.com/v1/blocks/${PARENT_ID}/children" \
  -H "Authorization: Bearer $NOTION_API_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d "$BODY"
