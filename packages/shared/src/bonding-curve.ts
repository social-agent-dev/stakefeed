import { BASE_STAKE_PRICE_SOL, BONDING_CURVE_K, LAMPORTS_PER_SOL } from "./constants";

/** Get the price in SOL for the next like on a post with `likeCount` existing likes */
export function getLikePrice(likeCount: number): number {
  return +(BASE_STAKE_PRICE_SOL * (1 + likeCount * BONDING_CURVE_K)).toFixed(6);
}

/** Get the price in lamports */
export function getLikePriceLamports(likeCount: number): number {
  return Math.round(getLikePrice(likeCount) * LAMPORTS_PER_SOL);
}

/** Weight for payout calculation — earlier likers get more */
export function getPayoutWeight(position: number): number {
  return 1 / (position + 1);
}

/** Estimate payout for a liker at a given position */
export function estimatePayout(
  position: number,
  totalLikers: number,
  poolSol: number,
  poolShareBps: number = 8800
): number {
  if (totalLikers === 0) return 0;
  const myWeight = getPayoutWeight(position);
  let totalWeight = 0;
  for (let i = 0; i < totalLikers; i++) {
    totalWeight += getPayoutWeight(i);
  }
  return (myWeight / totalWeight) * poolSol * (poolShareBps / 10000);
}

/** Format SOL amount */
export function formatSOL(sol: number): string {
  return sol.toFixed(4);
}

/** Format time remaining */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
