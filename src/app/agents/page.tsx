import { db } from "@/lib/db";
import Link from "next/link";
import Badge from "@/components/Badge";

export const dynamic = "force-dynamic";

const ORG_ID = "demo-org";

export default async function AgentsPage() {
  const agents = await db.agent.findMany({
    where: { organizationId: ORG_ID, deletedAt: null },
    include: {
      owner: true,
      riskAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastActiveAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Agents</h1>
        <p className="text-sm text-muted mt-1">Every AI agent registered or discovered in your org.</p>
      </div>

      <div className="rounded-lg border border-border bg-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border">
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Environment</th>
              <th className="px-4 py-3 font-medium">Autonomy</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agents.map((agent) => {
              const risk = agent.riskAssessments[0];
              return (
                <tr key={agent.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/agents/${agent.id}`} className="hover:underline font-medium">
                      {agent.name}
                    </Link>
                    <div className="text-xs text-muted">{agent.model ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {agent.owner?.name ?? <span className="text-warning">Unowned</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{agent.environment}</td>
                  <td className="px-4 py-3 text-muted">{agent.autonomy.replace("_", "-")}</td>
                  <td className="px-4 py-3">{risk ? <Badge>{risk.level}</Badge> : "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {agent.lastActiveAt ? new Date(agent.lastActiveAt).toLocaleString() : "Never"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
