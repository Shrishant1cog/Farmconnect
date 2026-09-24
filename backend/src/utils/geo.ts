const EARTH_RADIUS_KM = 6371.0;

/**
 * Validates that latitude and longitude fall within legal spherical coordinates.
 */
export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Computes Great-Circle distance using the Haversine formula.
 * Returns distance in kilometers rounded to two decimal places.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return 0;
  }

  const toRad = (degree: number) => degree * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return parseFloat((EARTH_RADIUS_KM * c).toFixed(2));
}

/**
 * Returns bounding box coordinates [minLat, maxLat, minLon, maxLon]
 * for fast database pre-filtering before Haversine sorting.
 */
export function getBoundingBox(
  lat: number,
  lon: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const dLat = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const dLon =
    ((radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI)) /
    Math.cos((lat * Math.PI) / 180);

  return {
    minLat: parseFloat((lat - dLat).toFixed(4)),
    maxLat: parseFloat((lat + dLat).toFixed(4)),
    minLon: parseFloat((lon - dLon).toFixed(4)),
    maxLon: parseFloat((lon + dLon).toFixed(4)),
  };
}