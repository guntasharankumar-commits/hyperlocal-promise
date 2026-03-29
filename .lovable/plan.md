

## Plan: Generate Comprehensive System Documentation PDF

### Overview

Create a detailed PDF document capturing all algorithms, logic, workflows, data models, and agent behaviors of the Q-Comm Control Tower hyperlocal fulfillment simulation system.

### Document Structure

**1. System Overview**
- Architecture: 3-panel layout (Storefront, Control Tower, Store Operations)
- Technology stack and purpose

**2. Data Models**
- User Personas (4 types with baseTESModifier, promisePadding)
- Store Config (picking/packing time + variance)
- Rider Database (5 riders with archetypes, ratings, speedFactor, localityAwareness, ordersCompleted per hex)
- Hex Grid (19 hexagons, 2 rings, lat/lng generation from store center at 12.9352N, 77.6120E)
- Order State Machine (BROWSE → CHECKOUT → OPTIMIZING → FULFILLMENT → RECOVERY → DELIVERED)
- Fulfillment Status (created → picked → packed → handover → intransit → delivered)

**3. Core Algorithms**
- O2S = avgPickingTime + pickingVariance + avgPackingTime + packingVariance
- S2D = hex.baseS2DMinutes + hex.variance
- Planned Delivery D = O2S + S2D
- TES Formula: `TES = W1*(10-P)^3 + W2*(P-D) + W3*(R-4) - Cost + PersonaModifier`
  - W1=1.2 (aggressiveness), W2_base=2.0 (feasibility, exponentially penalized when P<D), W3=5.0 (rider quality)
  - Cost = pickingVariance*0.5 + packingVariance*0.3
  - W2 dynamic: if P < D then W2 = W2_base * exp((D-P)*0.5)
- Optimization: iterate P=5..18, select P with MAXIMUM TES
- Rider Selection: for each idle rider, compute TES; pick rider yielding highest maxTES

**4. Promise Cache System**
- Pre-computes optimal promise for every persona x hex combination (4 personas x 19 hexes = 76 entries)
- Each entry stores top-3 promises (best + 2 alternatives)
- Three refresh triggers: 5-minute timer, rider freed, store config confirmed
- Full matrix logged to Agent Terminal on each refresh

**5. Agent Pipeline Workflow**
- Database Lookup → TES Optimization → Rider Assignment (sequential, with UI status indicators)
- Each step logs input/output JSON

**6. Recovery Protocol**
- Triggered when delay injected at "picked" status
- Recalculates TES using actual elapsed O2S (wall-clock time since order start)
- Re-assigns rider based on localityAwareness ranking

**7. Store Operations**
- Draft config with confirm button (dirty state tracking)
- Config confirmation triggers cache refresh
- 3-tab management: Orders list, Pipeline queue, Riders (active/idle)

**8. Persona Weight Effects**
- Table showing how each persona shifts TES and promise outcomes

### Implementation

- Use Python with `reportlab` to generate the PDF
- Write to `/mnt/documents/qcomm-system-documentation.pdf`
- Include formatted tables, formula blocks, flowcharts (ASCII), and data model diagrams
- QA via pdftoppm + visual inspection

### Single Script

One Python script at `/tmp/gen_doc.py` that builds the entire PDF with all sections, tables, and diagrams.

