import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getGitMetadataFromLocalHistory, parseGitLog } from "./git-metadata";

describe("parseGitLog", () => {
  it("splits one commit per line on the unit separator", () => {
    const output = "abc123\x1f2026-02-01T10:00:00+00:00\x1fSecond\ndef456\x1f2026-01-01T09:00:00+00:00\x1fFirst\n";
    expect(parseGitLog(output)).toEqual([
      { sha: "abc123", date: "2026-02-01T10:00:00+00:00", subject: "Second" },
      { sha: "def456", date: "2026-01-01T09:00:00+00:00", subject: "First" },
    ]);
  });
});

describe("getGitMetadataFromLocalHistory", () => {
  let repo: string;

  const git = (args: string[], env: Record<string, string> = {}) =>
    execFileSync("git", args, {
      cwd: repo,
      encoding: "utf8",
      env: { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "t@example.com", ...env },
    });

  beforeAll(() => {
    repo = mkdtempSync(path.join(tmpdir(), "git-metadata-"));
    git(["init", "-q"]);
    writeFileSync(path.join(repo, "post.md"), "one\n");
    git(["add", "post.md"]);
    git(["commit", "-q", "-m", "feat: add post"], { GIT_AUTHOR_DATE: "2026-01-01T09:00:00+00:00", GIT_COMMITTER_DATE: "2026-01-01T09:00:00+00:00" });
    writeFileSync(path.join(repo, "post.md"), "two\n");
    git(["commit", "-q", "-am", "fix: correct a figure"], { GIT_AUTHOR_DATE: "2026-02-01T10:00:00+00:00", GIT_COMMITTER_DATE: "2026-02-01T10:00:00+00:00" });
    git(["mv", "post.md", "moved.md"]);
    git(["commit", "-q", "-m", "refactor: move post"], { GIT_AUTHOR_DATE: "2026-03-01T11:00:00+00:00", GIT_COMMITTER_DATE: "2026-03-01T11:00:00+00:00" });
  });

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("reads publication and update history, following the file across a rename", () => {
    const meta = getGitMetadataFromLocalHistory("moved.md", repo);
    expect(meta).not.toBeNull();
    expect(new Date(meta!.publishedAt).toISOString()).toBe("2026-01-01T09:00:00.000Z");
    expect(new Date(meta!.updatedAt).toISOString()).toBe("2026-03-01T11:00:00.000Z");
    expect(meta!.updateCount).toBe(2);
    expect(meta!.lastCommitMessage).toBe("refactor: move post");
    expect(meta!.lastCommitSha).toHaveLength(7);
  });

  it("returns null for a file with no committed history", () => {
    writeFileSync(path.join(repo, "draft.md"), "draft\n");
    expect(getGitMetadataFromLocalHistory("draft.md", repo)).toBeNull();
  });

  it("returns null outside a repository", () => {
    expect(getGitMetadataFromLocalHistory("anything.md", tmpdir())).toBeNull();
  });
});
