

## Q-Comm Control Tower — Three-Panel Architecture with AI Backend

### Current State
- Two-panel layout: Storefront (left) + Store Ops (right)
- 7 hexagons around a dark-themed map
- Single active order at a time
- All logic runs client-side in `simulation.ts`
- 4 personas already exist in code

### What Changes

**1. Expanded Hex Grid (simulation.ts)**
- Increase from 7 to 19 hexagons (two rings around the store) with proper lat/lng offsets
- Labels H0–H18, each with computed S2D times based on distance from store

**2. Light Map Tiles (LeafletHexMap.tsx)**
- Switch CartoDB dark tiles to CartoDB Positron (light) tiles
- Adjust hex polygon colors for visibility on light background

**3. Multi-Order Support (Index.tsx + StorefrontPanel.tsx)**
- Replace single `order` state with `activeOrders: OrderData[]` array
- Left panel gets a "New Order" button that lets you pick a persona and hex, then place the order
- Each order tracked independently with its own rider, status, and delays
- Storefront shows a list of active orders with status badges, plus the browse/checkout flow for new orders

**4. Three-Panel Layout**

```text
┌──────────────┬──────────────────────┬──────────────┐
│  STOREFRONT   │   CONTROL TOWER      │  STORE OPS   │
│  (Consumer)   │   (Agent Monitor)    │  (Admin)     │
│               │                      │              │
│ • Persona     │ • Agent pipeline     │ • Order queue│
│ • Map + Hex   │   visualization      │ • Delay mgmt│
│ • Cart/Order  │ • TES calculation    │ • Riders     │
│ • Multi-order │ • Rider assignment   │              │
│   list        │ • Recovery events    │              │
│               │ • Agent logs         │              │
└──────────────┴──────────────────────┴──────────────┘
```

**5. Central Control Tower Panel (new `ControlTowerPanel.tsx`)**

Shows the real-time backend agent pipeline as a visual flow:

- **Pipeline Steps** rendered as a vertical flow diagram:
  - `PROMISE AGENT` → TES optimization result, selected P value
  - `ASSIGNMENT AGENT` → Rider selection reasoning, Google Maps ETA reference
  - `RECOVERY AGENT` → Triggered on delay, re-assignment logic
  - `DATABASE AGENT` → Customer history lookup, store health check

- **Agent Logs Terminal** (moved from BrainPanel) with color-coded entries per agent

- **TES Gauge** displayed prominently at the top for the currently selected/active order

- Each pipeline step shows: status (pending/running/done), input data, output data, and timing

**6. Claude AI Backend Integration**

This requires a Supabase edge function + Lovable AI gateway (since Claude isn't available via the gateway, we'll use the available AI models as the "brain").

**Edge Function: `supabase/functions/fulfillment-agent/index.ts`**
- Receives order context (hex, persona, store health, rider pool)
- Calls Lovable AI with a structured system prompt that acts as the fulfillment brain
- Uses tool-calling to return structured decisions:
  - `calculate_tes` → optimal promise
  - `assign_rider` → best rider with reasoning
  - `recovery_action` → re-assignment decision
  - `update_database` → persist order/customer/rider data

**Database Tables (Supabase migrations):**
- `customers` — id, name, persona, historical_tes, order_count
- `orders` — id, customer_id, hex_id, persona, promise_minutes, actual_minutes, tes_score, rider_id, status, delays, timestamps
- `store_health` — picking_sla, packing_sla, picking_variance, packer_congestion
- `riders` — id, name, archetype, rating, speed_factor, locality_awareness, status, hex_position, orders_per_hex (jsonb)
- `store_locations` — id, name, lat, lng, hex_id

**Frontend Integration:**
- On checkout, the Storefront calls the edge function instead of running `calculateTES` locally
- Control Tower panel streams the AI response and renders each agent step as it arrives
- Results (TES, rider assignment) update the order state and map in real-time

### Technical Details

**Files to create:**
- `src/components/ControlTowerPanel.tsx` — Central panel with agent pipeline visualization
- `supabase/functions/fulfillment-agent/index.ts` — AI-powered fulfillment logic
- Supabase migrations for the 5 database tables
- `src/lib/api.ts` — Client-side functions to call the edge function

**Files to modify:**
- `src/lib/simulation.ts` — Expand hex grid to 19, add multi-order helpers
- `src/components/LeafletHexMap.tsx` — Light tiles, support multiple rider markers, more hexagons
- `src/components/StorefrontPanel.tsx` — Multi-order UI, order list
- `src/components/StoreOpsPanel.tsx` — Multi-order management
- `src/pages/Index.tsx` — Three-column layout, multi-order state, edge function integration
- `src/index.css` — No theme changes needed (dark theme stays for UI, only map goes light)

**Prerequisites:**
- Lovable Cloud must be enabled for the edge function + Lovable AI gateway
- Supabase connection for database tables

### Implementation Order
1. Expand hex grid to 19 hexagons + light map tiles
2. Multi-order state management in Index.tsx
3. Update StorefrontPanel for multi-order flow
4. Create ControlTowerPanel with agent pipeline visualization
5. Update layout to three-column
6. Set up Supabase tables (customers, orders, riders, store_health, store_locations)
7. Create fulfillment-agent edge function with Lovable AI
8. Wire frontend to call edge function on checkout and stream agent steps to Control Tower

