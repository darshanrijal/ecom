"use client";

import { trpc } from "@/__rpc/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { TrashIcon } from "lucide-react";
import type { ReactNode } from "react";

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function ImageCleanupCard() {
  const usage = trpc.admin.storageUsage.useQuery();

  const sweep = trpc.admin.sweepImages.useMutation({
    onSuccess: (result) => {
      toast.add({
        type: "success",
        title: "Unused images cleaned",
        description: `Scanned ${result.scanned} files, deleted ${result.deleted} unused.`,
      });
      usage.refetch();
    },
    onError: (error) => {
      toast.add({
        type: "error",
        title: "Cleanup failed",
        description: error.message,
      });
    },
  });

  const storagePercent =
    usage.data && usage.data.limitBytes > 0
      ? Math.min(100, (usage.data.totalBytes / usage.data.limitBytes) * 100)
      : null;

  let storageSummary: ReactNode;
  if (usage.isPending) {
    storageSummary = <Skeleton className="mt-4 h-16 rounded-xl" />;
  } else if (usage.data) {
    storageSummary = (
      <div className="mt-4 space-y-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">
            {formatBytes(usage.data.totalBytes)} used
          </span>
          <span className="text-muted-foreground">
            {formatBytes(usage.data.limitBytes)} limit
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${storagePercent ?? 0}%` }}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          {usage.data.filesUploaded} files on UploadThing.
        </p>
      </div>
    );
  } else {
    storageSummary = (
      <p className="mt-4 text-muted-foreground text-sm">
        Storage usage is unavailable right now.
      </p>
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg">Image storage</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Hosted on UploadThing. Sweep deletes images that no product, SKU or
            avatar uses.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={sweep.isPending || usage.isPending}
          onClick={() => sweep.mutate()}
        >
          {sweep.isPending ? <Spinner /> : <TrashIcon className="size-4" />}
          {sweep.isPending ? "Sweeping…" : "Sweep unused images"}
        </Button>
      </div>

      {storageSummary}
    </section>
  );
}
