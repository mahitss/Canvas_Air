import { describe, it, expect } from "vitest";
import { VirtualCursor } from "../src/cursor/virtual_cursor";
import { SelectionEngine } from "../src/selection/selection_engine";
import { ManipulationEngine } from "../src/manipulation/manipulation_engine";
import { NavigationEngine } from "../src/navigation/navigation_engine";
import { RadialMenu } from "../src/menu/radial_menu";
import { ShortcutManager } from "../src/shortcuts/shortcut_manager";
import { SmartInteractionEngine } from "../src/interaction/smart_interaction";
import { AccessibilityManager } from "../src/accessibility/accessibility_manager";

describe("Air Interaction, Virtual Cursor & Selection Engines", () => {
  it("should smooth cursor movements and snap to screen boundary edges", () => {
    const cursor = new VirtualCursor({ smoothingFactor: 0.5, accelerationMultiplier: 1.0, precisionModeEnabled: false, edgeSnappingRadius: 10 });
    const pos = cursor.track({ x: 1915, y: 100, z: 0 }, { x: 1000, y: 100, z: 0 });

    // 1915 is within snapping range (10px) of 1920, so snaps to 1920
    expect(pos.x).toBe(1460); // 1000 + (1920 - 1000) * 0.5 = 1460
    expect(cursor.getPredictedPosition().z).toBe(0.5);
  });

  it("should evaluate target items intersection and hover selections", () => {
    const engine = new SelectionEngine();
    const objects = [
      { id: "rect-1", x: 10, y: 10, width: 100, height: 100 },
      { id: "circle-2", x: 200, y: 200, width: 50, height: 50 }
    ];

    const match = engine.evaluateSelection(objects, 50, 50, "Point");
    expect(match[0]).toBe("rect-1");
    expect(engine.getSelectedIds()).toContain("rect-1");

    const hovered = engine.evaluateSelection(objects, 220, 220, "Hover");
    expect(hovered[0]).toBe("circle-2");
    expect(engine.getHoveredId()).toBe("circle-2");
  });

  it("should translate scales and duplicate objects defined definitions", () => {
    const manipulation = new ManipulationEngine();
    const original = { id: "item-1", x: 100, y: 100, width: 50, height: 50 };

    manipulation.moveObject(original, 10, -5);
    expect(original.x).toBe(110);
    expect(original.y).toBe(95);

    manipulation.scaleObject(original, 2.0);
    expect(original.width).toBe(100);

    const copy = manipulation.duplicateObject(original);
    expect(copy.id).toContain("item-1-copy");
    expect(copy.x).toBe(original.x + 20);
  });

  it("should focus screen coordinates and scale zoom levels pivot offsets", () => {
    const nav = new NavigationEngine();
    nav.pan(50, -50);
    expect(nav.getCameraState().x).toBe(50);

    nav.zoom(2.0, 100, 100);
    // x = 100 - (100 - 50) * 2 = 0
    expect(nav.getCameraState().x).toBe(0);
    expect(nav.getCameraState().zoom).toBe(2.0);

    nav.focusObject(100, 100);
    expect(nav.getCameraState().zoom).toBe(1.5);
  });

  it("should toggle menu overlay states on shortcuts open gestures", () => {
    const menu = new RadialMenu();
    menu.registerItem({ id: "1", label: "Marker", actionId: "marker-tool", category: "brush" });
    menu.setOpenGesture("Thumbs Up");

    expect(menu.evaluateGestureToggle("Thumbs Up")).toBe(true);
    expect(menu.isOpen()).toBe(true);

    menu.selectItem("1");
    expect(menu.getSelectedItemId()).toBe("1");
  });

  it("should trigger system bindings on gesture shortcut matched values", () => {
    const shortcuts = new ShortcutManager();
    shortcuts.bindShortcut("Peace", "Undo");

    expect(shortcuts.evaluateShortcut("Peace")).toBe("Undo");
    expect(shortcuts.getHistory()).toContain("Undo");
  });

  it("should contextually display menu selections and execute pinches", () => {
    const interaction = new SmartInteractionEngine();
    const obj = { id: "box-1", x: 0, y: 0, width: 100, height: 100 };

    const first = interaction.processInteraction(obj, "Point");
    expect(first).toBe("ShowOptions");
    expect(interaction.isMenuVisible()).toBe(true);

    const second = interaction.processInteraction(obj, "Pinch");
    expect(second).toBe("ExecuteAction");
    expect(interaction.isMenuVisible()).toBe(false);
  });

  it("should apply sensitivity scale multipliers on spatial positions", () => {
    const accessibility = new AccessibilityManager({ largeGesturesOnly: false, reducedPrecision: false, oneHandedMode: false, leftHanded: false, sensitivityMultiplier: 1.5 });
    const pos = accessibility.scalePosition(100, 200);

    expect(pos.x).toBe(150);
    expect(pos.y).toBe(300);
  });
});
