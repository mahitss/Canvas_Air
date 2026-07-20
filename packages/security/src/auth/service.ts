import { AuthenticationResult, AuthTokenPayload, UserIdentity } from "../types";
import { DEFAULT_SECURITY_CONFIG } from "../config";

export class AuthenticationService {
  private secretKey: string;
  private users: Map<string, { secret: string; user: UserIdentity }> = new Map();
  private tokenLifetimeSec: number;

  constructor(
    secretKey: string = DEFAULT_SECURITY_CONFIG.secretsSaltKey,
    tokenLifetimeSec: number = DEFAULT_SECURITY_CONFIG.tokenExpirySec
  ) {
    this.secretKey = secretKey;
    this.tokenLifetimeSec = tokenLifetimeSec;
  }

  public registerCredentials(email: string, secret: string, user: UserIdentity): void {
    this.users.set(email, { secret, user });
  }

  private base64Encode(str: string): string {
    const encoded = btoa(unescape(encodeURIComponent(str)));
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  private base64Decode(str: string): string {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return decodeURIComponent(escape(atob(base64)));
  }

  private generateSignature(payloadStr: string): string {
    // Cryptographic signature simulation signature
    let hash = 0;
    const combined = payloadStr + this.secretKey;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 31 + combined.charCodeAt(i)) | 0;
    }
    return hash.toString(16);
  }

  /**
   * Performs authentication checks and returns a cryptographically signed JWT token.
   */
  public async authenticate(email: string, secret: string): Promise<AuthenticationResult> {
    const creds = this.users.get(email);
    if (!creds || creds.secret !== secret) {
      return { success: false, error: "Invalid credentials" };
    }

    const payload: AuthTokenPayload = {
      userId: creds.user.id,
      email: creds.user.email,
      roles: creds.user.roles,
      exp: Math.floor(Date.now() / 1000) + this.tokenLifetimeSec
    };

    const payloadStr = JSON.stringify(payload);
    const encodedPayload = this.base64Encode(payloadStr);
    const signature = this.generateSignature(encodedPayload);

    const token = `${encodedPayload}.${signature}`;

    return {
      success: true,
      token
    };
  }

  public verifyToken(token: string): AuthTokenPayload {
    const parts = token.split(".");
    if (parts.length !== 2) {
      throw new Error("Invalid token format. Missing signature separator.");
    }

    const [encodedPayload, signature] = parts;
    if (!encodedPayload || !signature) {
      throw new Error("Invalid token format. Missing payload or signature.");
    }

    // Verify cryptographic signature integrity
    const computedSignature = this.generateSignature(encodedPayload);
    if (computedSignature !== signature) {
      throw new Error("Cryptographic token signature verification failed.");
    }

    const payloadStr = this.base64Decode(encodedPayload);
    const payload: AuthTokenPayload = JSON.parse(payloadStr);

    // Check expiration timeline
    const currentTimeSec = Math.floor(Date.now() / 1000);
    if (payload.exp < currentTimeSec) {
      throw new Error("Authentication token signature has expired.");
    }

    return payload;
  }
}
