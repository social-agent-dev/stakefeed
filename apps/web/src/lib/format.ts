export function formatSOL(n: number): string {
  return n.toFixed(4);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function truncate(s: string, len: number): string {
  return s.length > len ? s.slice(0, len) + "..." : s;
}
