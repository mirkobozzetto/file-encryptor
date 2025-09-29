export class FileCrypto {
    private readonly SALT_LENGTH = 16;
    private readonly IV_LENGTH = 12;
    private readonly TAG_LENGTH = 16;
    private readonly ITERATIONS = 100000;

    private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        // Create a new ArrayBuffer from the Uint8Array to ensure compatibility
        const saltBuffer = new ArrayBuffer(salt.length);
        new Uint8Array(saltBuffer).set(salt);

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: this.ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    public async encryptFile(
        file: File,
        password: string,
        onProgress?: (progress: number) => void
    ): Promise<Blob> {
        if (!password) {
            throw new Error('Le mot de passe est requis');
        }

        const arrayBuffer = await this.readFileAsArrayBuffer(file, onProgress);
        const data = new Uint8Array(arrayBuffer);

        // Générer salt et IV aléatoires
        const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

        // Dériver la clé du mot de passe
        const key = await this.deriveKey(password, salt);

        // Chiffrer les données
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            data
        );

        // Structure du fichier chiffré : [salt (16 bytes)][iv (12 bytes)][encrypted data + tag]
        const encryptedArray = new Uint8Array(encryptedData);
        const result = new Uint8Array(salt.length + iv.length + encryptedArray.length);

        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(encryptedArray, salt.length + iv.length);

        return new Blob([result], { type: 'application/octet-stream' });
    }

    public async decryptFile(
        file: File,
        password: string,
        onProgress?: (progress: number) => void
    ): Promise<{ blob: Blob, originalName: string }> {
        if (!password) {
            throw new Error('Le mot de passe est requis');
        }

        const arrayBuffer = await this.readFileAsArrayBuffer(file, onProgress);
        const data = new Uint8Array(arrayBuffer);

        if (data.length < this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH) {
            throw new Error('Fichier chiffré invalide : trop petit');
        }

        // Extraire salt, iv et données chiffrées
        const salt = data.slice(0, this.SALT_LENGTH);
        const iv = data.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
        const encryptedData = data.slice(this.SALT_LENGTH + this.IV_LENGTH);

        // Dériver la clé du mot de passe
        const key = await this.deriveKey(password, salt);

        try {
            // Déchiffrer les données
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encryptedData
            );

            // Déterminer le type MIME basé sur l'extension originale
            let originalName = file.name;
            if (originalName.endsWith('.enc')) {
                originalName = originalName.slice(0, -4);
            }

            const mimeType = this.getMimeType(originalName);
            return {
                blob: new Blob([decryptedData], { type: mimeType }),
                originalName: originalName
            };
        } catch (error) {
            throw new Error('Échec du déchiffrement : mot de passe incorrect ou fichier corrompu');
        }
    }

    private async readFileAsArrayBuffer(
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                resolve(e.target?.result as ArrayBuffer);
            };

            reader.onerror = () => {
                reject(new Error('Erreur lors de la lecture du fichier'));
            };

            if (onProgress) {
                reader.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const progress = (e.loaded / e.total) * 100;
                        onProgress(progress);
                    }
                };
            }

            reader.readAsArrayBuffer(file);
        });
    }

    private getMimeType(filename: string): string {
        const extension = filename.split('.').pop()?.toLowerCase();
        const mimeTypes: { [key: string]: string } = {
            'txt': 'text/plain',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'zip': 'application/zip',
            'mp3': 'audio/mpeg',
            'mp4': 'video/mp4',
            'json': 'application/json',
            'xml': 'application/xml',
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'ts': 'application/typescript'
        };

        return mimeTypes[extension || ''] || 'application/octet-stream';
    }
}