## Changes Plan

### 1. Fix Persona Dropdown Z-Index (SelectContent overlapped by map)

- In `StorefrontPanel.tsx`, add `z-50` or `style={{ zIndex: 50 }}` to the `SelectContent` component so it renders above the Leaflet map.

### 2. Show Street Names on Map

- In `LeafletHexMap.tsx`, switch tile layer from `light_all` to OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) which show full street names for Bengaluru, or use CartoDB Voyager (`voyager_labels_under`) which has street names on a light background.

### 3. Connect n8n as the AI Brain

- Use the n8n MCP connector to connect the user's n8n instance.
- Create a document (`/mnt/documents/n8n-flow-guide.md`) with:
  - Full prompt/system instructions for the fulfillment agent
  - `skills.md` content (TES formula, persona configs, rider database schema, hex grid details)
  - n8n flow design: HTTP webhook trigger → AI agent node (with skills.md as context) → respond with structured JSON
  - API documentation for calling the n8n webhook from the edge function
- Update `supabase/functions/fulfillment-agent/index.ts` to call the n8n webhook URL instead of Lovable AI gateway (once user provides the webhook URL as a secret).

### 4. Make Agent Pipeline Collapsible/Expandable

- In `ControlTowerPanel.tsx`, wrap the Agent Pipeline section with `Collapsible` from shadcn, defaulting to expanded. Each pipeline step can also be individually collapsible to show/hide its output JSON.

### 5. Promise Agent: Calculate TES for P=5..18 with O2S + S2D

- In `simulation.ts`, update `calculateTES` to iterate P from 5 to 18 (instead of 8 to 15).
- Add O2S (Order-to-Store) calculation: `O2S = pickingSLA + pickingVariance + packingSLA + packingVariance`.
- Update planned delivery: `D = O2S + S2D` (instead of `s2dMinutes + 2 + pickingVariance`).
- Find the P that yields the **minimum** TES (user said "assign promise for min TES" — this means the tightest promise that still has acceptable TES, i.e., the most aggressive promise).
- Update the Agent Terminal logs in `Index.tsx` to show the full breakdown of all P=5..18 TES values.

### 6. Store Ops: Picking & Packing Time Simulator

- In `StoreOpsPanel.tsx`, add a new section (or tab) "Store Config" with sliders:
  - Avg Picking Time (1–10 min, default 3)
  - Picking Variance (0–3 min, default 0.2)
  - Avg Packing Time (1–5 min, default 2)
  - Packing Variance (0–3 min, default 0.3)
- Lift these values as state in `Index.tsx` (replace the current hardcoded `pickingVariance` and `packingVariance`) and pass them down to both `StoreOpsPanel` (for editing) and the checkout flow (for TES calculation).

### 7. Recovery Agent: Use Actual O2S

- When recovery is triggered (delay injected), recalculate TES using actual elapsed O2S time from order start instead of the planned O2S. Pass this actual O2S into the promise agent formula for re-optimization.

### Files to Modify

- `src/components/StorefrontPanel.tsx` — Fix dropdown z-index
- `src/components/LeafletHexMap.tsx` — Switch to street-name tiles
- `src/components/ControlTowerPanel.tsx` — Add collapsible pipeline sections
- `src/lib/simulation.ts` — Expand P range to 5-18, add O2S calc, update D formula
- `src/pages/Index.tsx` — Lift picking/packing state, pass to components, update TES call with O2S
- `src/components/StoreOpsPanel.tsx` — Add Store Config section with sliders
- `supabase/functions/fulfillment-agent/index.ts` — Prepare for n8n webhook integration

### Files to Create

- `/mnt/documents/n8n-flow-guide.md` — Prompt, skills.md, and n8n flow design with API docs

### Implementation Order

1. Fix dropdown z-index + street-name tiles
2. Update TES formula (P=5..18, O2S+S2D)
3. Add Store Config sliders in StoreOps, lift state
4. Make pipeline collapsible
5. Recovery agent with actual O2S
6. Connect n8n + generate flow guide document