import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Block } from "@/content/posts";
import { deletePost, getPostById, savePost } from "@/lib/posts.functions";

export const Route = createFileRoute("/_authenticated/admin/straipsniai/$id")({
  head: () => ({
    meta: [
      { title: "Straipsnio redagavimas — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PostEditor,
});

type Draft = {
  lang: "en" | "lt";
  slug: string;
  translation_group: string;
  title: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  excerpt: string;
  cover_image: string;
  cover_alt: string;
  status: "draft" | "published";
  published_at: string;
  blocks: Block[];
};

const emptyDraft = (): Draft => ({
  lang: "lt",
  slug: "",
  translation_group: "",
  title: "",
  h1: "",
  meta_title: "",
  meta_description: "",
  excerpt: "",
  cover_image: "",
  cover_alt: "",
  status: "draft",
  published_at: new Date().toISOString().slice(0, 10),
  blocks: [{ type: "p", text: "" }],
});

function PostEditor() {
  const { id } = Route.useParams();
  const isNew = id === "naujas";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchPost = useServerFn(getPostById);
  const persist = useServerFn(savePost);
  const remove = useServerFn(deletePost);

  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const existing = useQuery({
    queryKey: ["admin-post", id],
    queryFn: () => fetchPost({ data: { id } }),
    enabled: !isNew,
  });

  useEffect(() => {
    const post = existing.data?.post;
    if (!post) return;
    setDraft({
      lang: post.lang,
      slug: post.slug,
      translation_group: post.translationGroup ?? "",
      title: post.title,
      h1: post.h1,
      meta_title: post.metaTitle,
      meta_description: post.metaDescription,
      excerpt: post.excerpt,
      cover_image: post.coverImage ?? "",
      cover_alt: post.coverAlt ?? "",
      status: post.status,
      published_at: post.date,
      blocks: post.blocks,
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: () =>
      persist({
        data: {
          ...(isNew ? {} : { id }),
          lang: draft.lang,
          slug: draft.slug,
          translation_group: draft.translation_group,
          title: draft.title,
          h1: draft.h1,
          meta_title: draft.meta_title,
          meta_description: draft.meta_description,
          excerpt: draft.excerpt,
          cover_image: draft.cover_image,
          cover_alt: draft.cover_alt,
          status: draft.status,
          published_at: draft.published_at,
          blocks: draft.blocks,
        },
      }),
    onSuccess: async (result) => {
      toast.success("Išsaugota");
      await queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-post"] });
      if (isNew) {
        await navigate({ to: "/admin/straipsniai/$id/", params: { id: result.id }, replace: true });
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Nepavyko išsaugoti"),
  });

  const destroy = useMutation({
    mutationFn: () => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Straipsnis ištrintas");
      await queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      await navigate({ to: "/admin/straipsniai/", replace: true });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nepavyko ištrinti"),
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const setBlock = (index: number, block: Block) =>
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b, i) => (i === index ? block : b)),
    }));

  const moveBlock = (index: number, delta: number) =>
    setDraft((prev) => {
      const next = [...prev.blocks];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item!);
      return { ...prev, blocks: next };
    });

  const removeBlock = (index: number) =>
    setDraft((prev) => ({ ...prev, blocks: prev.blocks.filter((_, i) => i !== index) }));

  const addBlock = (type: Block["type"]) =>
    setDraft((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock(type)],
    }));

  if (!isNew && existing.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-ink-soft">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Kraunama…
      </main>
    );
  }

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/admin/straipsniai/" className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Straipsniai
        </Link>

        <h1 className="mt-4 font-display text-4xl text-ink">
          {isNew ? "Naujas straipsnis" : "Redaguoti straipsnį"}
        </h1>

        <section className="mt-7 space-y-4 rounded-3xl bg-white p-6 shadow-[0_20px_60px_-50px_rgba(8,32,30,0.6)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kalba">
              <select
                value={draft.lang}
                onChange={(e) => set("lang", e.target.value as Draft["lang"])}
                className={inputClass}
              >
                <option value="lt">Lietuvių</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field label="Būsena">
              <select
                value={draft.status}
                onChange={(e) => set("status", e.target.value as Draft["status"])}
                className={inputClass}
              >
                <option value="draft">Juodraštis</option>
                <option value="published">Paskelbtas</option>
              </select>
            </Field>
            <Field label="Adresas (slug)">
              <input value={draft.slug} onChange={(e) => set("slug", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Publikavimo data">
              <input
                type="date"
                value={draft.published_at}
                onChange={(e) => set("published_at", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Vertimų grupė (ta pati abiem kalboms)">
              <input
                value={draft.translation_group}
                onChange={(e) => set("translation_group", e.target.value)}
                placeholder="pvz. pvm-2026"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Pavadinimas sąraše">
            <input value={draft.title} onChange={(e) => set("title", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Antraštė puslapyje (H1)">
            <input value={draft.h1} onChange={(e) => set("h1", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Meta title">
            <input value={draft.meta_title} onChange={(e) => set("meta_title", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Meta description">
            <textarea
              rows={2}
              value={draft.meta_description}
              onChange={(e) => set("meta_description", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Įžanga (excerpt)">
            <textarea
              rows={2}
              value={draft.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Viršelio paveikslėlis (URL)">
              <input
                value={draft.cover_image}
                onChange={(e) => set("cover_image", e.target.value)}
                placeholder="/media/…"
                className={inputClass}
              />
            </Field>
            <Field label="Viršelio alt tekstas">
              <input
                value={draft.cover_alt}
                onChange={(e) => set("cover_alt", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <h2 className="font-display text-2xl text-ink">Turinys</h2>
          {draft.blocks.map((block, index) => (
            <div
              key={index}
              className="rounded-3xl bg-white p-5 shadow-[0_20px_60px_-50px_rgba(8,32,30,0.6)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink-soft uppercase">
                  {blockLabel(block.type)}
                </span>
                <div className="flex gap-1">
                  <IconButton label="Aukštyn" onClick={() => moveBlock(index, -1)}>
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Žemyn" onClick={() => moveBlock(index, 1)}>
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Šalinti bloką" onClick={() => removeBlock(index)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {block.type === "h2" || block.type === "p" ? (
                  <textarea
                    rows={block.type === "h2" ? 1 : 4}
                    value={block.text}
                    onChange={(e) => setBlock(index, { ...block, text: e.target.value })}
                    className={inputClass}
                  />
                ) : null}

                {block.type === "ul" || block.type === "ol" ? (
                  <textarea
                    rows={4}
                    value={block.items.join("\n")}
                    onChange={(e) =>
                      setBlock(index, {
                        ...block,
                        items: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Vienas punktas eilutėje"
                    className={inputClass}
                  />
                ) : null}

                {block.type === "image" ? (
                  <>
                    <input
                      value={block.src}
                      onChange={(e) => setBlock(index, { ...block, src: e.target.value })}
                      placeholder="Paveikslėlio adresas, pvz. /media/9_invoice.webp"
                      className={inputClass}
                    />
                    <input
                      value={block.alt}
                      onChange={(e) => setBlock(index, { ...block, alt: e.target.value })}
                      placeholder="Alt tekstas"
                      className={inputClass}
                    />
                    <input
                      value={block.caption ?? ""}
                      onChange={(e) => setBlock(index, { ...block, caption: e.target.value })}
                      placeholder="Parašas po paveikslėliu (nebūtina)"
                      className={inputClass}
                    />
                    {block.src ? (
                      <img
                        src={block.src}
                        alt={block.alt}
                        className="max-h-56 rounded-xl border border-ink/10"
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            {(["p", "h2", "ul", "ol", "image"] as const).map((type) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-cream"
              >
                + {blockLabel(type)}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="rounded-full bg-teal-700 px-6 py-3 text-sm text-cream transition-colors hover:bg-ink disabled:opacity-60"
          >
            {save.isPending ? "Saugoma…" : "Išsaugoti"}
          </button>
          {!isNew ? (
            <button
              onClick={() => {
                if (confirm("Ištrinti šį straipsnį?")) destroy.mutate();
              }}
              className="rounded-full border border-ink/15 px-5 py-2.5 text-sm text-ink transition-colors hover:bg-ink hover:text-cream"
            >
              Ištrinti
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-2xl border border-ink/10 bg-cream/40 px-4 py-2.5 text-sm text-ink outline-none focus:border-teal-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-full border border-ink/10 p-1.5 text-ink-soft transition-colors hover:bg-ink hover:text-cream"
    >
      {children}
    </button>
  );
}

function blockLabel(type: Block["type"]): string {
  switch (type) {
    case "h2":
      return "Antraštė";
    case "p":
      return "Pastraipa";
    case "ul":
      return "Sąrašas";
    case "ol":
      return "Numeruotas sąrašas";
    case "image":
      return "Paveikslėlis";
  }
}

function newBlock(type: Block["type"]): Block {
  switch (type) {
    case "h2":
      return { type: "h2", text: "" };
    case "p":
      return { type: "p", text: "" };
    case "ul":
      return { type: "ul", items: [] };
    case "ol":
      return { type: "ol", items: [] };
    case "image":
      return { type: "image", src: "", alt: "" };
  }
}
