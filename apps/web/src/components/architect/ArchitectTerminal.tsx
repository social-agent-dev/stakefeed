"use client";

import { useEffect, useRef } from "react";
import { useArchitectStore } from "@/store/useArchitectStore";

export function ArchitectTerminal() {
  const { currentOutput, phase } = useArchitectStore();
  const termRef = useRef<HTMLPreElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [currentOutput]);

  const isWriting = phase === "writing";

  return (
    <div className="flex-1 overflow-auto min-h-0 px-3 py-2">
      {currentOutput ? (
        <pre
          ref={termRef}
          className="text-[9px] leading-relaxed m-0 whitespace-pre-wrap break-all font-mono"
          style={{
            color: "#4ADE80",
            opacity: 0.8,
          }}
        >
          {currentOutput}
          {isWriting && (
            <span className="text-[#C27551]">█</span>
          )}
        </pre>
      ) : (
        <div className="text-[#1A1A1A] text-[9px] py-5 text-center">
          {phase === "idle"
            ? "architect is thinking..."
            : `${phase}...`}
        </div>
      )}
    </div>
  );
}
