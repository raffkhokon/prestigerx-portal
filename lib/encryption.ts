/**
 * AES-256-GCM PHI Encryption Library
 * Server-side only — uses Node.js crypto directly
 * HIPAA-compliant encryption for Protected Health Information
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENC_PREFIX = 'ENC:';
const IV_LENGTH = 12; // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16;

// PHI field definitions by entity type
export const PHI_FIELDS: Record<string, string[]> = {
  patient: [
    'firstName',
    'lastName',
    'dateOfBirth',
    'phone',
    'email',
    'streetAddress',
    'zipCode',
    'allergies',
    'gender', // Added
  ],
  prescription: [
    'medicationName',
    'medicationStrength',
    'directions',
    'pharmacyName',
    'providerName',
    'providerNpi',
    'providerPhone',
    // Added denormalized patient fields (CRITICAL)
    'patientName',
    'patientDob',
    'patientGender',
    'patientAllergies',
  ],
  provider: [
    'providerNpi',
    'providerName',
    'providerPhone',
    'name',
    'npi',
    'phone',
    'dea',      // Added
    'license',  // Added
    'email',    // Added
  ],
};

function getKey(): Buffer {
  const keyHex = process.env.HIPAA_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('HIPAA_ENCRYPTION_KEY environment variable is not set');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a single string value with AES-256-GCM
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: ENC:<iv_hex>:<authTag_hex>:<ciphertext_hex>
  return `${ENC_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a single string value
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext || !ciphertext.startsWith(ENC_PREFIX)) return ciphertext;

  const key = getKey();
  const withoutPrefix = ciphertext.slice(ENC_PREFIX.length);
  const parts = withoutPrefix.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedData = Buffer.from(encryptedHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Encrypt PHI fields in a data object based on entity type
 */
export function encryptPHI<T extends Record<string, unknown>>(
  data: T,
  entityType: string
): T {
  const fields = PHI_FIELDS[entityType] || [];
  const result = { ...data };

  for (const field of fields) {
    if (result[field] !== null && result[field] !== undefined && typeof result[field] === 'string') {
      const value = result[field] as string;
      if (value && !value.startsWith(ENC_PREFIX)) {
        (result as Record<string, unknown>)[field] = encrypt(value);
      }
    }
  }

  return result;
}

/**
 * Decrypt PHI fields in a data object based on entity type
 */
export function decryptPHI<T extends Record<string, unknown>>(
  data: T,
  entityType: string
): T {
  const fields = PHI_FIELDS[entityType] || [];
  const result = { ...data };

  for (const field of fields) {
    if (result[field] !== null && result[field] !== undefined && typeof result[field] === 'string') {
      const value = result[field] as string;
      if (value && value.startsWith(ENC_PREFIX)) {
        try {
          (result as Record<string, unknown>)[field] = decrypt(value);
        } catch {
          // If decryption fails, return the raw value (may be unencrypted legacy data)
          console.error(`Failed to decrypt field ${field}`);
        }
      }
    }
  }

  return result;
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

/**
 * Get list of PHI fields that were accessed/modified
 */
export function getAccessedPhiFields(
  data: Record<string, unknown>,
  entityType: string
): string[] {
  const fields = PHI_FIELDS[entityType] || [];
  return fields.filter((field) => data[field] !== undefined && data[field] !== null);
}
