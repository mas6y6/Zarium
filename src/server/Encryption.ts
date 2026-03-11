import crypto from "crypto";
import argon2 from "argon2";

export class Encryption {
    /**
     * Derive a key from a password and salt using PBKDF2 (HMAC-SHA256).
     * Using PBKDF2 for compatibility with native WebCrypto in browsers.
     */
    public static async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(password, salt, 100000, 32, "sha256", (err, derivedKey) => {
                if (err) reject(err);
                else resolve(derivedKey);
            });
        });
    }

    /**
     * Encrypt data using AES-256-GCM.
     */
    public static encrypt(data: Buffer, key: Buffer) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

        const encrypted = Buffer.concat([
            cipher.update(data),
            cipher.final()
        ]);

        const tag = cipher.getAuthTag();

        return {
            encrypted,
            iv,
            tag
        };
    }

    /**
     * Decrypt data using AES-256-GCM.
     */
    public static decrypt(encrypted: Buffer, key: Buffer, iv: Buffer, tag: Buffer): Buffer {
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(tag);

        return Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
    }

    /**
     * Generate a random salt or key.
     */
    public static randomBytes(length: number): Buffer {
        return crypto.randomBytes(length);
    }

    /**
     * Verify a password hash.
     */
    public static async verifyPassword(hash: string, password: string): Promise<boolean> {
        return argon2.verify(hash, password);
    }

    /**
     * Hash a password.
     */
    public static async hashPassword(password: string): Promise<string> {
        return argon2.hash(password);
    }
}
