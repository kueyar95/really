import { Injectable } from '@nestjs/common';

@Injectable()
export class E164Service {
  /**
   * Normaliza un número de teléfono al formato E.164
   * Por defecto asume Chile (+56) si no tiene código de país
   */
  normalize(phoneNumber: string, defaultCountryCode = '56'): string {
    if (!phoneNumber) {
      throw new Error('Número de teléfono vacío');
    }

    // Remover todos los caracteres que no sean dígitos
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Remover ceros iniciales
    cleaned = cleaned.replace(/^0+/, '');

    // Si empieza con el código del país, lo dejamos
    // Si no, agregamos el código del país por defecto
    if (!cleaned.startsWith(defaultCountryCode)) {
      cleaned = defaultCountryCode + cleaned;
    }

    // Agregar el signo +
    return '+' + cleaned;
  }

  /**
   * Valida si un número está en formato E.164
   */
  isValid(phoneNumber: string): boolean {
    // E.164: +[código país][número nacional]
    // Máximo 15 dígitos, mínimo 8 (aprox)
    const e164Regex = /^\+[1-9]\d{7,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Formatea un número E.164 para mostrar
   * Ej: +56912345678 -> +56 9 1234 5678
   */
  format(phoneNumber: string): string {
    if (!this.isValid(phoneNumber)) {
      return phoneNumber;
    }

    // Para Chile
    if (phoneNumber.startsWith('+56')) {
      const national = phoneNumber.substring(3);
      if (national.length === 9 && national.startsWith('9')) {
        // Móvil: +56 9 XXXX XXXX
        return `+56 ${national.substring(0, 1)} ${national.substring(1, 5)} ${national.substring(5)}`;
      } else if (national.length === 8) {
        // Fijo: +56 XX XXX XXXX
        return `+56 ${national.substring(0, 2)} ${national.substring(2, 5)} ${national.substring(5)}`;
      }
    }

    // Por defecto, espaciar cada 4 dígitos después del código
    return phoneNumber;
  }

  /**
   * Extrae el código de país de un número E.164
   */
  getCountryCode(phoneNumber: string): string {
    if (!this.isValid(phoneNumber)) {
      throw new Error('Número de teléfono no válido');
    }

    // Lista simplificada de códigos de país comunes
    const countryCodes = [
      '1',    // USA/Canada
      '7',    // Russia
      '20',   // Egypt
      '27',   // South Africa
      '30',   // Greece
      '31',   // Netherlands
      '32',   // Belgium
      '33',   // France
      '34',   // Spain
      '36',   // Hungary
      '39',   // Italy
      '40',   // Romania
      '41',   // Switzerland
      '43',   // Austria
      '44',   // UK
      '45',   // Denmark
      '46',   // Sweden
      '47',   // Norway
      '48',   // Poland
      '49',   // Germany
      '51',   // Peru
      '52',   // Mexico
      '53',   // Cuba
      '54',   // Argentina
      '55',   // Brazil
      '56',   // Chile
      '57',   // Colombia
      '58',   // Venezuela
      '60',   // Malaysia
      '61',   // Australia
      '62',   // Indonesia
      '63',   // Philippines
      '64',   // New Zealand
      '65',   // Singapore
      '66',   // Thailand
      '81',   // Japan
      '82',   // South Korea
      '84',   // Vietnam
      '86',   // China
      '90',   // Turkey
      '91',   // India
      '92',   // Pakistan
      '93',   // Afghanistan
      '94',   // Sri Lanka
      '95',   // Myanmar
      '98',   // Iran
    ];

    const number = phoneNumber.substring(1); // Quitar el +

    for (const code of countryCodes.sort((a, b) => b.length - a.length)) {
      if (number.startsWith(code)) {
        return code;
      }
    }

    // Si no encontramos, asumimos que los primeros 2 dígitos son el código
    return number.substring(0, 2);
  }

  /**
   * Compara dos números de teléfono ignorando formato
   */
  equals(phone1: string, phone2: string): boolean {
    try {
      const normalized1 = this.normalize(phone1);
      const normalized2 = this.normalize(phone2);
      return normalized1 === normalized2;
    } catch {
      return false;
    }
  }
}
