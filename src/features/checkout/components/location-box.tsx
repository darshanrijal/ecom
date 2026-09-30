"use client";

import { LocateFixedIcon, MapPinIcon, MapPinnedIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * The delivery-location box under the address fields: explains how the
 * drop-off point is found and offers the two ways to set it (geocode the
 * written address, or use the device GPS). The coordinate inputs themselves
 * are hidden — this box is their only visible surface, and it doubles as the
 * error banner when an address can't be placed on the map.
 */
export function LocationBox({
  geocoding,
  coordsManual,
  coordsError,
  canGeocode,
  locating,
  onGeocode,
  onLocate,
}: {
  geocoding: boolean;
  coordsManual: boolean;
  coordsError: boolean;
  canGeocode: boolean;
  locating: boolean;
  onGeocode: () => void;
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
              ? "Using the point you selected — “Fill from address” re-finds it from the written address."
              : "We find the delivery point from your address automatically — or use a button to set it yourself."}
            {geocoding ? " Finding…" : ""}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={geocoding || !canGeocode}
          onClick={onGeocode}
        >
          {geocoding ? <Spinner /> : <MapPinnedIcon className="size-4" />}
          Fill from address
        </Button>
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
    </div>
  );
}
