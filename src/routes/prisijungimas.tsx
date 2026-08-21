import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/prisijungimas")({
  head: () => ({
    meta: [
      { title: "Prisijungimas — Revoo administravimas" },
      { name: "description", content: "Revoo administravimo srities prisijungimas." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/admin/uzklausos", replace: true });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${window.location.origin}/prisijungimas` },
            });
      if (error) throw error;
      await navigate({ to: "/admin/uzklausos", replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Prisijungti nepavyko. Patikrinkite duomenis.",
      );
    } finally {
      setBusy(false);
    }
  };


  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4 py-16">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-[0_20px_60px_-45px_rgba(8,32,30,0.6)]"
      >
        <p className="eyebrow text-ink-soft">Revoo</p>
        <h1 className="mt-2 font-display text-3xl text-ink">Administravimas</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {mode === "signin"
            ? "Prisijunkite, kad matytumėte užklausas."
            : "Susikurkite paskyrą. Administratoriaus teises suteiks Revoo komanda."}
        </p>

        <label htmlFor="email" className="eyebrow mt-7 mb-2 block text-ink-soft">
          El. paštas
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-ink/15 bg-cream/40 px-4 py-3 text-[0.95rem] text-ink outline-none transition-colors focus:border-teal-500"
        />

        <label htmlFor="password" className="eyebrow mt-5 mb-2 block text-ink-soft">
          Slaptažodis
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-ink/15 bg-cream/40 px-4 py-3 text-[0.95rem] text-ink outline-none transition-colors focus:border-teal-500"
        />

        <button
          type="submit"
          disabled={busy}
          className="mt-7 w-full rounded-full bg-teal-700 px-6 py-3.5 font-medium text-cream transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy
            ? mode === "signin"
              ? "Jungiamasi…"
              : "Kuriama…"
            : mode === "signin"
              ? "Prisijungti"
              : "Sukurti paskyrą"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          {mode === "signin" ? "Neturite paskyros? Susikurti" : "Jau turite paskyrą? Prisijungti"}
        </button>

      </form>
    </main>
  );
}
