"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ImagePlusIcon,
  Link2Icon,
  Loader2Icon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body: form,
  });
  const json = (await response.json().catch(() => null)) as {
    url?: string;
    error?: string;
  } | null;
  if (!response.ok || !json?.url) {
    throw new Error(json?.error ?? "Upload failed. Please try another image.");
  }
  return json.url;
}

interface ProductImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
}

export function ProductImageField({
  value,
  onChange,
  label = "Photo",
  hint,
}: ProductImageFieldProps) {
  const [tab, setTab] = useState<"upload" | "url">(value ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const shownUrl = previewUrl ?? value;

  const pickFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.add({
        title: "Not an image",
        description: "Only image files can be uploaded.",
        type: "error",
      });
      return;
    }
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const url = await uploadImage(file);
      onChange(url);
      toast.add({
        title: "Image uploaded",
        description: "You can review it in the preview below.",
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Couldn't upload image",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      });
    } finally {
      setUploading(false);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
      <div className="relative">
        <div
          className={cn(
            "flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-muted",
            shownUrl ? "" : "border-dashed"
          )}
        >
          {shownUrl ? (
            // Uploaded/selected images are runtime assets, not next/image optimized sources.
            <Image
              src={shownUrl}
              alt=""
              width={160}
              height={160}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImagePlusIcon className="size-6" />
              <span className="px-2 text-center text-xs">No photo yet</span>
            </div>
          )}
        </div>
        {shownUrl ? (
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label="Remove photo"
            className="absolute -top-2 -right-2 rounded-full border bg-background shadow-xs"
            onClick={() => {
              onChange("");
              setTab("upload");
              setPreviewUrl(null);
            }}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="grid content-start gap-3">
        <div>
          <Label>{label}</Label>
          {hint ? (
            <p className="mt-0.5 text-muted-foreground text-xs">{hint}</p>
          ) : null}
        </div>

        <Tabs
          value={tab}
          onValueChange={(next) => setTab(next as "upload" | "url")}
        >
          <TabsList>
            <TabsTrigger value="upload">
              <UploadCloudIcon />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link2Icon />
              Image URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-6 text-center text-sm transition-colors",
                "hover:bg-muted group-hover:bg-muted",
                uploading ? "opacity-60" : ""
              )}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="sr-only"
                disabled={uploading}
                onChange={(event) => {
                  pickFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              {uploading ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <UploadCloudIcon />
                  <span className="font-medium">Choose a file to upload</span>
                  <span className="text-muted-foreground text-xs">
                    PNG, JPG, WEBP, GIF or AVIF · up to 5 MB
                  </span>
                </>
              )}
            </label>
          </TabsContent>

          <TabsContent value="url">
            <Input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://… or /uploads/products/…"
            />
            <p className="mt-1.5 text-muted-foreground text-xs">
              Paste a link to an image hosted elsewhere, or enter a path like{" "}
              <code className="text-foreground">/products/iphone-15.jpg</code>
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
