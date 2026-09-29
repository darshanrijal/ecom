export interface Coordinates {
  lat: number;
  lng: number;
}

/** Mean Earth radius in kilometres. */
const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle (Haversine) distance between two points, in kilometres. */
export function haversineKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Distance snapshot precision: 3 decimals (one metre). */
export function roundDistanceKm(km: number): number {
  return Math.round(km * 1000) / 1000;
}

/** Money precision used across the store: 2 decimals (one paisa). */
export function roundRupees(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export interface DeliveryQuoteInput {
  /** Store origin; null while the admin has not configured the store location. */
  store: Coordinates | null;
  customer: Coordinates;
  /** Rupees per kilometre; null while the admin has not configured a rate. */
  ratePerKm: number | null;
}

export interface DeliveryQuote {
  distanceKm: number | null;
  deliveryCharge: number;
}

/**
 * Delivery quote: distance is rounded to metres first, then the charge is
 * `distance × rate` rounded to whole paisa (never ceiled), so 4.3 km at
 * Rs. 20/km is exactly Rs. 86. A missing store origin or rate means the
 * delivery is free. The server recomputes this when an order is created —
 * callers must never treat the preview as authoritative.
 */
export function quoteDelivery(input: DeliveryQuoteInput): DeliveryQuote {
  if (!input.store) {
    return { distanceKm: null, deliveryCharge: 0 };
  }

  const distanceKm = roundDistanceKm(haversineKm(input.store, input.customer));

  if (input.ratePerKm === null) {
    return { distanceKm, deliveryCharge: 0 };
  }

  return {
    distanceKm,
    deliveryCharge: roundRupees(distanceKm * input.ratePerKm),
  };
}
