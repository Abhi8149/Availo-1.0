// LocationIQ service for geocoding, reverse geocoding, and autocomplete
// Replace <YOUR_LOCATIONIQ_API_KEY> with your actual API key

const LOCATIONIQ_API_KEY = process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY;

export interface PlacePrediction {
  display_name: string;
  place_id: string;
  lat: string;
  lon: string;
}

export class LocationIQService {
  static async searchPlaces(query: string): Promise<PlacePrediction[]> {
    console.log('LocationIQ searchPlaces called with query:', query);
    console.log('LocationIQ API key status:', LOCATIONIQ_API_KEY ? 'Available' : 'Missing');
    if (!LOCATIONIQ_API_KEY) throw new Error('LocationIQ API key is not configured');
    const url = `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(query)}&limit=5&format=json`;
    console.log('LocationIQ API URL:', url.replace(LOCATIONIQ_API_KEY, 'HIDDEN_KEY'));
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch autocomplete results');
    const results = await response.json();
    console.log('LocationIQ searchPlaces results:', results);
    return results;
  }

  static async getPlaceDetails(placeId: string): Promise<PlacePrediction | null> {
    // LocationIQ does not provide a direct place details endpoint, so we use searchPlaces and filter
    // In production, you may want to store lat/lon from autocomplete
    return null;
  }

  static async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    console.log('LocationIQ reverseGeocode called with lat:', lat, 'lon:', lon);
    console.log('LocationIQ API key status:', LOCATIONIQ_API_KEY ? 'Available' : 'Missing');
    if (!LOCATIONIQ_API_KEY) throw new Error('LocationIQ API key is not configured');
    const url = `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json`;
    console.log('LocationIQ reverse geocode URL:', url.replace(LOCATIONIQ_API_KEY, 'HIDDEN_KEY'));
    const response = await fetch(url);
    if (!response.ok) {
      console.log('LocationIQ reverse geocode failed with status:', response.status);
      return null;
    }
    const data = await response.json();
    console.log('LocationIQ reverse geocode result:', data);
    return data.display_name || null;
  }
}
