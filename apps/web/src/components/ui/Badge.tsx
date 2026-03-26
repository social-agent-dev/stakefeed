"use client";

export function Badge({
  children,
  color = "#444",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className="text-[7px] font-semibold tracking-widest px-1.5 py-0.5"
      style={{
        background: color + "15",
        color,
      }}
    >
      {children}
    </span>
  );
}
