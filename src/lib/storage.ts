import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Abstract storage layer. The MVP ships a local-disk provider; a real cloud
 * provider (S3-compatible / Vercel Blob) plugs in later behind this interface.
 * NOTE: on serverless (Vercel) local disk is ephemeral — fine for demo data.
 */
export interface StorageProvider {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), "storage");

class LocalStorageProvider implements StorageProvider {
  async put(key: string, data: Buffer): Promise<void> {
    const filePath = this.resolve(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  private resolve(key: string): string {
    // keys are generated server-side (uuid-based) — resolve defensively anyway
    const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    return path.join(STORAGE_ROOT, safe);
  }
}

export const storage: StorageProvider = new LocalStorageProvider();

export function makeStorageKey(firmId: string, fileName: string): string {
  const ext = path.extname(fileName).slice(0, 10);
  return `${firmId}/${crypto.randomUUID()}${ext}`;
}
