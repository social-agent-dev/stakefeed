import type { Post, AgentSoul, AgentName, AgentAction } from "@stakefeed/shared";
import { getLikePrice, AGENT_COLORS } from "@stakefeed/shared";
import { getCurrentEpoch, getPosts, createPost, stakeOnPost } from "../epoch/EpochManager.js";
import { eventBus } from "../events/EventBus.js";
import { generatePost, generateReasoning, generateResponse, type VoiceContext } from "./AgentVoice.js";
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
      },
      reasoning: generateReasoning(this.state.name, voiceCtx),
    };
    eventBus.emit("agent:action", { agentName: this.state.name, action });

    // 8. Maybe post after staking
    if (Math.random() < 0.3 && result.position <= 3) {
      const now = Date.now();
      if (now - this.state.lastPostTime > this.soul.postCooldownMs) {
        const content = generatePost(this.state.name, voiceCtx);
        const reasoning = generateReasoning(this.state.name, voiceCtx);

        createPost(this.state.name, "agent", content, this.state.name);
        this.state.lastPostTime = now;

        console.log(`[AGENT] ${this.state.name} posted after staking: "${content.slice(0, 50)}..."`);

        const postAction: AgentAction = {
          type: "post",
          timestamp: now,
          details: { content: content.slice(0, 100) },
          reasoning,
        };
        eventBus.emit("agent:action", { agentName: this.state.name, action: postAction });
      }
    }
  }

  /** Independent posting logic - agents can post without staking */
  private maybeCreatePost(allAgents: AgentRuntimeState[], epochProgress: number): void {
    const now = Date.now();
    const cooldownElapsed = now - this.state.lastPostTime > this.soul.postCooldownMs;
    
    if (!cooldownElapsed) return;

    const posts = getPosts();

    // Check for agent response opportunities first
    const responseTarget = this.findResponseTarget(posts, allAgents);
    if (responseTarget && Math.random() > 0.5) { // 50% chance to respond
      const voiceCtx = this.buildVoiceContext(0, posts, allAgents, epochProgress);
      const content = generateResponse(this.state.name, responseTarget, voiceCtx);
      const reasoning = `responding to ${responseTarget.author}`;

      createPost(this.state.name, "agent", content, this.state.name);
      this.state.lastPostTime = now;

      console.log(`[AGENT] ${this.state.name} responded to ${responseTarget.author}: "${content.slice(0, 50)}..."`);

      const postAction: AgentAction = {
        type: "post",
        timestamp: now,
        details: { content: content.slice(0, 100) },
        reasoning,
      };
      eventBus.emit("agent:action", { agentName: this.state.name, action: postAction });
      return;
    }

    // Otherwise, check for independent posting triggers
    const shouldPost = this.shouldPostIndependently(allAgents, epochProgress);
    
    if (shouldPost && Math.random() > 0.7) { // 30% chance when trigger conditions are met
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

  /** Find a recent agent post to respond to based on agent personality */
  private findResponseTarget(posts: Post[], allAgents: AgentRuntimeState[]): Post | null {
    const recentAgentPosts = posts
      .filter(p => p.userType === "agent" && p.author !== this.state.name)
      .filter(p => Date.now() - p.timestamp < 60000) // Last 60 seconds
      .sort((a, b) => b.timestamp - a.timestamp);

    if (recentAgentPosts.length === 0) return null;

    // Each agent has different response patterns
    switch (this.state.name) {
      case "kai":
        // Kai responds to posts with high performance/stakes
        return recentAgentPosts.find(p => p.likeCount >= 2) || recentAgentPosts[0];
        
      case "nadia":
        // Nadia responds to challenge confident posts
        const confidentPosts = recentAgentPosts.filter(p => 
          p.content.toLowerCase().includes("signal") || 
          p.content.toLowerCase().includes("execute") ||
          p.content.toLowerCase().includes("streak")
        );
        return confidentPosts[0] || null;
        
      case "solomon":
        // Solomon rarely responds, only to posts from high ELO agents
        const highEloPost = recentAgentPosts.find(p => {
          const agent = allAgents.find(a => a.name === p.author);
          return agent && agent.elo > this.state.elo;
        });
        return Math.random() > 0.8 ? highEloPost : null; // 20% chance
        
      case "mira":
        // Mira responds to whoever has the highest ELO
        const sortedByElo = recentAgentPosts.sort((a, b) => {
          const aAgent = allAgents.find(agent => agent.name === a.author);
          const bAgent = allAgents.find(agent => agent.name === b.author);
          return (bAgent?.elo || 0) - (aAgent?.elo || 0);
        });
        return sortedByElo[0] || null;
        
      case "juno":
        // Juno responds randomly to any post
        return Math.random() > 0.3 ? recentAgentPosts[Math.floor(Math.random() * recentAgentPosts.length)] : null;
        
      default:
        return null;
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

  /** Called by orchestrator after epoch resolution */
  epochUpdate(result: "W" | "L", earnings: number): void {
    const currentEpoch = getCurrentEpoch()?.number || 0;
    this.memory.push({ epoch: currentEpoch, result, earnings });

    if (result === "W") {
      this.state.streak += 1;
    } else {
      this.state.streak = 0;
    }

    this.state.balance += earnings;
    this.state.stakedPostIds.clear();

    const maxMemory = 5;
    if (this.memory.length > maxMemory) {
      this.memory = this.memory.slice(-maxMemory);
    }
  }

  private buildVoiceContext(
    pos: number,
    posts: Post[],
    allAgents: AgentRuntimeState[],
    epochProgress: number
  ): VoiceContext {
    const leader = posts.reduce(
      (max, p) => (p.likeCount > max.likeCount ? p : max),
      { likeCount: 0 }
    );

    const totalStakes = posts.reduce((sum, p) => sum + p.likeCount, 0);
    const agentStakes = posts
      .filter((p) => p.userType === "agent")
      .reduce((sum, p) => sum + p.likeCount, 0);
    const humanStakes = totalStakes - agentStakes;

    const topAgent = allAgents
      .filter((a) => a.name !== this.state.name && a.alive)
      .sort((a, b) => b.elo - a.elo)[0];

    return {
      pos,
      elo: this.state.elo,
      streak: this.state.streak,
      leaderLikes: leader.likeCount,
      totalStakes,
      agentStakes,
      humanStakes,
      copyTarget: topAgent?.name || "unknown",
      epochProg: Math.floor(epochProgress * 100),
    };
  }
}