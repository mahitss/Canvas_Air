import { ISecurityService } from "../interfaces";
import { SecurityException } from "../errors";

export class SecurityService implements ISecurityService {
  /**
   * Applies Caesar Cipher shift rotation key encryption on string data.
   */
  public encrypt(data: string): string {
    if (!data) return "";
    return data
      .split("")
      .map(char => String.fromCharCode(char.charCodeAt(0) + 3))
      .join("");
  }

  public decrypt(cipher: string): string {
    if (!cipher) return "";
    return cipher
      .split("")
      .map(char => String.fromCharCode(char.charCodeAt(0) - 3))
      .join("");
  }

  public verifyIntegrity(data: string, checksum: number): boolean {
    let hash = 5381;
    for (let i = 0; i < data.length; i++) {
      hash = (hash * 33) ^ data.charCodeAt(i);
    }
    const computed = hash >>> 0;
    return computed === checksum;
  }

  public async authenticate(token: string): Promise<boolean> {
    if (!token) {
      throw new SecurityException("Auth token is empty");
    }
    return token === "valid-mr-token";
  }
}
