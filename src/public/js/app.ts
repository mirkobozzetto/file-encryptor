import { FileCrypto } from './crypto';

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
        this.dropZone = document.getElementById('dropZone')!;
        this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
        this.passwordInput = document.getElementById('password') as HTMLInputElement;
        this.encryptBtn = document.getElementById('encryptBtn') as HTMLButtonElement;
        this.decryptBtn = document.getElementById('decryptBtn') as HTMLButtonElement;
        this.progressBar = document.getElementById('progressBar')!;
        this.progressBarFill = document.getElementById('progressBarFill')!;
        this.progressText = document.getElementById('progressText')!;
        this.statusMessage = document.getElementById('statusMessage')!;
        this.fileList = document.getElementById('fileList')!;
        this.filesContainer = document.getElementById('filesContainer')!;
    }

    private initEventListeners(): void {
        // Drag and drop
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('border-blue-500', 'bg-gray-700');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('border-blue-500', 'bg-gray-700');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('border-blue-500', 'bg-gray-700');
            const files = Array.from(e.dataTransfer?.files || []);
            this.handleFiles(files);
        });

        // File input
        document.getElementById('selectFiles')?.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', () => {
            const files = Array.from(this.fileInput.files || []);
            this.handleFiles(files);
        });

        // Buttons
        this.encryptBtn.addEventListener('click', () => this.processFiles(true));
        this.decryptBtn.addEventListener('click', () => this.processFiles(false));

        // Password input
        this.passwordInput.addEventListener('input', () => {
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
        this.fileList.classList.remove('hidden');
        this.filesContainer.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex justify-between items-center p-2 bg-gray-700 rounded-lg';
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

            const removeBtn = fileItem.querySelector('button');
            removeBtn?.addEventListener('click', () => {
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
            this.showStatus('Veuillez entrer un mot de passe', 'error');
            return;
        }

        this.showProgressBar();
        const totalFiles = this.selectedFiles.length;
        const results: { name: string, blob: Blob }[] = [];

        try {
            for (let i = 0; i < totalFiles; i++) {
                const file = this.selectedFiles[i];
                this.updateProgress((i / totalFiles) * 100, `Traitement de ${file.name}...`);

                if (encrypt) {
                    const encryptedBlob = await this.crypto.encryptFile(file, password);
                    results.push({
                        name: file.name + '.enc',
                        blob: encryptedBlob
                    });
                } else {
                    const { blob, originalName } = await this.crypto.decryptFile(file, password);
                    results.push({
                        name: originalName,
                        blob: blob
                    });
                }
            }

            this.updateProgress(100, 'Terminé !');

            // Télécharger les fichiers traités
            for (const result of results) {
                this.downloadFile(result.blob, result.name);
            }

            this.showStatus(
                `${totalFiles} fichier(s) ${encrypt ? 'chiffré(s)' : 'déchiffré(s)'} avec succès !`,
                'success'
            );

            // Réinitialiser après succès
            setTimeout(() => {
                this.resetForm();
            }, 3000);

        } catch (error) {
            this.showStatus(
                `Erreur : ${error instanceof Error ? error.message : 'Une erreur est survenue'}`,
                'error'
            );
        } finally {
            this.hideProgressBar();
        }
    }

    private showProgressBar(): void {
        this.progressBar.classList.remove('hidden');
        this.encryptBtn.disabled = true;
        this.decryptBtn.disabled = true;
    }

    private hideProgressBar(): void {
        setTimeout(() => {
            this.progressBar.classList.add('hidden');
            this.updateButtonStates();
        }, 1500);
    }

    private updateProgress(percent: number, text: string): void {
        this.progressBarFill.style.width = `${percent}%`;
        this.progressText.textContent = `${Math.round(percent)}% - ${text}`;
    }

    private showStatus(message: string, type: 'success' | 'error'): void {
        this.statusMessage.classList.remove('hidden', 'bg-green-900', 'bg-red-900');
        this.statusMessage.classList.add(type === 'success' ? 'bg-green-900' : 'bg-red-900');
        this.statusMessage.textContent = message;

        setTimeout(() => {
            this.statusMessage.classList.add('hidden');
        }, 5000);
    }

    private downloadFile(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    private resetForm(): void {
        this.selectedFiles = [];
        this.fileInput.value = '';
        this.passwordInput.value = '';
        this.fileList.classList.add('hidden');
        this.filesContainer.innerHTML = '';
        this.updateButtonStates();
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FileEncryptorApp();
    });
} else {
    new FileEncryptorApp();
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration.scope);

            // Check for updates periodically
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000); // Check every hour

            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available, show update notification
                            if (confirm('Une nouvelle version de l\'application est disponible. Voulez-vous mettre à jour ?')) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                window.location.reload();
                            }
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}

// PWA Install Prompt
let deferredPrompt: any;
const installButton = document.createElement('button');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install button if not already installed
    if (!window.matchMedia('(display-mode: standalone)').matches) {
        showInstallPrompt();
    }
});

function showInstallPrompt() {
    // Create install button if it doesn't exist
    if (!document.getElementById('pwa-install-btn')) {
        installButton.id = 'pwa-install-btn';
        installButton.className = 'fixed bottom-4 right-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all transform hover:scale-105 z-50';
        installButton.innerHTML = '📱 Installer l\'app';
        installButton.style.display = 'none';
        document.body.appendChild(installButton);

        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to install prompt: ${outcome}`);
                deferredPrompt = null;
                installButton.style.display = 'none';
            }
        });
    }

    // Show the button with animation
    setTimeout(() => {
        installButton.style.display = 'block';
    }, 2000);
}

// Check if app is installed
window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    if (installButton) {
        installButton.style.display = 'none';
    }
});