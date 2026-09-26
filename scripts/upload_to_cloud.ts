import { db } from "@/lib/prisma";
import fs from "node:fs";
import path from "node:path";
import { UTApi } from "uploadthing/server";

const prisma = db;
const utapi = new UTApi();

const PRODUCTS_DIR = path.join(process.cwd(), "public", "products");

async function migrateImages() {
  if (!fs.existsSync(PRODUCTS_DIR)) {
    console.error(`Directory not found: ${PRODUCTS_DIR}`);
    process.exit(1);
  }

  const filenames = fs.readdirSync(PRODUCTS_DIR);
  const validExtensions = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

  const imageFiles = filenames.filter((file) =>
    validExtensions.includes(path.extname(file).toLowerCase())
  );

  console.log(`Found ${imageFiles.length} image files to process.`);

  for (const filename of imageFiles) {
    const filePath = path.join(PRODUCTS_DIR, filename);
    const slug = path.parse(filename).name;

    try {
      // biome-ignore lint/performance/noAwaitInLoops: script file
      const product = await prisma.product.findUnique({
        where: { slug },
      });

      if (!product) {
        console.warn(`[SKIP] No product found in DB matching slug: "${slug}"`);
        continue;
      }

      console.log(`Uploading ${filename}...`);

      const fileBuffer = fs.readFileSync(filePath);
      const file = new File([fileBuffer], filename, {
        type: getMimeType(filename),
      });

      const response = await utapi.uploadFiles([file]);
      const [uploadResult] = response;

      if (uploadResult.error || !uploadResult.data) {
        console.error(
          `[ERROR] Failed to upload ${filename}:`,
          uploadResult.error
        );
        continue;
      }

      const { ufsUrl } = uploadResult.data;
      console.log(`Uploaded ${filename} -> ${ufsUrl}`);

      await prisma.$transaction([
        prisma.product.update({
          where: { id: product.id },
          data: { baseImage: ufsUrl },
        }),
        prisma.productSKU.updateMany({
          where: { productId: product.id },
          data: { imageUrl: ufsUrl },
        }),
      ]);

      // Delete file immediately after DB updates succeed
      fs.unlinkSync(filePath);
      console.log(`[SUCCESS] Updated DB and deleted local file for: "${slug}"`);
    } catch (error) {
      console.error(`[FAILED] Error processing ${filename}:`, error);
    }
  }

  console.log("Migration complete.");
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

migrateImages()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Migration script encountered an unhandled error:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
