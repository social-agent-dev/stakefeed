"use client";

import { PhaseIndicator, PhaseStatus } from "./PhaseIndicator";
import { ArchitectTerminal } from "./ArchitectTerminal";
import { CommitLog } from "./CommitLog";
import { useArchitectStore } from "@/store/useArchitectStore";

export function ArchitectPanel() {
  const { phase } = useArchitectStore();

  return (
    <div className="w-[340px] border-l border-[#141414] flex flex-col bg-[#070707] shrink-0 overflow-hidden">
      <PhaseIndicator />
      <PhaseStatus />
      <ArchitectTerminal />

      {/* Deploy impact banner */}
      {phase === "deploying" && (
        <div className="px-3 py-2 bg-[#4ADE8008] border-t border-[#4ADE8022] shrink-0">
          <div className="text-[8px] text-[#4ADE80] font-bold tracking-[1.5px]">
            DEPLOYING...
          </div>
        </div>
      )}

      <CommitLog />
    </div>
  );
}
