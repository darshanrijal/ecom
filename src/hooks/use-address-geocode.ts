"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type GeoResult, geocodeAddress } from "@/lib/geocode";

interface UseAddressGeocodeOptions {
  address: string;
  city: string;
  province: string;
  /**
   * True once the user has set coordinates themselves (typed them or used
   * the device GPS) — the hook then stops overwriting them automatically.
   */
  skip: boolean;
  onResult: (coords: GeoResult) => void;
}

const DEBOUNCE_MS = 1500;

/**
 * Fills delivery coordinates from the order's address without user
 * interaction: watches the address fields, waits for typing to settle,
 * geocodes them (city + province required), and hands the result to
 * `onResult`. One in-flight request at a time; stale responses are
 * discarded. `geocodeNow` bypasses `skip` for explicit "fill from address"
 * button clicks.
 */
export function useAddressGeocode({
  address,
  city,
  province,
  skip,
  onResult,
}: UseAddressGeocodeOptions) {
  const [geocoding, setGeocoding] = useState(false);
  const lastQueryRef = useRef("");
  const sequenceRef = useRef(0);
  const skipRef = useRef(skip);
  const onResultRef = useRef(onResult);

  skipRef.current = skip;
  onResultRef.current = onResult;

  const ready = city.trim() !== "" && province.trim() !== "";
  const query = ready
    ? [address.trim(), city.trim(), province.trim(), "Nepal"]
        .filter(Boolean)
        .join(", ")
    : "";

  const run = useCallback(async (target: string) => {
    const sequence = sequenceRef.current + 1;
    sequenceRef.current = sequence;
    setGeocoding(true);
    try {
      const result = await geocodeAddress(target);
      if (result && sequenceRef.current === sequence) {
        lastQueryRef.current = target;
        onResultRef.current(result);
      }
    } finally {
      if (sequenceRef.current === sequence) {
        setGeocoding(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!query || skip || query === lastQueryRef.current) {
      return;
    }
    const timer = setTimeout(() => {
      // Re-check at fire time — coordinates may have been entered manually
      // while the debounce window was open.
      if (skipRef.current || query === lastQueryRef.current) {
        return;
      }
      run(query);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, skip, run]);

  const geocodeNow = useCallback(async () => {
    if (!query) {
      return false;
    }
    await run(query);
    return lastQueryRef.current === query;
  }, [query, run]);

  return { geocoding, geocodeNow, canGeocode: query !== "" };
}
