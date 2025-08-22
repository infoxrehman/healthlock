export class EncryptionService {
  // Generate RSA key pair for asymmetric encryption
  static async generateKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    )
  }

  // Generate AES key for symmetric encryption
  static async generateAESKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"],
    )
  }

  // Encrypt file with AES-GCM
  static async encryptFile(
    file: File,
    key: CryptoKey,
  ): Promise<{
    encryptedData: ArrayBuffer
    iv: Uint8Array
  }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const fileBuffer = await file.arrayBuffer()

    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      fileBuffer,
    )

    return { encryptedData, iv }
  }

  // Decrypt file with AES-GCM
  static async decryptFile(encryptedData: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
    return await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedData,
    )
  }

  // Encrypt AES key with RSA public key
  static async encryptKey(aesKey: CryptoKey, publicKey: CryptoKey): Promise<ArrayBuffer> {
    const keyBuffer = await window.crypto.subtle.exportKey("raw", aesKey)
    return await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      keyBuffer,
    )
  }

  // Decrypt AES key with RSA private key
  static async decryptKey(encryptedKey: ArrayBuffer, privateKey: CryptoKey): Promise<CryptoKey> {
    const keyBuffer = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      encryptedKey,
    )

    return await window.crypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"],
    )
  }

  // Export public key to base64
  static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey)
    return btoa(String.fromCharCode(...new Uint8Array(exported)))
  }

  // Import public key from base64
  static async importPublicKey(keyData: string): Promise<CryptoKey> {
    const binaryString = atob(keyData)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return await window.crypto.subtle.importKey(
      "spki",
      bytes.buffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"],
    )
  }
}
