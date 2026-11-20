import { execFileSync } from "node:child_process";

/**
 * Update history for a published post. The frontmatter `date` is the
 * publication date; git only says what changed after it.
 */
export interface GitMetadata {
  /** Commits after the publication day, not counting the commit that added the file. */
  updateCount: number;
  /** The newest of those commits, or null when there are none. */
  lastUpdate: { date: string; sha: string } | null;
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      date: string;
    };
  };
}

export interface CommitRecord {
  sha: string;
  date: string;
}

/**
 * Fold a newest-first list of commits into update history relative to the
 * publication date. The oldest commit added the file, so it is never an
 * update; commits made on the publication day (UTC) are part of publishing,
 * not revisions, so only commits from the start of the next UTC day count.
 */
export function summariseCommits(commits: CommitRecord[], publishedOn: string): GitMetadata {
  const published = new Date(publishedOn);
  const cutoff = Date.UTC(published.getUTCFullYear(), published.getUTCMonth(), published.getUTCDate() + 1);
  const updates = commits.slice(0, -1).filter((commit) => Date.parse(commit.date) >= cutoff);
  const newest = updates[0];
  return {
    updateCount: updates.length,
    lastUpdate: newest ? { date: newest.date, sha: newest.sha.slice(0, 7) } : null,
  };
}

function runGit(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

/**
 * Parse `git log` output produced with the format used by readLocalHistory:
 * one commit per line, fields separated by the unit separator character.
 */
export function parseGitLog(output: string): CommitRecord[] {
  return output
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const [sha, date] = line.split("\x1f");
      return { sha, date };
    });
}

/**
 * Read a file's commits, newest first, from the local repository. Renames are
 * followed, so a moved post keeps its history. Returns null when the file has
 * no committed history, when git is unavailable, or when the checkout is
 * shallow (its history would be truncated).
 */
export function readLocalHistory(filePath: string, cwd: string = process.cwd()): CommitRecord[] | null {
  try {
    if (runGit(["rev-parse", "--is-shallow-repository"], cwd).trim() === "true") return null;
    const commits = parseGitLog(runGit(["log", "--follow", "--format=%H%x1f%aI", "--", filePath], cwd));
    return commits.length > 0 ? commits : null;
  } catch {
    return null;
  }
}

/**
 * Fetch a file's commits, newest first, from the GitHub API.
 *
 * Environment variables:
 * - GITHUB_OWNER: GitHub username/org (defaults to 'deadmanoz')
 * - GITHUB_REPO: Repository name (defaults to 'deadmanoz.xyz')
 * - GITHUB_TOKEN: Optional token for higher rate limits (5000/hour vs 60/hour)
 */
export async function readGitHubHistory(filePath: string): Promise<CommitRecord[] | null> {
  const owner = process.env.GITHUB_OWNER || "deadmanoz";
  const repo = process.env.GITHUB_REPO || "deadmanoz.xyz";

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?path=${filePath}&per_page=100`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "deadmanoz-xyz-blog",
    };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.warn(`Failed to fetch git metadata for ${filePath}: ${response.status} ${response.statusText}`);
      return null;
    }

    const commits: GitHubCommit[] = await response.json();
    if (commits.length === 0) {
      console.warn(`No commits found for ${filePath}`);
      return null;
    }

    // Newest first, as the API returns them.
    return commits.map((c) => ({ sha: c.sha, date: c.commit.author.date }));
  } catch (error) {
    console.error(`Error fetching git metadata for ${filePath}:`, error);
    return null;
  }
}

/**
 * Update history for a published post file since `publishedOn`. History comes
 * from the local repository first (no network, no rate limit) and from the
 * GitHub API only when the local history is missing or truncated; the
 * publication filter runs after the source is chosen, so a complete local
 * history with no updates never reaches the network. Set
 * DISABLE_GIT_METADATA=true to skip both.
 */
export async function getGitMetadata(
  filePath: string,
  publishedOn: string,
  cwd: string = process.cwd(),
): Promise<GitMetadata | null> {
  const commits = readLocalHistory(filePath, cwd) ?? (await readGitHubHistory(filePath));
  return commits ? summariseCommits(commits, publishedOn) : null;
}

export function shouldFetchGitMetadata(): boolean {
  // Fetch by default unless explicitly disabled, so dev matches production.
  return process.env.DISABLE_GIT_METADATA !== "true";
}
