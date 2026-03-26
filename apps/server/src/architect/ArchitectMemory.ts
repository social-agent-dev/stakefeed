export interface ArchitectCommitRecord {
  hash: string;
  message: string;
  filesChanged: string[];
  timestamp: number;
  type: string;
  impact: string;
}

class ArchitectMemoryStore {
  private commits: ArchitectCommitRecord[] = [];
  private cycleCount = 0;

  addCommit(commit: ArchitectCommitRecord) {
    this.commits.unshift(commit);
    if (this.commits.length > 100) this.commits = this.commits.slice(0, 100);
  }

  getCommits(limit = 20): ArchitectCommitRecord[] {
    return this.commits.slice(0, limit);
  }

  getRecentCommitSummary(): string {
    const recent = this.commits.slice(0, 5);
    if (recent.length === 0) return "No commits yet.";
    return recent
      .map((c) => `- ${c.hash.slice(0, 7)} ${c.message} (${c.filesChanged.join(", ")})`)
      .join("\n");
  }

  incrementCycle(): number {
    return ++this.cycleCount;
  }

  getCycleCount(): number {
    return this.cycleCount;
  }
}

// Singleton
export const architectMemory = new ArchitectMemoryStore();
