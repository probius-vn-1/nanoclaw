/**
 * detect-node-type.js
 *
 * Parses a Figma URL and determines whether the linked node is a
 * SECTION or a single FRAME (or other node type).
 *
 * Used by the figma-read skill to route to different analysis flows.
 *
 * Node types returned by the Figma API:
 *   SECTION  — a named grouping container in the canvas
 *   FRAME    — a single artboard / screen / component frame
 *   COMPONENT, COMPONENT_SET, GROUP, etc. — treated as frame-like
 */

/**
 * Extracts fileKey and nodeId from a Figma URL.
 *
 * Supported formats:
 *   figma.com/design/:fileKey/:name?node-id=:nodeId
 *   figma.com/design/:fileKey/branch/:branchKey/:name?node-id=:nodeId
 *   figma.com/board/:fileKey/:name?node-id=:nodeId
 *
 * @param {string} url
 * @returns {{ fileKey: string, nodeId: string | null }}
 */
function parseFigmaUrl(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);

  // figma.com/design/:fileKey/branch/:branchKey/...
  const branchIdx = parts.indexOf("branch");
  const fileKey = branchIdx !== -1 ? parts[branchIdx + 1] : parts[1];

  // node-id uses "-" in URLs but ":" in the API
  const rawNodeId = parsed.searchParams.get("node-id");
  const nodeId = rawNodeId ? rawNodeId.replace(/-/g, ":") : null;

  return { fileKey, nodeId };
}

/**
 * NODE_CATEGORY maps Figma API node types to one of two routing categories:
 *   "section" — the link points to a section (multiple frames / screens)
 *   "frame"   — the link points to a single design frame
 *   "unknown" — type not yet handled
 */
const NODE_CATEGORY = {
  SECTION: "section",
  FRAME: "frame",
  COMPONENT: "frame",
  COMPONENT_SET: "frame",
  GROUP: "frame",
  INSTANCE: "frame",
};

/**
 * Detects whether a Figma node is a section or a single frame.
 *
 * @param {string} nodeType  — the `type` field from the Figma API node object
 * @returns {"section" | "frame" | "unknown"}
 */
function detectNodeCategory(nodeType) {
  return NODE_CATEGORY[nodeType?.toUpperCase()] ?? "unknown";
}

// ─── CLI usage ────────────────────────────────────────────────────────────────
// node detect-node-type.js <figma-url> <node-type-from-api>
//
// Example:
//   node detect-node-type.js "https://figma.com/design/abc123/App?node-id=1-2" SECTION
//
if (typeof process !== "undefined" && process.argv[1]?.endsWith("detect-node-type.js")) {
  const [, , url, nodeType] = process.argv;

  if (!url) {
    console.error("Usage: node detect-node-type.js <figma-url> [node-type]");
    process.exit(1);
  }

  const { fileKey, nodeId } = parseFigmaUrl(url);
  const category = nodeType ? detectNodeCategory(nodeType) : "unknown";

  console.log(JSON.stringify({ fileKey, nodeId, nodeType, category }, null, 2));
}

module.exports = { parseFigmaUrl, detectNodeCategory };
