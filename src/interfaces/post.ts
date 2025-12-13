import { type Author } from "./author";

export type PostType = 'research' | 'blog';

export type Post = {
  slug: string;
  title: string;
  date: string;
  type: PostType;
  coverImage: string;
  author: Author;
  excerpt: string;
  ogImage: {
    url: string;
  };
  content: string;
  hidden?: boolean;
};