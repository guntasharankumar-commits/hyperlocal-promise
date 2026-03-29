import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, payload } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "optimize") {
      // TES optimization + rider assignment
      systemPrompt = `You are a Q-Commerce fulfillment optimization AI agent for a dark store in Bengaluru.
You must analyze the order context and make optimal decisions.

You have access to these tools:
1. calculate_tes - Calculate Trust Equity Score and find optimal promise
2. assign_rider - Select the best rider for the delivery
3. store_health_check - Check current store operational metrics

Always respond with structured JSON decisions. Be concise and data-driven.`;

      userPrompt = `Optimize this order:
- Customer Persona: ${payload.persona} (TES modifier: ${payload.personaModifier})
- Delivery Hex: ${payload.hexLabel} (S2D: ${payload.s2dMinutes} min)
- Store picking variance: ${payload.pickingVariance}
- Packer congestion: ${payload.packerCongestion}
- Available riders: ${JSON.stringify(payload.riders.map((r: any) => ({
  name: r.name, archetype: r.archetype, rating: r.rating, speed: r.speedFactor, locality: r.localityAwareness, hexPosition: r.hexPosition
})))}

Calculate the optimal promise (P) between 8-15 minutes that maximizes TES using:
TES = (1.2 * (10-P)^3) + (W2 * (P-D)) + (5 * (R-4)) - Cost
where D = S2D + 2 + pickingVariance, W2 increases exponentially if P < D.

Then select the best rider considering rating, speed, and proximity to delivery hex.

Respond with your analysis and decisions.`;

    } else if (action === "recovery") {
      systemPrompt = `You are a Q-Commerce recovery agent. A delivery is experiencing delays and you must decide on recovery actions to protect the TES score.`;

      userPrompt = `Recovery needed:
- Order: ${payload.orderId}
- Current status: ${payload.status}
- Delay: ${payload.delaySec}s at ${payload.delayStatus}
- Current rider: ${payload.currentRider?.name} (${payload.currentRider?.archetype})
- Available riders: ${JSON.stringify(payload.availableRiders?.map((r: any) => ({
  name: r.name, rating: r.rating, locality: r.localityAwareness
})))}

Should we re-assign the rider? Analyze and recommend.`;

    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds at Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("fulfillment-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
