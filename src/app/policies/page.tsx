import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ORG_ID = "demo-org";

export default async function PoliciesPage() {
  const policies = await db.policy.findMany({
    where: { organizationId: ORG_ID },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Policies</h1>
        <p className="text-sm text-muted mt-1">
          Deterministic rules evaluated against every agent action. Never interpreted by an LLM.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {policies.map((policy) => (
          <div key={policy.id} className="rounded-lg border border-border bg-panel p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">{policy.name}</div>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  policy.enabled ? "bg-success/15 text-success" : "bg-white/10 text-muted"
                }`}
              >
                {policy.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="text-sm text-muted mt-1">{policy.description}</p>
            <pre className="text-xs text-muted mt-3 bg-black/30 rounded p-3 overflow-x-auto">
              {JSON.stringify(policy.rule, null, 2)}
            </pre>
          </div>
        ))}
        {policies.length === 0 && (
          <div className="text-sm text-muted">No policies defined yet.</div>
        )}
      </div>
    </div>
  );
}
