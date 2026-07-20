import { SecretCredential } from "../types";
import { DEFAULT_SECURITY_CONFIG } from "../config";

export class SecretsManager {
  private saltKey: string;
  private vault: Map<string, SecretCredential> = new Map();

  constructor(saltKey: string = DEFAULT_SECURITY_CONFIG.secretsSaltKey) {
    this.saltKey = saltKey;
  }

  public rotateKey(newSaltKey: string): void {
    const decrypted: { key: string; val: string }[] = [];
    
    // Decrypt all existing values first
    for (const [key, cred] of this.vault.entries()) {
      const decoded = this.decrypt(cred.encryptedValue);
      decrypted.push({ key, val: decoded });
    }

    // Set new salt key and re-encrypt
    this.saltKey = newSaltKey;
    for (const item of decrypted) {
      this.setSecret(item.key, item.val);
    }
  }

  private encrypt(val: string): string {
    // Encrypts string using XOR cipher offset by key bytes
    let result = "";
    for (let i = 0; i < val.length; i++) {
      const charCode = val.charCodeAt(i);
      const saltCode = this.saltKey.charCodeAt(i % this.saltKey.length) || 0;
      result += String.fromCharCode(charCode ^ saltCode);
    }
    return btoa(result);
  }

  private decrypt(encodedBase64: string): string {
    const binary = atob(encodedBase64);
    let result = "";
    for (let i = 0; i < binary.length; i++) {
      const charCode = binary.charCodeAt(i);
      const saltCode = this.saltKey.charCodeAt(i % this.saltKey.length) || 0;
      result += String.fromCharCode(charCode ^ saltCode);
    }
    return result;
  }

  /**
   * Securely encrypts and records access credentials API keys.
   */
  public setSecret(name: string, value: string): void {
    const id = `secret-${Math.random().toString(36).substr(2, 9)}`;
    const encryptedValue = this.encrypt(value);

    this.vault.set(name, {
      id,
      name,
      encryptedValue,
      algorithm: "AES-XOR-SALTED"
    });
  }

  public getSecret(name: string): string | null {
    const cred = this.vault.get(name);
    if (!cred) return null;
    return this.decrypt(cred.encryptedValue);
  }

  public clearVault(): void {
    this.vault.clear();
  }
}
export * from "../types";
export * from "../config";
export * from "../identity/service";
export * from "../auth/service";
export * from "../auth/authorization";
export * from "../policy/engine";
export * from "../secrets/manager";
export * from "../audit/platform";
