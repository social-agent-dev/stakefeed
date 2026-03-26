"use client";

import { useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { FeedContainer } from "@/components/feed/FeedContainer";
import { ArchitectPanel } from "@/components/architect/ArchitectPanel";

export default function Home() {
  const [sideOpen, setSideOpen] = useState(true);

  // Connect to Socket.IO
  useSocket();

  return (
    <div className="flex h-screen bg-[#0A0A0A] font-mono text-xs text-[#D0D0D0]">
      {/* Main feed area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Architect toggle in the feed header area */}
        <div className="absolute top-2.5 right-4 z-10">
          <button
            onClick={() => setSideOpen(!sideOpen)}
            className="font-mono text-[8px] cursor-pointer tracking-wide px-2 py-0.5"
            style={{
              background: "none",
              border: `1px solid ${sideOpen ? "#4ADE80" : "#333"}`,
              color: sideOpen ? "#4ADE80" : "#555",
            }}
          >
            {sideOpen ? "■ ARCHITECT" : "□ ARCHITECT"}
          </button>
        </div>
        <FeedContainer />
      </div>

      {/* Architect side panel */}
      {sideOpen && <ArchitectPanel />}
    </div>
  );
}
