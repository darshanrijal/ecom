"use client";

import { cn } from "@/lib/utils";
import { PackageOpenIcon } from "lucide-react";
import Image from "next/image";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className }: ProductImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex aspect-square items-center justify-center rounded-lg bg-muted text-muted-foreground",
          className
        )}
      >
        <PackageOpenIcon className="size-10" />
      </div>
    );
  }

  return (
    <div className={cn("relative aspect-square", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="rounded-lg object-cover"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      />
    </div>
  );
}
