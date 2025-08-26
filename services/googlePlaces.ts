import { Platform } from 'react-native';
import * as Location from 'expo-location';

// GoMaps Pro API configuration (drop-in replacement for Google Maps API)
const GOMAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export interface PlaceDetails {
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
  formattedAddress: string;
}

export interface PlacePrediction {
  description: string;
  placeId: string;
  structuredFormatting: {
    mainText: string;
    secondaryText: string;
  };
}

export class GoMapsProService {
  private static readonly BASE_URL = 'https://maps.gomaps.pro/maps/api';

  /**
   * Search for places using autocomplete
   */
  static async searchPlaces(query: string, location?: { lat: number; lng: number }): Promise<PlacePrediction[]> {
    if (!GOMAPS_API_KEY) {
      throw new Error('GoMaps Pro API key is not configured');
    }

    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      let url = `${this.BASE_URL}/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOMAPS_API_KEY}`;
      
      // Add location bias if provided
      if (location) {
        url += `&location=${location.lat},${location.lng}&radius=50000`;
      }

      // Add country restriction (optional - you can modify this based on your needs)
      url += '&components=country:in'; // Restricting to India, change as needed

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.predictions.map((prediction: any) => ({
          description: prediction.description,
          placeId: prediction.place_id,
          structuredFormatting: {
            mainText: prediction.structured_formatting?.main_text || '',
            secondaryText: prediction.structured_formatting?.secondary_text || '',
          },
        }));
      } else {
        console.error('GoMaps Pro API error:', data.status, data.error_message);
        return [];
      }
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a place using its Place ID
   */
  static async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    if (!GOMAPS_API_KEY) {
      throw new Error('GoMaps Pro API key is not configured');
    }

    try {
      const url = `${this.BASE_URL}/place/details/json?place_id=${placeId}&fields=formatted_address,geometry&key=${GOMAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        const result = data.result;
        return {
          address: result.formatted_address,
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          placeId: placeId,
          formattedAddress: result.formatted_address,
        };
      } else {
        console.error('GoMaps Pro Details API error:', data.status, data.error_message);
        return null;
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Reverse geocoding - get address from coordinates
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    if (!GOMAPS_API_KEY) {
      throw new Error('GoMaps Pro API key is not configured');
    }

    try {
      const url = `${this.BASE_URL}/geocode/json?latlng=${latitude},${longitude}&key=${GOMAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      } else {
        console.error('Reverse geocoding error:', data.status, data.error_message);
        return null;
      }
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Get current location using device GPS
   */
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      if (Platform.OS === 'web') {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        });
      } else {
        // For React Native, use expo-location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission not granted');
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        });

        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }
}
