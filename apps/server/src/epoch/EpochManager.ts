import { eventBus } from "../events/EventBus.js";
import { getLikePrice, formatSOL } from "@stakefeed/shared";
import type { Post, EpochState, StakeInfo, AgentName } from "@stakefeed/shared";
import { EPOCH_DURATION_SECS } from "../config/constants.js";
import crypto from "crypto";

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
  if (currentElo < 1400) kFactor = 40;        // Rapid movement in lower tiers
  else if (currentElo < 1600) kFactor = 32;   // Moderate movement
  else if (currentElo < 1800) kFactor = 24;   // Slower but meaningful changes
  else kFactor = 16;                          // Elite level requires consistency

  // Performance bonus/penalty (exponential to reward exceptional performance)
  const performanceMultiplier = Math.pow(2, (performance - 0.5) * 2); // Range ~0.25x to 4x

  // Streak multiplier (up to 50% bonus for hot streaks)
  const streakBonus = Math.min(0.5, streak * 0.1);

  // Wealth penalty to prevent runaway success (diminishing returns)
  const wealthPenalty = Math.max(0.7, 1 - totalEarnings * 0.05); // Max 30% penalty

  return kFactor * performanceMultiplier * (1 + streakBonus) * wealthPenalty;
}

function resolveEpoch() {
  if (posts.length === 0 || currentEpoch.resolved) return;

  // Find the winner (post with most stake)
  const winner = posts.reduce((best, post) =>
    post.totalStaked > best.totalStaked ? post : best
  );

  currentEpoch.resolved = true;
  currentEpoch.winnerPostId = winner.id;

  console.log(`[EPOCH] Resolved epoch ${currentEpoch.number}`);
  console.log(`  Winner: "${winner.content.slice(0, 40)}..."`);
  console.log(`  Total pool: ◎${formatSOL(currentEpoch.totalPool)}`);

  // Calculate payouts
  const payouts: { staker: string; amount: number; position: number; agentName?: AgentName }[] = [];

  winner.likes.forEach((like) => {
    const payout = currentEpoch.totalPool / winner.likeCount;
    payouts.push({
      staker: like.staker,
      agentName: like.agentName,
      amount: payout,
      position: like.position,
    });

    console.log(`  Payout: ${like.staker} gets ◎${formatSOL(payout)} (pos #${like.position})`);
  });

  eventBus.emit("epoch:resolved", {
    epoch: currentEpoch.number,
    winnerPostId: winner.id,
    totalPool: currentEpoch.totalPool,
    payouts,
  });

  // Update agent ELO ratings if this was a competitive epoch
  if (posts.length > 1 && payouts.some(p => p.agentName)) {
    updateAgentElos(payouts);
  }

  // Start next epoch after a brief pause
  setTimeout(startNewEpoch, 5000);
}

function updateAgentElos(payouts: { staker: string; amount: number; position: number; agentName?: AgentName }[]) {
  const agentPayouts = payouts.filter(p => p.agentName);
  if (agentPayouts.length === 0) return;

  const totalPool = currentEpoch.totalPool;

  agentPayouts.forEach(payout => {
    const performance = payout.amount / totalPool; // Their share of the pool
    
    // Get current agent state (we'd need to emit this to orchestrator)
    eventBus.emit("agent:elo_update", {
      agentName: payout.agentName!,
      performance,
      position: payout.position,
      earnings: payout.amount
    });
  });
}

export function createPost(authorName: string, authorType: "human" | "agent", content: string): Post {
  const post: Post = {
    id: `post_${currentEpoch.number}_${++postIdCounter}`,
    epochNumber: currentEpoch.number,
    author: authorName,
    authorType: authorType,
    agentName: authorType === "agent" ? authorName as AgentName : undefined,
    content: content.slice(0, 280),
    contentHash: crypto.createHash('sha256').update(content).digest('hex'),
    likeCount: 0,
    totalStaked: 0,
    likes: [],
    createdAt: Date.now(),
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
  post.likeCount++;
  post.totalStaked += price;
  currentEpoch.totalPool += price;

  eventBus.emit("stake:placed", {
    postId,
    staker,
    amount: price,
    position,
    newPrice: getLikePrice(post.likeCount),
    isAgent,
    agentName,
  });

  return { success: true, price, position };
}

export function stopEpochLoop() {
  if (epochTimer) {
    clearInterval(epochTimer);
    epochTimer = null;
  }
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}