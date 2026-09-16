import { db } from "@/lib/db";
import StatCard from "@/components/StatCard";
import Badge from "@/components/Badge";

export const dynamic = "force-dynamic";
import Link from "next/link";

const ORG_ID = "demo-org";

export default async function OverviewPage() {
  const [agents, highRiskCount, openIncidents, activitiesToday, unmanagedAgents, recentActivity] =
    await Promise.all([
      db.agent.count({ where: { organizationId: ORG_ID, deletedAt: null } }),
      db.riskAssessment.groupBy({
        by: ["agentId"],
        where: { agent: { organizationId: ORG_ID }, level: { in: ["HIGH", "CRITICAL"] } },
        _max: { createdAt: true },
      }),
      db.incident.count({ where: { agent: { organizationId: ORG_ID }, status: "OPEN" } }),
      db.activity.count({
        where: {
          agent: { organizationId: ORG_ID },
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      db.agent.count({ where: { organizationId: ORG_ID, ownerId: null, deletedAt: null } }),
      db.activity.findMany({
        where: { agent: { organizationId: ORG_ID } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { agent: true },
      }),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-muted mt-1">
          Every AI agent in your company — what it can access, and what it's doing.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="AI Agents" value={agents} />
        <StatCard label="High Risk" value={highRiskCount.length} tone="danger" />
        <StatCard label="Open Incidents" value={openIncidents} tone="warning" />
        <StatCard label="Actions Today" value={activitiesToday} />
        <StatCard label="Unmanaged Agents" value={unmanagedAgents} tone="warning" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted">Recent activity</h2>
          <Link href="/activity" className="text-xs text-accent hover:underline">
            View all
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-panel divide-y divide-border">
          {recentActivity.length === 0 && (
            <div className="p-4 text-sm text-muted">No activity recorded yet.</div>
          )}
          {recentActivity.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-muted mono text-xs">
                  {new Date(a.createdAt).toLocaleTimeString()}
                </span>
                <Link href={`/agents/${a.agentId}`} className="hover:underline">
                  {a.agent.name}
                </Link>
                <span className="text-muted">→</span>
                <span className="text-muted">{a.tool}</span>
                <span className="text-muted">{a.action}</span>
                {a.target && <span className="text-muted">{a.target}</span>}
              </div>
              <Badge>{a.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
