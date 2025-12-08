// Local file storage helpers - no external dependencies required
// Files are stored locally and served via Express static middleware

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Storage directory - use /tmp for Railway compatibility or local uploads folder
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), 'uploads');
const BASE_URL = process.env.BASE_URL || '';

// Ensure storage directory exists
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, '').replace(/\.\./g, '');
}

function getFilePath(key: string): string {
  return path.join(STORAGE_DIR, key);
}

function getPublicUrl(key: string): string {
  // Return a URL path that can be served by Express static middleware
  const baseUrl = BASE_URL || '';
  return `${baseUrl}/uploads/${key}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  await ensureStorageDir();

  const key = normalizeKey(relKey);
  const filePath = getFilePath(key);

  // Ensure subdirectories exist
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  // Convert data to Buffer if needed
  let buffer: Buffer;
  if (typeof data === 'string') {
    buffer = Buffer.from(data);
  } else if (data instanceof Uint8Array) {
    buffer = Buffer.from(data);
  } else {
    buffer = data;
  }

  // Write file to disk
  await fs.writeFile(filePath, buffer);

  const url = getPublicUrl(key);

  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const filePath = getFilePath(key);

  // Check if file exists
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`File not found: ${key}`);
  }

  const url = getPublicUrl(key);
  return { key, url };
}

export async function storageDelete(relKey: string): Promise<void> {
  const key = normalizeKey(relKey);
  const filePath = getFilePath(key);

  try {
    await fs.unlink(filePath);
  } catch {
    // File might not exist, ignore
  }
}

export async function storageExists(relKey: string): Promise<boolean> {
  const key = normalizeKey(relKey);
  const filePath = getFilePath(key);

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Get the storage directory path (for Express static middleware)
export function getStorageDirectory(): string {
  return STORAGE_DIR;
}
