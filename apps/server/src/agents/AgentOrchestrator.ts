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
import { getPosts } from "../epoch/EpochManager.js";
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
    }, 6000); // Reduced from 8000ms to 6000ms for more activity

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
    // Get current post count to determine if we need more content
    const posts = getPosts();
    const alive = this.runners.filter((r) => r.state.alive);
    if (alive.length === 0) return;

    const runner = alive[Math.floor(Math.random() * alive.length)];
    const now = Date.now();
    const cooldownElapsed =
      now - runner.state.lastPostTime > (runner["soul"]?.postCooldownMs || 8000);

    // If there are very few posts OR random chance, try to seed a post
    const needsMoreContent = posts.length < 3;
    const shouldSeed = needsMoreContent || Math.random() > 0.8;

    if (cooldownElapsed && shouldSeed) {
      // Directly trigger post creation instead of relying on tick()
      runner.forceCreatePost();
    } else {
      // Normal staking behavior
      const allStates = this.runners.map((r) => r.state);
      runner.tick(allStates);
    }
  }

  private onEpochStart() {
    // Reset per-epoch state for all agents
    for (const runner of this.runners) {
      runner.state.stakedPostIds = new Set();
      runner.onEpochStart();
    }
    console.log(`[AGENTS] All agents reset for new epoch`);
  }

  private onEpochResolved(data: {
    epochNumber: number;
    winningPostId: string;
    payouts: Record<string, number>;
  }) {
    console.log(`[AGENTS] Epoch ${data.epochNumber} resolved — distributing payouts`);

    for (const runner of this.runners) {
      const payout = data.payouts[runner.state.name] || 0;
      runner.onEpochResolved(data.epochNumber, payout, data.winningPostId);
    }
  }

  stop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.seedInterval) clearInterval(this.seedInterval);
    this.tickInterval = null;
    this.seedInterval = null;
    console.log(`[AGENTS] Orchestrator stopped`);
  }

  getStates() {
    return this.runners.map((r) => r.state);
  }
}