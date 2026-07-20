export class PluginSdkException extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

export class PluginValidationException extends PluginSdkException {
  constructor(message: string, public readonly errors: string[]) {
    super(`${message}: ${errors.join("; ")}`);
  }
}

export class PluginPermissionDeniedException extends PluginSdkException {
  constructor(pluginId: string, permission: string) {
    super(`Permission denied: Plugin ${pluginId} requires permission ${permission}`);
  }
}

export class PluginLifecycleException extends PluginSdkException {
  constructor(pluginId: string, action: string, reason: string) {
    super(`Lifecycle failure on ${action} for Plugin ${pluginId}: ${reason}`);
  }
}
