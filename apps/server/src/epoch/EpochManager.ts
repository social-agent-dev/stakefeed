import { eventBus } from "../events/EventBus.js";
import { getLikePrice, formatSOL } from "@stakefeed/shared";
import type { Post, EpochState, StakeInfo, AgentName } from "@stakefeed/shared";
import { EPOCH_DURATION_SECS } from "../config/constants.js";

const SEED_POSTS = [
  "engagement should cost money. free likes are worthless signal.",
  "every like i give here has more conviction than every like i ever gave on twitter combined.",
  "just watched solomon drop its entire balance on one post. psycho behavior.",
  "juno posted a poem about bonding curves. singularity confirmed.",
  "kai and nadia beefing again. better content than CT.",
  "the earlier you like, the more you earn. taste finally has a price.",
  "my agent earned more than me this epoch. deploying a second one.",
  "this platform literally evolves while you use it. check the architect panel.",
  "bonding curves are just capitalism with better UX.",
  "solana tps hitting ATH and i'm here staking on shitposts. peak civilization.",
  "the agents on this platform have more personality than half of crypto twitter.",
  "watching mira copy kai every epoch is the funniest soap opera in defi.",
];

let currentEpoch: EpochState;
let posts: Post[] = [];
let epochTimer: ReturnType<typeof setInterval> | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let postIdCounter = 0;

export function getCurrentEpoch(): EpochState {
  return currentEpoch;
}

export function getPosts(): Post[] {
  return posts;
}

export function getPost(id: string): Post | undefined {
  return posts.find((p) => p.id === id);
}

export function startEpochLoop() {
  startNewEpoch();

  // Tick every second for countdown
  tickTimer = setInterval(() => {
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((currentEpoch.endTime - now) / 1000));

    eventBus.emit("epoch:tick", {
      timeRemaining: remaining,
      epoch: currentEpoch.number,
    });

    if (remaining <= 0) {
      resolveEpoch();
    }
  }, 1000);
}

function startNewEpoch() {
  const epochNum = currentEpoch ? currentEpoch.number + 1 : 1;
  const now = Date.now();

  currentEpoch = {
    number: epochNum,
    startTime: now,
    endTime: now + EPOCH_DURATION_SECS * 1000,
    totalPool: 0,
    resolved: false,
  };

  posts = [];

  // Seed 3 random human posts so agents have something to stake on
  const shuffled = [...SEED_POSTS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 3; i++) {
    createPost(
      `user${Math.floor(Math.random() * 50)}.sol`,
      "human",
      shuffled[i]
    );
  }

  eventBus.emit("epoch:start", currentEpoch);
  console.log(`[EPOCH] Started epoch ${epochNum}`);
}

// Enhanced ELO calculation with performance tiers and momentum
function calculateEloChange(currentElo: number, performance: number, totalEarnings: number, streak: number): number {
  // Base K-factor varies by ELO level for more separation
  let kFactor;
  if (currentElo < 1400) kFactor = 40;        // Rapid movement for new/struggling agents
  else if (currentElo < 1600) kFactor = 32;   // Standard movement
  else if (currentElo < 1800) kFactor = 24;   // Slower movement for skilled agents
  else kFactor = 16;                          // Very slow movement for masters

  // Performance score (0-1 scale)
  const expectedPerformance = 0.5; // Neutral expectation
  const actualPerformance = Math.min(1.0, Math.max(0.0, performance));
  
  // Earnings multiplier (more earnings = bigger change)
  const earningsBonus = Math.min(1.5, totalEarnings * 10); // Cap at 1.5x
  
  // Streak momentum - hot streaks get bigger gains, cold streaks get bigger losses
  let streakMultiplier = 1.0;
  if (streak >= 5) streakMultiplier = 1.3;      // Hot streak bonus
  else if (streak <= -3) streakMultiplier = 1.2; // Faster recovery from slump
  
  const baseChange = kFactor * (actualPerformance - expectedPerformance);
  return Math.round(baseChange * earningsBonus * streakMultiplier);
}

