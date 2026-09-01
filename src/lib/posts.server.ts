import { createClient } from "@supabase/supabase-js";

import type { Block, Post, PostListItem } from "@/content/posts";
import type { Lang } from "@/lib/i18n";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["posts"]["Row"];

const COLUMNS =
  "id, lang, slug, translation_group, title, h1, meta_title, meta_description, excerpt, blocks, cover_image, cover_alt, status, reading_time, published_at, updated_at";

/** Publishable-key client for public, RLS-scoped reads on the server. */
export function publicSupabase() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export function toPost(row: Row): Post {
  return {
    id: row.id,
    slug: row.slug,
    lang: row.lang as Lang,
    translationGroup: row.translation_group,
    date: row.published_at,
    updatedAt: row.updated_at,
    readingTime: row.reading_time,
    title: row.title,
    h1: row.h1,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    coverAlt: row.cover_alt,
    status: row.status as "draft" | "published",
    blocks: (row.blocks as unknown as Block[]) ?? [],
  };
}

export function toListItem(post: Post): PostListItem {
  return {
    id: post.id,
    slug: post.slug,
    lang: post.lang,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    updatedAt: post.updatedAt,
    readingTime: post.readingTime,
    status: post.status,
    translationGroup: post.translationGroup,
  };
}

export async function fetchPublishedList(lang: Lang): Promise<PostListItem[]> {
  const { data, error } = await publicSupabase()
    .from("posts")
    .select(COLUMNS)
    .eq("status", "published")
    .eq("lang", lang)
    .order("published_at", { ascending: false })
    .returns<Row[]>();
  if (error) {
    console.error("fetchPublishedList failed", error.message);
    throw new Error("Nepavyko įkelti straipsnių");
  }
  return (data ?? []).map((row) => toListItem(toPost(row)));
}

export async function fetchPublishedPost(lang: Lang, slug: string): Promise<Post | null> {
  const { data, error } = await publicSupabase()
    .from("posts")
    .select(COLUMNS)
    .eq("status", "published")
    .eq("lang", lang)
    .eq("slug", slug)
    .maybeSingle<Row>();
  if (error) {
    console.error("fetchPublishedPost failed", error.message);
    throw new Error("Nepavyko įkelti straipsnio");
  }
  return data ? toPost(data) : null;
}

export type SitemapPost = {
  lang: Lang;
  slug: string;
  date: string;
  updatedAt: string;
  translationGroup: string | null;
};

export async function fetchPublishedForSitemap(): Promise<SitemapPost[]> {
  const { data, error } = await publicSupabase()
    .from("posts")
    .select("lang, slug, translation_group, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .returns<
      Pick<Row, "lang" | "slug" | "translation_group" | "published_at" | "updated_at">[]
    >();
  if (error) {
    console.error("fetchPublishedForSitemap failed", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    lang: row.lang as Lang,
    slug: row.slug,
    date: row.published_at,
    updatedAt: row.updated_at,
    translationGroup: row.translation_group,
  }));
}

export const POST_COLUMNS = COLUMNS;

export async function fetchTranslationSlug(group: string, lang: Lang): Promise<string | null> {
  const { data, error } = await publicSupabase()
    .from("posts")
    .select("slug")
    .eq("status", "published")
    .eq("translation_group", group)
    .eq("lang", lang)
    .maybeSingle<{ slug: string }>();
  if (error) {
    console.error("fetchTranslationSlug failed", error.message);
    return null;
  }
  return data?.slug ?? null;
}
