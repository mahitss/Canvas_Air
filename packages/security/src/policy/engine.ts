import { PolicyRule, UserIdentity } from "../types";

export class PolicyEngine {
  private rules: Map<string, PolicyRule> = new Map();

  public registerRule(rule: PolicyRule): void {
    this.rules.set(rule.id, rule);
  }

  public removeRule(id: string): void {
    this.rules.delete(id);
  }

  /**
   * Resolves fine-grained Attribute-Based Access Control (ABAC) contextual rules.
   */
  public evaluatePolicy(subject: UserIdentity, resource: any, context: any): boolean {
    const rulesList = Array.from(this.rules.values());

    let allowed = false;

    for (const rule of rulesList) {
      const match = rule.condition(subject, resource, context);
      
      if (match) {
        // Deny overrides: immediate rejection if dynamic rule condition triggers deny
        if (rule.effect === "deny") {
          return false;
        }
        if (rule.effect === "allow") {
          allowed = true;
        }
      }
    }

    // Secure by default: reject if no allow rule matches
    return allowed;
  }

  public clearRules(): void {
    this.rules.clear();
  }
}
