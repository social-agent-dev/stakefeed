"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useFeedStore } from "@/store/useFeedStore";
import { useArchitectStore } from "@/store/useArchitectStore";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

export function useSocket() {
  const feedRef = useRef<Socket | null>(null);
  const archRef = useRef<Socket | null>(null);

  const {
    setEpoch,
    setTimeRemaining,
    setPosts,
    addPost,
    updatePostStake,
    resetUserStakes,
    setNotification,
  } = useFeedStore();

  const { setPhase, addCommit, appendOutput, clearOutput } = useArchitectStore();

  useEffect(() => {
    // Feed namespace
    const feedSocket = io(`${SERVER_URL}/feed`, { transports: ["websocket"] });
    feedRef.current = feedSocket;

    feedSocket.on("epoch:start", (epoch) => {
      setEpoch(epoch);
      setPosts([]);
      resetUserStakes();
    });

    feedSocket.on("epoch:tick", ({ timeRemaining }) => {
      setTimeRemaining(timeRemaining);
    });

    feedSocket.on("post:created", (post) => {
      addPost(post);
    });

    feedSocket.on("stake:placed", (data) => {
      updatePostStake(data);
    });

    feedSocket.on("epoch:resolved", (data) => {
      if (data.winnerPostId) {
        const myPayout = data.payouts.find((p: any) => p.staker === "you");
        if (myPayout) {
          setNotification(`EPOCH ${data.epoch}: +${myPayout.amount.toFixed(4)} SOL`);
        }
      }
    });

    // Architect namespace
    const archSocket = io(`${SERVER_URL}/architect`, { transports: ["websocket"] });
    archRef.current = archSocket;

    archSocket.on("architect:phase", ({ phase }) => {
      setPhase(phase);
      if (phase === "analyzing") clearOutput();
    });

    archSocket.on("architect:output", ({ text }) => {
      appendOutput(text);
    });

    archSocket.on("architect:commit", (commit) => {
      addCommit(commit);
    });

    archSocket.on("architect:idle", () => {
      setPhase("idle");
    });

    return () => {
      feedSocket.disconnect();
      archSocket.disconnect();
    };
  }, []);
}
