"use client";

import { useArchitectStore } from "@/store/useArchitectStore";

const TYPE_COLORS: Record<string, string> = {
  feature: "#4ADE80",
  bugfix: "#EF4444",
  refactor: "#7B68EE",
  performance: "#F59E0B",
  infra: "#20B2AA",
};

export function CommitLog() {
  const { commits } = useArchitectStore();

  return (
    <div className="border-t border-[#1A1A1A] max-h-[200px] overflow-auto shrink-0">
      <div className="px-3 py-1.5 border-b border-[#0E0E0E]">
        <span className="text-[8px] text-[#1A1A1A] tracking-[2px]">COMMIT LOG</span>
      </div>
      {commits.slice(0, 15).map((c, i) => (
        <div
          key={i}
          className="px-3 py-1 border-b border-[#0B0B0B] flex gap-1.5 items-start"
        >
          <span className="text-[8px] text-[#333] font-bold min-w-[48px] font-mono">
            {c.hash.slice(0, 7)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[8px] text-[#666] leading-snug overflow-hidden text-ellipsis whitespace-nowrap">
              {c.message}
            </div>
            <div
              className="text-[7px] mt-0.5"
              style={{ color: TYPE_COLORS[c.type] || "#444" }}
            >
              {c.impact}
            </div>
          </div>
        </div>
      ))}
      {commits.length === 0 && (
        <div className="p-3 text-[8px] text-[#111] text-center">
          no commits yet...
        </div>
      )}
    </div>
  );
}
