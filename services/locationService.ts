import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface UserLocation {
  lat: number;
  lng: number;
  address?: string;
}

export class LocationService {
  // Request location permission and get current location
  static async getCurrentLocation(): Promise<UserLocation | null> {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location permission is required to receive nearby shop notifications. Please enable location access in settings.',
          [{ text: 'OK' }]
        );
        return null;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userLocation: UserLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      // Try to get address (reverse geocoding)
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          userLocation.address = [
            address.street,
            address.city,
            address.region,
            address.postalCode,
          ].filter(Boolean).join(', ');
        }
      } catch (error) {
        console.log('Could not get address:', error);
      }

      return userLocation;
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Could not get your current location. Please try again.',
        [{ text: 'OK' }]
      );
      return null;
    }
  }

  // Watch location changes (for real-time updates)
  static async watchLocation(
    callback: (location: UserLocation) => void,
    options?: {
      accuracy?: Location.Accuracy;
      timeInterval?: number;
      distanceInterval?: number;
    }
  ): Promise<Location.LocationSubscription | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return null;
      }

      return await Location.watchPositionAsync(
        {
          accuracy: options?.accuracy || Location.Accuracy.Balanced,
          timeInterval: options?.timeInterval || 30000, // 30 seconds
          distanceInterval: options?.distanceInterval || 100, // 100 meters
        },
        async (location) => {
          const userLocation: UserLocation = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };

          // Try to get address
          try {
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });

            if (reverseGeocode.length > 0) {
              const address = reverseGeocode[0];
              userLocation.address = [
                address.street,
                address.city,
                address.region,
                address.postalCode,
              ].filter(Boolean).join(', ');
            }
          } catch (error) {
            console.log('Could not get address:', error);
          }

          callback(userLocation);
        }
      );
    } catch (error) {
      console.error('Error watching location:', error);
      return null;
    }
  }

  // Check if location services are enabled
  static async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  // Calculate distance between two points using Haversine formula
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }
}
