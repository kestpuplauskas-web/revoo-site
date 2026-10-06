import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Building2,
  FilePenLine,
  FolderKanban,
  Images,
  Inbox,
  NotepadText,
  Send,
  Tag,
  Type,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getMyRole, getUnreadCount } from "@/lib/leads.functions";
import { ensureProfile } from "@/lib/registry.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchRole = useServerFn(getMyRole);
  const fetchUnread = useServerFn(getUnreadCount);
  const bootstrapProfile = useServerFn(ensureProfile);

  const role = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const unread = useQuery({
    queryKey: ["leads-unread"],
    queryFn: () => fetchUnread(),
    enabled: role.data?.isAdmin === true,
  });
  useQuery({
    queryKey: ["my-profile"],
    queryFn: () => bootstrapProfile(),
    enabled: role.data?.isAdmin === true,
  });

  const authUser = useQuery({
    queryKey: ["my-auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      const fullName = ((u?.user_metadata as { full_name?: string } | null)?.full_name ?? "").trim();
      return {
        fullName: fullName || (u?.email ?? ""),
        email: u?.email ?? "",
      };
    },
    enabled: role.data?.isAdmin === true,
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/prisijungimas/", replace: true });
  };

  if (role.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream/60 text-sm text-ink-soft">
        Kraunama…
      </main>
    );
  }

  if (!role.data?.isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream/60 px-4 text-center">
        <div>
          <p className="font-display text-2xl text-ink">Neturite administratoriaus teisių</p>
          <p className="mt-2 text-sm text-ink-soft">
            Susisiekite su Revoo komanda, kad jūsų paskyrai būtų suteikta „admin“ rolė.
          </p>
          <button onClick={signOut} className="mt-6 text-sm text-teal-700 underline">
            Atsijungti
          </button>
        </div>
      </main>
    );
  }

  const unreadCount = unread.data?.count ?? 0;

  return (
    <div className="min-h-screen bg-cream/60 lg:flex">
      <aside className="border-b border-ink/10 bg-white px-4 py-5 lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0 lg:px-5 lg:py-8">
        <p className="eyebrow text-ink-soft">REVOO.</p>
        <p className="mt-1 font-display text-xl text-ink">Administravimas</p>

        <nav aria-label="Administravimo meniu" className="mt-7 grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
          <NavGroup label="Darbo sritis">
            <NavItem to="/admin/uzklausos/" icon={<Inbox className="h-4 w-4" aria-hidden="true" />} badge={unreadCount}>
              Užklausos
            </NavItem>
            <NavItem to="/admin/registras/" icon={<Building2 className="h-4 w-4" aria-hidden="true" />}>
              Klientų registras
            </NavItem>
            <NavItem to="/admin/projektai/" icon={<FolderKanban className="h-4 w-4" aria-hidden="true" />}>
              Valdomi projektai
            </NavItem>
            <NavItem to="/admin/kampanijos/" icon={<Send className="h-4 w-4" aria-hidden="true" />}>
              Kampanijos
            </NavItem>
          </NavGroup>

          <NavGroup label="Valdymas">
            <NavItem to="/admin/analitika/" icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}>
              Analitika
            </NavItem>
            <NavItem to="/admin/kainodara/" icon={<Tag className="h-4 w-4" aria-hidden="true" />}>
              Kainodara
            </NavItem>
            <NavItem to="/admin/straipsniai/" icon={<FilePenLine className="h-4 w-4" aria-hidden="true" />}>
              Straipsniai
            </NavItem>
            <NavItem to="/admin/homepage/" icon={<Images className="h-4 w-4" aria-hidden="true" />}>
              Pagrindinis puslapis
            </NavItem>
            <NavItem to="/admin/tekstai/" icon={<Type className="h-4 w-4" aria-hidden="true" />}>
              Tekstai
            </NavItem>
            <NavItem to="/admin/sablonai/" icon={<NotepadText className="h-4 w-4" aria-hidden="true" />}>
              Šablonai
            </NavItem>
          </NavGroup>

          <NavGroup label="Nustatymai">
            <NavItem to="/admin/vartotojai/" icon={<Users className="h-4 w-4" aria-hidden="true" />}>
              Vartotojai
            </NavItem>
          </NavGroup>
        </nav>

        <button
          onClick={signOut}
          className="mt-12 w-full rounded-full border border-ink/15 px-5 py-2.5 text-sm text-ink transition-colors hover:bg-ink hover:text-cream lg:w-auto"
        >
          Atsijungti
        </button>
        {authUser.data ? (
          <p className="mt-3 text-sm text-ink-soft">{authUser.data.fullName}</p>
        ) : null}
      </aside>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`nav-${label.toLocaleLowerCase("lt").replaceAll(" ", "-")}`}>
      <h2
        id={`nav-${label.toLocaleLowerCase("lt").replaceAll(" ", "-")}`}
        className="px-3 text-[11px] font-semibold uppercase text-muted-foreground"
      >
        {label}
      </h2>
      <div className="mt-2 flex flex-col gap-1">{children}</div>
    </section>
  );
}

function NavItem({
  to,
  icon,
  badge,
  children,
}: {
  to:
    | "/admin/uzklausos/"
    | "/admin/straipsniai/"
    | "/admin/projektai/"
    | "/admin/registras/"
    | "/admin/sablonai/"
    | "/admin/analitika/"
    | "/admin/vartotojai/"
    | "/admin/tekstai/"
    | "/admin/kainodara/"
    | "/admin/homepage/";
  icon: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: false }}
      activeProps={{ className: "bg-accent font-semibold text-accent-foreground" }}
      inactiveProps={{ className: "text-muted-foreground hover:bg-muted/70 hover:text-foreground" }}
      className="flex min-h-11 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{children}</span>
      {badge ? (
        <span className="min-w-5 rounded-full bg-amber px-1.5 py-0.5 text-center text-xs font-semibold text-ink">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
