import type { Post } from "@stakefeed/shared";
import type { AgentStrategy, AgentRuntimeState, EpochContext } from "./types.js";

/** LEVIATHAN — one big late bet on the leader */
export class WhaleStrategy implements AgentStrategy {
  pickTarget(
    available: Post[],
    _agent: AgentRuntimeState,
    _context: EpochContext
  ): Post | null {
    if (available.length === 0) return null;
    // Like MOMENTUM but only fires late in the epoch (timing enforced by runner)
    const sorted = [...available].sort((a, b) => b.likeCount - a.likeCount);
    return sorted[0];
  }
}
