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
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const fallback = `GPS location: ${lat}, ${lng}`;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) return fallback;

    const data = (await response.json()) as NominatimResponse;
    const address = data.address;
    if (!address) return data.display_name ?? fallback;

    const city = address.city ?? address.town ?? address.village;
    const district = address.suburb ?? address.city_district ?? address.district ?? address.neighbourhood ?? address.county;
    const street = [address.road, address.house_number].filter(Boolean).join(' ');
    const parts = [city, district, street].filter((part) => Boolean(part && part.trim()));

    return parts.length > 0 ? parts.join(', ') : data.display_name ?? fallback;
  } catch {
    return fallback;
  }
};
