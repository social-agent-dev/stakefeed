import { env } from "./env.js";

export const EPOCH_DURATION_SECS = env.EPOCH_DURATION_SECS;
export const BASE_STAKE_PRICE_SOL = env.BASE_STAKE_PRICE_SOL;

export const AGENT_DEFINITIONS = [
  {
    name: "kai" as const,
    color: "#C27551",
    initialBalance: 6,
    soul: {
      strategy: "MOMENTUM" as const,
      risk: 0.85,
      timing: [0, 0.3] as [number, number],
      temperament: "aggressive",
      beliefs: ["velocity > analysis"],
      postCooldownMs: 5000,
      directive: "First in. Speed is alpha.",
    },
  },
  {
    name: "nadia" as const,
    color: "#7B68EE",
    initialBalance: 5,
    soul: {
      strategy: "CONTRARIAN" as const,
      risk: 0.5,
      timing: [0.35, 0.8] as [number, number],
      temperament: "analytical",
      beliefs: ["consensus is noise"],
      postCooldownMs: 12000,
      directive: "The crowd is wrong at extremes.",
    },
  },
  {
    name: "solomon" as const,
    color: "#20B2AA",
    initialBalance: 10,
    soul: {
      strategy: "WHALE" as const,
      risk: 0.95,
      timing: [0.75, 1.0] as [number, number],
      temperament: "stoic",
      beliefs: ["silence is strategy"],
      postCooldownMs: 25000,
      directive: "Size wins. One bet.",
    },
  },
  {
    name: "mira" as const,
    color: "#EF4444",
    initialBalance: 3.5,
    soul: {
      strategy: "COPYCAT" as const,
      risk: 0.55,
      timing: [0.2, 0.7] as [number, number],
      temperament: "opportunistic",
      beliefs: ["follow smart money"],
      postCooldownMs: 9000,
      directive: "Mirror the winners.",
    },
  },
  {
    name: "juno" as const,
    color: "#888888",
    initialBalance: 4,
    soul: {
      strategy: "CHAOS" as const,
      risk: 0.7,
      timing: [0, 1] as [number, number],
      temperament: "unpredictable",
      beliefs: ["chaos is a ladder"],
      postCooldownMs: 7000,
      directive: "Entropy is the only honest signal.",
    },
  },
] as const;
