import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export interface SecretBox {
  encrypt(plain: string): Buffer;
  decrypt(data: Buffer): string;
}

let override: SecretBox | null | undefined;

/** Tests inject a box. Pass null to force plaintext. */
export function setSecretBox(box: SecretBox | null) {
  override = box;
}

export function getSecretBox(): SecretBox | null {
  if (override !== undefined) return override;
  try {
    // Outside the Electron runtime this module exports the executable path string.
    const electron = require("electron") as {
      safeStorage?: {
        isEncryptionAvailable: () => boolean;
        encryptString: (plain: string) => Buffer;
        decryptString: (data: Buffer) => string;
      };
    };
    const safeStorage = electron?.safeStorage;
    if (!safeStorage?.isEncryptionAvailable()) return null;
    return {
      encrypt: (plain) => Buffer.from(safeStorage.encryptString(plain)),
      decrypt: (data) => safeStorage.decryptString(data),
    };
  } catch {
    return null;
  }
}
