const ENCRYPTION_KEY = process.env.COOKIE_SECRET || "default_secret_key_gnflhs_2026_secure";

/**
 * 텍스트 기반의 비밀키로부터 AES-GCM 256-bit 대칭키를 유도합니다.
 */
async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const webCrypto = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
  
  if (!webCrypto || !webCrypto.subtle) {
    throw new Error("Web Crypto API is not supported in this environment.");
  }
  
  const keyMaterial = await webCrypto.subtle.importKey(
    "raw",
    enc.encode(ENCRYPTION_KEY),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  
  return webCrypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("gnflhs_salt_value_2026"),
      iterations: 1000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * 세션 객체를 암호화하여 Base64 인코딩 문자열로 반환합니다.
 */
export async function encryptSession(data: any): Promise<string> {
  const enc = new TextEncoder();
  const key = await getKey();
  
  const webCrypto = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
  const iv = webCrypto.getRandomValues(new Uint8Array(12)); // GCM용 12바이트 IV
  
  const encrypted = await webCrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(data))
  );
  
  // IV와 암호문을 병합하여 하나의 Uint8Array로 변환
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Base64 문자열로 변환 (atob/btoa는 Node.js 16+ 및 브라우저에서 표준 지원)
  return btoa(String.fromCharCode(...combined));
}

/**
 * 암호화된 Base64 문자열을 받아 원래의 세션 객체로 복호화합니다.
 */
export async function decryptSession(encryptedBase64: string): Promise<any | null> {
  try {
    const key = await getKey();
    
    // Base64 디코딩
    const binaryStr = atob(encryptedBase64);
    const combined = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      combined[i] = binaryStr.charCodeAt(i);
    }
    
    // IV(12바이트)와 암호문 분리
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const webCrypto = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
    const decrypted = await webCrypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  } catch (error) {
    console.error("Session decryption failed (Invalid or forged cookie):", error);
    return null;
  }
}
