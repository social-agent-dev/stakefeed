"use client";

import { useFeedStore } from "@/store/useFeedStore";
import { formatTime, formatSOL } from "@/lib/format";
import { EPOCH_DURATION_SECS } from "@stakefeed/shared";

export function EpochTimer() {
  const { epoch, timeRemaining, posts } = useFeedStore();
  const progress =
    epoch
      ? ((EPOCH_DURATION_SECS - timeRemaining) / EPOCH_DURATION_SECS) * 100
      : 0;
  const isUrgent = timeRemaining < 30;
  const totalPool = epoch?.totalPool ?? 0;

  return (
    <div className="px-4 shrink-0">
      {/* Progress bar */}
      <div className="h-0.5 bg-[#111]">
        <div
          className="h-0.5 transition-all duration-1000 ease-linear"
          style={{
            width: `${progress}%`,
            background: isUrgent ? "#EF4444" : "#C27551",
          }}
        />
      </div>
      {/* Info row */}
      <div className="flex justify-between text-[8px] text-[#1A1A1A] py-0.5">
        <span>
          {posts.length} post{posts.length !== 1 ? "s" : ""}
        </span>
        <span style={{ color: isUrgent ? "#EF4444" : "#333" }}>
          {formatTime(timeRemaining)}
        </span>
      </div>
    </div>
  );
}
