import { create } from "zustand";

export interface ArchitectCommit {
  hash: string;
  message: string;
  filesChanged: string[];
  timestamp: number;
  type: string;
  impact: string;
}

interface ArchitectStore {
  phase: "analyzing" | "planning" | "writing" | "testing" | "deploying" | "idle";
  commits: ArchitectCommit[];
  currentOutput: string;
  setPhase: (phase: ArchitectStore["phase"]) => void;
  addCommit: (commit: ArchitectCommit) => void;
  appendOutput: (text: string) => void;
  clearOutput: () => void;
}

export const useArchitectStore = create<ArchitectStore>((set) => ({
  phase: "idle",
  commits: [],
  currentOutput: "",
  setPhase: (phase) => set({ phase }),
  addCommit: (commit) =>
    set((s) => ({ commits: [commit, ...s.commits].slice(0, 50) })),
  appendOutput: (text) =>
    set((s) => ({ currentOutput: s.currentOutput + text })),
  clearOutput: () => set({ currentOutput: "" }),
}));
