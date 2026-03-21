import crypto from "crypto";

export interface EncryptedFileResult {
  encryptedFile: Buffer;
  encryptedKey: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * @param fileBuffer  Raw file bytes
 * @param publicKeyPem  PEM-formatted RSA public key (at least 2048-bit)
 */
export function encryptFile(fileBuffer: Buffer, publicKeyPem: string): EncryptedFileResult {
  // first we enerate a fresh AES-256 key (32 bytes) and IV (12 bytes for GCM)
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12); // GCM standard size taeha 12
  //AES-256-GCM authenticated encryption
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const encryptedFile = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16-byte auth tag

  //encrypt the AES key with RSA-OAEP (SHA-256 hash)
  const encryptedKey = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKey
  );

  return { encryptedFile, encryptedKey, iv, authTag };
}