"use client";

import { useState } from "react";
import type { Post } from "@stakefeed/shared";
import { getLikePrice } from "@stakefeed/shared";
import { AGENT_COLORS, type AgentName } from "@stakefeed/shared";
import { useFeedStore } from "@/store/useFeedStore";
import { Badge } from "@/components/ui/Badge";
import { formatSOL } from "@/lib/format";

interface PostCardProps {
  post: Post;
  isLeading: boolean;
}

export function PostCard({ post, isLeading }: PostCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const { userStakes, addUserStake, userBalance, setNotification } = useFeedStore();
  const isAgent = post.authorType === "agent";
  const didStake = post.likes.some((l) => l.staker === "you");
  const nextPrice = getLikePrice(post.likeCount);
  const agentColor = post.agentName
    ? AGENT_COLORS[post.agentName as AgentName] || "#7B68EE"
    : undefined;

  const handleStake = async () => {
    if (didStake) return;
    if (userBalance < nextPrice) {
      setNotification(`need ${formatSOL(nextPrice)} SOL`);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/feed/stake`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: post.id, staker: "you" }),
        }
      );
      const data = await res.json();
      if (data.success) {
        addUserStake(post.id, data.price);
      }
    } catch {
      setNotification("Stake failed");
    }
  };

  const agentLikers = post.likes.filter((l) => l.isAgent);

  return (
    <div
      className="p-2.5 mb-0.5 relative"
      style={{
        border: isLeading ? "1px solid #C27551" : "1px solid #1A1A1A",
        background: isLeading ? "rgba(194,117,81,0.03)" : "transparent",
      }}
    >
      {/* Leading badge */}
      {isLeading && (
        <div className="absolute top-0 right-0 bg-[#C27551] text-[#0A0A0A] text-[7px] font-extrabold px-1.5 py-0.5 tracking-[1.5px]">
          LEADING
        </div>
      )}

      {/* Author row */}
      <div className="flex items-center gap-2 mb-1.5">
        {isAgent ? (
          <div
            className="w-5 h-5 shrink-0"
            style={{ background: agentColor || "#7B68EE", opacity: 0.8 }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#444] text-[8px] font-bold shrink-0">
            {post.author[0]?.toUpperCase()}
          </div>
        )}
        <span
          className="font-semibold text-[11px]"
          style={{ color: isAgent ? agentColor || "#7B68EE" : "#888" }}
        >
          {post.author}
        </span>
        <Badge color={isAgent ? "#7B68EE" : "#4ADE80"}>
          {isAgent ? "AGENT" : "HUMAN"}
        </Badge>
      </div>

      {/* Content */}
      <div
        className="text-[11px] leading-relaxed mb-1.5 whitespace-pre-wrap"
        style={{ color: isAgent ? "#bbb" : "#ccc" }}
      >
        {post.content}
      </div>

      {/* Reasoning toggle for agent posts */}
      {isAgent && (
        <div className="mb-1">
          <span
            onClick={() => setShowReasoning(!showReasoning)}
            className="text-[8px] text-[#2A2A2A] cursor-pointer tracking-wide select-none hover:text-[#444]"
          >
            {showReasoning ? "▾ REASONING" : "▸ REASONING"}
          </span>
          {showReasoning && (
            <div
              className="mt-1 p-1.5 text-[9px] leading-relaxed whitespace-pre-wrap bg-[#0C0C0C]"
              style={{
                color: agentColor || "#555",
                borderLeft: `2px solid ${agentColor || "#333"}`,
              }}
            >
              Strategy-driven stake decision
            </div>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2.5 text-[10px] flex-wrap">
        <button
          onClick={handleStake}
          disabled={didStake}
          className="px-3 py-1 font-bold cursor-pointer disabled:cursor-default font-mono text-[10px]"
          style={{
            background: didStake ? "#0E0E0E" : "transparent",
            border: `1px solid ${didStake ? "#1A1A1A" : "#C27551"}`,
            color: didStake ? "#333" : "#C27551",
          }}
        >
          {didStake ? "✓" : `♡ ◎${formatSOL(nextPrice)}`}
        </button>
        <span className="text-[#555] font-semibold">{post.likeCount}</span>
        <span className="text-[#FFD700] text-[9px]">◎{formatSOL(post.totalStaked)}</span>
      </div>

      {/* Agent liker dots */}
      {(agentLikers.length > 0 || didStake) && (
        <div className="flex gap-0.5 mt-1">
          {agentLikers.map((l, i) => (
            <div
              key={i}
              className="w-3 h-3"
              title={l.agentName || "agent"}
              style={{
                background:
                  l.agentName
                    ? AGENT_COLORS[l.agentName as AgentName] || "#7B68EE"
                    : "#7B68EE",
                opacity: 0.6,
              }}
            />
          ))}
          {didStake && <div className="w-3 h-3 rounded-full bg-[#4ADE80]/40" />}
        </div>
      )}
    </div>
  );
}
