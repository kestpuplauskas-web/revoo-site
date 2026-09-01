import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  CLIENT_STATUSES,
  CURRENCIES,
  PROJECT_STATUSES,
  deleteClient,
  deleteProject,
  getClient,
  listConvertibleLeads,
  saveClient,
  saveContract,
  saveProject,
  type ProjectRow,
} from "@/lib/clients.functions";
import {
  CLIENT_STATUS_LABELS,
  NO_DATA,
  PROJECT_STATUS_LABELS,
  formatDate,
  formatMoney,
} from "@/lib/admin-format";
import {
  BTN,
  BTN_GHOST,
  CARD,
  Detail,
  EmptyState,
  Field,
  INPUT,
  LinkButtons,
  Pill,
} from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/projektai/$id")({
  head: () => ({
    meta: [
      { title: "Klientas — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: ClientPage,
});

type Tab = "main" | "projects" | "commercial" | "support" | "time" | "payments" | "activity";

const TABS: { key: Tab; label: string; ready: boolean }[] = [
  { key: "main", label: "Pagrindinis", ready: true },
  { key: "projects", label: "Projektai", ready: true },
  { key: "commercial", label: "Komercija", ready: true },
  { key: "support", label: "Support", ready: false },
  { key: "time", label: "Laikas", ready: false },
  { key: "payments", label: "Mokėjimai", ready: false },
  { key: "activity", label: "Istorija", ready: false },
];

function ClientPage() {
  const { id } = Route.useParams();
  const isNew = id === "naujas";

  if (isNew) return <ClientForm />;
  return <ClientDetail id={id} />;
}

/* ------------------------------------------------------------------ detail */

function ClientDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fetchClient = useServerFn(getClient);
  const removeClient = useServerFn(deleteClient);
  const [tab, setTab] = useState<Tab>("main");
  const [editing, setEditing] = useState(false);

  const query = useQuery({
    queryKey: ["client", id],
    queryFn: () => fetchClient({ data: { id } }),
  });

  const remove = useMutation({
    mutationFn: () => removeClient({ data: { id } }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (res.deleted) {
        toast.success("Klientas ištrintas");
        void navigate({ to: "/admin/projektai/" });
      } else {
        toast.message("Klientas turi susijusių įrašų — būsena pakeista į „Nutrauktas“");
        void queryClient.invalidateQueries({ queryKey: ["client", id] });
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  if (query.isLoading) {
    return (
      <main className="flex items-center gap-2 px-8 py-10 text-sm text-ink-soft">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Kraunama…
      </main>
    );
  }
  if (!query.data) {
    return <main className="px-8 py-10 text-sm text-ink-soft">Klientas nerastas.</main>;
  }

  const { client, contract, projects, lead } = query.data;

  if (editing) {
    return (
      <ClientForm
        client={client}
        onDone={() => {
          setEditing(false);
          void query.refetch();
        }}
      />
    );
  }

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/admin/projektai/"
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Į klientų sąrašą
        </Link>

        <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-4xl text-ink">{client.name}</h1>
              <Pill tone={client.status === "active" ? "accent" : "muted"}>
                {CLIENT_STATUS_LABELS[client.status]}
              </Pill>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              Klientas nuo {formatDate(client.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className={BTN_GHOST}>
              Redaguoti
            </button>
            <button
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className={BTN_GHOST}
            >
              Ištrinti
            </button>
          </div>
        </header>

        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <SummaryCard
            label="Mėnesinė prenumerata"
            value={
              contract?.monthly_subscription
                ? formatMoney(contract.monthly_subscription, contract.currency)
                : NO_DATA
            }
          />
          <SummaryCard
            label="Kitas mokėjimas"
            value={contract?.next_payment_date ? formatDate(contract.next_payment_date) : NO_DATA}
          />
          <SummaryCard label="Atviri kreipiniai" value="Ruošiama" />
          <SummaryCard label="Valandos šį mėnesį" value="Ruošiama" />
        </div>

        <nav className="mt-7 flex flex-wrap gap-1 rounded-full bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => t.ready && setTab(t.key)}
              disabled={!t.ready}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                tab === t.key
                  ? "bg-teal-700 text-cream"
                  : t.ready
                    ? "text-ink-soft hover:text-ink"
                    : "cursor-not-allowed text-ink-soft/50"
              }`}
            >
              {t.label}
              {t.ready ? "" : " · Ruošiama"}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {tab === "main" ? (
            <div className={`${CARD} p-6`}>
              <dl className="space-y-3 text-sm">
                <Detail label="Įmonė" value={client.company_name} />
                <Detail label="Šalis" value={client.country} />
                <Detail label="Miestas" value={client.city} />
                <Detail label="Objekto tipas" value={client.property_type} />
                <Detail label="Vienetų skaičius" value={client.units_count ?? "—"} />
                <Detail label="Kontaktinis asmuo" value={client.contact_name} />
                <Detail
                  label="El. paštas"
                  value={
                    client.contact_email ? (
                      <a
                        href={`mailto:${client.contact_email}`}
                        className="text-teal-700 underline underline-offset-2"
                      >
                        {client.contact_email}
                      </a>
                    ) : null
                  }
                />
                <Detail label="Telefonas" value={client.contact_phone} />
                <Detail
                  label="Užklausa"
                  value={
                    lead ? (
                      <Link
                        to="/admin/uzklausos/"
                        className="text-teal-700 underline underline-offset-2"
                      >
                        {lead.name} · {lead.property_name} · {formatDate(lead.created_at)}
                      </Link>
                    ) : null
                  }
                />
              </dl>
              {client.notes ? (
                <div className="mt-5 rounded-2xl bg-cream/60 p-4 text-sm whitespace-pre-wrap text-ink">
                  {client.notes}
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "projects" ? <ProjectsTab clientId={client.id} projects={projects} /> : null}

          {tab === "commercial" ? (
            <CommercialTab clientId={client.id} contract={contract} />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${CARD} p-4`}>
      <p className="text-xs tracking-wide text-ink-soft uppercase">{label}</p>
      <p className="mt-1 text-lg text-ink">{value}</p>
    </div>
  );
}

/* -------------------------------------------------------------- client form */

type ClientLike = {
  id: string;
  name: string;
  company_name: string | null;
  country: string | null;
  city: string | null;
  property_type: string | null;
  units_count: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  status: string;
  source_lead_id: string | null;
};

function ClientForm({ client, onDone }: { client?: ClientLike; onDone?: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const persist = useServerFn(saveClient);
  const fetchLeads = useServerFn(listConvertibleLeads);

  const [form, setForm] = useState({
    name: client?.name ?? "",
    company_name: client?.company_name ?? "",
    country: client?.country ?? "",
    city: client?.city ?? "",
    property_type: client?.property_type ?? "",
    units_count: client?.units_count != null ? String(client.units_count) : "",
    contact_name: client?.contact_name ?? "",
    contact_email: client?.contact_email ?? "",
    contact_phone: client?.contact_phone ?? "",
    notes: client?.notes ?? "",
    status: client?.status ?? "lead",
    source_lead_id: client?.source_lead_id ?? "",
  });

  const leads = useQuery({
    queryKey: ["convertible-leads", client?.source_lead_id ?? null],
    queryFn: () =>
      fetchLeads({
        data: client?.source_lead_id ? { include_id: client.source_lead_id } : {},
      }),
  });

  const save = useMutation({
    mutationFn: () =>
      persist({
        data: {
          ...(client ? { id: client.id } : {}),
          ...form,
          status: form.status as (typeof CLIENT_STATUSES)[number],
        },
      }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Išsaugota");
      if (onDone) onDone();
      else void navigate({ to: "/admin/projektai/$id/", params: { id: res.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Nepavyko išsaugoti"),
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/admin/projektai/"
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Į klientų sąrašą
        </Link>
        <h1 className="mt-3 font-display text-4xl text-ink">
          {client ? "Redaguoti klientą" : "Naujas klientas"}
        </h1>

        <form
          className={`${CARD} mt-6 grid gap-4 p-6 sm:grid-cols-2`}
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) {
              toast.error("Įveskite kliento pavadinimą");
              return;
            }
            save.mutate();
          }}
        >
          <Field label="Pavadinimas">
            <input
              className={INPUT}
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              required
            />
          </Field>
          <Field label="Įmonė">
            <input
              className={INPUT}
              value={form.company_name}
              onChange={(e) => set("company_name")(e.target.value)}
            />
          </Field>
          <Field label="Šalis">
            <input
              className={INPUT}
              value={form.country}
              onChange={(e) => set("country")(e.target.value)}
            />
          </Field>
          <Field label="Miestas">
            <input
              className={INPUT}
              value={form.city}
              onChange={(e) => set("city")(e.target.value)}
            />
          </Field>
          <Field label="Objekto tipas">
            <input
              className={INPUT}
              value={form.property_type}
              onChange={(e) => set("property_type")(e.target.value)}
            />
          </Field>
          <Field label="Vienetų skaičius">
            <input
              className={INPUT}
              inputMode="numeric"
              value={form.units_count}
              onChange={(e) => set("units_count")(e.target.value)}
            />
          </Field>
          <Field label="Kontaktinis asmuo">
            <input
              className={INPUT}
              value={form.contact_name}
              onChange={(e) => set("contact_name")(e.target.value)}
            />
          </Field>
          <Field label="El. paštas">
            <input
              className={INPUT}
              type="email"
              value={form.contact_email}
              onChange={(e) => set("contact_email")(e.target.value)}
            />
          </Field>
          <Field label="Telefonas">
            <input
              className={INPUT}
              value={form.contact_phone}
              onChange={(e) => set("contact_phone")(e.target.value)}
            />
          </Field>
          <Field label="Būsena">
            <select
              className={INPUT}
              value={form.status}
              onChange={(e) => set("status")(e.target.value)}
            >
              {CLIENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CLIENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="Užklausa, iš kurios šis klientas atsirado"
              hint="Rodomos tik dar nekonvertuotos užklausos."
            >
              <select
                className={INPUT}
                value={form.source_lead_id}
                onChange={(e) => set("source_lead_id")(e.target.value)}
              >
                <option value="">Nesusieta</option>
                {(leads.data?.leads ?? []).map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} · {lead.property_name} · {formatDate(lead.created_at)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Užrašai">
              <textarea
                className={`${INPUT} min-h-28`}
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={BTN} disabled={save.isPending}>
              {save.isPending ? "Saugoma…" : "Išsaugoti"}
            </button>
            {onDone ? (
              <button type="button" className={BTN_GHOST} onClick={onDone}>
                Atšaukti
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------- projects tab */

function ProjectsTab({ clientId, projects }: { clientId: string; projects: ProjectRow[] }) {
  const queryClient = useQueryClient();
  const persist = useServerFn(saveProject);
  const removeProject = useServerFn(deleteProject);
  const [editing, setEditing] = useState<ProjectRow | "new" | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["client", clientId] });

  const save = useMutation({
    mutationFn: (values: ProjectValues) =>
      persist({
        data: {
          ...(editing && editing !== "new" ? { id: editing.id } : {}),
          client_id: clientId,
          ...values,
        },
      }),
    onSuccess: async () => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      setEditing(null);
      toast.success("Projektas išsaugotas");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  const remove = useMutation({
    mutationFn: (projectId: string) => removeProject({ data: { id: projectId } }),
    onSuccess: async (res) => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.message(
        res.deleted
          ? "Projektas ištrintas"
          : "Projektas turi susijusių įrašų — būsena pakeista į „Nutrauktas“",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  if (editing) {
    return (
      <ProjectForm
        project={editing === "new" ? null : editing}
        pending={save.isPending}
        onCancel={() => setEditing(null)}
        onSubmit={(values) => save.mutate(values)}
      />
    );
  }

  return (
    <div className={CARD}>
      {projects.length === 0 ? (
        <EmptyState
          title="Šis klientas dar neturi projektų"
          description="Pridėkite projektą, kad matytumėte jo būseną ir greitas nuorodas."
          action={
            <button className={BTN} onClick={() => setEditing("new")}>
              Pridėti projektą
            </button>
          }
        />
      ) : (
        <div className="p-6">
          <div className="flex justify-end">
            <button className={BTN} onClick={() => setEditing("new")}>
              Naujas projektas
            </button>
          </div>
          <ul className="mt-4 divide-y divide-ink/10">
            {projects.map((project) => (
              <li key={project.id} className="flex flex-wrap items-start gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-xl text-ink">{project.project_name}</p>
                    <Pill tone={project.project_status === "active" ? "accent" : "muted"}>
                      {PROJECT_STATUS_LABELS[project.project_status]}
                    </Pill>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    Paleidimo data: {formatDate(project.launch_date)}
                  </p>
                  <div className="mt-3">
                    <LinkButtons
                      links={[
                        { label: "Website", url: project.website_url },
                        { label: "Lovable", url: project.lovable_url },
                        { label: "GitHub", url: project.github_url },
                        { label: "Supabase", url: project.supabase_url },
                      ]}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className={BTN_GHOST} onClick={() => setEditing(project)}>
                    Redaguoti
                  </button>
                  <button className={BTN_GHOST} onClick={() => remove.mutate(project.id)}>
                    Ištrinti
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type ProjectValues = {
  project_name: string;
  website_url: string;
  lovable_url: string;
  github_url: string;
  supabase_url: string;
  launch_date: string;
  project_status: (typeof PROJECT_STATUSES)[number];
  notes: string;
};

function ProjectForm({
  project,
  pending,
  onCancel,
  onSubmit,
}: {
  project: ProjectRow | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (values: ProjectValues) => void;
}) {
  const [values, setValues] = useState<ProjectValues>({
    project_name: project?.project_name ?? "",
    website_url: project?.website_url ?? "",
    lovable_url: project?.lovable_url ?? "",
    github_url: project?.github_url ?? "",
    supabase_url: project?.supabase_url ?? "",
    launch_date: project?.launch_date ?? "",
    project_status: project?.project_status ?? "planning",
    notes: project?.notes ?? "",
  });

  const set = (key: keyof ProjectValues) => (value: string) =>
    setValues((p) => ({ ...p, [key]: value }));

  return (
    <form
      className={`${CARD} grid gap-4 p-6 sm:grid-cols-2`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <Field label="Projekto pavadinimas">
        <input
          className={INPUT}
          value={values.project_name}
          onChange={(e) => set("project_name")(e.target.value)}
          required
        />
      </Field>
      <Field label="Būsena">
        <select
          className={INPUT}
          value={values.project_status}
          onChange={(e) =>
            set("project_status")(e.target.value as (typeof PROJECT_STATUSES)[number])
          }
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Svetainė">
        <input
          className={INPUT}
          value={values.website_url}
          onChange={(e) => set("website_url")(e.target.value)}
        />
      </Field>
      <Field label="Lovable">
        <input
          className={INPUT}
          value={values.lovable_url}
          onChange={(e) => set("lovable_url")(e.target.value)}
        />
      </Field>
      <Field label="GitHub">
        <input
          className={INPUT}
          value={values.github_url}
          onChange={(e) => set("github_url")(e.target.value)}
        />
      </Field>
      <Field label="Duomenų bazė">
        <input
          className={INPUT}
          value={values.supabase_url}
          onChange={(e) => set("supabase_url")(e.target.value)}
        />
      </Field>
      <Field label="Paleidimo data">
        <input
          className={INPUT}
          type="date"
          value={values.launch_date}
          onChange={(e) => set("launch_date")(e.target.value)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Užrašai">
          <textarea
            className={`${INPUT} min-h-24`}
            value={values.notes}
            onChange={(e) => set("notes")(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className={BTN} disabled={pending}>
          {pending ? "Saugoma…" : "Išsaugoti"}
        </button>
        <button type="button" className={BTN_GHOST} onClick={onCancel}>
          Atšaukti
        </button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------- commercial tab */

function CommercialTab({
  clientId,
  contract,
}: {
  clientId: string;
  contract: {
    setup_fee: number | null;
    monthly_subscription: number | null;
    currency: (typeof CURRENCIES)[number];
    next_payment_date: string | null;
    contract_start_date: string | null;
    contract_end_date: string | null;
  } | null;
}) {
  const queryClient = useQueryClient();
  const persist = useServerFn(saveContract);
  const [values, setValues] = useState({
    setup_fee: contract?.setup_fee != null ? String(contract.setup_fee) : "",
    monthly_subscription:
      contract?.monthly_subscription != null ? String(contract.monthly_subscription) : "",
    currency: contract?.currency ?? "EUR",
    next_payment_date: contract?.next_payment_date ?? "",
    contract_start_date: contract?.contract_start_date ?? "",
    contract_end_date: contract?.contract_end_date ?? "",
  });

  useEffect(() => {
    setValues({
      setup_fee: contract?.setup_fee != null ? String(contract.setup_fee) : "",
      monthly_subscription:
        contract?.monthly_subscription != null ? String(contract.monthly_subscription) : "",
      currency: contract?.currency ?? "EUR",
      next_payment_date: contract?.next_payment_date ?? "",
      contract_start_date: contract?.contract_start_date ?? "",
      contract_end_date: contract?.contract_end_date ?? "",
    });
  }, [contract]);

  const save = useMutation({
    mutationFn: () =>
      persist({
        data: {
          client_id: clientId,
          ...values,
          currency: values.currency as (typeof CURRENCIES)[number],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Komercinės sąlygos išsaugotos");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Klaida"),
  });

  const set = (key: keyof typeof values) => (value: string) =>
    setValues((p) => ({ ...p, [key]: value }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <form
        className={`${CARD} grid gap-4 p-6 sm:grid-cols-2`}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Setup fee">
          <input
            className={INPUT}
            inputMode="decimal"
            value={values.setup_fee}
            onChange={(e) => set("setup_fee")(e.target.value)}
          />
        </Field>
        <Field label="Mėnesinė prenumerata">
          <input
            className={INPUT}
            inputMode="decimal"
            value={values.monthly_subscription}
            onChange={(e) => set("monthly_subscription")(e.target.value)}
          />
        </Field>
        <Field label="Valiuta">
          <select
            className={INPUT}
            value={values.currency}
            onChange={(e) => set("currency")(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kitas mokėjimas">
          <input
            className={INPUT}
            type="date"
            value={values.next_payment_date}
            onChange={(e) => set("next_payment_date")(e.target.value)}
          />
        </Field>
        <Field label="Sutarties pradžia">
          <input
            className={INPUT}
            type="date"
            value={values.contract_start_date}
            onChange={(e) => set("contract_start_date")(e.target.value)}
          />
        </Field>
        <Field label="Sutarties pabaiga">
          <input
            className={INPUT}
            type="date"
            value={values.contract_end_date}
            onChange={(e) => set("contract_end_date")(e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <button type="submit" className={BTN} disabled={save.isPending}>
            {save.isPending ? "Saugoma…" : "Išsaugoti"}
          </button>
        </div>
      </form>

      <div className={`${CARD} p-6`}>
        <p className="text-xs tracking-wide text-ink-soft uppercase">Mokėjimo būsena</p>
        <p className="mt-1 text-lg text-ink">{NO_DATA}</p>
        <p className="mt-2 text-xs text-ink-soft">
          Būsena išvedama iš mokėjimų įrašų. Mokėjimų modulis — 3 fazė.
        </p>
      </div>
    </div>
  );
}
