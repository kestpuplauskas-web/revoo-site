import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowDown, ArrowUp, Eye, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Block } from "@/content/posts";
import { deletePost, getPostById, listAllPosts, savePost } from "@/lib/posts.functions";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { slugify } from "@/lib/slugify";

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
  slugTouched: boolean;
  translationPartnerId: string;
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
  slugTouched: false,
  translationPartnerId: "",
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
  const fetchPosts = useServerFn(listAllPosts);
  const persist = useServerFn(savePost);
  const remove = useServerFn(deletePost);

  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const existing = useQuery({
    queryKey: ["admin-post", id],
    queryFn: () => fetchPost({ data: { id } }),
    enabled: !isNew,
  });

  const allPosts = useQuery({ queryKey: ["admin-posts"], queryFn: () => fetchPosts() });

  const partnerOptions = useMemo(
    () => (allPosts.data?.posts ?? []).filter((p) => p.lang !== draft.lang && p.id !== id),
    [allPosts.data, draft.lang, id],
  );

  useEffect(() => {
    const post = existing.data?.post;
    if (!post) return;
    const partner = (allPosts.data?.posts ?? []).find(
      (p) => p.id !== post.id && p.translationGroup && p.translationGroup === post.translationGroup,
    );
    setDraft({
      lang: post.lang,
      slug: post.slug,
      slugTouched: true,
      translationPartnerId: partner?.id ?? "",
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
  }, [existing.data, allPosts.data]);

  const save = useMutation({
    mutationFn: (status: "draft" | "published") => {
      const slug = (draft.slug || slugify(draft.title)).trim();
      const missingAlt = draft.blocks.some((b) => b.type === "image" && !b.alt.trim());
      if (missingAlt) throw new Error("Kiekvienam paveikslėliui privalomas alt tekstas");
      if (draft.cover_image.trim() && !draft.cover_alt.trim()) {
        throw new Error("Viršelio paveikslėliui privalomas alt tekstas");
      }
      if (!slug) throw new Error("Reikalingas adresas (slug)");
      return persist({
        data: {
          ...(isNew ? {} : { id }),
          lang: draft.lang,
          slug,
          title: draft.title,
          h1: draft.h1 || draft.title,
          meta_title: draft.meta_title || draft.title,
          meta_description: draft.meta_description || draft.excerpt,
          excerpt: draft.excerpt,
          cover_image: draft.cover_image,
          cover_alt: draft.cover_alt,
          status,
          published_at:
            status === "published" && draft.status === "draft"
              ? new Date().toISOString().slice(0, 10)
              : draft.published_at,
          blocks: draft.blocks,
          translation_partner_id: draft.translationPartnerId || null,
          translation_group: null,
        },
      });
    },
    onSuccess: async (result, status) => {
      toast.success(status === "published" ? "Paskelbta" : "Juodraštis išsaugotas");
      setDraft((prev) => ({ ...prev, status }));
      await queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-post"] });
      if (isNew) {
        await navigate({ to: "/admin/straipsniai/$id/", params: { id: result.id }, replace: true });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nepavyko išsaugoti"),
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

  const setTitle = (value: string) =>
    setDraft((prev) => ({
      ...prev,
      title: value,
      h1: prev.h1 === prev.title ? value : prev.h1,
      slug: prev.slugTouched ? prev.slug : slugify(value),
    }));

  const setBlock = (index: number, block: Block) =>
    setDraft((prev) => ({ ...prev, blocks: prev.blocks.map((b, i) => (i === index ? block : b)) }));

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
    setDraft((prev) => ({ ...prev, blocks: [...prev.blocks, newBlock(type)] }));

  const publicUrl = `/${draft.lang === "lt" ? "lt/" : ""}blog/${draft.slug || "…"}/`;

  if (!isNew && existing.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-ink-soft">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Kraunama…
      </main>
    );
  }

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/admin/straipsniai/"
          className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Straipsniai
        </Link>

        <h1 className="mt-4 font-display text-4xl text-ink">
          {isNew ? "Naujas straipsnis" : "Redaguoti straipsnį"}
        </h1>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ---------------- Turinys ---------------- */}
          <div className="space-y-6">
            <section className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_20px_60px_-50px_rgba(8,32,30,0.6)]">
              <Field label="Kalba">
                <select
                  value={draft.lang}
                  disabled={!isNew}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      lang: e.target.value as Draft["lang"],
                      translationPartnerId: "",
                    }))
                  }
                  className={inputClass}
                >
                  <option value="lt">Lietuvių</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label="Antraštė">
                <input value={draft.title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Antraštė puslapyje (H1)">
                <input value={draft.h1} onChange={(e) => set("h1", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Įžanga">
                <textarea
                  rows={3}
                  value={draft.excerpt}
                  onChange={(e) => set("excerpt", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-2xl text-ink">Turinio blokai</h2>
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
                      <IconButton label="Ištrinti bloką" onClick={() => removeBlock(index)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {block.type === "h2" || block.type === "p" ? (
                      <textarea
                        rows={block.type === "h2" ? 1 : 5}
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
                        <ImageUpload
                          onUploaded={({ url, width, height }) =>
                            setBlock(index, { ...block, src: url, width, height })
                          }
                        />
                        <input
                          value={block.src}
                          onChange={(e) => setBlock(index, { ...block, src: e.target.value })}
                          placeholder="Paveikslėlio adresas"
                          className={inputClass}
                        />
                        <div>
                          <input
                            value={block.alt}
                            onChange={(e) => setBlock(index, { ...block, alt: e.target.value })}
                            placeholder="Alt tekstas (privalomas)"
                            aria-invalid={!block.alt.trim()}
                            className={`${inputClass} ${block.alt.trim() ? "" : "border-red-400"}`}
                          />
                          {block.alt.trim() ? null : (
                            <p className="mt-1 text-xs text-red-500">
                              Alt tekstas privalomas – be jo išsaugoti negalima.
                            </p>
                          )}
                        </div>
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
                    type="button"
                    onClick={() => addBlock(type)}
                    className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-cream"
                  >
                    + {blockLabel(type)}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* ---------------- Nuoroda ir SEO ---------------- */}
          <aside className="space-y-6">
            <section className="space-y-4 rounded-3xl bg-white p-6 shadow-[0_20px_60px_-50px_rgba(8,32,30,0.6)]">
              <h2 className="font-display text-xl text-ink">Nuoroda ir SEO</h2>

              <Field label="Adresas (slug)">
                <input
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      slug: slugify(e.target.value),
                      slugTouched: true,
                    }))
                  }
                  className={inputClass}
                />
              </Field>
              <p className="-mt-2 text-xs text-ink-soft">
                Straipsnis atsiras adresu <span className="text-ink">{publicUrl}</span>
              </p>

              <Field label="Meta title">
                <input
                  value={draft.meta_title}
                  onChange={(e) => set("meta_title", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Counter value={draft.meta_title.length} limit={60} />

              <Field label="Meta description">
                <textarea
                  rows={3}
                  value={draft.meta_description}
                  onChange={(e) => set("meta_description", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Counter value={draft.meta_description.length} limit={155} />

              <Field label="Viršelio paveikslėlis">
                <input
                  value={draft.cover_image}
                  onChange={(e) => set("cover_image", e.target.value)}
                  placeholder="/media/…"
                  className={inputClass}
                />
              </Field>
              <ImageUpload
                label="Įkelti viršelį"
                onUploaded={({ url }) => set("cover_image", url)}
              />
              <Field label="Viršelio alt tekstas">
                <input
                  value={draft.cover_alt}
                  onChange={(e) => set("cover_alt", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Vertimų grupė – to paties straipsnio versija kita kalba">
                <select
                  value={draft.translationPartnerId}
                  onChange={(e) => set("translationPartnerId", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Nesusieta</option>
                  {partnerOptions.map((post) => (
                    <option key={post.id} value={post.id}>
                      [{post.lang}] {post.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Publikavimo data">
                <input
                  type="date"
                  value={draft.published_at}
                  onChange={(e) => set("published_at", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <p className="text-xs text-ink-soft">
                Būsena:{" "}
                <span className="text-ink">
                  {draft.status === "published" ? "Paskelbtas" : "Juodraštis"}
                </span>
              </p>
            </section>

            <section className="space-y-3 rounded-3xl bg-white p-6 shadow-[0_20px_60px_-50px_rgba(8,32,30,0.6)]">
              <button
                type="button"
                onClick={() => save.mutate("draft")}
                disabled={save.isPending}
                className="w-full rounded-full border border-ink/15 px-5 py-2.5 text-sm text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
              >
                Išsaugoti juodraštį
              </button>
              <button
                type="button"
                onClick={() => save.mutate("published")}
                disabled={save.isPending}
                className="w-full rounded-full bg-teal-700 px-5 py-3 text-sm text-cream transition-colors hover:bg-ink disabled:opacity-60"
              >
                {save.isPending ? "Saugoma…" : "Paskelbti"}
              </button>
              {!isNew ? (
                <>
                  <Link
                    to="/admin/perziura/$id/"
                    params={{ id }}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-sm text-ink transition-colors hover:bg-ink hover:text-cream"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" /> Peržiūra
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Ištrinti šį straipsnį?")) destroy.mutate();
                    }}
                    className="w-full rounded-full px-5 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    Ištrinti straipsnį
                  </button>
                </>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-2xl border border-ink/10 bg-cream/40 px-4 py-2.5 text-sm text-ink outline-none focus:border-teal-500";

function Counter({ value, limit }: { value: number; limit: number }) {
  return (
    <p className={`-mt-2 text-xs ${value > limit ? "text-red-500" : "text-ink-soft"}`}>
      {value} / rekomenduojama iki {limit} simbolių
    </p>
  );
}

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
