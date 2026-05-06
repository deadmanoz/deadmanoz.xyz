import { type Author } from "./author";

export type PostType = "research" | "blog";
export type PostStatus = "published" | "draft" | "placeholder" | "canary";

export type Post = {
  slug: string;
  title: string;
  date: string;
  type?: PostType;
  status?: PostStatus;
  tags?: string[];
  coverImage: string;
  author: Author;
  excerpt: string;
  ogImage: {
    url: string;
  };
  content: string;
  hidden?: boolean;
  coming_soon?: boolean;
};
