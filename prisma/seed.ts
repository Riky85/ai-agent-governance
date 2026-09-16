import { PrismaClient } from "@prisma/client";
import { assessAgentRisk } from "../src/lib/risk-engine";

const db = new PrismaClient();

async function main() {
  const org = await db.organization.upsert({
    where: { id: "demo-org" },
    update: {},
    create: { id: "demo-org", name: "Demo Manufacturing SpA" },
  });

  const owner = await db.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "mario.rossi@demo.eu" } },
    update: {},
    create: {
      organizationId: org.id,
      email: "mario.rossi@demo.eu",
      name: "Mario Rossi",
      role: "admin",
    },
  });

  const tools = await Promise.all(
    ["Salesforce", "Pricing API", "Email", "ERP", "GitHub Copilot", "HR System"].map((name) =>
      db.tool.upsert({
        where: { organizationId_name: { organizationId: org.id, name } },
        update: {},
        create: { organizationId: org.id, name, category: "internal_api" },
      })
    )
  );
  const toolByName = Object.fromEntries(tools.map((t) => [t.name, t]));

  const dataAssets = await Promise.all(
    ["Customer PII", "Contracts", "Pricing", "Employee data", "Source code"].map((name) =>
      db.dataAsset.upsert({
        where: { organizationId_name: { organizationId: org.id, name } },
        update: {},
        create: {
          organizationId: org.id,
          name,
          sensitivity: name === "Customer PII" ? "pii" : name === "Employee data" ? "pii" : "internal",
        },
      })
    )
  );
  const assetByName = Object.fromEntries(dataAssets.map((a) => [a.name, a]));

  const salesAgent = await db.agent.upsert({
    where: { id: "agent-sales-quote" },
    update: {},
    create: {
      id: "agent-sales-quote",
      organizationId: org.id,
      name: "Sales Quoting Agent",
      description: "Generates and sends customer quotes from CRM and pricing data.",
      department: "Sales",
      model: "Claude Sonnet 4.6",
      framework: "LangGraph",
      environment: "PRODUCTION",
      autonomy: "SEMI_AUTONOMOUS",
      ownerId: owner.id,
      lastActiveAt: new Date(),
      permissions: {
        create: [
          { toolId: toolByName["Salesforce"].id, action: "read" },
          { toolId: toolByName["Salesforce"].id, action: "write" },
          { toolId: toolByName["Pricing API"].id, action: "read" },
          { toolId: toolByName["ERP"].id, action: "read" },
          { toolId: toolByName["Email"].id, action: "send", requiresApproval: true },
        ],
      },
      dataAccess: {
        create: [
          { dataAssetId: assetByName["Customer PII"].id },
          { dataAssetId: assetByName["Contracts"].id },
          { dataAssetId: assetByName["Pricing"].id },
        ],
      },
    },
    include: { permissions: { include: { tool: true } }, dataAccess: { include: { dataAsset: true } } },
  });

  const codingAgent = await db.agent.upsert({
    where: { id: "agent-coding" },
    update: {},
    create: {
      id: "agent-coding",
      organizationId: org.id,
      name: "Internal Coding Agent",
      description: "Autonomous coding agent used by the platform team.",
      department: "Engineering",
      model: "Claude Sonnet 4.6",
      framework: "Claude Code",
      environment: "DEVELOPMENT",
      autonomy: "AUTONOMOUS",
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 12),
      permissions: {
        create: [{ toolId: toolByName["GitHub Copilot"].id, action: "write" }],
      },
      dataAccess: {
        create: [{ dataAssetId: assetByName["Source code"].id }],
      },
    },
    include: { permissions: { include: { tool: true } }, dataAccess: { include: { dataAsset: true } } },
  });

  const hrAgent = await db.agent.upsert({
    where: { id: "agent-hr" },
    update: {},
    create: {
      id: "agent-hr",
      organizationId: org.id,
      name: "HR Assistant",
      description: "Answers employee questions and drafts HR communications.",
      department: "HR",
      model: "GPT-4o",
      framework: "Custom",
      environment: "PRODUCTION",
      autonomy: "ASSIST",
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
      permissions: {
        create: [{ toolId: toolByName["HR System"].id, action: "read" }],
      },
      dataAccess: {
        create: [{ dataAssetId: assetByName["Employee data"].id }],
      },
    },
    include: { permissions: { include: { tool: true } }, dataAccess: { include: { dataAsset: true } } },
  });

  const noOwnerAgent = await db.agent.upsert({
    where: { id: "agent-unknown-scraper" },
    update: {},
    create: {
      id: "agent-unknown-scraper",
      organizationId: org.id,
      name: "Unregistered Data Agent",
      description: "Discovered via GitHub scan — no declared owner.",
      environment: "PRODUCTION",
      autonomy: "AUTONOMOUS",
      status: "active",
      permissions: {
        create: [{ toolId: toolByName["Salesforce"].id, action: "read" }],
      },
      dataAccess: {
        create: [{ dataAssetId: assetByName["Customer PII"].id }],
      },
    },
    include: { permissions: { include: { tool: true } }, dataAccess: { include: { dataAsset: true } } },
  });

  for (const agent of [salesAgent, codingAgent, hrAgent, noOwnerAgent]) {
    const risk = assessAgentRisk(agent as any);
    await db.riskAssessment.create({
      data: {
        agentId: agent.id,
        level: risk.level,
        score: risk.score,
        reasons: risk.reasons,
        mitigations: risk.mitigations,
      },
    });
  }

  const noExternalEmailPolicy = await db.policy.upsert({
    where: { id: "policy-email-approval" },
    update: {},
    create: {
      id: "policy-email-approval",
      organizationId: org.id,
      name: "External email requires approval",
      description: "Agents cannot send external email without human approval.",
      rule: { tool: "Email", action: "send", requiresApproval: true },
    },
  });

  const discountCapPolicy = await db.policy.upsert({
    where: { id: "policy-discount-cap" },
    update: {},
    create: {
      id: "policy-discount-cap",
      organizationId: org.id,
      name: "Discounts capped at 20%",
      description: "Agents cannot create discounts above 20% without approval.",
      rule: { tool: "Salesforce", action: "discount", maxValue: 20 },
    },
  });

  await db.activity.createMany({
    data: [
      {
        agentId: salesAgent.id,
        tool: "Salesforce",
        action: "read",
        target: "customer_438",
        status: "ALLOWED",
        createdAt: new Date(Date.now() - 1000 * 60 * 6),
      },
      {
        agentId: salesAgent.id,
        tool: "Pricing API",
        action: "read",
        target: "product_82",
        status: "ALLOWED",
        createdAt: new Date(Date.now() - 1000 * 60 * 5),
      },
      {
        agentId: salesAgent.id,
        tool: "Salesforce",
        action: "write",
        target: "quote_9832",
        status: "ALLOWED",
        createdAt: new Date(Date.now() - 1000 * 60 * 4),
      },
      {
        agentId: salesAgent.id,
        tool: "Email",
        action: "send",
        target: "customer@example.com",
        status: "BLOCKED",
        reason: "Human approval required but not present",
        createdAt: new Date(Date.now() - 1000 * 60 * 3),
      },
      {
        agentId: codingAgent.id,
        tool: "GitHub Copilot",
        action: "write",
        target: "repo:ai-agent-governance",
        status: "ALLOWED",
        createdAt: new Date(Date.now() - 1000 * 60 * 12),
      },
    ],
  });

  const blockedActivity = await db.activity.findFirst({
    where: { agentId: salesAgent.id, status: "BLOCKED" },
  });

  if (blockedActivity) {
    await db.incident.upsert({
      where: { activityId: blockedActivity.id },
      update: {},
      create: {
        agentId: salesAgent.id,
        activityId: blockedActivity.id,
        policyId: noExternalEmailPolicy.id,
        severity: "HIGH",
        status: "OPEN",
        title: "Sales Agent attempted to send external email without approval",
        description:
          "The Sales Quoting Agent attempted to send a quote directly to a customer email address without the required human approval step.",
      },
    });
  }

  void discountCapPolicy;

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
