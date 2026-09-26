import { db } from "@/lib/prisma";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

/** Files younger than this survive sweeps — an open admin form may still need them. */
const SWEEP_MIN_AGE_MS = 15 * 60 * 1000;
const LIST_PAGE_SIZE = 100;
const UT_HOSTS = ["ufs.sh", "utfs.io"];

/** Only our UploadThing-hosted URLs are ever safe to delete from storage. */
export function isUploadThingHosted(url: string) {
  try {
    const host = new URL(url).hostname;
    return UT_HOSTS.some(
      (entry) => host === entry || host.endsWith(`.${entry}`)
    );
  } catch {
    return false;
  }
}

/** UploadThing file keys are the last path segment of a hosted file URL. */
function extractFileKey(url: string) {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    return segments.at(-1) ?? null;
  } catch {
    return null;
  }
}

function toHostedUrls(urls: Array<string | null | undefined>) {
  return [
    ...new Set(
      urls.filter((url): url is string => !!url && isUploadThingHosted(url))
    ),
  ];
}

/** Which of these URLs still appear on a product, SKU, or user avatar. */
async function findReferenced(urls: string[]) {
  const [products, skus, users] = await Promise.all([
    db.product.findMany({
      where: { baseImage: { in: urls } },
      select: { baseImage: true },
    }),
    db.productSKU.findMany({
      where: { imageUrl: { in: urls } },
      select: { imageUrl: true },
    }),
    db.user.findMany({
      where: { image: { in: urls } },
      select: { image: true },
    }),
  ]);

  return new Set([
    ...products.map((row) => row.baseImage),
    ...skus.map((row) => row.imageUrl),
    ...users.flatMap((row) => (row.image ? [row.image] : [])),
  ]);
}

/**
 * Delete a single hosted URL from UploadThing once nothing references it.
 * Best-effort: cleanup failures never break the mutation that triggered them.
 */
export async function cleanupImageIfUnused(url: string | null | undefined) {
  await cleanupImagesIfUnused([url]);
}

/** Same as cleanupImageIfUnused, for a batch of replaced/deleted images. */
export async function cleanupImagesIfUnused(
  urls: Array<string | null | undefined>
) {
  const hosted = toHostedUrls(urls);
  if (hosted.length === 0) {
    return;
  }

  try {
    const referenced = await findReferenced(hosted);
    const stale = hosted
      .filter((url) => !referenced.has(url))
      .map(extractFileKey)
      .filter((key): key is string => !!key);

    if (stale.length > 0) {
      await utapi.deleteFiles(stale);
    }
  } catch (error) {
    console.warn("[image-cleanup] skipped delete:", error);
  }
}

function uploadedRecently(uploadedAt: number) {
  // UploadThing has reported both seconds and milliseconds over time.
  const ms = uploadedAt < 1e12 ? uploadedAt * 1000 : uploadedAt;
  return Date.now() - ms < SWEEP_MIN_AGE_MS;
}

async function allReferencedKeys() {
  const [products, skus, users] = await Promise.all([
    db.product.findMany({ select: { baseImage: true } }),
    db.productSKU.findMany({ select: { imageUrl: true } }),
    db.user.findMany({
      where: { image: { not: null } },
      select: { image: true },
    }),
  ]);

  const urls = [
    ...products.map((row) => row.baseImage),
    ...skus.map((row) => row.imageUrl),
    ...users.flatMap((row) => (row.image ? [row.image] : [])),
  ];

  const keys = new Set<string>();
  for (const url of toHostedUrls(urls)) {
    const key = extractFileKey(url);
    if (key) {
      keys.add(key);
    }
  }
  return keys;
}

/**
 * Delete every UploadThing file that no product, SKU, or avatar references.
 * Recent uploads are skipped so abandoned-but-open forms don't lose their image.
 */
export async function sweepUnusedImages() {
  const referenced = await allReferencedKeys();
  let offset = 0;
  let scanned = 0;
  let deleted = 0;
  let hasMore = true;

  while (hasMore) {
    // biome-ignore lint/performance/noAwaitInLoops: pages must be fetched sequentially by offset
    const page = await utapi.listFiles({
      limit: LIST_PAGE_SIZE,
      offset,
    });
    scanned += page.files.length;
    offset += page.files.length;
    ({ hasMore } = page);

    const stale = page.files
      .filter(
        (file) =>
          file.status === "Uploaded" &&
          !referenced.has(file.key) &&
          !uploadedRecently(file.uploadedAt)
      )
      .map((file) => file.key);

    if (stale.length > 0) {
      await utapi.deleteFiles(stale);
      deleted += stale.length;
    }
  }

  return { scanned, deleted };
}

/** Storage usage for the admin dashboard; null when UploadThing is unreachable. */
export async function getStorageUsage() {
  try {
    const usage = await utapi.getUsageInfo();
    return {
      totalBytes: usage.totalBytes,
      filesUploaded: usage.filesUploaded,
      limitBytes: usage.limitBytes,
    };
  } catch (error) {
    console.warn("[image-cleanup] usage lookup failed:", error);
    return null;
  }
}
