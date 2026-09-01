import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus } from "lucide-react";

import { listAllPosts } from "@/lib/posts.functions";

export const Route = createFileRoute("/_authenticated/admin/straipsniai/")({
  head: () => ({
    meta: [
      { title: "Straipsniai — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PostsListPage,
});

function PostsListPage() {
  const fetchPosts = useServerFn(listAllPosts);
  const posts = useQuery({ queryKey: ["admin-posts"], queryFn: () => fetchPosts() });
  const rows = posts.data?.posts ?? [];

  return (
    <main className="px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-ink-soft">Revoo administravimas</p>
            <h1 className="mt-1 font-display text-4xl text-ink">Straipsniai</h1>
          </div>
          <Link
            to="/admin/straipsniai/$id/"
            params={{ id: "naujas" }}
            className="flex items-center gap-2 rounded-full bg-teal-700 px-5 py-2.5 text-sm text-cream transition-colors hover:bg-ink"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Naujas straipsnis
          </Link>
        </header>

        <div className="mt-7 overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-50px_rgba(8,32,30,0.6)]">
          {posts.isLoading ? (
            <div className="flex items-center gap-2 p-8 text-sm text-ink-soft">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Kraunama…
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-sm text-ink-soft">Straipsnių dar nėra.</p>
          ) : (
            <ul className="divide-y divide-ink/8">
              {rows.map((post) => (
                <li key={post.id}>
                  <Link
                    to="/admin/straipsniai/$id/"
                    params={{ id: post.id }}
                    className="flex flex-wrap items-center gap-3 px-6 py-4 transition-colors hover:bg-cream/50"
                  >
                    <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-ink-soft uppercase">
                      {post.lang}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{post.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-soft">
                        /{post.lang === "lt" ? "lt/" : ""}blog/{post.slug}/
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        post.status === "published"
                          ? "bg-teal-700 text-cream"
                          : "bg-amber/40 text-ink"
                      }`}
                    >
                      {post.status === "published" ? "Paskelbtas" : "Juodraštis"}
                    </span>
                    <span className="text-xs text-ink-soft">{post.date}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
