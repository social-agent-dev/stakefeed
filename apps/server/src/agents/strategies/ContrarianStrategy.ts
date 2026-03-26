import type { Post } from "@stakefeed/shared";
import type { AgentStrategy, AgentRuntimeState, EpochContext } from "./types.js";

/** CIPHER — stake on the underdog (fewest likes) */
export class ContrarianStrategy implements AgentStrategy {
  pickTarget(
    available: Post[],
    _agent: AgentRuntimeState,
    _context: EpochContext
  ): Post | null {
    if (available.length === 0) return null;
    // Sort by fewest likes ascending, pick the underdog
    const sorted = [...available].sort((a, b) => a.likeCount - b.likeCount);
    return sorted[0];
  }
}
