"use strict";
(() => {
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

  // src/public/js/app.ts
  var FileEncryptorApp = class {
    constructor() {
      this.selectedFiles = [];
      this.crypto = new FileCrypto();
      this.initElements();
      this.initEventListeners();
    }
    initElements() {
      this.dropZone = document.getElementById("dropZone");
      this.fileInput = document.getElementById("fileInput");
      this.passwordInput = document.getElementById("password");
      this.encryptBtn = document.getElementById("encryptBtn");
      this.decryptBtn = document.getElementById("decryptBtn");
      this.progressBar = document.getElementById("progressBar");
      this.progressBarFill = document.getElementById("progressBarFill");
      this.progressText = document.getElementById("progressText");
      this.statusMessage = document.getElementById("statusMessage");
      this.fileList = document.getElementById("fileList");
      this.filesContainer = document.getElementById("filesContainer");
    }
    initEventListeners() {
      this.dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        this.dropZone.classList.add("border-blue-500", "bg-gray-700");
      });
      this.dropZone.addEventListener("dragleave", () => {
        this.dropZone.classList.remove("border-blue-500", "bg-gray-700");
      });
      this.dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        this.dropZone.classList.remove("border-blue-500", "bg-gray-700");
        const files = Array.from(e.dataTransfer?.files || []);
        this.handleFiles(files);
      });
      document.getElementById("selectFiles")?.addEventListener("click", () => {
        this.fileInput.click();
      });
      this.fileInput.addEventListener("change", () => {
        const files = Array.from(this.fileInput.files || []);
        this.handleFiles(files);
      });
      this.encryptBtn.addEventListener("click", () => this.processFiles(true));
      this.decryptBtn.addEventListener("click", () => this.processFiles(false));
      this.passwordInput.addEventListener("input", () => {
        this.updateButtonStates();
      });
    }
    handleFiles(files) {
      if (files.length === 0) return;
      this.selectedFiles = files;
      this.displayFiles();
      this.updateButtonStates();
    }
    displayFiles() {
      this.fileList.classList.remove("hidden");
      this.filesContainer.innerHTML = "";
      this.selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement("div");
        fileItem.className = "flex justify-between items-center p-2 bg-gray-700 rounded-lg";
        fileItem.innerHTML = `
                <div class="flex-1">
                    <p class="text-sm font-medium">${this.escapeHtml(file.name)}</p>
                    <p class="text-xs text-gray-400">${this.formatFileSize(file.size)}</p>
                </div>
                <button class="ml-2 text-red-500 hover:text-red-400" data-index="${index}">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            `;
        const removeBtn = fileItem.querySelector("button");
        removeBtn?.addEventListener("click", () => {
          this.selectedFiles.splice(index, 1);
          this.displayFiles();
          this.updateButtonStates();
        });
        this.filesContainer.appendChild(fileItem);
      });
    }
    updateButtonStates() {
      const hasFiles = this.selectedFiles.length > 0;
      const hasPassword = this.passwordInput.value.length > 0;
      const canProcess = hasFiles && hasPassword;
      this.encryptBtn.disabled = !canProcess;
      this.decryptBtn.disabled = !canProcess;
    }
    async processFiles(encrypt) {
      const password = this.passwordInput.value;
      if (!password) {
        this.showStatus("Veuillez entrer un mot de passe", "error");
        return;
      }
      this.showProgressBar();
      const totalFiles = this.selectedFiles.length;
      const results = [];
      try {
        for (let i = 0; i < totalFiles; i++) {
          const file = this.selectedFiles[i];
          this.updateProgress(i / totalFiles * 100, `Traitement de ${file.name}...`);
          if (encrypt) {
            const encryptedBlob = await this.crypto.encryptFile(file, password);
            results.push({
              name: file.name + ".enc",
              blob: encryptedBlob
            });
          } else {
            const { blob, originalName } = await this.crypto.decryptFile(file, password);
            results.push({
              name: originalName,
              blob
            });
          }
        }
        this.updateProgress(100, "Termin\xE9 !");
        for (const result of results) {
          this.downloadFile(result.blob, result.name);
        }
        this.showStatus(
          `${totalFiles} fichier(s) ${encrypt ? "chiffr\xE9(s)" : "d\xE9chiffr\xE9(s)"} avec succ\xE8s !`,
          "success"
        );
        setTimeout(() => {
          this.resetForm();
        }, 3e3);
      } catch (error) {
        this.showStatus(
          `Erreur : ${error instanceof Error ? error.message : "Une erreur est survenue"}`,
          "error"
        );
      } finally {
        this.hideProgressBar();
      }
    }
    showProgressBar() {
      this.progressBar.classList.remove("hidden");
      this.encryptBtn.disabled = true;
      this.decryptBtn.disabled = true;
    }
    hideProgressBar() {
      setTimeout(() => {
        this.progressBar.classList.add("hidden");
        this.updateButtonStates();
      }, 1500);
    }
    updateProgress(percent, text) {
      this.progressBarFill.style.width = `${percent}%`;
      this.progressText.textContent = `${Math.round(percent)}% - ${text}`;
    }
    showStatus(message, type) {
      this.statusMessage.classList.remove("hidden", "bg-green-900", "bg-red-900");
      this.statusMessage.classList.add(type === "success" ? "bg-green-900" : "bg-red-900");
      this.statusMessage.textContent = message;
      setTimeout(() => {
        this.statusMessage.classList.add("hidden");
      }, 5e3);
    }
    downloadFile(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    resetForm() {
      this.selectedFiles = [];
      this.fileInput.value = "";
      this.passwordInput.value = "";
      this.fileList.classList.add("hidden");
      this.filesContainer.innerHTML = "";
      this.updateButtonStates();
    }
    formatFileSize(bytes) {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      new FileEncryptorApp();
    });
  } else {
    new FileEncryptorApp();
  }
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker registered:", registration.scope);
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1e3);
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                if (confirm("Une nouvelle version de l'application est disponible. Voulez-vous mettre \xE0 jour ?")) {
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                  window.location.reload();
                }
              }
            });
          }
        });
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }
  var deferredPrompt;
  var installButton = document.createElement("button");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!window.matchMedia("(display-mode: standalone)").matches) {
      showInstallPrompt();
    }
  });
  function showInstallPrompt() {
    if (!document.getElementById("pwa-install-btn")) {
      installButton.id = "pwa-install-btn";
      installButton.className = "fixed bottom-4 right-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all transform hover:scale-105 z-50";
      installButton.innerHTML = "\u{1F4F1} Installer l'app";
      installButton.style.display = "none";
      document.body.appendChild(installButton);
      installButton.addEventListener("click", async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`User response to install prompt: ${outcome}`);
          deferredPrompt = null;
          installButton.style.display = "none";
        }
      });
    }
    setTimeout(() => {
      installButton.style.display = "block";
    }, 2e3);
  }
  window.addEventListener("appinstalled", () => {
    console.log("PWA installed successfully");
    if (installButton) {
      installButton.style.display = "none";
    }
  });
})();
