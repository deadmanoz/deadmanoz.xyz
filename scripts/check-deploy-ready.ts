/**
 * Refuse to deploy a local build whose posts differ from what is committed.
 *
 *   just deploy   (runs this before building)
 *
 * Every status has a route, so a local build publishes every post file the
 * loader finds at its URL, drafts included. The check compares the files the
 * loader actually reads (getPostSlugs, which skips *.draft.md scratch copies)
 * with the files git tracks, so untracked and gitignored posts both count, and
 * refuses when a tracked post has uncommitted changes.
 */

import { execFileSync } from "node:child_process";
import { getPostSlugs } from "../src/lib/api";

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function main(): number {
  let tracked: Set<string>;
  let changed: string[];
  try {
    tracked = new Set(git(["ls-files", "-z", "--", "_posts"]).split("\0").filter(Boolean));
    changed = git(["status", "--porcelain", "--untracked-files=no", "--", "_posts"]).split("\n").filter(Boolean);
  } catch (error) {
    console.error(`Refusing to deploy: cannot read git state for _posts (${(error as Error).message.trim()}).`);
    return 1;
  }

  const untracked = getPostSlugs()
    .map((slug) => `_posts/${slug}`)
    .filter((file) => !tracked.has(file));

  if (untracked.length === 0 && changed.length === 0) return 0;

  console.error("Refusing to deploy: the build would publish post files that are not committed.");
  console.error("Drafts have routes, so these would go live at their URLs.");
  if (untracked.length > 0) {
    for (const file of untracked) console.error(`  not tracked: ${file}`);
    console.error("Commit a post to deploy it, or keep it local by renaming it to <name>.draft.md,");
    console.error("a scratch copy the build never reads.");
  }
  if (changed.length > 0) {
    for (const line of changed) console.error(`  changed:     ${line}`);
    console.error("Commit these changes, or set them aside, before deploying.");
  }
  return 1;
}

process.exit(main());
