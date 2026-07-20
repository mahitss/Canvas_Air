export const DEFAULT_RELEASE_CONFIG = {
  defaultPlatform: "windows",
  allowedChannels: ["development", "nightly", "alpha", "beta", "rc", "stable"] as const,
  allowedBuildTypes: ["debug", "release", "production"] as const
};
