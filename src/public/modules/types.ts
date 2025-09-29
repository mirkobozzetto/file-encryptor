export interface DecryptResult {
  readonly blob: Blob;
  readonly originalName: string;
}

export interface ProcessResult {
  readonly name: string;
  readonly blob: Blob;
}

export interface CryptoConfig {
  readonly saltLength: number;
  readonly ivLength: number;
  readonly tagLength: number;
  readonly iterations: number;
}

export type StatusType = "success" | "error";

export type ProgressCallback = (progress: number) => void;
