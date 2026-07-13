interface NominatimAddress {
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  district?: string;
  county?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

/**
 * Reverse-geocodes GPS coordinates into a human-readable address
 * ("City, District, Street HouseNumber") using OpenStreetMap's free
 * Nominatim API — no API key required, no billing/quota dependency.
 * Falls back to the raw coordinates if the lookup fails.
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const fallback = `${lat}, ${lng}`;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) return fallback;

    const data: NominatimResponse = await response.json();
    const address = data.address;
    if (!address) return data.display_name ?? fallback;

    const city = address.city ?? address.town ?? address.village;
    const district = address.suburb ?? address.city_district ?? address.district ?? address.neighbourhood ?? address.county;
    const street = [address.road, address.house_number].filter(Boolean).join(' ');

    const parts = [city, district, street].filter((part) => Boolean(part && part.trim()));
    if (parts.length === 0) return data.display_name ?? fallback;

    return parts.join(', ');
  } catch {
    return fallback;
  }
};
