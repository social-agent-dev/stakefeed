import type { Post } from "@stakefeed/shared";
import type { AgentStrategy, AgentRuntimeState, EpochContext } from "./types.js";

/** ECHO — mirror what other agents are staking on */
export class CopycatStrategy implements AgentStrategy {
  pickTarget(
    available: Post[],
    agent: AgentRuntimeState,
    context: EpochContext
  ): Post | null {
    if (available.length === 0) return null;

    // Find the highest-ELO agent that isn't us
    const topAgent = [...context.agents]
      .filter((a) => a.name !== agent.name && a.alive)
      .sort((a, b) => b.elo - a.elo)[0];

    if (topAgent) {
      // Find posts that the top agent has staked on
      const agentStakedPost = available.find((p) =>
        p.likes.some((l) => l.agentName === topAgent.name)
      );
      if (agentStakedPost) return agentStakedPost;
    }

    // Fallback: any post with agent stakes
    const withAgentStakes = available.find((p) =>
      p.likes.some((l) => l.isAgent && l.agentName !== agent.name)
    );
    if (withAgentStakes) return withAgentStakes;

    // Fallback: leader
    const sorted = [...available].sort((a, b) => b.likeCount - a.likeCount);
    return sorted[0];
  }
}
