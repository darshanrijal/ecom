import { NEPAL_PROVINCES } from "@/lib/order-schema";

export interface GeoResult {
  lat: number;
  lng: number;
}

/** Address fields Nominatim returns that we can map onto our form. */
export interface ReverseGeoResult {
  province: string | null;
  city: string | null;
  address: string | null;
}

/**
 * Forward-geocodes a free-text address to coordinates using the free
 * OpenStreetMap Nominatim service (no API key, CORS-enabled). Results are
 * restricted to Nepal. Returns null when nothing matches or the request
 * fails — callers keep whatever coordinates are already set.
 */
export async function geocodeAddress(query: string): Promise<GeoResult | null> {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url =
      "https://nominatim.openstreetmap.org/search" +
      `?format=jsonv2&limit=1&countrycodes=np&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
      },
    });
    if (!response.ok) {
      return null;
    }
    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    const first = data[0] as { lat?: unknown; lon?: unknown };
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Nominatim returns an ISO 3166-2:NP subdivision code alongside the province
 * name. The code is authoritative — the name is unreliable (it comes back as
 * "Bagamati Province", in Nepali script, or as a legacy "Province No. 3"
 * depending on the response).
 */
const ISO_PROVINCE_CODES: Record<string, string> = {
  "NP-P1": "Koshi",
  "NP-P2": "Madhesh",
  "NP-P3": "Bagmati",
  "NP-P4": "Gandaki",
  "NP-P5": "Lumbini",
  "NP-P6": "Karnali",
  "NP-P7": "Sudurpashchim",
};

/** Legacy pre-2015 province numbering, still present in some responses. */
const LEGACY_PROVINCE_NUMBERS: Record<string, string> = {
  1: "Koshi",
  2: "Madhesh",
  3: "Bagmati",
  4: "Gandaki",
  5: "Lumbini",
  6: "Karnali",
  7: "Sudurpashchim",
};

/** "Bagamati Province" / "Province No. 5" / "Koshi" -> "Bagmati". */
const LEGACY_PROVINCE_NUMBER_PATTERN = /province\s*(?:no\.?|number)?\s*(\d+)/i;
const PROVINCE_SUFFIX_PATTERN = /\s*(province|प्रदेश)\s*$/iu;
const DASH_PATTERN = /[–—]/g;

function normalizeProvince(raw: string): string | null {
  const cleaned = raw.replace(DASH_PATTERN, "-").trim();
  if (!cleaned) {
    return null;
  }
  const numbered = LEGACY_PROVINCE_NUMBER_PATTERN.exec(cleaned);
  if (numbered) {
    return LEGACY_PROVINCE_NUMBERS[numbered[1]] ?? null;
  }
  const stripped = cleaned
    .replace(PROVINCE_SUFFIX_PATTERN, "")
    .trim()
    .toLowerCase();
  return (
    NEPAL_PROVINCES.find((province) => province.toLowerCase() === stripped) ??
    null
  );
}

/** Nominatim's placeholder road names carry no delivery information. */
const UNUSABLE_STREETS = new Set([
  "unnamed road",
  "unknown",
  "n/a",
  "-",
  "no road",
]);

function cleanPart(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || UNUSABLE_STREETS.has(trimmed.toLowerCase())) {
    return;
  }
  return trimmed;
}

/** First usable value, ignoring empties and Nominatim placeholders. */
function firstOf(values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const cleaned = cleanPart(value);
    if (cleaned) {
      return cleaned;
    }
  }
}

/** Comma-joined, de-duplicated list — never longer than the DB column. */
function joinParts(parts: Array<string | undefined>, exclude?: string) {
  const seen = new Set<string>();
  const partsOut: string[] = [];
  for (const part of parts) {
    const cleaned = cleanPart(part);
    if (!cleaned) {
      continue;
    }
    const key = cleaned.toLowerCase();
    if (seen.has(key) || (exclude && key === exclude.toLowerCase())) {
      continue;
    }
    seen.add(key);
    partsOut.push(cleaned);
  }
  return partsOut.length === 0 ? null : partsOut.join(", ").slice(0, 300);
}

/**
 * Turns coordinates back into an address — used by "Use my location", so a
 * customer who just pressed the button ends up with a pre-filled province,
 * city and street instead of an empty form. Fields that Nominatim can't
 * answer come back as null and the caller leaves the input alone.
 */
export async function reverseGeocode(
  coords: GeoResult
): Promise<ReverseGeoResult | null> {
  try {
    const url =
      "https://nominatim.openstreetmap.org/reverse" +
      `?format=jsonv2&zoom=18&addressdetails=1&lat=${coords.lat}&lon=${coords.lng}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
      },
    });
    if (!response.ok) {
      return null;
    }
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null) {
      return null;
    }
    const details = (data as { address?: unknown }).address;
    if (typeof details !== "object" || details === null) {
      return null;
    }
    const parts = details as Record<string, unknown>;
    const read = (key: string) => {
      const value = parts[key];
      return typeof value === "string" ? value : undefined;
    };

    const city =
      firstOf([
        read("city"),
        read("town"),
        read("village"),
        read("municipality"),
        read("city_district"),
        read("county"),
      ]) ?? null;
    const province =
      ISO_PROVINCE_CODES[read("ISO3166-2-lvl4") ?? ""] ??
      normalizeProvince(read("state") ?? "");
    const address = joinParts(
      [
        read("road"),
        read("neighbourhood"),
        read("suburb"),
        read("quarter"),
        read("city_district"),
      ],
      city ?? undefined
    );

    if (province === null && city === null && address === null) {
      return null;
    }
    return { province, city, address };
  } catch {
    return null;
  }
}
