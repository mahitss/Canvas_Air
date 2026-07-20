import { AccessibilityAuditResult, DOMNodeInfo } from "../types";

export class AccessibilityEngine {
  /**
   * Evaluates UI components against WCAG standard focus and semantic labels policies.
   */
  public runAccessibilityAudit(nodes: DOMNodeInfo[]): AccessibilityAuditResult {
    const errors: string[] = [];

    for (const node of nodes) {
      const lowerTag = node.tagName.toLowerCase();
      
      // Buttons and Links must have screen reader descriptive labels
      if (lowerTag === "button" || lowerTag === "a" || node.role === "button") {
        if (!node.ariaLabel || node.ariaLabel.trim() === "") {
          errors.push(`Interactive tag <${node.tagName}> is missing a descriptive 'aria-label' text.`);
        }
      }

      // Images must have alternative text values
      if (lowerTag === "img") {
        if (!node.ariaLabel || node.ariaLabel.trim() === "") {
          errors.push(`Media element <${node.tagName}> is missing alternative description text.`);
        }
      }

      // Interactive items must have focus index tags mapped
      const isInteractive = lowerTag === "button" || lowerTag === "a" || lowerTag === "input" || lowerTag === "select";
      if (isInteractive || node.role === "button") {
        if (node.tabIndex === undefined || node.tabIndex < 0) {
          errors.push(`Focus check failed: element <${node.tagName}> has invalid 'tabIndex' (${node.tabIndex}).`);
        }
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }
}
