const EARTH_RADIUS_KM = 6371.0;

/**
 * Validates that latitude and longitude fall within legal spherical coordinates.
 * Handles both number and valid numeric string inputs.
 */
export function isValidCoordinate(lat: unknown, lon: unknown): boolean {
  const numLat = Number(lat);
  const numLon = Number(lon);

  return (
    typeof lat !== 'boolean' &&
    typeof lon !== 'boolean' &&
    !Number.isNaN(numLat) &&
    !Number.isNaN(numLon) &&
    numLat >= -90 &&
    numLat <= 90 &&
    numLon >= -180 &&
    numLon <= 180
  );
}

/**
 * Computes Great-Circle distance between two coordinates using the Haversine formula.
 * Returns distance in kilometers rounded to two decimal places.
 */
export function calculateDistanceKm(
  lat1: number | string,
  lon1: number | string,
  lat2: number | string,
  lon2: number | string
): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return 0;
  }

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  const toRad = (degree: number) => (degree * Math.PI) / 180;

  const dLat = toRad(nLat2 - nLat1);
  const dLon = toRad(nLon2 - nLon1);

  const radLat1 = toRad(nLat1);
  const radLat2 = toRad(nLat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  return parseFloat((EARTH_RADIUS_KM * c).toFixed(2));
}

/**
 * Returns bounding box coordinates [minLat, maxLat, minLon, maxLon]
 * for database geospatial pre-filtering before fine Haversine sorting.
 */
export function getBoundingBox(
  lat: number | string,
  lon: number | string,
  radiusKm: number | string
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const nLat = Number(lat);
  const nLon = Number(lon);
  const nRadius = Math.max(0, Number(radiusKm) || 0);

  if (!isValidCoordinate(nLat, nLon)) {
    return { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
  }

  const dLat = (nRadius / EARTH_RADIUS_KM) * (180 / Math.PI);
  const cosLat = Math.cos((nLat * Math.PI) / 180);

  // Prevent division by zero near the Earth's poles
  const dLon =
    Math.abs(cosLat) > 0.0001
      ? ((nRadius / EARTH_RADIUS_KM) * (180 / Math.PI)) / Math.abs(cosLat)
      : 180;

  return {
    minLat: parseFloat(Math.max(-90, nLat - dLat).toFixed(4)),
    maxLat: parseFloat(Math.min(90, nLat + dLat).toFixed(4)),
    minLon: parseFloat(Math.max(-180, nLon - dLon).toFixed(4)),
    maxLon: parseFloat(Math.min(180, nLon + dLon).toFixed(4)),
  };
}

export default {
  isValidCoordinate,
  calculateDistanceKm,
  getBoundingBox,
};