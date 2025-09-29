import type { CryptoConfig } from "./types";

export const CRYPTO_CONFIG: CryptoConfig = {
  saltLength: 16,
  ivLength: 12,
  tagLength: 16,
  iterations: 100000,
};

export const MIME_TYPES: Record<string, string> = {
  txt: "text/plain",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  zip: "application/zip",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  ts: "application/typescript",
};

export const DOM_ELEMENTS = {
  dropZone: "dropZone",
  fileInput: "fileInput",
  password: "password",
  encryptBtn: "encryptBtn",
  decryptBtn: "decryptBtn",
  progressBar: "progressBar",
  progressBarFill: "progressBarFill",
  progressText: "progressText",
  statusMessage: "statusMessage",
  fileList: "fileList",
  filesContainer: "filesContainer",
  selectFiles: "selectFiles",
} as const;

export const CSS_CLASSES = {
  dragOver: ["border-blue-500", "bg-gray-700"],
  fileItem: "flex justify-between items-center p-2 bg-gray-700 rounded-lg",
  statusSuccess: "bg-green-900",
  statusError: "bg-red-900",
  hidden: "hidden",
} as const;

export const FILE_EXTENSION = {
  encrypted: ".enc",
} as const;

export const MESSAGES = {
  passwordRequired: "Please enter a password",
  processing: (fileName: string) => `Processing ${fileName}...`,
  completed: "Complete!",
  success: (count: number, operation: string) =>
    `${count} file(s) ${operation} successfully!`,
  error: (message: string) => `Error: ${message}`,
  decryptionFailed: "Decryption failed: incorrect password or corrupted file",
  fileReadError: "Error reading file",
  invalidFile: "Invalid encrypted file: too small",
  updateAvailable:
    "A new version of the app is available. Would you like to update?",
} as const;
