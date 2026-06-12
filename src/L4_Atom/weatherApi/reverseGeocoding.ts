const COORDINATE_LABEL_PATTERN = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/;
const LOCATION_FIELDS = [
  'city',
  'town',
  'village',
  'municipality',
  'hamlet',
  'suburb',
  'neighbourhood',
  'county',
  'state',
  'region',
  'country',
] as const;

type NominatimAddress = Partial<Record<(typeof LOCATION_FIELDS)[number], string>>;

export interface NominatimReverseResponse {
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
}

function cleanLocationName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const name = value.trim();
  return name && !isCoordinateLocationLabel(name) ? name : null;
}

export function isCoordinateLocationLabel(label: string): boolean {
  return COORDINATE_LABEL_PATTERN.test(label.trim());
}

export function formatTimezoneLocation(timezone: string | null | undefined): string {
  const name = cleanLocationName(timezone?.split('/').at(-1)?.replaceAll('_', ' '));
  return name ?? 'Local';
}

export function pickReverseGeocodedLocationName(input: NominatimReverseResponse): string | null {
  for (const field of LOCATION_FIELDS) {
    const value = cleanLocationName(input.address?.[field]);
    if (value) {
      return value;
    }
  }

  return cleanLocationName(input.name) ?? cleanLocationName(input.display_name?.split(',')[0]);
}

export async function fetchReverseGeocodedLocationLabel(
  latitude: number,
  longitude: number,
  fetcher: typeof fetch = fetch,
  language = 'en',
  timeoutMs = 4_000,
): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('zoom', '10');
  url.searchParams.set('addressdetails', '1');

  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timer = controller ? globalThis.setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetcher(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': language,
      },
      signal: controller?.signal,
    });

    if (!response.ok) {
      return null;
    }

    return pickReverseGeocodedLocationName((await response.json()) as NominatimReverseResponse);
  } catch {
    return null;
  } finally {
    if (timer !== null) {
      globalThis.clearTimeout(timer);
    }
  }
}
