export interface UserIdentity {
  id: string;
  email: string;
  roles: string[];
  attributes: Record<string, any>;
}

export interface AuthenticationResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  roles: string[];
  exp: number;
}

export interface AuthToken {
  payload: AuthTokenPayload;
  signature: string;
}

export type PolicyEffect = "allow" | "deny";

export interface PolicyRule {
  id: string;
  name: string;
  effect: PolicyEffect;
  condition: (subject: UserIdentity, resource: any, context: any) => boolean;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  event: string;
  actorId: string;
  result: "allow" | "deny" | "error" | "auth_success" | "auth_fail";
  previousHash: string;
  hash: string;
}

export interface SecretCredential {
  id: string;
  name: string;
  encryptedValue: string;
  algorithm: string;
}
