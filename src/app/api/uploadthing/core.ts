import { getCurrentSession, preventUnauthorized } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";

const f = createUploadthing();

const auth = preventUnauthorized;

// FileRouter for your app, can contain multiple FileRoutes
export const appFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const { session, user } = await auth();

      if (!session || !user) {
        throw new UploadThingError("Unauthorized");
      }

      if (!isAdminEmail(user.email)) {
        throw new UploadThingError("Admin access required");
      }

      return { userId: user.id };
    })
    .onUploadComplete(({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),

  avatar: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const { session, user } = await getCurrentSession();

      if (!session || !user) {
        throw new UploadThingError("Unauthorized");
      }

      return { userId: user.id, userImage: user.image };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const existingUserImageUrl = metadata.userImage;
      const existingImageKey =
        existingUserImageUrl?.split("https://qq6j8iag8y.ufs.sh/f/")[1] ?? "";

      await new UTApi().deleteFiles([existingImageKey]);
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof appFileRouter;
