"use client";

import { FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useUploadThing } from "@/lib/utfs";
import { ImageIcon, TrashIcon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";

interface ImageUploadFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}

function uploadButtonLabel(isUploading: boolean, hasImage: boolean) {
  if (isUploading) {
    return "Uploading…";
  }
  return hasImage ? "Replace image" : "Upload image";
}

export function ImageUploadField({
  id,
  label,
  value,
  onChange,
  hint,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { startUpload } = useUploadThing("imageUploader");

  async function handleFile(file: File | null | undefined) {
    if (!file) {
      return;
    }
    setIsUploading(true);
    try {
      const result = await startUpload([file]);
      const url = result?.[0]?.serverData.url;
      if (!url) {
        throw new Error("The upload did not return a URL");
      }
      onChange(url);
      toast.add({ type: "success", title: "Image uploaded" });
    } catch (error) {
      toast.add({
        type: "error",
        title: "Upload failed",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-start gap-3">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed bg-muted/40">
          {value ? (
            // biome-ignore lint/performance/noImgElement: admin preview of arbitrary hosted URLs
            <img
              src={value}
              alt=""
              width={96}
              height={96}
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col items-start gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? <Spinner /> : <UploadIcon className="size-4" />}
            {uploadButtonLabel(isUploading, !!value)}
          </Button>
          {!!value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={isUploading}
              onClick={() => onChange("")}
            >
              <TrashIcon className="size-4" />
              Remove
            </Button>
          )}
          {!!hint && (
            <p className="max-w-64 text-muted-foreground text-xs">{hint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
