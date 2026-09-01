import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Article } from "@/components/site/Article";
import { getPostById } from "@/lib/posts.functions";

export const Route = createFileRoute("/_authenticated/admin/perziura/$id")({
  head: () => ({
    meta: [
      { title: "Straipsnio peržiūra — Revoo administravimas" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PreviewPage,
});

function PreviewPage() {
  const { id } = Route.useParams();
  const fetchPost = useServerFn(getPostById);
  const query = useQuery({
    queryKey: ["admin-post", id],
    queryFn: () => fetchPost({ data: { id } }),
  });

  const post = query.data?.post ?? null;

  return (
    <div>
      <div className="sticky top-0 z-50 flex flex-wrap items-center gap-3 bg-ink px-5 py-3 text-sm text-cream">
        <Link
          to="/admin/straipsniai/$id/"
          params={{ id }}
          className="flex items-center gap-2 hover:text-amber"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Grįžti į redaktorių
        </Link>
        <span className="opacity-70">
          Peržiūra{post ? ` · ${post.status === "published" ? "paskelbtas" : "juodraštis"}` : ""} –
          matoma tik administratoriui
        </span>
      </div>

      {query.isLoading ? (
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-soft">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Kraunama…
        </div>
      ) : post ? (
        <Article lang={post.lang} post={post} />
      ) : (
        <p className="p-10 text-sm text-ink-soft">Straipsnis nerastas.</p>
      )}
    </div>
  );
}
