import type { AgentName } from "./constants";

export type AgentStrategy =
  | "MOMENTUM"
  | "CONTRARIAN"
  | "WHALE"
  | "COPYCAT"
  | "CHAOS";

export interface AgentSoul {
  strategy: AgentStrategy;
  risk: number; // 0-1, how much of balance they're willing to stake
  timing: [number, number]; // [earliestPct, latestPct] of epoch
  temperament: string;
  beliefs: string[];
  postCooldownMs: number;
  directive: string;
}

export interface AgentState {
  name: AgentName;
  walletAddress: string;
  balance: number; // SOL
  totalEarned: number;
  totalSpent: number;
  elo: number;
  streak: number;
  generation: number;
  alive: boolean;
  color: string;
  soul: AgentSoul;
  lastAction?: AgentAction;
}

export interface AgentAction {
  type: "post" | "stake" | "observe" | "wait";
  timestamp: number;
  details: Record<string, unknown>;
  reasoning?: string;
}

export interface EpochState {
  number: number;
  startTime: number;
  endTime: number;
  totalPool: number;
  resolved: boolean;
  winnerPostId?: string;
}

export interface Post {
  id: string;
  epochNumber: number;
  author: string;
  authorType: "human" | "agent";
  agentName?: AgentName;
  content: string;
  contentHash: string;
  likeCount: number;
  totalStaked: number;
  likes: StakeInfo[];
  createdAt: number;
}

export interface StakeInfo {
  staker: string;
  position: number;
  amount: number;
  isAgent: boolean;
  agentName?: AgentName;
  timestamp: number;
}

// Socket.IO event types
export interface ServerToClientEvents {
  "epoch:start": (epoch: EpochState) => void;
  "epoch:tick": (data: { timeRemaining: number; epoch: number }) => void;
  "epoch:resolved": (data: {
    epoch: number;
    winnerPostId: string;
    totalPool: number;
    payouts: { staker: string; amount: number; position: number }[];
  }) => void;
  "post:created": (post: Post) => void;
  "stake:placed": (data: {
    postId: string;
    staker: string;
    amount: number;
    position: number;
    newPrice: number;
    isAgent: boolean;
    agentName?: AgentName;
  }) => void;
  "agent:action": (data: {
    agentName: AgentName;
    action: AgentAction;
  }) => void;
  "agent:updated": (agent: AgentState) => void;
}

export interface ClientToServerEvents {
  "post:create": (data: { content: string; walletAddress: string }) => void;
  "stake:place": (data: { postId: string; walletAddress: string }) => void;
}

// Architect events
export interface ArchitectServerEvents {
  "architect:phase": (data: {
    phase: "analyzing" | "planning" | "writing" | "testing" | "deploying" | "idle";
    label?: string;
  }) => void;
  "architect:output": (data: { text: string; stream: boolean }) => void;
  "architect:tool_use": (data: { tool: string; input: Record<string, unknown> }) => void;
  "architect:commit": (data: {
    hash: string;
    message: string;
    filesChanged: string[];
    timestamp: number;
    type: string;
    impact: string;
  }) => void;
  "architect:idle": (data: { nextRunIn: number }) => void;
}
