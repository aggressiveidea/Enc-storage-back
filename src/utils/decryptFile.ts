import crypto from "crypto";

/**
 *
 * @param encryptedFile  Encrypted file bytes
 * @param authTag        16-byte GCM authentication tag
 * @param iv             12-byte GCM IV
 * @param encryptedKey   RSA-OAEP encrypted AES key
 * @param privateKeyPem  PEM-formatted RSA private key
 */
export function decryptFile(
  encryptedFile: Buffer,
  authTag: Buffer,
  iv: Buffer,
  encryptedKey: Buffer,
  privateKeyPem: string
): Buffer {
  //decrypt the AES key with the RSA private key (OAEP padding)
  const aesKey = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    encryptedKey
  );

  //AES-256-GCM decryption 
  const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedFile), decipher.final()]);
  return decrypted;
}
//hna brk we check l auth if not valid  it throws n error