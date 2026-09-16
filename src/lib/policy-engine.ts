/**
 * Deterministic policy engine.
 *
 * A Policy.rule is a small JSON condition, evaluated in code — never by an
 * LLM — against a proposed agent action. This keeps enforcement decisions
 * reproducible and auditable.
 *
 * Supported rule shape (deliberately small for the MVP):
 * {
 *   "tool": "Email",              // optional, exact match
 *   "action": "send",             // optional, exact match
 *   "targetMatches": "external",  // optional: "external" | "internal"
 *   "maxValue": 20,                // optional numeric ceiling on metadata.value
 *   "requiresApproval": true       // if true, action is BLOCKED unless metadata.approved === true
 * }
 */

export interface ProposedAction {
  tool: string;
  action: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyRule {
  tool?: string;
  action?: string;
  targetMatches?: "external" | "internal";
  maxValue?: number;
  requiresApproval?: boolean;
}

export interface PolicyDecision {
  policyId: string;
  policyName: string;
  passed: boolean;
  reason: string;
}

function ruleApplies(rule: PolicyRule, proposed: ProposedAction): boolean {
  if (rule.tool && rule.tool.toLowerCase() !== proposed.tool.toLowerCase()) return false;
  if (rule.action && rule.action.toLowerCase() !== proposed.action.toLowerCase()) return false;
  return true;
}

export function evaluateAction(
  proposed: ProposedAction,
  policies: { id: string; name: string; rule: PolicyRule; enabled: boolean }[]
): { blocked: boolean; decisions: PolicyDecision[] } {
  const decisions: PolicyDecision[] = [];
  let blocked = false;

  for (const policy of policies) {
    if (!policy.enabled) continue;
    const rule = policy.rule;
    if (!ruleApplies(rule, proposed)) continue;

    if (rule.targetMatches === "external" && proposed.target && !/@/.test(proposed.target)) {
      continue; // rule is about external targets but this isn't one
    }

    if (typeof rule.maxValue === "number") {
      const value = Number(proposed.metadata?.value ?? 0);
      if (value > rule.maxValue) {
        decisions.push({
          policyId: policy.id,
          policyName: policy.name,
          passed: false,
          reason: `Value ${value} exceeds policy limit of ${rule.maxValue}`,
        });
        blocked = true;
        continue;
      }
    }

    if (rule.requiresApproval) {
      const approved = proposed.metadata?.approved === true;
      if (!approved) {
        decisions.push({
          policyId: policy.id,
          policyName: policy.name,
          passed: false,
          reason: "Human approval required but not present",
        });
        blocked = true;
        continue;
      }
    }

    decisions.push({
      policyId: policy.id,
      policyName: policy.name,
      passed: true,
      reason: "Conditions satisfied",
    });
  }

  return { blocked, decisions };
}
