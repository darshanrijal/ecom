"use client";

import { LocateFixedIcon, MapPinIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * The delivery-location box under the address fields. The coordinate inputs
 * are hidden and the address itself is geocoded automatically, so this box
 * only carries: an explanation of how the delivery point is found, the manual
 * "use my location" escape hatch (which also fills in the address), and the
 * error banner when an address can't be placed on the map.
 */
export function LocationBox({
  geocoding,
  coordsManual,
  coordsError,
  locating,
  onLocate,
}: {
  geocoding: boolean;
  coordsManual: boolean;
  coordsError: boolean;
  locating: boolean;
  onLocate: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 sm:col-span-2",
        coordsError ? "border-destructive/50 bg-destructive/5" : "bg-muted/40"
      )}
    >
      <div className="flex items-start gap-2 text-sm">
        <MapPinIcon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            coordsError ? "text-destructive" : "text-muted-foreground"
          )}
        />
        {coordsError ? (
          <p className="font-medium text-destructive">
            We couldn&apos;t find that address. Check the street address, city
            and province are correct — or use your location — then place the
            order again.
          </p>
        ) : (
          <p className="text-muted-foreground">
            {coordsManual
              ? "Using your current location as the delivery point — check the address details above and correct anything that's off."
              : "We find the delivery point from your address automatically — or use your location instead."}
            {geocoding ? " Finding…" : ""}
            {locating ? " Locating you…" : ""}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={locating}
        onClick={onLocate}
      >
        {locating ? <Spinner /> : <LocateFixedIcon className="size-4" />}
        Use my location
      </Button>
    </div>
  );
}
