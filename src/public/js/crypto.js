// src/public/js/crypto.ts
var FileCrypto = class {
  constructor() {
    this.SALT_LENGTH = 16;
    this.IV_LENGTH = 12;
    this.TAG_LENGTH = 16;
    this.ITERATIONS = 1e5;
  }
  async deriveKey(password, salt) {
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
        iterations: this.ITERATIONS,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
  async encryptFile(file, password, onProgress) {
    if (!password) {
      throw new Error("Le mot de passe est requis");
    }
    const arrayBuffer = await this.readFileAsArrayBuffer(file, onProgress);
    const data = new Uint8Array(arrayBuffer);
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const key = await this.deriveKey(password, salt);
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      data
    );
    const encryptedArray = new Uint8Array(encryptedData);
    const result = new Uint8Array(salt.length + iv.length + encryptedArray.length);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(encryptedArray, salt.length + iv.length);
    return new Blob([result], { type: "application/octet-stream" });
  }
  async decryptFile(file, password, onProgress) {
    if (!password) {
      throw new Error("Le mot de passe est requis");
    }
    const arrayBuffer = await this.readFileAsArrayBuffer(file, onProgress);
    const data = new Uint8Array(arrayBuffer);
    if (data.length < this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH) {
      throw new Error("Fichier chiffr\xE9 invalide : trop petit");
    }
    const salt = data.slice(0, this.SALT_LENGTH);
    const iv = data.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
    const encryptedData = data.slice(this.SALT_LENGTH + this.IV_LENGTH);
    const key = await this.deriveKey(password, salt);
    try {
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv
        },
        key,
        encryptedData
      );
      let originalName = file.name;
      if (originalName.endsWith(".enc")) {
        originalName = originalName.slice(0, -4);
      }
      const mimeType = this.getMimeType(originalName);
      return {
        blob: new Blob([decryptedData], { type: mimeType }),
        originalName
      };
    } catch (error) {
      throw new Error("\xC9chec du d\xE9chiffrement : mot de passe incorrect ou fichier corrompu");
    }
  }
  async readFileAsArrayBuffer(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result);
      };
      reader.onerror = () => {
        reject(new Error("Erreur lors de la lecture du fichier"));
      };
      if (onProgress) {
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = e.loaded / e.total * 100;
            onProgress(progress);
          }
        };
      }
      reader.readAsArrayBuffer(file);
    });
  }
  getMimeType(filename) {
    const extension = filename.split(".").pop()?.toLowerCase();
    const mimeTypes = {
      "txt": "text/plain",
      "pdf": "application/pdf",
      "doc": "application/msword",
      "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "xls": "application/vnd.ms-excel",
      "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png",
      "gif": "image/gif",
      "zip": "application/zip",
      "mp3": "audio/mpeg",
      "mp4": "video/mp4",
      "json": "application/json",
      "xml": "application/xml",
      "html": "text/html",
      "css": "text/css",
      "js": "application/javascript",
      "ts": "application/typescript"
    };
    return mimeTypes[extension || ""] || "application/octet-stream";
  }
};
export {
  FileCrypto
};
