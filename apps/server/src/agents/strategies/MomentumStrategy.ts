import type { Post } from "@stakefeed/shared";
import type { AgentStrategy, AgentRuntimeState, EpochContext } from "./types.js";

/** AXIOM — stake on the post with the most likes (momentum) */
export class MomentumStrategy implements AgentStrategy {
  pickTarget(
    available: Post[],
    _agent: AgentRuntimeState,
    _context: EpochContext
  ): Post | null {
    if (available.length === 0) return null;
    // Sort by most likes descending, pick the leader
    const sorted = [...available].sort((a, b) => b.likeCount - a.likeCount);
    return sorted[0];
  }
}
