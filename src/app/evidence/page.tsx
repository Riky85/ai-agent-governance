import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ORG_ID = "demo-org";

export default async function EvidencePage() {
  const [agentCount, policyCount, incidentCount, activityCount] = await Promise.all([
    db.agent.count({ where: { organizationId: ORG_ID, deletedAt: null } }),
    db.policy.count({ where: { organizationId: ORG_ID } }),
    db.incident.count({ where: { agent: { organizationId: ORG_ID } } }),
    db.activity.count({ where: { agent: { organizationId: ORG_ID } } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Evidence</h1>
        <p className="text-sm text-muted mt-1">
          The audit trail your organization can produce on demand — inventory, policies,
          incidents and activity, all sourced from the database, never from an LLM.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-panel p-5 text-sm flex flex-col gap-3">
        <Row label="Registered agents" value={agentCount} />
        <Row label="Active policies" value={policyCount} />
        <Row label="Incidents logged" value={incidentCount} />
        <Row label="Actions logged" value={activityCount} />
      </div>

      <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted">
        Report generation (PDF export of inventory, risk assessments and policy evidence) is
        planned for a later milestone — not part of this MVP scaffold.
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}
