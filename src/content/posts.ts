import type { Lang } from "./copy";

export type Block =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
      width?: number;
      height?: number;
    };

export type Post = {
  id: string;
  slug: string;
  lang: Lang;
  translationGroup: string | null;
  date: string;
  updatedAt: string;
  readingTime: number;
  title: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  coverImage: string | null;
  coverAlt: string | null;
  status: "draft" | "published";
  blocks: Block[];
};

export type PostListItem = Pick<
  Post,
  | "id"
  | "slug"
  | "lang"
  | "title"
  | "excerpt"
  | "date"
  | "updatedAt"
  | "readingTime"
  | "status"
  | "translationGroup"
>;
