import { TextRegion, FormField } from "../types";

export class FormEngine {
  private formProximityThreshold = 150;

  /**
   * Identifies form label-value field pairs, checkboxes, radio buttons, signatures,
   * and required tags based on horizontal proximity.
   */
  public extractFormFields(regions: TextRegion[]): FormField[] {
    const fields: FormField[] = [];
    const labelRegions = regions.filter(r => r.text.trim().endsWith(":") || r.text.trim().includes("*"));
    const valueRegions = regions.filter(r => !labelRegions.includes(r));

    for (const labelReg of labelRegions) {
      let closestValReg: TextRegion | null = null;
      let minDistance = Infinity;

      for (const valReg of valueRegions) {
        const horizontalDelta = valReg.x - (labelReg.x + labelReg.w);
        const verticalDelta = Math.abs(valReg.y - labelReg.y);

        if (horizontalDelta >= -10 && horizontalDelta < this.formProximityThreshold && verticalDelta < 20) {
          if (horizontalDelta < minDistance) {
            minDistance = horizontalDelta;
            closestValReg = valReg;
          }
        }
      }

      if (closestValReg) {
        const cleanLabel = labelReg.text.replace(/:$/, "").trim();
        const valueText = closestValReg.text.trim();
        const isRequired = labelReg.text.includes("*");

        let fieldType: FormField["fieldType"] = "input";
        if (valueText === "[ ]" || valueText === "[x]" || valueText === "[X]") {
          fieldType = "checkbox";
        } else if (valueText === "( )" || valueText === "(x)") {
          fieldType = "radio";
        } else if (cleanLabel.toLowerCase().includes("signature") || valueText.startsWith("X__")) {
          fieldType = "signature";
        }

        fields.push({
          label: cleanLabel.replace(/\*$/, "").trim(),
          value: valueText,
          x: labelReg.x,
          y: labelReg.y,
          w: (closestValReg.x + closestValReg.w) - labelReg.x,
          h: Math.max(labelReg.h, closestValReg.h),
          fieldType,
          required: isRequired
        });
      }
    }

    return fields;
  }
}
