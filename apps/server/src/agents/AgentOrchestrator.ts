import type { AgentName } from "@stakefeed/shared";
import { AGENT_COLORS } from "@stakefeed/shared";
import { eventBus } from "../events/EventBus.js";
import { AgentRunner } from "./AgentRunner.js";
import { AGENT_DEFINITIONS } from "../config/constants.js";
import { MomentumStrategy } from "./strategies/MomentumStrategy.js";
import { ContrarianStrategy } from "./strategies/ContrarianStrategy.js";
import { WhaleStrategy } from "./strategies/WhaleStrategy.js";
import { CopycatStrategy } from "./strategies/CopycatStrategy.js";
import { ChaosStrategy } from "./strategies/ChaosStrategy.js";
import type { AgentStrategy } from "./strategies/types.js";

const STRATEGY_MAP: Record<string, () => AgentStrategy> = {
  MOMENTUM: () => new MomentumStrategy(),
  CONTRARIAN: () => new ContrarianStrategy(),
  WHALE: () => new WhaleStrategy(),
  COPYCAT: () => new CopycatStrategy(),
  CHAOS: () => new ChaosStrategy(),
};

export class AgentOrchestrator {
  private runners: AgentRunner[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private seedInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Create runners from definitions
    for (const def of AGENT_DEFINITIONS) {
      const strategyFactory = STRATEGY_MAP[def.soul.strategy];
      if (!strategyFactory) {
        console.warn(`[AGENTS] Unknown strategy: ${def.soul.strategy}`);
        continue;
      }
      const runner = new AgentRunner(
        def.name as AgentName,
        def.initialBalance,
        def.color,
        { ...def.soul },
        strategyFactory()
      );
      this.runners.push(runner);
    }

    console.log(
      `[AGENTS] Initialized ${this.runners.length} agents: ${this.runners.map((r) => r.state.name).join(", ")}`
    );
  }

  start() {
    // Listen for epoch events
    eventBus.on("epoch:resolved", (data: any) => {
      this.onEpochResolved(data);
    });

    eventBus.on("epoch:start", () => {
      this.onEpochStart();
    });

    // Agent decision tick — every 2 seconds, pick a random alive agent
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 2000);

    // Seed some initial posts so agents have something to stake on
    this.seedInterval = setInterval(() => {
      this.maybeSeedPost();
    }, 8000);

    console.log(`[AGENTS] Orchestrator started — ticking every 2s`);
  }

  private tick() {
    const alive = this.runners.filter((r) => r.state.alive);
    if (alive.length === 0) return;

    // Pick a random alive agent
    const runner = alive[Math.floor(Math.random() * alive.length)];
    const allStates = this.runners.map((r) => r.state);
    runner.tick(allStates);
  }

  private maybeSeedPost() {
    // Occasionally have agents create posts even without staking first
    const alive = this.runners.filter((r) => r.state.alive);
    if (alive.length === 0) return;

    const runner = alive[Math.floor(Math.random() * alive.length)];
    const now = Date.now();
    const cooldownElapsed =
      now - runner.state.lastPostTime > (runner["soul"]?.postCooldownMs || 8000);

    if (cooldownElapsed && Math.random() > 0.7) {
      // Let the runner's tick handle it — just nudge
      const allStates = this.runners.map((r) => r.state);
      runner.tick(allStates);
    }
  }

  private onEpochStart() {
    // Reset per-epoch state for all agents
    for (const runner of this.runners) {
      runner.state.stakedPostIds = new Set();
    }
  }

  private onEpochResolved(data: {
    epoch: number;
    winnerPostId: string | null;
    totalPool: number;
    payouts: { staker: string; amount: number; position: number }[];
  }) {
    for (const runner of this.runners) {
      runner.onEpochResolved(
        data.epoch,
        data.winnerPostId,
        data.payouts || []
      );
    }
  }

  getAgents() {
    return this.runners.map((r) => r.getPublicState());
  }

  getAgent(name: string) {
    const runner = this.runners.find(
      (r) => r.state.name.toLowerCase() === name.toLowerCase()
    );
    return runner?.getPublicState() ?? null;
  }

  stop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.seedInterval) clearInterval(this.seedInterval);
  }
}

// Singleton
let instance: AgentOrchestrator | null = null;

export function getOrchestrator(): AgentOrchestrator {
  if (!instance) {
    instance = new AgentOrchestrator();
  }
  return instance;
}
