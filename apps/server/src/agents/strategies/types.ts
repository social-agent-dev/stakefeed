import type { Post, AgentName } from "@stakefeed/shared";

export interface AgentRuntimeState {
  name: AgentName;
  balance: number;
  elo: number;
  streak: number;
  alive: boolean;
  color: string;
  stakedPostIds: Set<string>;
  lastPostTime: number;
}

export interface EpochContext {
  epochProgress: number; // 0.0 to 1.0
  posts: Post[];
  agents: AgentRuntimeState[];
}

export interface AgentStrategy {
  pickTarget(
    available: Post[],
    agent: AgentRuntimeState,
    context: EpochContext
  ): Post | null;
}
