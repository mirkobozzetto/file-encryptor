# File Encryptor

AES-256-GCM client-side file encryption web app.

## Features

- Browser-based encryption (no server processing)
- AES-256-GCM with PBKDF2 key derivation
- PWA support for offline use
- Batch file processing
- Zero data transmission to server

## Tech Stack

- TypeScript
- Hono.js server
- Web Crypto API
- Service Worker for offline functionality

## Setup

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Build

```bash
pnpm build
pnpm start
```
