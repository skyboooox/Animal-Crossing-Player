export interface OpenMeteoGeocodingResult {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

export interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingResult[];
}

export interface GeocodedPlace {
  latitude: number;
  longitude: number;
  label: string;
}

function compactUnique(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const next = value?.trim();
    if (!next || seen.has(next)) {
      continue;
    }
    seen.add(next);
    result.push(next);
  }
  return result;
}

export function formatGeocodedPlaceLabel(place: OpenMeteoGeocodingResult): string | null {
  const parts = compactUnique([place.name, place.admin1, place.country]);
  return parts.length > 0 ? parts.join(', ') : null;
}

export async function fetchOpenMeteoGeocodedPlace(
  query: string,
  fetcher: typeof fetch = fetch,
  language = 'en',
): Promise<GeocodedPlace | null> {
  const name = query.trim();
  if (!name) {
    return null;
  }

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', language);
  url.searchParams.set('format', 'json');

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo geocoding failed: ${response.status}`);
  }

  const result = ((await response.json()) as OpenMeteoGeocodingResponse).results?.[0];
  const label = result ? formatGeocodedPlaceLabel(result) : null;
  if (!result || typeof result.latitude !== 'number' || typeof result.longitude !== 'number' || !label) {
    return null;
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    label,
  };
}
