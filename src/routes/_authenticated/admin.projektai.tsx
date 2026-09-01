import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/projektai")({
  head: () => ({
    meta: [
      { title: "Valdomi projektai — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow text-ink-soft">Revoo administravimas</p>
        <h1 className="mt-1 font-display text-4xl text-ink">Valdomi projektai</h1>
        <div className="mt-8 rounded-3xl bg-white p-8 text-sm text-ink-soft shadow-[0_20px_60px_-50px_rgba(8,32,30,0.6)]">
          Ši skiltis ruošiama. Čia atsiras klientų objektai, jų diegimo būsena ir susijusi
          informacija.
        </div>
      </div>
    </main>
  );
}
