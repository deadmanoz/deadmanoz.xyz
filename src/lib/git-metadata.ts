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

/**
 * Fetches git metadata from GitHub API for a given file path.
 * 
 * Environment variables:
 * - GITHUB_OWNER: GitHub username/org (defaults to 'deadmanoz')
 * - GITHUB_REPO: Repository name (defaults to 'deadmanoz.xyz')
 * - GITHUB_TOKEN: Optional GitHub token for higher rate limits (5000/hour vs 60/hour)
 * - DISABLE_GIT_METADATA: Set to 'true' to disable metadata fetching (for faster dev builds)
 */
export async function getGitMetadata(filePath: string): Promise<GitMetadata | null> {
  const owner = process.env.GITHUB_OWNER || 'deadmanoz';
  const repo = process.env.GITHUB_REPO || 'deadmanoz.xyz';
  
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?path=${filePath}&per_page=100`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'deadmanoz-xyz-blog'
    };
    
    // Add GitHub token if available for higher rate limits
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
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
    
    // Commits are returned in reverse chronological order (newest first)
    const firstCommit = commits[commits.length - 1];
    const lastCommit = commits[0];
    
    return {
      publishedAt: firstCommit.commit.author.date,
      updatedAt: lastCommit.commit.author.date,
      updateCount: Math.max(0, commits.length - 1), // Don't count initial commit as "update"
      lastCommitMessage: lastCommit.commit.message.split('\n')[0], // First line only
      lastCommitSha: lastCommit.sha.substring(0, 7)
    };
  } catch (error) {
    console.error(`Error fetching git metadata for ${filePath}:`, error);
    return null;
  }
}

export function shouldFetchGitMetadata(): boolean {
  // Fetch by default unless explicitly disabled
  // This ensures dev matches production behavior
  return process.env.DISABLE_GIT_METADATA !== 'true';
}