import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyB64 = this.configService.get<string>('medilink.encryptionKeyB64');
    if (!keyB64) {
      // No lanzar error aquí, permitir que el módulo se cargue
      // Los errores se lanzarán cuando se intente usar el servicio
      this.key = null;
      return;
    }
    
    this.key = Buffer.from(keyB64, 'base64');
    if (this.key.length !== this.keyLength) {
      throw new Error(
        `La clave de encriptación debe tener ${this.keyLength} bytes (recibido: ${this.key.length})`,
      );
    }
  }

  encrypt(plaintext: string): string {
    if (!this.key) {
      throw new Error('CryptoService no está configurado. Falta MEDILINK_ENCRYPTION_KEY_B64 en las variables de entorno.');
    }
    
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    
    const tag = cipher.getAuthTag();
    
    // Formato: iv:tag:ciphertext (todo en base64)
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    if (!this.key) {
      throw new Error('CryptoService no está configurado. Falta MEDILINK_ENCRYPTION_KEY_B64 en las variables de entorno.');
    }
    
    const buffer = Buffer.from(ciphertext, 'base64');
    
    const iv = buffer.slice(0, this.ivLength);
    const tag = buffer.slice(this.ivLength, this.ivLength + this.tagLength);
    const encrypted = buffer.slice(this.ivLength + this.tagLength);
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);
    
    return decipher.update(encrypted, null, 'utf8') + decipher.final('utf8');
  }

  /**
   * Genera una clave de encriptación segura de 32 bytes
   * Útil para generar la clave inicial
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }
}
