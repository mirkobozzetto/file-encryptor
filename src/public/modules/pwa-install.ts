interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export class PWAInstaller {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private readonly button: HTMLButtonElement;

  constructor() {
    this.button = this.createButton();
    this.init();
  }

  private createButton(): HTMLButtonElement {
    const button = document.createElement("button");
    button.className =
      "fixed bottom-4 right-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all transform hover:scale-105 z-50 hidden";
    button.textContent = "📱 Install app";
    button.onclick = () => this.install();
    return button;
  }

  private init(): void {
    window.addEventListener("beforeinstallprompt", (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        this.show();
      }
    });

    window.addEventListener("appinstalled", () => this.hide());
  }

  private show(): void {
    if (!this.button.parentElement) {
      document.body.appendChild(this.button);
    }
    setTimeout(() => this.button.classList.remove("hidden"), 2000);
  }

  private hide(): void {
    this.button.classList.add("hidden");
  }

  private async install(): Promise<void> {
    if (!this.deferredPrompt) return;
    await this.deferredPrompt.prompt();
    await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.hide();
  }
}
