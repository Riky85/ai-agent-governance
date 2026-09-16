import { db } from "@/lib/db";
import Badge from "@/components/Badge";
import Link from "next/link";

const ORG_ID = "demo-org";

export default async function ActivityPage() {
  const activities = await db.activity.findMany({
    where: { agent: { organizationId: ORG_ID } },
    include: { agent: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Activity</h1>
        <p className="text-sm text-muted mt-1">Every action every agent has taken.</p>
      </div>

      <div className="rounded-lg border border-border bg-panel divide-y divide-border">
        {activities.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-muted mono text-xs w-20">
                {new Date(a.createdAt).toLocaleTimeString()}
              </span>
              <Link href={`/agents/${a.agentId}`} className="hover:underline font-medium">
                {a.agent.name}
              </Link>
              <span className="text-muted">→</span>
              <span className="text-muted">{a.tool}</span>
              <span className="text-muted">{a.action}</span>
              {a.target && <span className="text-muted">{a.target}</span>}
            </div>
            <div className="flex items-center gap-3">
              {a.reason && <span className="text-xs text-muted">{a.reason}</span>}
              <Badge>{a.status}</Badge>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="p-4 text-sm text-muted">No activity recorded yet.</div>
        )}
      </div>
    </div>
  );
}
