/**
 * Deterministic risk engine.
 *
 * Design principle (per product spec): an LLM may be used later to
 * *explain* a risk assessment in natural language, but it must never be
 * the source of truth for the score itself. Every factor here is derived
 * directly from rows in the database — permissions, data access,
 * environment, autonomy — so a score can always be reproduced and
 * defended in an audit.
 */

import type { Agent, AgentPermission, AgentDataAccess, DataAsset, Tool } from "@prisma/client";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskFactor {
  label: string;
  weight: number;
}

export interface RiskResult {
  score: number; // 0-100
  level: RiskLevel;
  reasons: string[];
  mitigations: string[];
}

type AgentWithGraph = Agent & {
  permissions: (AgentPermission & { tool: Tool })[];
  dataAccess: (AgentDataAccess & { dataAsset: DataAsset })[];
};

const SENSITIVE_TIERS = ["pii", "financial", "confidential"];

export function assessAgentRisk(agent: AgentWithGraph): RiskResult {
  const reasons: string[] = [];
  const mitigations: string[] = [];
  let score = 0;

  // Environment
  if (agent.environment === "PRODUCTION") {
    score += 20;
    reasons.push("Running in production");
  }

  // Autonomy
  if (agent.autonomy === "AUTONOMOUS") {
    score += 25;
    reasons.push("Fully autonomous execution");
  } else if (agent.autonomy === "SEMI_AUTONOMOUS") {
    score += 12;
    reasons.push("Semi-autonomous execution");
  }

  // Data sensitivity
  const sensitiveAssets = agent.dataAccess.filter((d) =>
    SENSITIVE_TIERS.includes(d.dataAsset.sensitivity)
  );
  if (sensitiveAssets.length > 0) {
    score += Math.min(20, sensitiveAssets.length * 8);
    reasons.push(
      `Access to sensitive data: ${sensitiveAssets.map((d) => d.dataAsset.name).join(", ")}`
    );
  }

  // Write / delete / execute permissions
  const writeLike = agent.permissions.filter(
    (p) => p.effect === "ALLOW" && ["write", "delete", "execute", "send"].includes(p.action)
  );
  if (writeLike.length > 0) {
    score += Math.min(20, writeLike.length * 6);
    reasons.push(
      `Write/execute access: ${writeLike.map((p) => `${p.action} ${p.tool.name}`).join(", ")}`
    );
  }

  // External communication capability (heuristic on tool category/name)
  const canSendExternally = agent.permissions.some(
    (p) =>
      p.effect === "ALLOW" &&
      p.action === "send" &&
      /email|sms|slack|whatsapp/i.test(p.tool.name)
  );
  if (canSendExternally) {
    score += 10;
    reasons.push("Can send external communications");
  }

  // Missing owner
  if (!agent.ownerId) {
    score += 10;
    reasons.push("No registered owner");
  } else {
    mitigations.push("Owner assigned");
  }

  // Mitigations reduce nothing to the raw score (it stays explainable) but
  // are reported so a reviewer understands why the residual risk may be
  // acceptable despite a high raw score.
  const requiresApproval = agent.permissions.some((p) => p.requiresApproval);
  if (requiresApproval) {
    mitigations.push("Human approval required for sensitive actions");
  }
  if (agent.status === "disabled") {
    mitigations.push("Agent is currently disabled");
    score = Math.max(0, score - 30);
  }

  score = Math.min(100, score);

  let level: RiskLevel = "LOW";
  if (score >= 70) level = "CRITICAL";
  else if (score >= 45) level = "HIGH";
  else if (score >= 20) level = "MEDIUM";

  if (reasons.length === 0) {
    reasons.push("No elevated-risk factors detected");
  }

  return { score, level, reasons, mitigations };
}
