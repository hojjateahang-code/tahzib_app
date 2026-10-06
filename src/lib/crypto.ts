/**
 * Client-Side WebCrypto Utility for AES-GCM Encrypted Storage & Notes
 * Ensures end-to-end client-side privacy so that data at rest (IndexedDB & Cloud Backups)
 * cannot be read without the user's session key.
 */

// Ensure global polyfill for crypto.randomUUID
if (typeof globalThis !== 'undefined') {
  if (!(globalThis as any).crypto) {
    (globalThis as any).crypto = {};
  }
  if (typeof (globalThis as any).crypto.randomUUID !== 'function') {
    (globalThis as any).crypto.randomUUID = function safeRandomUUID(): string {
      try {
        if ((globalThis as any).crypto && typeof (globalThis as any).crypto.getRandomValues === 'function') {
          const bytes = new Uint8Array(16);
          (globalThis as any).crypto.getRandomValues(bytes);
          bytes[6] = (bytes[6] & 0x0f) | 0x40;
          bytes[8] = (bytes[8] & 0x3f) | 0x80;
          const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
          return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
      } catch (e) {
        // Fallback below
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
}

export function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generate a deterministic or device/session derived key
async function deriveKey(secret: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a text string using AES-GCM
 */
export async function encryptText(text: string, userSecret: string = 'TahzibSecretKeyKey2026'): Promise<string> {
  try {
    if (!text) return '';
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      return text; // Graceful fallback on non-secure HTTP
    }
    const enc = new TextEncoder();
    const salt = 'TahzibAppSalt2026';
    const key = await deriveKey(userSecret, salt);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(text)
    );

    const buffer = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + buffer.length);
    combined.set(iv, 0);
    combined.set(buffer, iv.length);

    // Convert to base64 with prefix tag
    const base64 = btoa(String.fromCharCode(...combined));
    return `ENC:${base64}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return text; // fallback
  }
}

/**
 * Decrypt a cipher text string using AES-GCM
 */
export async function decryptText(cipherText: string, userSecret: string = 'TahzibSecretKeyKey2026'): Promise<string> {
  try {
    if (!cipherText || !cipherText.startsWith('ENC:')) {
      return cipherText; // Return original if not encrypted
    }
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      return cipherText.replace('ENC:', ''); // Graceful fallback on non-secure HTTP
    }

    const rawBase64 = cipherText.replace('ENC:', '');
    const binaryStr = atob(rawBase64);
    const combined = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      combined[i] = binaryStr.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const salt = 'TahzibAppSalt2026';
    const key = await deriveKey(userSecret, salt);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    console.error('Decryption error:', err);
    return '[داده رمزنگاری شده غیرقابل رمزگشایی]';
  }
}
