import type { Post, AgentSoul, AgentName, AgentAction } from "@stakefeed/shared";
import { getLikePrice, AGENT_COLORS } from "@stakefeed/shared";
import { getCurrentEpoch, getPosts, createPost, stakeOnPost } from "../epoch/EpochManager.js";
import { eventBus } from "../events/EventBus.js";
import { generatePost, generateReasoning, type VoiceContext } from "./AgentVoice.js";
import type { AgentStrategy, AgentRuntimeState, EpochContext } from "./strategies/types.js";
import { EPOCH_DURATION_SECS } from "../config/constants.js";

export class AgentRunner {
  public state: AgentRuntimeState;
  private soul: AgentSoul;
  private strategy: AgentStrategy;
  private memory: { epoch: number; result: "W" | "L"; earnings?: number }[] = [];

  constructor(
    name: AgentName,
    initialBalance: number,
    color: string,
    soul: AgentSoul,
    strategy: AgentStrategy
  ) {
    this.soul = soul;
    this.strategy = strategy;
    this.state = {
      name,
      balance: initialBalance,
      elo: 1200,
      streak: 0,
      alive: true,
      color,
      stakedPostIds: new Set(),
      lastPostTime: 0,
    };
  }

  /** Called every ~2 seconds by the orchestrator */
  tick(allAgents: AgentRuntimeState[]): void {
    if (!this.state.alive) return;

    const epoch = getCurrentEpoch();
    if (!epoch || epoch.resolved) return;

    const elapsed = Date.now() - epoch.startTime;
    const epochProgress = elapsed / (EPOCH_DURATION_SECS * 1000);

    // 1. Check if agent should post (independent of staking)
    this.maybeCreatePost(allAgents, epochProgress);

    // 2. Check timing window for staking
    const [tMin, tMax] = this.soul.timing;
    if (epochProgress < tMin || epochProgress > tMax) return;

    // 3. Find posts not yet staked on by this agent
    const posts = getPosts();
    const available = posts.filter(
      (p) => !this.state.stakedPostIds.has(p.id)
    );
    if (available.length === 0) return;

    // 4. Build context
    const context: EpochContext = {
      epochProgress,
      posts,
      agents: allAgents,
    };

    // 5. Strategy picks target
    const target = this.strategy.pickTarget(available, this.state, context);
    if (!target) return;

    // 6. Risk check
    const price = getLikePrice(target.likeCount);
    if (price > this.state.balance * this.soul.risk) return;

    // 7. Execute stake
    const result = stakeOnPost(target.id, this.state.name, true, this.state.name);
    if (!("success" in result) || !result.success) return;

    this.state.balance -= result.price;
    this.state.stakedPostIds.add(target.id);

    const voiceCtx = this.buildVoiceContext(result.position, posts, allAgents, epochProgress);

    console.log(
      `[AGENT] ${this.state.name} staked on "${target.content.slice(0, 35)}..." at #${result.position} for ◎${result.price.toFixed(4)}`
    );

    // Emit action
    const action: AgentAction = {
      type: "stake",
      timestamp: Date.now(),
      details: {
        postId: target.id,
        position: result.position,
        price: result.price,
        targetContent: target.content.slice(0, 50),
      },
      reasoning: generateReasoning(this.state.name, voiceCtx),
    };
    eventBus.emit("agent:action", { agentName: this.state.name, action });

    // 8. Maybe post after staking (higher chance for engagement)
    const now = Date.now();
    const cooldownElapsed = now - this.state.lastPostTime > this.soul.postCooldownMs;
    if (cooldownElapsed && Math.random() > 0.2) { // Increased from 0.5 to 0.2 (80% chance)
      const content = generatePost(this.state.name, voiceCtx);
      const reasoning = generateReasoning(this.state.name, voiceCtx);

      createPost(this.state.name, "agent", content, this.state.name);
      this.state.lastPostTime = now;

      console.log(`[AGENT] ${this.state.name} posted: "${content.slice(0, 50)}..."`);

      const postAction: AgentAction = {
        type: "post",
        timestamp: now,
        details: { content: content.slice(0, 100) },
        reasoning,
      };
      eventBus.emit("agent:action", { agentName: this.state.name, action: postAction });
    }
  }

  /** Independent posting logic - agents can post without staking */
  private maybeCreatePost(allAgents: AgentRuntimeState[], epochProgress: number): void {
    const now = Date.now();
    const cooldownElapsed = now - this.state.lastPostTime > this.soul.postCooldownMs;
    
    if (!cooldownElapsed) return;

    // Each agent has different posting triggers based on their personality
    const shouldPost = this.shouldPostIndependently(allAgents, epochProgress);
    
    if (shouldPost && Math.random() > 0.7) { // 30% chance when trigger conditions are met
      const posts = getPosts();
      const voiceCtx = this.buildVoiceContext(0, posts, allAgents, epochProgress);
      const content = generatePost(this.state.name, voiceCtx);
      const reasoning = generateReasoning(this.state.name, voiceCtx);

      createPost(this.state.name, "agent", content, this.state.name);
      this.state.lastPostTime = now;

      console.log(`[AGENT] ${this.state.name} posted independently: "${content.slice(0, 50)}..."`);

      const postAction: AgentAction = {
        type: "post",
        timestamp: now,
        details: { content: content.slice(0, 100) },
        reasoning,
      };
      eventBus.emit("agent:action", { agentName: this.state.name, action: postAction });
    }
  }

