export interface EncryptedDocument { version: 1; salt: Uint8Array; iv: Uint8Array; ciphertext: ArrayBuffer; }
async function keyFor(passphrase: string, salt: Uint8Array, usage: KeyUsage) {
  if (!globalThis.crypto?.subtle) throw new Error('Encrypted storage requires a secure browser context.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 600000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, [usage]);
}
export async function encryptDocument(data: string, passphrase: string): Promise<EncryptedDocument> {
  if (passphrase.length < 12) throw new Error('Use a passphrase with at least 12 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(passphrase, salt, 'encrypt');
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(data));
  return { version: 1, salt, iv, ciphertext };
}
export async function decryptDocument(record: EncryptedDocument, passphrase: string) {
  if (record.version !== 1) throw new Error('Unsupported document encryption version.');
  try {
    const key = await keyFor(passphrase, record.salt, 'decrypt');
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(record.iv) }, key, record.ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch { throw new Error('Unable to unlock. The passphrase is incorrect or the stored file is damaged.'); }
}
