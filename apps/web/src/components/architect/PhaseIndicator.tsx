"use client";

import { useArchitectStore } from "@/store/useArchitectStore";
import { Badge } from "@/components/ui/Badge";

const PHASE_COLORS: Record<string, string> = {
  analyzing: "#555",
  planning: "#C27551",
  writing: "#C27551",
  testing: "#7B68EE",
  deploying: "#4ADE80",
  idle: "#333",
};

export function PhaseIndicator() {
  const { phase, commits } = useArchitectStore();
  const color = PHASE_COLORS[phase] || "#333";

  return (
    <div className="px-3 py-2.5 border-b border-[#1A1A1A] flex justify-between items-center shrink-0">
      <div className="flex items-center gap-1.5">
        <div
          className="w-2 h-2 transition-colors duration-300"
          style={{ background: color }}
        />
        <span className="text-[11px] font-bold text-[#4ADE80]">ARCHITECT</span>
        <Badge color="#333">BUILDER AGENT</Badge>
      </div>
      <span className="text-[8px] text-[#333]">{commits.length} commits</span>
    </div>
  );
}

export function PhaseStatus() {
  const { phase } = useArchitectStore();
  const color = PHASE_COLORS[phase] || "#333";

  return (
    <div className="px-3 py-2 border-b border-[#1A1A1A] shrink-0">
      <span
        className="text-[9px] font-semibold tracking-wide"
        style={{ color }}
      >
        {phase === "idle" ? "● IDLE" : `● ${phase.toUpperCase()}`}
      </span>
    </div>
  );
}
