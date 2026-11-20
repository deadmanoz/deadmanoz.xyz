import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  getPostStatus,
  isPublishedPost,
  isRoutablePost,
  getPostSlugs,
  getPostBySlug,
  getAllPosts,
} from "./api";

describe("getPostStatus", () => {
  it("returns an explicit valid status verbatim", () => {
    expect(getPostStatus({ status: "published" })).toBe("published");
    expect(getPostStatus({ status: "draft" })).toBe("draft");
    expect(getPostStatus({ status: "placeholder" })).toBe("placeholder");
  });

  it("treats retired and unknown status strings as draft", () => {
    expect(getPostStatus({ status: "canary" })).toBe("draft");
    expect(getPostStatus({ status: "wip" })).toBe("draft");
    expect(getPostStatus({ status: "" })).toBe("draft");
  });

  it("treats a missing status as draft, whatever the slug", () => {
    expect(getPostStatus({})).toBe("draft");
    expect(getPostStatus({ slug: "hello-world" })).toBe("draft");
  });

  it("ignores the retired hidden and coming_soon flags", () => {
    expect(getPostStatus({ coming_soon: true })).toBe("draft");
    expect(getPostStatus({ status: "published", hidden: true })).toBe("published");
  });
});

describe("isPublishedPost", () => {
  it("returns true for a post with title, parseable date, and published status", () => {
    expect(
      isPublishedPost({
        title: "Hello",
        date: "2026-01-15",
        status: "published",
      }),
    ).toBe(true);
  });

  it("returns false when the title is missing", () => {
    expect(isPublishedPost({ date: "2026-01-15", status: "published" })).toBe(
      false,
    );
  });

  it("returns false when the date is missing", () => {
    expect(isPublishedPost({ title: "Hello", status: "published" })).toBe(
      false,
    );
  });

  it("returns false when the date is not a parseable string", () => {
    expect(
      isPublishedPost({
        title: "Hello",
        date: "not-a-date",
        status: "published",
      }),
    ).toBe(false);
  });

  it("returns false when the resolved status is not 'published'", () => {
    expect(
      isPublishedPost({
        title: "Hello",
        date: "2026-01-15",
        status: "draft",
      }),
    ).toBe(false);
    expect(
      isPublishedPost({
        title: "Hello",
        date: "2026-01-15",
        status: "placeholder",
      }),
    ).toBe(false);
    expect(isPublishedPost({ title: "Hello", date: "2026-01-15" })).toBe(false);
  });
});

describe("isRoutablePost", () => {
  it("routes drafts and placeholders with only a slug and title", () => {
    for (const status of ["draft", "placeholder"] as const) {
      expect(isRoutablePost({ slug: "post", title: "Post", status })).toBe(true);
    }
    expect(isRoutablePost({ slug: "post", title: "Post" })).toBe(true);
  });

  it("routes a published post only when it has a valid date, like the listings", () => {
    expect(isRoutablePost({ slug: "post", title: "Post", status: "published", date: "2026-01-15" })).toBe(true);
    expect(isRoutablePost({ slug: "post", title: "Post", status: "published" })).toBe(false);
    expect(isRoutablePost({ slug: "post", title: "Post", status: "published", date: "not-a-date" })).toBe(false);
  });

  it("returns false when the slug is missing", () => {
    expect(isRoutablePost({ title: "No slug", status: "draft" })).toBe(false);
  });

  it("returns false when the title is missing", () => {
    expect(isRoutablePost({ slug: "no-title", status: "draft" })).toBe(false);
  });
});

describe("getPostSlugs / getPostBySlug / getAllPosts against a fixture directory", () => {
  let fixtureDir: string;

  const writePost = (
    relPath: string,
    frontmatter: Record<string, unknown>,
    body = "Body content",
  ) => {
    const fullPath = path.join(fixtureDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const yaml = Object.entries(frontmatter)
      .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : v}`)
      .join("\n");
    fs.writeFileSync(fullPath, `---\n${yaml}\n---\n\n${body}\n`);
  };

  beforeAll(() => {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "api-test-"));
    writePost("hello.md", { title: "Hello", date: "2026-03-01", status: "published" });
    writePost("2026/nested-post.md", { title: "Nested", date: "2026-04-15", status: "published" });
    writePost("draft.md", {
      title: "Draft",
      date: "2026-02-01",
      status: "draft",
    });
    writePost("placeholder.md", {
      title: "Soon",
      date: "2026-05-01",
      status: "placeholder",
    });
    writePost("no-status.md", { title: "No status", date: "2026-01-10" });
    writePost("older.md", { title: "Older", date: "2025-12-01", status: "published" });
    fs.writeFileSync(path.join(fixtureDir, "README.txt"), "ignore me");
  });

  afterAll(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it("getPostSlugs walks the directory recursively and returns relative paths to all .md files", () => {
    const slugs = getPostSlugs(fixtureDir).sort();
    expect(slugs).toEqual(
      [
        "2026/nested-post.md",
        "draft.md",
        "hello.md",
        "no-status.md",
        "older.md",
        "placeholder.md",
      ].sort(),
    );
  });

  it("getPostSlugs ignores non-markdown files in the directory", () => {
    const slugs = getPostSlugs(fixtureDir);
    expect(slugs.some((s) => s.endsWith(".txt"))).toBe(false);
  });

  it("getPostBySlug returns only the requested fields, mapping 'slug' to the file stem", () => {
    const post = getPostBySlug(
      "hello.md",
      ["slug", "title", "date"],
      fixtureDir,
    );
    expect(post).toEqual({
      slug: "hello",
      title: "Hello",
      date: "2026-03-01",
    });
  });

  it("getPostBySlug supplies body text when 'content' is in the requested fields", () => {
    const post = getPostBySlug("hello.md", ["content"], fixtureDir);
    expect(post.content).toContain("Body content");
  });

  it("getPostBySlug accepts a slug without the .md suffix", () => {
    const post = getPostBySlug("hello", ["title"], fixtureDir);
    expect(post.title).toBe("Hello");
  });

  it("getPostBySlug omits fields that are not present in the frontmatter", () => {
    const post = getPostBySlug(
      "hello.md",
      ["title", "tags", "excerpt"],
      fixtureDir,
    );
    expect(post).toEqual({ title: "Hello" });
  });

  it("getAllPosts lists only published posts, leaving out drafts, placeholders and posts without a status", () => {
    const posts = getAllPosts(["title"], fixtureDir);
    const titles = posts.map((p) => p.title);
    expect(titles).toContain("Hello");
    expect(titles).toContain("Nested");
    expect(titles).toContain("Older");
    expect(titles).not.toContain("Draft");
    expect(titles).not.toContain("Soon");
    expect(titles).not.toContain("No status");
  });

  it("getAllPosts returns published posts sorted by date descending", () => {
    const posts = getAllPosts(["title", "date"], fixtureDir);
    const dates = posts.map((p) => p.date);
    expect(dates).toEqual(["2026-04-15", "2026-03-01", "2025-12-01"]);
  });
});