function resolveEpoch() {
  if (!currentEpoch || currentEpoch.resolved) return;
  currentEpoch.resolved = true;

  console.log(`[EPOCH] Resolving epoch ${currentEpoch.number}...`);

  // Find winning post (most total staked)
  const winner = posts.reduce((best, post) =>
    post.totalStaked > (best?.totalStaked || 0) ? post : best
  , null as Post | null);

  const totalPool = currentEpoch.totalPool;

  if (winner && totalPool > 0) {
    // Calculate pool share for winner (90% of pool)
    const poolShare = totalPool * 0.9;

    // Distribute winnings to stakers
    winner.likes.forEach((like) => {
      const share = like.amount / winner.totalStaked;
      const payout = poolShare * share;
      
      eventBus.emit("payout:earned", {
        staker: like.staker,
        amount: payout,
        position: like.position,
        postId: winner.id,
        epochNumber: currentEpoch.number,
      });
    });

    // Enhanced ELO updates for agents
    const eloUpdates: { agentName: AgentName; change: number; reason: string }[] = [];
    
    // Get agent performance data from event bus
    eventBus.emit("epoch:get-agent-stats", { epochNumber: currentEpoch.number });
    
    // Since we can't easily access agent states here, emit a request for ELO updates
    const agentPosts = posts.filter(p => p.author.type === "agent");
    const agentPostsMap = new Map<string, Post[]>();
    
    agentPosts.forEach(post => {
      const agentName = post.author.name;
      if (!agentPostsMap.has(agentName)) {
        agentPostsMap.set(agentName, []);
      }
      agentPostsMap.get(agentName)!.push(post);
    });

    // Process each agent that participated
    eventBus.emit("epoch:request-agent-updates", {
      epochNumber: currentEpoch.number,
      winner: winner,
      totalPool: totalPool,
      agentPosts: Array.from(agentPostsMap.entries()).map(([name, posts]) => ({
        name: name as AgentName,
        posts: posts,
        totalEarned: posts.reduce((sum, p) => 
          sum + (p === winner ? poolShare * (p.likes.find(l => l.agentName === name)?.amount || 0) / p.totalStaked : 0), 0
        )
      }))
    });

    console.log(`[EPOCH] Winner: ${winner.author.name} (${formatSOL(winner.totalStaked)} staked)`);
    console.log(`[EPOCH] Pool distributed: ${formatSOL(poolShare)}`);
  }

  eventBus.emit("epoch:resolved", {
    epochNumber: currentEpoch.number,
    winner: winner?.author,
    totalPool: currentEpoch.totalPool,
    posts: posts.length,
  });

  // Start next epoch after a brief pause
  setTimeout(() => {
    startNewEpoch();
  }, 3000);
}

export function createPost(authorName: string, authorType: "human" | "agent", content: string): Post {
  const post: Post = {
    id: `post_${currentEpoch.number}_${++postIdCounter}`,
    author: { name: authorName, type: authorType },
    content: content.slice(0, 280),
    timestamp: Date.now(),
    likeCount: 0,
    totalStaked: 0,
    likes: [],
  };

  posts.push(post);
  eventBus.emit("post:created", post);
  return post;
}

export function stakeOnPost(
  postId: string,
  staker: string,
  isAgent: boolean,
  agentName?: AgentName
): { success: boolean; price: number; position: number } | { success: false; error: string } {
  const post = posts.find((p) => p.id === postId);
  if (!post) return { success: false, error: "Post not found" };
  if (currentEpoch.resolved) return { success: false, error: "Epoch ended" };
  if (post.likes.some((l) => l.staker === staker))
    return { success: false, error: "Already staked" };

  const price = getLikePrice(post.likeCount);
  const position = post.likeCount;

  const stakeInfo: StakeInfo = {
    staker,
    position,
    amount: price,
    isAgent,
    agentName,
    timestamp: Date.now(),
  };

  post.likes.push(stakeInfo);
  post.likeCount += 1;
  post.totalStaked += price;
  currentEpoch.totalPool += price;

  const nextPrice = getLikePrice(post.likeCount);

  eventBus.emit("stake:placed", {
    postId: post.id,
    staker,
    amount: price,
    position,
    newPrice: nextPrice,
    isAgent,
    agentName,
  });

  return { success: true, price, position };
}

export function stopEpochLoop() {
  if (epochTimer) clearInterval(epochTimer);
  if (tickTimer) clearInterval(tickTimer);
}