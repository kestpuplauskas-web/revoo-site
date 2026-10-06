import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { unsubscribeByToken } from "@/lib/campaigns.functions";

export const Route = createFileRoute("/atsisakyti")({
  validateSearch: z.object({ t: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Atsisakyti laiškų — Revoo" },
      { name: "description", content: "Atsisakykite Revoo el. laiškų vienu paspaudimu." },
      { property: "og:title", content: "Atsisakyti laiškų — Revoo" },
      { property: "og:description", content: "Atsisakykite Revoo el. laiškų vienu paspaudimu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { t } = Route.useSearch();
  const unsub = useServerFn(unsubscribeByToken);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const valid = !!t && z.string().uuid().safeParse(t).success;

  const confirm = async () => {
    if (!valid) return;
    setState("busy");
    try {
      const r = await unsub({ data: { token: t! } });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream/60 px-4">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl text-ink">
          {state === "done" ? "Jūs atsisakėte laiškų" : "Atsisakyti Revoo laiškų"}
        </h1>
        <p className="mt-3 text-sm text-ink-soft">
          {state === "done"
            ? "Daugiau mūsų laiškų negausite. Ačiū, kad pranešėte."
            : state === "error" || !valid
              ? "Nuoroda netinkama arba pasenusi. Parašykite mums hello@revoo.site."
              : "Paspauskite mygtuką ir daugiau nebegausite mūsų laiškų."}
        </p>
        {valid && state !== "done" && state !== "error" ? (
          <button
            onClick={confirm}
            disabled={state === "busy"}
            className="mt-6 min-h-11 rounded-full bg-ink px-6 py-2.5 text-sm text-cream disabled:opacity-50"
          >
            {state === "busy" ? "Vykdoma…" : "Atsisakyti"}
          </button>
        ) : null}
      </div>
    </main>
  );
}
