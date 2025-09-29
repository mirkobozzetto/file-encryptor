import { MESSAGES } from "./constants";

export class ServiceWorkerManager {
  async register(): Promise<void> {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        this.setupUpdateCheck(registration);
        this.setupUpdateHandling(registration);
      } catch {
        // Silent fail - service worker is optional
      }
    });

    this.setupControllerChangeHandler();
  }

  private setupUpdateCheck(registration: ServiceWorkerRegistration): void {
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check every hour
  }

  private setupUpdateHandling(registration: ServiceWorkerRegistration): void {
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            if (confirm(MESSAGES.updateAvailable)) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
              window.location.reload();
            }
          }
        });
      }
    });
  }

  private setupControllerChangeHandler(): void {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }
}
