
export type PluginEventType =
  | "PluginDiscovered"
  | "PluginRegistered"
  | "PluginStateChanged"
  | "PluginPermissionRequested"
  | "PluginMessageSent";

export interface PluginEvent {
  type: PluginEventType;
  payload: any;
  timestamp: number;
}
