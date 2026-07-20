export type ReleaseChannel = "development" | "nightly" | "alpha" | "beta" | "rc" | "stable";

export type BuildType = "debug" | "release" | "production";

export interface BuildArtifact {
  id: string;
  platform: string;
  type: BuildType;
  channel: ReleaseChannel;
  fileName: string;
  checksum: string;
  signature?: string;
  sizeBytes: number;
}

export interface PackageResult {
  success: boolean;
  artifact?: BuildArtifact;
  error?: string;
}

export interface UpdatePatch {
  fromVersion: string;
  deltaFileName: string;
  checksum: string;
}

export interface UpdateManifest {
  version: string;
  releaseNotes: string;
  requiredMinSDK: string;
  patches: UpdatePatch[];
}

export interface ReleaseVersion {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
}
