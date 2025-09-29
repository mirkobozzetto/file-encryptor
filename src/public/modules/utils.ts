import { MIME_TYPES } from "./constants";

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes: readonly string[] = ["Bytes", "KB", "MB", "GB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function getMimeType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();
  return MIME_TYPES[extension || ""] || "application/octet-stream";
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function readFileAsArrayBuffer(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>): void => {
      const result = e.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
      } else {
        reject(new Error("Erreur lors de la lecture du fichier"));
      }
    };

    reader.onerror = (): void => {
      reject(new Error("Erreur lors de la lecture du fichier"));
    };

    if (onProgress) {
      reader.onprogress = (e: ProgressEvent<FileReader>): void => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      };
    }

    reader.readAsArrayBuffer(file);
  });
}
