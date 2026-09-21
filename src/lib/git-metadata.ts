import { execFileSync } from "node:child_process";

export interface GitMetadata {
  publishedAt: string;
  updatedAt: string;
  updateCount: number;
  lastCommitMessage: string;
  lastCommitSha: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      date: string;
    };
    message: string;
  };
}

interface CommitRecord {
  sha: string;
  date: string;
  subject: string;
}

/** Fold a newest-first list of commits into the metadata the site shows. */
function summariseCommits(commits: CommitRecord[]): GitMetadata | null {
  if (commits.length === 0) return null;
  const first = commits[commits.length - 1];
  const last = commits[0];
  return {
    publishedAt: first.date,
    updatedAt: last.date,
    // The commit that added the post is not an update.
    updateCount: commits.length - 1,
    lastCommitMessage: last.subject,
    lastCommitSha: last.sha.slice(0, 7),
  };
}

function runGit(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

/**
 * Parse `git log` output produced with the format used by
 * getGitMetadataFromLocalHistory: one commit per line, fields separated by
 * the unit separator character.
 */
export function parseGitLog(output: string): CommitRecord[] {
  return output
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const [sha, date, subject = ""] = line.split("\x1f");
      return { sha, date, subject };
    });
}

/**
 * Read a file's history from the local repository. Renames are followed, so a
 * post keeps its original publication date when it moves. Returns null when
 * the file has no committed history, when git is unavailable, or when the
 * checkout is shallow (its history would be truncated and the dates wrong).
 */
export function getGitMetadataFromLocalHistory(filePath: string, cwd: string = process.cwd()): GitMetadata | null {
  try {
    if (runGit(["rev-parse", "--is-shallow-repository"], cwd).trim() === "true") return null;
    const output = runGit(["log", "--follow", "--format=%H%x1f%aI%x1f%s", "--", filePath], cwd);
    return summariseCommits(parseGitLog(output));
  } catch {
    return null;
  }
}

/**
 * Fetch a file's history from the GitHub API.
 *
 * Environment variables:
 * - GITHUB_OWNER: GitHub username/org (defaults to 'deadmanoz')
 * - GITHUB_REPO: Repository name (defaults to 'deadmanoz.xyz')
 * - GITHUB_TOKEN: Optional token for higher rate limits (5000/hour vs 60/hour)
 */
export async function getGitMetadataFromGitHub(filePath: string): Promise<GitMetadata | null> {
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
    return summariseCommits(
      commits.map((c) => ({ sha: c.sha, date: c.commit.author.date, subject: c.commit.message.split("\n")[0] })),
    );
  } catch (error) {
    console.error(`Error fetching git metadata for ${filePath}:`, error);
    return null;
  }
}

/**
 * Publication history for a post file: the local repository first (no
 * network, no rate limit), the GitHub API when the local history is missing
 * or truncated. Set DISABLE_GIT_METADATA=true to skip both.
 */
export async function getGitMetadata(filePath: string): Promise<GitMetadata | null> {
  return getGitMetadataFromLocalHistory(filePath) ?? (await getGitMetadataFromGitHub(filePath));
}

export function shouldFetchGitMetadata(): boolean {
  // Fetch by default unless explicitly disabled, so dev matches production.
  return process.env.DISABLE_GIT_METADATA !== "true";
}
