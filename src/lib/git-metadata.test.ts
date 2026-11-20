import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getGitMetadata, parseGitLog, readLocalHistory, summariseCommits } from "./git-metadata";

describe("parseGitLog", () => {
  it("splits one commit per line on the unit separator", () => {
    const output = "abc123\x1f2026-02-01T10:00:00+00:00\ndef456\x1f2026-01-01T09:00:00+00:00\n";
    expect(parseGitLog(output)).toEqual([
      { sha: "abc123", date: "2026-02-01T10:00:00+00:00" },
      { sha: "def456", date: "2026-01-01T09:00:00+00:00" },
    ]);
  });
});

describe("summariseCommits", () => {
  const commit = (sha: string, date: string) => ({ sha: `${sha}0000000000`, date });
  const publishedOn = "2026-03-01T00:00:00.000Z";

  it("counts only commits after the publication day, newest as the last update", () => {
    const meta = summariseCommits(
      [
        commit("d", "2026-03-05T10:00:00Z"),
        commit("c", "2026-03-02T00:00:00Z"),
        commit("b", "2026-03-01T20:00:00Z"),
        commit("a", "2026-02-20T09:00:00Z"),
      ],
      publishedOn,
    );
    expect(meta).toEqual({
      updateCount: 2,
      lastUpdate: { date: "2026-03-05T10:00:00Z", sha: "d000000" },
    });
  });

  it("starts counting at the next UTC day when the publication date carries a time", () => {
    const meta = summariseCommits(
      [
        commit("c", "2026-03-02T09:00:00Z"),
        commit("b", "2026-03-01T23:30:00Z"),
        commit("a", "2026-03-01T17:00:00Z"),
      ],
      "2026-03-01T18:00:00Z",
    );
    expect(meta).toEqual({ updateCount: 1, lastUpdate: { date: "2026-03-02T09:00:00Z", sha: "c000000" } });
  });

  it("never counts the commit that added the file, even when it is after the publication day", () => {
    const meta = summariseCommits([commit("b", "2026-04-10T00:00:00Z"), commit("a", "2026-04-05T00:00:00Z")], publishedOn);
    expect(meta.updateCount).toBe(1);
    expect(meta.lastUpdate?.sha).toBe("b000000");
  });

  it("reports no updates when every later commit falls on the publication day", () => {
    const meta = summariseCommits([commit("b", "2026-03-01T23:00:00Z"), commit("a", "2026-02-27T00:00:00Z")], publishedOn);
    expect(meta).toEqual({ updateCount: 0, lastUpdate: null });
  });
});

describe("git history sources", () => {
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
    git(["config", "commit.gpgsign", "false"]);
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads local history newest first, following the file across a rename", () => {
    const commits = readLocalHistory("moved.md", repo);
    expect(commits?.map((c) => new Date(c.date).toISOString())).toEqual([
      "2026-03-01T11:00:00.000Z",
      "2026-02-01T10:00:00.000Z",
      "2026-01-01T09:00:00.000Z",
    ]);
  });

  it("returns null for a file with no committed history", () => {
    writeFileSync(path.join(repo, "draft.md"), "draft\n");
    expect(readLocalHistory("draft.md", repo)).toBeNull();
  });

  it("returns null outside a repository", () => {
    expect(readLocalHistory("anything.md", tmpdir())).toBeNull();
  });

  it("summarises local history relative to the publication date", async () => {
    const meta = await getGitMetadata("moved.md", "2026-01-01T00:00:00.000Z", repo);
    expect(meta?.updateCount).toBe(2);
    expect(new Date(meta!.lastUpdate!.date).toISOString()).toBe("2026-03-01T11:00:00.000Z");
  });

  it("does not ask GitHub when local history exists but nothing counts as an update", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const meta = await getGitMetadata("moved.md", "2026-03-01T00:00:00.000Z", repo);
    expect(meta).toEqual({ updateCount: 0, lastUpdate: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to GitHub when the file has no local history", async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => [
        { sha: "bbbbbbbbbb", commit: { author: { date: "2026-05-10T00:00:00Z" } } },
        { sha: "aaaaaaaaaa", commit: { author: { date: "2026-05-01T00:00:00Z" } } },
      ],
    }));
    vi.stubGlobal("fetch", fetchSpy);
    const meta = await getGitMetadata("draft.md", "2026-05-01T00:00:00.000Z", repo);
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(meta).toEqual({ updateCount: 1, lastUpdate: { date: "2026-05-10T00:00:00Z", sha: "bbbbbbb" } });
  });
});
