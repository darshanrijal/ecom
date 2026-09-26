import type { AppFileRouter } from "@/app/api/uploadthing/core";
import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

export const UploadButton = generateUploadButton<AppFileRouter>();
export const UploadDropzone = generateUploadDropzone<AppFileRouter>();
export const { useUploadThing, uploadFiles } =
  generateReactHelpers<AppFileRouter>();
