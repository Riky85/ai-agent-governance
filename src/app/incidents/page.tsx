import { db } from "@/lib/db";
import Badge from "@/components/Badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ORG_ID = "demo-org";

export default async function IncidentsPage() {
  const incidents = await db.incident.findMany({
    where: { agent: { organizationId: ORG_ID } },
    include: { agent: true, policy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Incidents</h1>
        <p className="text-sm text-muted mt-1">Policy violations and anomalies that need review.</p>
      </div>

      <div className="flex flex-col gap-3">
        {incidents.map((incident) => (
          <div key={incident.id} className="rounded-lg border border-border bg-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge>{incident.severity}</Badge>
              <Badge>{incident.status}</Badge>
            </div>
            <div className="font-medium text-sm">{incident.title}</div>
            <p className="text-sm text-muted mt-1">{incident.description}</p>
            <div className="text-xs text-muted mt-3 flex items-center gap-4">
              <Link href={`/agents/${incident.agentId}`} className="hover:underline">
                {incident.agent.name}
              </Link>
              {incident.policy && <span>Policy: {incident.policy.name}</span>}
              <span>{new Date(incident.createdAt).toLocaleString()}</span>
            </div>
          </div>
        ))}
        {incidents.length === 0 && (
          <div className="text-sm text-muted">No incidents. Everything looks governed.</div>
        )}
      </div>
    </div>
  );
}
