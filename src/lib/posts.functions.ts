import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Post, PostListItem } from "@/content/posts";

const langSchema = z.enum(["en", "lt"]);

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("h2"), text: z.string().trim().min(1).max(300) }),
  z.object({ type: z.literal("p"), text: z.string().trim().min(1).max(8000) }),
  z.object({ type: z.literal("ul"), items: z.array(z.string().trim().min(1).max(2000)).min(1) }),
  z.object({ type: z.literal("ol"), items: z.array(z.string().trim().min(1).max(2000)).min(1) }),
  z.object({
    type: z.literal("image"),
    src: z.string().trim().min(1).max(500),
    alt: z.string().trim().min(1).max(300),
    caption: z.string().trim().max(300).optional(),
  }),
]);

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Nuoroda gali turėti tik mažąsias raides, skaičius ir brūkšnelius");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

const savePostSchema = z.object({
  id: z.string().uuid().optional(),
  lang: langSchema,
  slug: slugSchema,
  translation_group: optionalText(120),
  title: z.string().trim().min(1).max(300),
  h1: z.string().trim().min(1).max(300),
  meta_title: z.string().trim().min(1).max(300),
  meta_description: z.string().trim().min(1).max(400),
  excerpt: z.string().trim().min(1).max(600),
  cover_image: optionalText(500),
  cover_alt: optionalText(300),
  status: z.enum(["draft", "published"]),
  published_at: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  blocks: z.array(blockSchema).min(1),
});

/* ---------------- Public (no auth, SSR-safe) ---------------- */

export const listPublishedPosts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ lang: langSchema }).parse(input))
  .handler(async ({ data }): Promise<{ posts: PostListItem[] }> => {
    const { fetchPublishedList } = await import("./posts.server");
    return { posts: await fetchPublishedList(data.lang) };
  });

export const getPublishedPost = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ lang: langSchema, slug: z.string().trim().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ post: Post | null; altSlug: string | null }> => {
    const { fetchPublishedPost, fetchTranslationSlug } = await import("./posts.server");
    const post = await fetchPublishedPost(data.lang, data.slug);
    if (!post) return { post: null, altSlug: null };
    const altSlug = post.translationGroup
      ? await fetchTranslationSlug(post.translationGroup, data.lang === "en" ? "lt" : "en")
      : null;
    return { post, altSlug };
  });

/* ---------------- Admin (auth + RLS) ---------------- */

export const listAllPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ posts: PostListItem[] }> => {
    const { POST_COLUMNS, toPost, toListItem } = await import("./posts.server");
    const { data, error } = await context.supabase
      .from("posts")
      .select(POST_COLUMNS)
      .order("published_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("listAllPosts failed", error.message);
      throw new Error("Nepavyko įkelti straipsnių");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { posts: ((data ?? []) as any[]).map((row) => toListItem(toPost(row))) };
  });

export const getPostById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ post: Post | null }> => {
    const { POST_COLUMNS, toPost } = await import("./posts.server");
    const { data: row, error } = await context.supabase
      .from("posts")
      .select(POST_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("getPostById failed", error.message);
      throw new Error("Nepavyko įkelti straipsnio");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { post: row ? toPost(row as any) : null };
  });

export const savePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => savePostSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { id, ...values } = data;
    const payload = { ...values, blocks: values.blocks as unknown as never };

    if (id) {
      const { error } = await context.supabase.from("posts").update(payload).eq("id", id);
      if (error) {
        console.error("savePost update failed", error.message);
        throw new Error(friendly(error.message));
      }
      return { id };
    }

    const { data: inserted, error } = await context.supabase
      .from("posts")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      console.error("savePost insert failed", error.message);
      throw new Error(friendly(error.message));
    }
    return { id: inserted.id };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("posts").delete().eq("id", data.id);
    if (error) {
      console.error("deletePost failed", error.message);
      throw new Error("Nepavyko ištrinti straipsnio");
    }
    return { ok: true as const };
  });

function friendly(message: string): string {
  if (message.includes("posts_lang_slug_key") || message.includes("duplicate key")) {
    return "Toks adresas (slug) šia kalba jau egzistuoja";
  }
  return "Nepavyko išsaugoti straipsnio";
}
