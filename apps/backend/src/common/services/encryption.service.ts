import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  // Mantienes AES-GCM
  private algorithm: crypto.CipherGCMTypes = 'aes-256-gcm';
  private key: Buffer;

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[EncryptionService] ⚠️ No ENCRYPTION_KEY found, generating one for development');
        const generatedKey = crypto.randomBytes(32).toString('hex');
        console.warn(`[EncryptionService] Generated key: ${generatedKey}`);
        console.warn('[EncryptionService] Add this to your .env: ENCRYPTION_KEY=' + generatedKey);
        this.key = Buffer.from(generatedKey, 'hex');
      } else {
        throw new Error('ENCRYPTION_KEY is required in production');
      }
    } else {
      if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes)');
      }
      this.key = Buffer.from(encryptionKey, 'hex');
    }
  }

  /**
   * Encripta un texto usando AES-256-GCM
   * Formato devuelto: iv:authTag:encrypted (hex:hex:hex)
   */
  encrypt(text: string): string {
    try {
      // IV recomendado en GCM es 12 bytes; si prefieres mantener 16, no hay drama.
      const iv = crypto.randomBytes(16);

      // Tipar como CipherGCM para poder usar getAuthTag()
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('[EncryptionService] Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Desencripta: iv:authTag:encrypted
   */
  decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) throw new Error('Invalid encrypted format');

      const [ivHex, authTagHex, encrypted] = parts;

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Tipar como DecipherGCM para poder usar setAuthTag()
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('[EncryptionService] Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Verificación simple del formato iv:authTag:encrypted
   */
  isEncrypted(text: string): boolean {
    const parts = text.split(':');
    if (parts.length !== 3) return false;

    const [iv, authTag, encrypted] = parts;
    const hexRegex = /^[0-9a-fA-F]+$/;

    return (
      hexRegex.test(iv) &&
      iv.length === 32 &&       // 16 bytes IV = 32 hex
      hexRegex.test(authTag) &&
      authTag.length === 32 &&  // 16 bytes tag = 32 hex
      hexRegex.test(encrypted)
    );
  }
}
