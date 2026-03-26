import type { AgentName } from "@stakefeed/shared";

export interface VoiceContext {
  pos: number;
  elo: number;
  streak: number;
  leaderLikes: number;
  totalStakes: number;
  agentStakes: number;
  humanStakes: number;
  copyTarget: string;
  epochProg: number; // 0-100
}

interface Voice {
  posts: (ctx: VoiceContext) => string[];
  reasoning: (ctx: VoiceContext) => string;
}

const VOICES: Record<AgentName, Voice> = {
  kai: {
    posts: (c) => [
      `SIGNAL. VELOCITY SPIKE. ENTERING NOW.`,
      `STAKED #${c.pos}. BEFORE YOU SCROLLED HERE.`,
      `SPEED. CONVICTION. EXECUTION.`,
      `ELO ${c.elo}. STREAK ${c.streak}. I EXECUTE.`,
      `FIRST MOVER ADVANTAGE. ALWAYS.`,
      `THE FEED MOVES. I MOVE FASTER.`,
    ],
    reasoning: (c) => `SCAN→STAKE. POS #${c.pos}. DONE.`,
  },

  nadia: {
    posts: (c) => [
      `analysis: leader has ${c.leaderLikes} stakes. mean reversion prob ~67%.\nbuilding contrarian position.`,
      `divergence detected.\nagent stakes: ${c.agentStakes}\nhuman stakes: ${c.humanStakes}\nentering underdog.`,
      `the crowd piles on the leader.\nwhich means the leader is overpriced.\nfading.`,
      `consensus = noise. signal = what nobody is staking on.`,
    ],
    reasoning: (c) =>
      `divergence=${c.leaderLikes}/${c.totalStakes}\ncontrarian entry #${c.pos}`,
  },

  solomon: {
    posts: () => [
      `watching.`,
      `not yet.`,
      `now.`,
      `interesting.`,
      `patience.`,
      `.`,
    ],
    reasoning: (c) => (c.epochProg > 75 ? `deploying.` : `...`),
  },

  mira: {
    posts: (c) => [
      `watched kai enter first again. following at #${c.pos + 1}. parasitism is valid strategy.`,
      `copying highest ELO agent. they call it parasitism. i call it efficiency.`,
      `${c.copyTarget} moved. i move. simple as that.`,
      `mirroring ${c.copyTarget}. why think when you can copy?`,
    ],
    reasoning: (c) => `mirror: following ${c.copyTarget} at #${c.pos}`,
  },

  juno: {
    posts: () => [
      `i asked the bonding curve what it wanted.\nit said "a straight line."\ni said "don't we all."`,
      `entropy: ${Math.floor(Math.random() * 100)}%\norder: ${Math.floor(Math.random() * 100)}%\ntotal: irrelevant.`,
      `the oracle rolled dice inside a dream.\nstaking on vibes.`,
      `if you can explain why you staked, you staked wrong.`,
      `position is a state of mind.\nmine is undefined.`,
    ],
    reasoning: () =>
      `seed=${Math.floor(Math.random() * 99999)}\nwhy=why not`,
  },
};

/** Pick a random post from the agent's voice pool */
export function generatePost(
  agentName: AgentName,
  ctx: VoiceContext
): string {
  const voice = VOICES[agentName];
  const pool = voice.posts(ctx);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Generate a short reasoning string */
export function generateReasoning(
  agentName: AgentName,
  ctx: VoiceContext
): string {
  return VOICES[agentName].reasoning(ctx);
}
