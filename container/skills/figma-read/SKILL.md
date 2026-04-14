---
name: figma-read
description: Analyze the Figma link provided
user_invocable: true
arguments: Figma URL to analyze
---

Analyze the Figma link provided: $ARGUMENTS

If no URL is provided, ask the user to share a Figma URL first.

---

## Token Budget

Figma API responses can be massive. Be defensive about what you pull into context.

- **Always start with `get_metadata`** — it's lightweight and tells you the node type, name, and children without fetching design details.
- **Prefer specific nodes over top-level pages.** If the user links to a page or section with many frames, list the children and ask which one to analyze — don't fetch `get_design_context` on the whole thing.
- **Watch for truncation.** If `get_design_context` returns a truncated response, do not retry with a broader scope. Work with what you have and suggest the user link to a smaller sub-frame.
- **Ask before large fetches.** If a section contains 5+ child frames or the node name suggests it's a full page (e.g. "Dashboard", "All Screens"), warn the user that the response will be large and ask whether to proceed or pick a specific frame.
- **One frame at a time.** Never call `get_design_context` on multiple nodes in parallel — process one, deliver results, then ask if the user wants another.
- **Skip the screenshot only when asked.** Screenshots add tokens but are valuable. Don't exclude them by default, but if the user is doing repeated reads, suggest skipping screenshots after the first.

---

## Step 1 — Parse & Route

Extract `fileKey` and `nodeId` from the URL (convert `-` → `:` in nodeId).
For branch URLs (`/design/:fileKey/branch/:branchKey/...`), use `branchKey` as fileKey.
For Make URLs (`/make/:makeFileKey/...`), use `makeFileKey` as fileKey.

Call `get_metadata` with `fileKey` and `nodeId`.

Route based on node type:
- `FRAME | COMPONENT | COMPONENT_SET | GROUP | INSTANCE` → **FRAME flow**
- `SECTION` → **SECTION flow**

---

## SECTION flow

Call `get_metadata` with `fileKey` and `nodeId` to retrieve the section's children.
List all direct child frames with their names and node IDs, then ask the user to pick one:

> **This link points to a section: "[sectionName]"**
>
> It contains these frames:
> 1. [frameName] — `nodeId`
> 2. [frameName] — `nodeId`
> ...
>
> Which frame should I analyze? (Enter a number or paste a different Figma link)

Once the user picks a frame, continue with the **FRAME flow** using that frame's `nodeId`.

---

## FRAME flow

### 1. Fetch

Call `get_design_context` with `fileKey` and `nodeId`.
Do not exclude the screenshot.

**Truncation check:** If the response indicates the design context was truncated (e.g. the frame is very large or deeply nested), add a `_warning` string to `meta` in the output and tell the user:

> **Warning: Design context was truncated due to frame size.**
> Colors and spacing may be incomplete. For full extraction, link to a specific sub-section or child frame instead of the full page.

Continue with the extraction — partial data is still useful — but flag any sections you cannot populate.

### 2. Extract annotations

Scan the `get_design_context` response for:
- **Designer annotations** — any text notes, comments, or instructions attached to the design (e.g. "Email is not a sidebar item anymore")
- **Component documentation links** — links to usage guidelines or docs
- **Design constraints** — min/max width, responsive behavior notes, fixed vs. scroll

These become the `annotations` array in the output.

### 3. Extract Design Spec

Build the following JSON object from the `get_design_context` response.
Omit any field that is empty or null — do not include empty arrays or objects.

```
{
  "meta": {
    "fileKey": string,
    "nodeId": string,
    "nodeName": string,
    "nodeType": string,
    "url": string,
    "_warning": string           // only if design context was truncated
  },
  "context": {
    "featureArea": string,        // e.g. "Asset detail sidebar"
    "role": string,               // e.g. "Activity feed panel"
    "layout": string,             // e.g. "Vertical stack: tabs → chip row → collapsible date sections"
    "visibleStates": string[]     // e.g. ["active tab: Activity", "selected chip: All"]
  },
  "annotations": [
    {
      "target": string,           // component or area this applies to, e.g. "Email field"
      "note": string,             // the designer's instruction or comment
      "type": string              // "instruction" | "constraint" | "documentation"
    }
  ],
  "components": [
    {
      "name": string,             // Figma component name, e.g. "<Chip>"
      "library": string,          // e.g. "MUI" — omit if unknown
      "nodeId": string,
      "parentContainer": string,  // name of the nearest named parent frame, e.g. "History"
      "category": string,         // see categories below
      "props": object,            // only props visible in the design: variant, size, color, state
      "textContent": string,      // visible text inside the component, e.g. "All" — omit if none
      "iconName": string,         // icon identifier, e.g. "expand_more" — required for Icon/IconButton
      "iconStyle": string,        // "rounded" or "outlined" — required for Icon/IconButton
      "usage": string,            // what this component does in context
      "codeConnect": string       // include only if a Code Connect snippet was returned
    }
  ],
  "typography": [
    {
      "token": string,            // e.g. "typography/body2" — omit if no token exists
      "font": {
        "family": string,
        "weight": number,
        "size": number,           // in px
        "letterSpacing": number
      },
      "color": {
        "token": string,          // prefer token name over raw hex
        "hex": string
      },
      "sample": string            // short example of actual text content
    }
  ],
  "colors": {
    "background": [{ "token": string, "hex": string }],
    "text":       [{ "token": string, "hex": string }],
    "border":     [{ "token": string, "hex": string }],
    "interactive":[{ "token": string, "hex": string }]
  },
  "spacing": {
    "padding":      [{ "value": string, "context": string }],
    "gap":          [{ "value": string, "context": string }],
    "borderRadius": [{ "value": string, "context": string }],
    "borders":      [{ "value": string, "context": string }]
  }
}
```

**Extraction rules:**

- `components.category` must be one of: `navigation | input | action | display | layout | feedback | data`
- `components.parentContainer`: use the nearest named ancestor frame — skip anonymous wrappers (e.g. "Frame 2558", "Frame 2574")
- `components.textContent`: include any visible static text rendered inside the component
- `components.iconName` and `components.iconStyle`: **required** on every `<Icon>` and `<IconButton>`; `iconStyle` must be `"rounded"` or `"outlined"`
- `annotations`: capture every designer note, comment, or instruction from the design — these are critical for downstream compliance checking
- `typography`: deduplicate by token name — list each distinct style once; do not include `lineHeight`
- `colors`: only list tokens actually used in this node; always prefer `var(--x)` names over raw hex
- `spacing`: only record values that appear on structural containers or repeat 2+ times; widths and heights are intentionally excluded — this design is responsive and those values will differ across breakpoints
- If a Code Connect snippet is returned for a component, add its import line as `codeConnect`

### 4. Write output

Serialize the JSON with 2-space indentation.
Write it to `.claude/tmp/figma-spec.tmp.json` (relative to the project root).

### 5. Confirm

Reply to the user with only:
- Node name and type
- Component count grouped by category
- Annotations summary (count + one-line preview of each)
- List of any colors or text styles that have no token name (raw hex/values only) — label these **unresolved tokens**
- If truncation occurred, repeat the warning with guidance to link a sub-frame

Do not print the full JSON in your response.

---

## Pipeline contract

`figma-spec.tmp.json` is a temporary handoff file.

- **figma-read** writes it.
- **design-compliance-checker** (or any downstream agent) deletes it when done.
- **figma-read does not delete the file.** If the user runs figma-read without a downstream agent and the old file lingers, that is fine — figma-read always overwrites it on the next run.
