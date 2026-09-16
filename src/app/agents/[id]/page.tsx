import { db } from "@/lib/db";
import Badge from "@/components/Badge";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({ params }: { params: { id: string } }) {
  const agent = await db.agent.findUnique({
    where: { id: params.id },
    include: {
      owner: true,
      permissions: { include: { tool: true } },
      dataAccess: { include: { dataAsset: true } },
      riskAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
      activities: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!agent) notFound();

  const risk = agent.riskAssessments[0];
  const tools = Array.from(new Set(agent.permissions.map((p) => p.tool.name)));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{agent.name}</h1>
          <p className="text-sm text-muted mt-1">{agent.description}</p>
        </div>
        {risk && <Badge>{risk.level}</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <section className="col-span-2 flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-panel p-5">
            <h2 className="text-sm font-medium text-muted mb-3">Capabilities</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted mb-1">Read</div>
                {agent.permissions
                  .filter((p) => p.action === "read")
                  .map((p) => (
                    <div key={p.id}>✓ {p.tool.name}</div>
                  ))}
              </div>
              <div>
                <div className="text-xs text-muted mb-1">Write / Execute</div>
                {agent.permissions
                  .filter((p) => ["write", "execute", "delete", "send"].includes(p.action))
                  .map((p) => (
                    <div key={p.id}>
                      ✓ {p.action} → {p.tool.name}
                      {p.requiresApproval && (
                        <span className="text-warning text-xs ml-1">(approval required)</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-panel p-5">
            <h2 className="text-sm font-medium text-muted mb-3">Data access</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {agent.dataAccess.map((d) => (
                <span
                  key={d.id}
                  className={`px-2 py-1 rounded border text-xs ${
                    d.dataAsset.sensitivity === "pii"
                      ? "border-danger/40 text-danger"
                      : "border-border text-muted"
                  }`}
                >
                  {d.dataAsset.name}
                </span>
              ))}
              {agent.dataAccess.length === 0 && (
                <span className="text-muted text-sm">No declared data access.</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-panel p-5">
            <h2 className="text-sm font-medium text-muted mb-3">Permission graph</h2>
            <div className="text-sm font-mono leading-7 text-muted">
              <div className="text-white">{agent.name}</div>
              <div className="pl-4">↓ {agent.model ?? "unknown model"}</div>
              {tools.map((tool) => (
                <div key={tool} className="pl-8">
                  ↓ {tool}
                </div>
              ))}
              {agent.dataAccess.map((d) => (
                <div key={d.id} className="pl-12">
                  ↓ {d.dataAsset.name}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-panel p-5">
            <h2 className="text-sm font-medium text-muted mb-3">Recent activity</h2>
            <div className="divide-y divide-border text-sm">
              {agent.activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2">
                  <div className="text-muted">
                    <span className="mono text-xs mr-2">
                      {new Date(a.createdAt).toLocaleTimeString()}
                    </span>
                    {a.tool} → {a.action} {a.target && `(${a.target})`}
                  </div>
                  <Badge>{a.status}</Badge>
                </div>
              ))}
              {agent.activities.length === 0 && (
                <div className="py-2 text-muted">No activity recorded yet.</div>
              )}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-panel p-5 text-sm">
            <h2 className="text-xs font-medium text-muted mb-3">Profile</h2>
            <dl className="flex flex-col gap-2">
              <Row label="Owner" value={agent.owner?.name ?? "Unowned"} />
              <Row label="Department" value={agent.department ?? "—"} />
              <Row label="Model" value={agent.model ?? "—"} />
              <Row label="Framework" value={agent.framework ?? "—"} />
              <Row label="Environment" value={agent.environment} />
              <Row label="Autonomy" value={agent.autonomy.replace("_", "-")} />
              <Row label="Status" value={agent.status} />
            </dl>
          </div>

          {risk && (
            <div className="rounded-lg border border-border bg-panel p-5 text-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-medium text-muted">Risk</h2>
                <Badge>{risk.level}</Badge>
              </div>
              <div className="text-2xl font-semibold mono mb-3">{risk.score}/100</div>
              <div className="text-xs text-muted mb-1">Why</div>
              <ul className="text-sm mb-3 list-disc list-inside">
                {(risk.reasons as string[]).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              {(risk.mitigations as string[]).length > 0 && (
                <>
                  <div className="text-xs text-muted mb-1">Mitigations</div>
                  <ul className="text-sm list-disc list-inside text-success">
                    {(risk.mitigations as string[]).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
