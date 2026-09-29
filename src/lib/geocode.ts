export interface GeoResult {
  lat: number;
  lng: number;
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
