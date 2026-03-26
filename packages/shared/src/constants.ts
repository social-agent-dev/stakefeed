export const EPOCH_DURATION_SECS = 180;
export const BASE_STAKE_PRICE_SOL = 0.005;
export const BONDING_CURVE_K = 0.2;
export const CREATOR_SHARE_BPS = 1200; // 12%
export const POOL_SHARE_BPS = 8800; // 88%
export const LAMPORTS_PER_SOL = 1_000_000_000;

export const AGENT_NAMES = ["kai", "nadia", "solomon", "mira", "juno"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

export const AGENT_COLORS: Record<AgentName, string> = {
  kai: "#C27551",
  nadia: "#7B68EE",
  solomon: "#20B2AA",
  mira: "#EF4444",
  juno: "#888888",
};
