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
    expect(getPostStatus({ status: "canary" })).toBe("canary");
  });

  it("falls back to draft when the explicit status string is not in the allowed set", () => {
    expect(getPostStatus({ status: "wip" })).toBe("draft");
    expect(getPostStatus({ status: "" })).toBe("draft");
  });

  it("classifies the hello-world slug as canary when no status is set", () => {
    expect(getPostStatus({ slug: "hello-world" })).toBe("canary");
  });

  it("does not classify hello-world as canary when an explicit status is set", () => {
    expect(getPostStatus({ slug: "hello-world", status: "published" })).toBe(
      "published",
    );
  });

  it("classifies coming_soon: true as placeholder when no explicit status is set", () => {
    expect(getPostStatus({ coming_soon: true })).toBe("placeholder");
  });

  it("classifies hidden: true as draft when no explicit status is set", () => {
    expect(getPostStatus({ hidden: true })).toBe("draft");
  });

  it("prefers the placeholder branch over the hidden branch when both flags are set", () => {
    expect(getPostStatus({ coming_soon: true, hidden: true })).toBe(
      "placeholder",
    );
  });

  it("defaults to published when no status hints are present", () => {
    expect(getPostStatus({})).toBe("published");
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
        coming_soon: true,
      }),
    ).toBe(false);
  });
});

describe("isRoutablePost", () => {
  it("returns true for a published post with slug + title", () => {
    expect(
      isRoutablePost({
        slug: "hello",
        title: "Hello",
        status: "published",
      }),
    ).toBe(true);
  });

  it("returns true for a placeholder (coming_soon) post with slug + title", () => {
    expect(
      isRoutablePost({
        slug: "soon",
        title: "Soon",
        coming_soon: true,
      }),
    ).toBe(true);
  });

  it("returns true for the hello-world canary post with slug + title", () => {
    expect(
      isRoutablePost({
        slug: "hello-world",
        title: "Canary",
      }),
    ).toBe(true);
  });

  it("returns false for a draft post even with slug + title", () => {
    expect(
      isRoutablePost({
        slug: "draft-post",
        title: "Draft",
        status: "draft",
      }),
    ).toBe(false);
    expect(
      isRoutablePost({
        slug: "hidden-post",
        title: "Hidden",
        hidden: true,
      }),
    ).toBe(false);
  });

  it("returns false when the slug is missing", () => {
    expect(
      isRoutablePost({ title: "No slug", status: "published" }),
    ).toBe(false);
  });

  it("returns false when the title is missing", () => {
    expect(
      isRoutablePost({ slug: "no-title", status: "published" }),
    ).toBe(false);
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
    writePost("hello.md", { title: "Hello", date: "2026-03-01" });
    writePost("2026/nested-post.md", { title: "Nested", date: "2026-04-15" });
    writePost("draft.md", {
      title: "Draft",
      date: "2026-02-01",
      status: "draft",
    });
    writePost("placeholder.md", {
      title: "Soon",
      date: "2026-05-01",
      coming_soon: true,
    });
    writePost("hidden.md", {
      title: "Hidden",
      date: "2026-01-10",
      hidden: true,
    });
    writePost("older.md", { title: "Older", date: "2025-12-01" });
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
        "hidden.md",
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

  it("getAllPosts filters out drafts/placeholders/hidden and returns only published posts", () => {
    const posts = getAllPosts(["title"], fixtureDir);
    const titles = posts.map((p) => p.title);
    expect(titles).toContain("Hello");
    expect(titles).toContain("Nested");
    expect(titles).toContain("Older");
    expect(titles).not.toContain("Draft");
    expect(titles).not.toContain("Soon");
    expect(titles).not.toContain("Hidden");
  });

  it("getAllPosts returns published posts sorted by date descending", () => {
    const posts = getAllPosts(["title", "date"], fixtureDir);
    const dates = posts.map((p) => p.date);
    expect(dates).toEqual(["2026-04-15", "2026-03-01", "2025-12-01"]);
  });
});
