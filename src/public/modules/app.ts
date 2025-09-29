import { FileCrypto } from "./crypto";
import { ServiceWorkerManager } from "./service-worker-manager";
import { PWAInstaller } from "./pwa-install";
import { formatFileSize, escapeHtml, downloadFile } from "./utils";
import {
  DOM_ELEMENTS,
  CSS_CLASSES,
  FILE_EXTENSION,
  MESSAGES,
} from "./constants";
import type { ProcessResult, StatusType } from "./types";

class FileEncryptorApp {
  private crypto: FileCrypto;
  private selectedFiles: File[] = [];
  private dropZone!: HTMLElement;
  private fileInput!: HTMLInputElement;
  private passwordInput!: HTMLInputElement;
  private encryptBtn!: HTMLButtonElement;
  private decryptBtn!: HTMLButtonElement;
  private progressBar!: HTMLElement;
  private progressBarFill!: HTMLElement;
  private progressText!: HTMLElement;
  private statusMessage!: HTMLElement;
  private fileList!: HTMLElement;
  private filesContainer!: HTMLElement;

  constructor() {
    this.crypto = new FileCrypto();
    this.initElements();
    this.initEventListeners();
  }

  private initElements(): void {
    this.dropZone = document.getElementById(DOM_ELEMENTS.dropZone)!;
    this.fileInput = document.getElementById(
      DOM_ELEMENTS.fileInput
    ) as HTMLInputElement;
    this.passwordInput = document.getElementById(
      DOM_ELEMENTS.password
    ) as HTMLInputElement;
    this.encryptBtn = document.getElementById(
      DOM_ELEMENTS.encryptBtn
    ) as HTMLButtonElement;
    this.decryptBtn = document.getElementById(
      DOM_ELEMENTS.decryptBtn
    ) as HTMLButtonElement;
    this.progressBar = document.getElementById(DOM_ELEMENTS.progressBar)!;
    this.progressBarFill = document.getElementById(
      DOM_ELEMENTS.progressBarFill
    )!;
    this.progressText = document.getElementById(DOM_ELEMENTS.progressText)!;
    this.statusMessage = document.getElementById(DOM_ELEMENTS.statusMessage)!;
    this.fileList = document.getElementById(DOM_ELEMENTS.fileList)!;
    this.filesContainer = document.getElementById(DOM_ELEMENTS.filesContainer)!;
  }

  private initEventListeners(): void {
    this.setupDragAndDrop();
    this.setupFileInput();
    this.setupButtons();
    this.setupPasswordInput();
  }

  private setupDragAndDrop(): void {
    this.dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.dropZone.classList.add(...CSS_CLASSES.dragOver);
    });

    this.dropZone.addEventListener("dragleave", () => {
      this.dropZone.classList.remove(...CSS_CLASSES.dragOver);
    });

    this.dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.dropZone.classList.remove(...CSS_CLASSES.dragOver);
      const files = Array.from(e.dataTransfer?.files || []);
      this.handleFiles(files);
    });
  }

  private setupFileInput(): void {
    document
      .getElementById(DOM_ELEMENTS.selectFiles)
      ?.addEventListener("click", () => {
        this.fileInput.click();
      });

    this.fileInput.addEventListener("change", () => {
      const files = Array.from(this.fileInput.files || []);
      this.handleFiles(files);
    });
  }

  private setupButtons(): void {
    this.encryptBtn.addEventListener("click", () => this.processFiles(true));
    this.decryptBtn.addEventListener("click", () => this.processFiles(false));
  }

  private setupPasswordInput(): void {
    this.passwordInput.addEventListener("input", () => {
      this.updateButtonStates();
    });
  }

  private handleFiles(files: File[]): void {
    if (files.length === 0) return;

    this.selectedFiles = files;
    this.displayFiles();
    this.updateButtonStates();
  }

  private displayFiles(): void {
    this.fileList.classList.remove(CSS_CLASSES.hidden);
    this.filesContainer.innerHTML = "";

    this.selectedFiles.forEach((file, index) => {
      const fileItem = document.createElement("div");
      fileItem.className = CSS_CLASSES.fileItem;
      fileItem.innerHTML = `
        <div class="flex-1">
          <p class="text-sm font-medium">${escapeHtml(file.name)}</p>
          <p class="text-xs text-gray-400">${formatFileSize(file.size)}</p>
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

  private updateButtonStates(): void {
    const hasFiles = this.selectedFiles.length > 0;
    const hasPassword = this.passwordInput.value.length > 0;
    const canProcess = hasFiles && hasPassword;

    this.encryptBtn.disabled = !canProcess;
    this.decryptBtn.disabled = !canProcess;
  }

  private async processFiles(encrypt: boolean): Promise<void> {
    const password = this.passwordInput.value;

    if (!password) {
      this.showStatus(MESSAGES.passwordRequired, "error");
      return;
    }

    this.showProgressBar();
    const totalFiles = this.selectedFiles.length;
    const results: ProcessResult[] = [];

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = this.selectedFiles[i];
        this.updateProgress(
          (i / totalFiles) * 100,
          MESSAGES.processing(file.name)
        );

        if (encrypt) {
          const encryptedBlob = await this.crypto.encryptFile(file, password);
          results.push({
            name: file.name + FILE_EXTENSION.encrypted,
            blob: encryptedBlob,
          });
        } else {
          const { blob, originalName } = await this.crypto.decryptFile(
            file,
            password
          );
          results.push({
            name: originalName,
            blob: blob,
          });
        }
      }

      this.updateProgress(100, MESSAGES.completed);

      for (const result of results) {
        downloadFile(result.blob, result.name);
      }

      const operation = encrypt ? "encrypted" : "decrypted";
      this.showStatus(MESSAGES.success(totalFiles, operation), "success");

      setTimeout(() => {
        this.resetForm();
      }, 3000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      this.showStatus(MESSAGES.error(errorMessage), "error");
    } finally {
      this.hideProgressBar();
    }
  }

  private showProgressBar(): void {
    this.progressBar.classList.remove(CSS_CLASSES.hidden);
    this.encryptBtn.disabled = true;
    this.decryptBtn.disabled = true;
  }

  private hideProgressBar(): void {
    setTimeout(() => {
      this.progressBar.classList.add(CSS_CLASSES.hidden);
      this.updateButtonStates();
    }, 1500);
  }

  private updateProgress(percent: number, text: string): void {
    this.progressBarFill.style.width = `${percent}%`;
    this.progressText.textContent = `${Math.round(percent)}% - ${text}`;
  }

  private showStatus(message: string, type: StatusType): void {
    this.statusMessage.classList.remove(
      CSS_CLASSES.hidden,
      CSS_CLASSES.statusSuccess,
      CSS_CLASSES.statusError
    );
    this.statusMessage.classList.add(
      type === "success" ? CSS_CLASSES.statusSuccess : CSS_CLASSES.statusError
    );
    this.statusMessage.textContent = message;

    setTimeout(() => {
      this.statusMessage.classList.add(CSS_CLASSES.hidden);
    }, 5000);
  }

  private resetForm(): void {
    this.selectedFiles = [];
    this.fileInput.value = "";
    this.passwordInput.value = "";
    this.fileList.classList.add(CSS_CLASSES.hidden);
    this.filesContainer.innerHTML = "";
    this.updateButtonStates();
  }
}

function initializeApp(): void {
  new FileEncryptorApp();
  new ServiceWorkerManager().register();
  new PWAInstaller();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
