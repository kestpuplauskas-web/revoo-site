import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, FolderKanban, Inbox } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getMyRole, getUnreadCount } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchRole = useServerFn(getMyRole);
  const fetchUnread = useServerFn(getUnreadCount);

  const role = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const unread = useQuery({
    queryKey: ["leads-unread"],
    queryFn: () => fetchUnread(),
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
        <p className="eyebrow text-ink-soft">Revoo</p>
        <p className="mt-1 font-display text-xl text-ink">Administravimas</p>

        <nav className="mt-6 flex flex-wrap gap-1 lg:flex-col">
          <NavItem to="/admin/uzklausos/" icon={<Inbox className="h-4 w-4" aria-hidden="true" />} badge={unreadCount}>
            Užklausos
          </NavItem>
          <NavItem to="/admin/straipsniai/" icon={<FileText className="h-4 w-4" aria-hidden="true" />}>
            Straipsniai
          </NavItem>
          <NavItem to="/admin/projektai/" icon={<FolderKanban className="h-4 w-4" aria-hidden="true" />}>
            Valdomi projektai
          </NavItem>
        </nav>

        <button
          onClick={signOut}
          className="mt-8 w-full rounded-full border border-ink/15 px-5 py-2.5 text-sm text-ink transition-colors hover:bg-ink hover:text-cream lg:w-auto"
        >
          Atsijungti
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon,
  badge,
  children,
}: {
  to: "/admin/uzklausos/" | "/admin/straipsniai/" | "/admin/projektai/";
  icon: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: false }}
      activeProps={{ className: "bg-teal-700 text-cream" }}
      inactiveProps={{ className: "text-ink-soft hover:bg-cream/70 hover:text-ink" }}
      className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition-colors"
    >
      {icon}
      <span className="flex-1">{children}</span>
      {badge ? (
        <span className="rounded-full bg-amber px-2 py-0.5 text-xs font-semibold text-ink">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
