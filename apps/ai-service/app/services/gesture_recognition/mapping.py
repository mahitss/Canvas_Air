from typing import Dict, Optional, Any
from app.services.gesture_recognition.models import ShortcutAction

class ActionMapper:
    def __init__(self):
        # Default fallback shortcut bindings
        self.mappings: Dict[str, ShortcutAction] = {
            "Swipe Left": ShortcutAction(action_type="SHORTCUT", target="alt+left"),
            "Swipe Right": ShortcutAction(action_type="SHORTCUT", target="alt+right"),
            "Circle Clockwise": ShortcutAction(action_type="DRAW_ACTION", target="brush_draw"),
            "OK Sign": ShortcutAction(action_type="SYSTEM_CMD", target="confirm_dialog"),
            "Closed Fist": ShortcutAction(action_type="MOUSE_EMULATION", target="left_click"),
            "Pinch": ShortcutAction(action_type="DRAW_ACTION", target="draw_stroke"),
            "Two Hand Expand": ShortcutAction(action_type="SYSTEM_CMD", target="zoom_viewport_in"),
            "Two Hand Compress": ShortcutAction(action_type="SYSTEM_CMD", target="zoom_viewport_out"),
        }

    def register_mapping(self, gesture_name: str, action: ShortcutAction) -> None:
        self.mappings[gesture_name] = action

    def remove_mapping(self, gesture_name: str) -> None:
        if gesture_name in self.mappings:
            del self.mappings[gesture_name]

    def get_mapped_action(self, gesture_name: str) -> Optional[ShortcutAction]:
        return self.mappings.get(gesture_name)

    def execute_mapped_action(self, gesture_name: str) -> Dict[str, Any]:
        """
        Retrieves mapped action and returns simulated execution envelope context.
        """
        action = self.get_mapped_action(gesture_name)
        if not action:
            return {
                "executed": False,
                "error": f"No action mapped to gesture '{gesture_name}'."
            }
            
        print(f"[ActionMapper] Triggering action {action.action_type} -> '{action.target}' via gesture '{gesture_name}'.")
        
        return {
            "executed": True,
            "gesture": gesture_name,
            "action_type": action.action_type,
            "target": action.target,
            "parameters": action.parameters or {}
        }
