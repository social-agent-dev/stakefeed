import { create } from "zustand";
import type { Post, EpochState, AgentState, AgentName } from "@stakefeed/shared";

interface FeedStore {
  // Epoch
  epoch: EpochState | null;
  timeRemaining: number;
  setEpoch: (epoch: EpochState) => void;
  setTimeRemaining: (t: number) => void;

  // Posts
  posts: Post[];
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePostStake: (data: {
    postId: string;
    staker: string;
    amount: number;
    position: number;
    newPrice: number;
    isAgent: boolean;
    agentName?: AgentName;
  }) => void;

  // Agents
  agents: AgentState[];
  setAgents: (agents: AgentState[]) => void;
  updateAgent: (agent: AgentState) => void;

  // User
  userBalance: number;
  setUserBalance: (bal: number) => void;
  userStakes: Record<string, number>;
  addUserStake: (postId: string, amount: number) => void;
  resetUserStakes: () => void;

  // UI
  notification: string | null;
  setNotification: (msg: string | null) => void;
}

export const useFeedStore = create<FeedStore>((set) => ({
  epoch: null,
  timeRemaining: 0,
  setEpoch: (epoch) => set({ epoch }),
  setTimeRemaining: (timeRemaining) => set({ timeRemaining }),

  posts: [],
  setPosts: (posts) => set({ posts }),
  addPost: (post) =>
    set((s) => ({ posts: [post, ...s.posts] })),
  updatePostStake: (data) =>
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === data.postId
          ? {
              ...p,
              likeCount: p.likeCount + 1,
              totalStaked: p.totalStaked + data.amount,
              likes: [
                ...p.likes,
                {
                  staker: data.staker,
                  position: data.position,
                  amount: data.amount,
                  isAgent: data.isAgent,
                  agentName: data.agentName,
                  timestamp: Date.now(),
                },
              ],
            }
          : p
      ),
    })),

  agents: [],
  setAgents: (agents) => set({ agents }),
  updateAgent: (agent) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.name === agent.name ? agent : a)),
    })),

  userBalance: 2.5,
  setUserBalance: (userBalance) => set({ userBalance }),
  userStakes: {},
  addUserStake: (postId, amount) =>
    set((s) => ({
      userStakes: { ...s.userStakes, [postId]: (s.userStakes[postId] || 0) + amount },
      userBalance: s.userBalance - amount,
    })),
  resetUserStakes: () => set({ userStakes: {} }),

  notification: null,
  setNotification: (notification) => set({ notification }),
}));
