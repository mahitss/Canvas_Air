import { SessionRole } from "../types";

export interface TemporaryPermission {
  userId: string;
  role: SessionRole;
  expiresAt: number;
}

export interface InvitationToken {
  token: string;
  role: SessionRole;
  expiresAt: number;
  maxUsages: number;
  usages: number;
}

export class CollaborationPermissionSystem {
  private readonly temporaryPermissions = new Map<string, TemporaryPermission>(); // userId -> TempPermission
  private readonly invitationTokens = new Map<string, InvitationToken>(); // token -> InvitationToken
  private readonly roleWeights: Record<SessionRole, number> = {
    owner: 5,
    editor: 4,
    commenter: 3,
    viewer: 2,
    guest: 1
  };

  /**
   * Evaluates if a user possesses appropriate credentials to edit document layers.
   */
  public isAuthorized(
    userId: string,
    currentRole: SessionRole,
    requiredRole: SessionRole
  ): boolean {
    let activeRole = currentRole;

    // Evaluate temporary permission overrides
    const temp = this.temporaryPermissions.get(userId);
    if (temp && temp.expiresAt > Date.now()) {
      activeRole = temp.role;
    }

    const weight = this.roleWeights[activeRole] ?? 1;
    const requiredWeight = this.roleWeights[requiredRole] ?? 1;
    return weight >= requiredWeight;
  }

  /**
   * Grants a high-privilege override role to a user that expires after the timeout duration.
   */
  public grantTemporaryPermission(userId: string, role: SessionRole, durationMs: number): void {
    this.temporaryPermissions.set(userId, {
      userId,
      role,
      expiresAt: Date.now() + durationMs
    });
  }

  /**
   * Generates a sign-in token mapping to a specific role.
   */
  public createInvitationToken(role: SessionRole, durationMs: number, maxUsages: number = 1): string {
    const token = "tok_" + Math.random().toString(36).substring(2, 10);
    this.invitationTokens.set(token, {
      token,
      role,
      expiresAt: Date.now() + durationMs,
      maxUsages,
      usages: 0
    });
    return token;
  }

  /**
   * Consumes an invitation token, returning the associated session role.
   */
  public useInvitationToken(token: string): SessionRole {
    const inv = this.invitationTokens.get(token);
    if (!inv) {
      throw new Error(`InvitationError: Invalid or non-existent token: ${token}`);
    }
    if (Date.now() > inv.expiresAt) {
      throw new Error(`InvitationError: Token has expired`);
    }
    if (inv.usages >= inv.maxUsages) {
      throw new Error(`InvitationError: Token usage limits exceeded`);
    }

    inv.usages++;
    return inv.role;
  }
}
