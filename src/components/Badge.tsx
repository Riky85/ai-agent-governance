const COLORS: Record<string, string> = {
  LOW: "bg-success/15 text-success",
  MEDIUM: "bg-warning/15 text-warning",
  HIGH: "bg-danger/15 text-danger",
  CRITICAL: "bg-danger/25 text-danger",
  ALLOWED: "bg-success/15 text-success",
  BLOCKED: "bg-danger/15 text-danger",
  FLAGGED: "bg-warning/15 text-warning",
  OPEN: "bg-danger/15 text-danger",
  RESOLVED: "bg-success/15 text-success",
  REVIEWING: "bg-warning/15 text-warning",
};

export default function Badge({ children }: { children: string }) {
  const cls = COLORS[children] ?? "bg-white/10 text-muted";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}
