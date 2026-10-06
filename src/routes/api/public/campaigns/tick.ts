import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/campaigns/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-tick-token") ?? "";
        if (token.length < 32) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("campaign_runtime").select("tick_token").eq("singleton", true).single();
        if (!data || data.tick_token !== token) return new Response("Unauthorized", { status: 401 });
        const { processTick } = await import("@/lib/campaigns.server");
        const result = await processTick(supabaseAdmin);
        return Response.json(result);
      },
    },
  },
});
