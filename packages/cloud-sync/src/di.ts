export const CLOUD_SYNC_DI_TOKENS = {
  WorkspaceManager: Symbol.for("IWorkspaceManager"),
  SyncEngine: Symbol.for("ISyncEngine"),
  AssetManager: Symbol.for("IAssetManager"),
  ConflictResolver: Symbol.for("IConflictResolver"),
  VersionManager: Symbol.for("IVersionManager"),
  OfflineQueue: Symbol.for("IOfflineQueue"),
  SecurityService: Symbol.for("ISecurityService"),
  MonitoringService: Symbol.for("IMonitoringService")
};
