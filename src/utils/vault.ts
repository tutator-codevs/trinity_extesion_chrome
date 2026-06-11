// Cifrado de credenciales en el navegador (AES-GCM).
//
// El backend NO expone refresh-token: cuando el token (~4h) caduca, la única forma
// de obtener uno nuevo es volver a hacer login. Para no pedirle la contraseña al
// usuario cada vez, guardamos sus credenciales **cifradas** en `storage.local`.
//
// La clave AES se genera como **no extraíble** y se guarda como objeto `CryptoKey`
// en IndexedDB. Aunque alguien lea `storage.local`, no puede sacar los bytes de la
// clave (el navegador no los expone) ni descifrar las credenciales fuera de esta
// extensión. IndexedDB y Web Crypto están disponibles tanto en el popup como en el
// service worker, así que ambos contextos comparten la misma clave.

const DB_NAME = 'trinity-vault';
const STORE_NAME = 'keys';
const KEY_ID = 'credentials-key';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Obtiene la clave AES no extraíble; la crea y persiste la primera vez. */
async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await openDb();
  try {
    const existing = await idbGet(db, KEY_ID);
    if (existing) return existing as CryptoKey;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
    await idbPut(db, KEY_ID, key);
    return key;
  } finally {
    db.close();
  }
}

/** Blob cifrado serializable en `storage.local` (JSON). */
export interface EncryptedBlob {
  iv: number[];
  data: number[];
}

/** Cifra un texto plano con la clave del navegador. */
export async function encryptString(plaintext: string): Promise<EncryptedBlob> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(cipher)) };
}

/** Descifra un blob; devuelve null si la clave ya no existe o el dato es inválido. */
export async function decryptString(blob: EncryptedBlob): Promise<string | null> {
  try {
    const key = await getOrCreateKey();
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(blob.iv) },
      key,
      new Uint8Array(blob.data)
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