  /** Determine if agent should post based on their personality and market conditions */
  private shouldPostIndependently(allAgents: AgentRuntimeState[], epochProgress: number): boolean {
    const posts = getPosts();
    const recentPosts = posts.filter(p => Date.now() - p.timestamp < 30000); // Last 30 seconds
    
    switch (this.state.name) {
      case "kai":
        // Kai posts when market is moving fast or early in epoch
        return epochProgress < 0.3 || recentPosts.length >= 2;
        
      case "nadia":
        // Nadia posts when she sees contrarian opportunities
        const agentPosts = recentPosts.filter(p => p.userType === "agent");
        return agentPosts.length < recentPosts.length / 2; // Less agent activity than human
        
      case "solomon":
        // Solomon posts rarely, only mid-epoch when things get interesting
        return epochProgress > 0.4 && epochProgress < 0.7 && posts.length >= 3;
        
      case "mira":
        // Mira posts after seeing high ELO agents post
        const highEloAgents = allAgents.filter(a => a.elo > this.state.elo && a.name !== this.state.name);
        const recentHighEloActivity = recentPosts.some(p => 
          p.userType === "agent" && highEloAgents.some(a => a.name === p.author)
        );
        return recentHighEloActivity;
        
      case "juno":
        // Juno posts randomly but more often when chaos is high
        const chaosScore = recentPosts.length + (Math.random() * 100);
        return chaosScore > 50;
        
      default:
        return false;
    }
  }

  /** Called by orchestrator after epoch resolves */
  onEpochResolved(
    epochNumber: number,
    winnerPostId: string | null,
    payouts: { staker: string; amount: number; position: number }[]
  ): void {
    const myPayout = payouts.find((p) => p.staker === this.state.name);

    if (myPayout) {
      // Won — staked on the winning post
      this.state.balance += myPayout.amount;
      this.state.streak += 1;
      this.state.elo += 20 + this.state.streak * 5;
      this.memory.push({ epoch: epochNumber, result: "W", earnings: myPayout.amount });
      console.log(
        `[AGENT] ${this.state.name} WON epoch ${epochNumber}: +◎${myPayout.amount.toFixed(4)} (ELO: ${this.state.elo}, streak: ${this.state.streak})`
      );
    } else {
      // Lost
      this.state.streak = 0;
      this.state.elo = Math.max(800, this.state.elo - 12);
      this.memory.push({ epoch: epochNumber, result: "L" });
      console.log(
        `[AGENT] ${this.state.name} LOST epoch ${epochNumber} (ELO: ${this.state.elo})`
      );
    }

    // Check elimination
    if (this.state.balance < 0.001) {
      this.state.alive = false;
      console.log(`[AGENT] ${this.state.name} ELIMINATED — bankrupt`);
    }

    // Reset per-epoch state
    this.state.stakedPostIds = new Set();

    // Keep memory trimmed
    if (this.memory.length > 20) this.memory = this.memory.slice(-20);

    // Broadcast updated state
    eventBus.emit("agent:updated", this.getPublicState());
  }

  getPublicState() {
    return {
      name: this.state.name,
      walletAddress: "", // will be real keypair later
      balance: this.state.balance,
      totalEarned: 0, // TODO: track
      totalSpent: 0,
      elo: this.state.elo,
      streak: this.state.streak,
      generation: 0,
      alive: this.state.alive,
      color: this.state.color,
      soul: this.soul,
      lastAction: undefined,
    };
  }

  private buildVoiceContext(
    position: number,
    posts: Post[],
    agents: AgentRuntimeState[],
    epochProgress: number
  ): VoiceContext {
    const sorted = [...posts].sort((a, b) => b.likeCount - a.likeCount);
    const topAgent = [...agents]
      .filter((a) => a.name !== this.state.name && a.alive)
      .sort((a, b) => b.elo - a.elo)[0];

    return {
      pos: position,
      elo: this.state.elo,
      streak: this.state.streak,
      leaderLikes: sorted[0]?.likeCount || 0,
      totalStakes: posts.reduce((s, p) => s + p.likeCount, 0),
      agentStakes: posts.reduce(
        (s, p) => s + p.likes.filter((l) => l.isAgent).length,
        0
      ),
      humanStakes: posts.reduce(
        (s, p) => s + p.likes.filter((l) => !l.isAgent).length,
        0
      ),
      copyTarget: topAgent?.name || "kai",
      epochProg: Math.floor(epochProgress * 100),
    };
  }
}