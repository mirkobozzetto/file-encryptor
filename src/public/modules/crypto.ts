import { CRYPTO_CONFIG, MESSAGES, FILE_EXTENSION } from "./constants";
import { getMimeType, readFileAsArrayBuffer } from "./utils";
import type { DecryptResult, ProgressCallback } from "./types";

export class FileCrypto {
  private async deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    const saltBuffer = new ArrayBuffer(salt.length);
    new Uint8Array(saltBuffer).set(salt);

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: CRYPTO_CONFIG.iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  public async encryptFile(
    file: File,
    password: string,
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    if (!password) {
      throw new Error(MESSAGES.passwordRequired);
    }

    const arrayBuffer = await readFileAsArrayBuffer(file, onProgress);
    const data = new Uint8Array(arrayBuffer);

    const salt = crypto.getRandomValues(
      new Uint8Array(CRYPTO_CONFIG.saltLength)
    );
    const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.ivLength));

    const key = await this.deriveKey(password, salt);

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      data
    );

    const encryptedArray = new Uint8Array(encryptedData);
    const result = new Uint8Array(
      salt.length + iv.length + encryptedArray.length
    );

    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(encryptedArray, salt.length + iv.length);

    return new Blob([result], { type: "application/octet-stream" });
  }

  public async decryptFile(
    file: File,
    password: string,
    onProgress?: ProgressCallback
  ): Promise<DecryptResult> {
    if (!password) {
      throw new Error(MESSAGES.passwordRequired);
    }

    const arrayBuffer = await readFileAsArrayBuffer(file, onProgress);
    const data = new Uint8Array(arrayBuffer);

    if (
      data.length <
      CRYPTO_CONFIG.saltLength +
        CRYPTO_CONFIG.ivLength +
        CRYPTO_CONFIG.tagLength
    ) {
      throw new Error(MESSAGES.invalidFile);
    }

    const salt = data.slice(0, CRYPTO_CONFIG.saltLength);
    const iv = data.slice(
      CRYPTO_CONFIG.saltLength,
      CRYPTO_CONFIG.saltLength + CRYPTO_CONFIG.ivLength
    );
    const encryptedData = data.slice(
      CRYPTO_CONFIG.saltLength + CRYPTO_CONFIG.ivLength
    );

    const key = await this.deriveKey(password, salt);

    try {
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        key,
        encryptedData
      );

      let originalName = file.name;
      if (originalName.endsWith(FILE_EXTENSION.encrypted)) {
        originalName = originalName.slice(0, -FILE_EXTENSION.encrypted.length);
      }

      const mimeType = getMimeType(originalName);
      return {
        blob: new Blob([decryptedData], { type: mimeType }),
        originalName: originalName,
      };
    } catch (error) {
      throw new Error(MESSAGES.decryptionFailed);
    }
  }
}
