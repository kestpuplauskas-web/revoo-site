import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { BTN, BTN_GHOST, CARD, Field, INPUT, Pill } from "@/components/admin/ui";
import {
  deleteUser,
  getMyAccess,
  inviteUser,
  listUsers,
  setUserRole,
  type AppUserRole,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/admin/vartotojai")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: UsersPage,
});

const ROLE_LABEL: Record<AppUserRole, string> = {
  admin: "Administratorius",
  developer: "Programuotojas",
};

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("lt-LT");
}

function UsersPage() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const invite = useServerFn(inviteUser);
  const changeRole = useServerFn(setUserRole);
  const removeUser = useServerFn(deleteUser);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppUserRole>("admin");

  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const inviteM = useMutation({
    mutationFn: () =>
      invite({
        data: {
          email,
          role,
          ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
          ...(typeof window !== "undefined" ? { origin: window.location.origin } : {}),
        },
      }),
    onSuccess: (res) => {
      toast.success(
        res.invited
          ? "Kvietimas išsiųstas el. paštu."
          : "Naudotojas jau egzistavo — išsiuntėme slaptažodžio susikūrimo laišką.",
      );
      setEmail("");
      setFullName("");
      void refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Nepavyko pakviesti."),
  });

  const roleM = useMutation({
    mutationFn: (vars: { userId: string; role: AppUserRole }) => changeRole({ data: vars }),
    onSuccess: () => {
      toast.success("Rolė pakeista.");
      void refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Nepavyko pakeisti."),
  });

  const deleteM = useMutation({
    mutationFn: (userId: string) => removeUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("Naudotojas pašalintas.");
      void refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Nepavyko pašalinti."),
  });

  return (
    <main className="px-4 py-8 lg:px-10">
      <p className="eyebrow text-ink-soft">Administravimas</p>
      <h1 className="mt-1 font-display text-3xl text-ink">Vartotojai</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">
        Pakvieskite žmogų el. paštu — jis gaus laišką su nuoroda susikurti slaptažodį. Yra dvi
        rolės: administratorius ir programuotojas.
      </p>

      <section className={`${CARD} mt-6 p-6`}>
        <h2 className="font-display text-xl text-ink">Pakviesti naudotoją</h2>
        <form
          className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr_0.8fr_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            inviteM.mutate();
          }}
        >
          <Field label="El. paštas">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT}
              placeholder="vardas@imone.lt"
            />
          </Field>
          <Field label="Vardas">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={INPUT}
              placeholder="Neprivaloma"
            />
          </Field>
          <Field label="Rolė">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AppUserRole)}
              className={INPUT}
            >
              <option value="admin">Administratorius</option>
              <option value="developer">Programuotojas</option>
            </select>
          </Field>
          <button type="submit" className={BTN} disabled={inviteM.isPending}>
            {inviteM.isPending ? "Siunčiama…" : "Pakviesti"}
          </button>
        </form>
      </section>

      <section className={`${CARD} mt-6 overflow-hidden`}>
        <div className="border-b border-ink/10 px-6 py-4">
          <h2 className="font-display text-xl text-ink">Prieigą turintys naudotojai</h2>
        </div>

        {users.isLoading ? (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">Kraunama…</p>
        ) : (users.data ?? []).length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">Naudotojų dar nėra.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {(users.data ?? []).map((u) => (
              <li key={u.userId} className="flex flex-wrap items-center gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{u.fullName || u.email || "—"}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {u.email} · pridėtas {fmt(u.createdAt)} · paskutinį kartą jungėsi{" "}
                    {fmt(u.lastSignInAt)}
                  </p>
                </div>

                <Pill tone={u.role === "developer" ? "accent" : "muted"}>{ROLE_LABEL[u.role]}</Pill>

                <select
                  value={u.role}
                  onChange={(e) =>
                    roleM.mutate({ userId: u.userId, role: e.target.value as AppUserRole })
                  }
                  className="rounded-2xl border border-ink/10 bg-white px-3 py-2 text-xs text-ink"
                  aria-label="Pakeisti rolę"
                >
                  <option value="admin">Administratorius</option>
                  <option value="developer">Programuotojas</option>
                </select>

                <button
                  type="button"
                  className={`${BTN_GHOST} px-3 py-2`}
                  aria-label="Pašalinti naudotoją"
                  onClick={() => {
                    if (window.confirm(`Pašalinti ${u.email}?`)) deleteM.mutate(u.userId);
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
