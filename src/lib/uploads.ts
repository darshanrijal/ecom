import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
export const IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

export async function saveUploadedImage(file: File): Promise<string> {
  const extension = IMAGE_MIME_TYPES[file.type];
  if (!extension) {
    throw new Error("Unsupported image type. Use PNG, JPG, WEBP, GIF or AVIF.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image is too large — the maximum size is 5 MB.");
  }

  const productsDir = path.join(UPLOADS_DIR, "products");
  await mkdir(productsDir, { recursive: true });

  const filename = `${randomUUID()}${extension}`;
  await writeFile(
    path.join(productsDir, filename),
    Buffer.from(await file.arrayBuffer())
  );
  return `/uploads/products/${filename}`;
}

/**
 * Deletes a previously uploaded image from the local uploads directory.
 * Only touches files under `/uploads/` and treats missing files as a no-op.
 */
export async function disposeUploadedImage(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/")) {
    return;
  }
  const filePath = path.join(process.cwd(), "public", url);
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return;
  }
  try {
    await unlink(filePath);
  } catch {
    // ignore missing files
  }
}

/**
 * Deletes uploaded images that are present in `previous` but no longer
 * referenced by `next`. Files outside `/uploads/` are never touched.
 */
export async function disposeOrphanedUploads(
  previous: Array<string | null | undefined>,
  next: Array<string | null | undefined>
) {
  const keep = new Set(next.filter((url): url is string => Boolean(url)));
  await Promise.all(
    previous
      .filter((url): url is string => Boolean(url))
      .filter((url) => !keep.has(url))
      .map((url) => disposeUploadedImage(url))
  );
}
