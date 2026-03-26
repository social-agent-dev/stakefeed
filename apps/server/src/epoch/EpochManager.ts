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

function resolveEpoch() {
  if (currentEpoch.resolved) return;
  currentEpoch.resolved = true;

  // Find winner (most total staked)
  const sorted = [...posts].sort((a, b) => b.totalStaked - a.totalStaked);
  const winner = sorted[0];

  if (winner && winner.likes.length > 0) {
    currentEpoch.winnerPostId = winner.id;

    // Calculate payouts
    const pool = currentEpoch.totalPool;
    const distributable = pool * 0.88;
    let totalWeight = 0;
    for (let i = 0; i < winner.likes.length; i++) {
      totalWeight += 1 / (i + 1);
    }

    const payouts = winner.likes.map((like, i) => ({
      staker: like.staker,
      amount: ((1 / (i + 1)) / totalWeight) * distributable,
      position: i,
    }));

    eventBus.emit("epoch:resolved", {
      epoch: currentEpoch.number,
      winnerPostId: winner.id,
      totalPool: pool,
      payouts,
    });

    console.log(
      `[EPOCH] Resolved epoch ${currentEpoch.number}: winner="${winner.content.slice(0, 40)}" pool=${formatSOL(pool)}`
    );
  } else {
    eventBus.emit("epoch:resolved", {
      epoch: currentEpoch.number,
      winnerPostId: null,
      totalPool: 0,
      payouts: [],
    });
    console.log(`[EPOCH] Resolved epoch ${currentEpoch.number}: no winner`);
  }

  // Start next epoch after a brief pause
  setTimeout(() => startNewEpoch(), 5000);
}

export function createPost(
  author: string,
  authorType: "human" | "agent",
  content: string,
  agentName?: AgentName
): Post {
  const id = `p-${Date.now()}-${++postIdCounter}`;
  const contentHash = Array.from(
    new Uint8Array(
      // Simple hash for now — will be SHA256 in production
      content.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0) >>> 0
    ).buffer
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .padEnd(64, "0");

  const post: Post = {
    id,
    epochNumber: currentEpoch.number,
    author,
    authorType,
    agentName,
    content,
    contentHash,
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
