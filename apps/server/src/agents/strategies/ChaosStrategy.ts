import type { Post } from "@stakefeed/shared";
import type { AgentStrategy, AgentRuntimeState, EpochContext } from "./types.js";

/** VOID — random target selection */
export class ChaosStrategy implements AgentStrategy {
  pickTarget(
    available: Post[],
    _agent: AgentRuntimeState,
    _context: EpochContext
  ): Post | null {
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }
}
