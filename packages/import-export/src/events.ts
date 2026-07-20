
export type ImportExportEventType =
  | "DocumentImported"
  | "DocumentExported"
  | "AdapterRegistered"
  | "ValidationErrorEncountered";

export interface ImportExportEvent {
  type: ImportExportEventType;
  payload: any;
  timestamp: number;
}
