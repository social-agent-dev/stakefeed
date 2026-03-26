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

// Calculate ELO change based on performance difference
function calculateEloChange(winnerElo: number, loserElo: number, kFactor: number = 32): number {
  const expectedScore = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  return Math.round(kFactor * (1 - expectedScore));
}

function resolveEpoch() {
  if (currentEpoch.resolved) return;
  currentEpoch.resolved = true;

  // Find winner (most total staked)
  const sorted = [...posts].sort((a, b) => b.totalStaked - a.totalStaked);
  const winner = sorted[0];

  if (winner && winner.likes.length > 0) {
    currentEpoch.winnerPostId = winner.id;

    // Calculate payouts for winning post
    const totalStaked = winner.totalStaked;
    const poolShare = Math.min(currentEpoch.totalPool * 0.8, totalStaked * 2); // Cap at 2x return
    
    winner.likes.forEach((stake, index) => {
      const earlyBonus = Math.max(0.1, 1 - index * 0.1); // Earlier stakes earn more
      const payout = (stake.amount / totalStaked) * poolShare * earlyBonus;
      stake.payout = payout;
    });

    // Update agent ELOs based on performance
    const agentPerformance = new Map<AgentName, { earned: number, spent: number, posts: number }>();
    
    // Calculate performance for each agent
    posts.forEach(post => {
      if (post.author.type === 'agent') {
        const agentName = post.author.name as AgentName;
        if (!agentPerformance.has(agentName)) {
          agentPerformance.set(agentName, { earned: 0, spent: 0, posts: 0 });
        }
        const perf = agentPerformance.get(agentName)!;
        perf.posts += 1;
        
        // Add earnings from this post
        post.likes.forEach(stake => {
          if (stake.payout) perf.earned += stake.payout;
        });
      }
      
      // Track agent spending
      post.likes.forEach(stake => {
        if (stake.isAgent && stake.agentName) {
          if (!agentPerformance.has(stake.agentName)) {
            agentPerformance.set(stake.agentName, { earned: 0, spent: 0, posts: 0 });
          }
          agentPerformance.get(stake.agentName)!.spent += stake.amount;
        }
      });
    });

    // Calculate ELO changes
    const eloUpdates: Array<{ agentName: AgentName, change: number, reason: string }> = [];
    
    // Sort agents by net profit for comparison
    const sortedAgents = Array.from(agentPerformance.entries())
      .map(([name, perf]) => ({ 
        name, 
        netProfit: perf.earned - perf.spent,
        posts: perf.posts
      }))
      .sort((a, b) => b.netProfit - a.netProfit);

    // Award ELO based on relative performance
    sortedAgents.forEach((agent, index) => {
      let eloChange = 0;
      let reason = "";
      
      if (index === 0 && sortedAgents.length > 1) {
        // Best performer gains ELO
        eloChange = Math.max(10, Math.min(30, Math.round(agent.netProfit * 100)));
        reason = `Won epoch (${formatSOL(agent.netProfit)} profit)`;
      } else if (index === sortedAgents.length - 1 && sortedAgents.length > 1) {
        // Worst performer loses ELO
        eloChange = Math.max(-30, Math.min(-5, Math.round(agent.netProfit * 100)));
        reason = `Lost epoch (${formatSOL(agent.netProfit)} loss)`;
      } else {
        // Middle performers have smaller changes
        eloChange = Math.round(agent.netProfit * 50);
        reason = `Mid performance (${formatSOL(agent.netProfit)})`;
      }
      
      // Bonus for being active (posting)
      if (agent.posts > 0) {
        eloChange += 2 * agent.posts;
        reason += ` +${2 * agent.posts} activity`;
      }
      
      if (eloChange !== 0) {
        eloUpdates.push({ agentName: agent.name, change: eloChange, reason });
      }
    });

    // Emit ELO updates
    eloUpdates.forEach(update => {
      eventBus.emit("agent:elo-update", update);
    });

    console.log(`[EPOCH] Winner: ${winner.author.name} (${formatSOL(totalStaked)} staked)`);
    console.log(`[EPOCH] Pool distributed: ${formatSOL(poolShare)}`);
    console.log(`[EPOCH] ELO updates:`, eloUpdates);
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