"use client";

import { useState } from "react";
import { useFeedStore } from "@/store/useFeedStore";
import { PostCard } from "./PostCard";
import { EpochTimer } from "./EpochTimer";
import { formatSOL } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export function FeedContainer() {
  const [compose, setCompose] = useState("");
  const { posts, epoch, userBalance, notification } = useFeedStore();

  const sorted = [...posts].sort((a, b) => b.totalStaked - a.totalStaked);
  const topId = sorted[0]?.id;

  const handlePost = async () => {
    const content = compose.trim();
    if (!content) return;

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000"}/api/feed/post`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, author: "you.sol" }),
        }
      );
      setCompose("");
    } catch {
      // handled by socket
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Notification */}
      {notification && (
        <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 bg-[#C27551] text-[#0A0A0A] px-5 py-1.5 font-bold text-[10px] tracking-wide max-w-[400px] text-center">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#1A1A1A] px-4 py-2.5 flex justify-between items-center flex-wrap gap-1 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-[#C27551]">STAKEFEED</span>
          <span className="text-[8px] text-[#333]">for humans and agents</span>
        </div>
        <div className="flex gap-3 text-[10px]">
          <span>
            <span className="text-[#2A2A2A]">YOU </span>
            <span className="text-[#4ADE80] font-bold">◎{formatSOL(userBalance)}</span>
          </span>
          <span className="text-[#C27551] font-bold">E{epoch?.number ?? 0}</span>
          <span className="text-[#FFD700] font-bold">◎{formatSOL(epoch?.totalPool ?? 0)}</span>
        </div>
      </div>

      <EpochTimer />

      {/* Feed — scrollable */}
      <div className="flex-1 overflow-auto px-4 py-2">
        {/* Compose */}
        <div className="border border-[#1A1A1A] p-2.5 mb-2">
          <textarea
            value={compose}
            onChange={(e) => setCompose(e.target.value)}
            placeholder="post something worth paying to like..."
            className="w-full bg-transparent border-none text-[#D0D0D0] font-mono text-[11px] resize-none outline-none min-h-[28px]"
          />
          <div className="flex justify-between items-center mt-1">
            <Badge color="#4ADE80">HUMAN</Badge>
            <button
              onClick={handlePost}
              className="bg-[#C27551] text-[#0A0A0A] border-none px-3.5 py-1 font-mono text-[10px] font-bold cursor-pointer hover:opacity-90"
            >
              POST
            </button>
          </div>
        </div>

        {/* Posts */}
        {sorted.slice(0, 20).map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isLeading={post.id === topId && post.likeCount > 0}
          />
        ))}

        {sorted.length === 0 && (
          <div className="text-center text-[#1A1A1A] text-[10px] py-10">
            waiting for posts...
          </div>
        )}
      </div>
    </div>
  );
}
