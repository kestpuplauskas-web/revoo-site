import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { BTN, CARD, INPUT } from "@/components/admin/ui";

export const Route = createFileRoute("/slaptazodis")({
  head: () => ({
    meta: [
      { title: "Slaptažodžio susikūrimas — Revoo" },
      { name: "description", content: "Revoo administravimo paskyros slaptažodžio susikūrimas." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Slaptažodžio susikūrimas — Revoo" },
      { property: "og:description", content: "Revoo administravimo paskyros slaptažodžio susikūrimas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PasswordPage,
});

function PasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
        return;
      }
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
      const type = url.searchParams.get("type");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) setReady(true);
        return;
      }
      if (tokenHash && (type === "invite" || type === "recovery" || type === "signup")) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as "invite" | "recovery" | "signup",
          token_hash: tokenHash,
        });
        if (!error) setReady(true);
      }
    };
    void bootstrap();

    return () => subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Slaptažodžiai nesutampa.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Slaptažodis išsaugotas.");
      await navigate({ to: "/admin/uzklausos/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko išsaugoti.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream/60 px-4">
      <div className={`${CARD} w-full max-w-md p-8`}>
        <p className="eyebrow text-ink-soft">REVOO.</p>
        <h1 className="mt-1 font-display text-2xl text-ink">Susikurkite slaptažodį</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {ready
            ? "Įveskite naują slaptažodį ir galėsite prisijungti."
            : "Atidarykite šį puslapį per kvietimo laiške esančią nuorodą."}
        </p>

        {ready ? (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Naujas slaptažodis"
              className={INPUT}
            />
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Pakartokite slaptažodį"
              className={INPUT}
            />
            <button type="submit" disabled={busy} className={`${BTN} w-full`}>
              {busy ? "Saugoma…" : "Išsaugoti"}
            </button>
          </form>
        ) : null}

        <a href="/prisijungimas/" className="mt-6 block text-center text-xs text-ink-soft hover:underline">
          Grįžti į prisijungimą
        </a>
      </div>
    </main>
  );
}
