import { Platform, Linking, Alert } from 'react-native';
import * as Location from 'expo-location';

export interface DirectionsOptions {
  latitude: number;
  longitude: number;
  shopName: string;
  address?: string;
}

export class DirectionsService {
  /**
   * Fast directions - Opens immediately without waiting for current location
   */
  static async openDirectionsFast(options: DirectionsOptions): Promise<void> {
    const { latitude, longitude, shopName } = options;
    
    // Get the most likely URL to work immediately
    const primaryUrl = this.getPrimaryDirectionUrl(latitude, longitude, shopName);
    
    try {
      // Try the primary URL first (fastest)
      const canOpen = await Linking.canOpenURL(primaryUrl);
      if (canOpen) {
        await Linking.openURL(primaryUrl);
        return;
      }
    } catch (error) {
      console.log(`Primary URL failed: ${primaryUrl}`, error);
    }
    
    // If primary fails, try other options
    await this.openDirectionsToDestination(latitude, longitude, shopName);
  }

  /**
   * Get the most likely URL to work on this platform
   */
  private static getPrimaryDirectionUrl(latitude: number, longitude: number, shopName: string): string {
    const encodedShopName = encodeURIComponent(shopName);
    
    if (Platform.OS === 'ios') {
      // Apple Maps is most likely to be installed on iOS
      return `http://maps.apple.com/?daddr=${latitude},${longitude}`;
    } else {
      // Generic geo intent works with most Android map apps
      return `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedShopName})`;
    }
  }

  /**
   * Open directions with current location (slower but more accurate)
   */
  static async openDirectionsWithLocation(options: DirectionsOptions): Promise<void> {
    const { latitude, longitude, shopName } = options;

    try {
      // Check permission first (fast)
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        // Request permission if not granted
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          // Permission denied, use fast method
          await this.openDirectionsFast(options);
          return;
        }
      }

      // Get current location with faster settings
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Faster than high accuracy
      });
      
      const { latitude: currentLat, longitude: currentLng } = currentLocation.coords;

      await this.openDirectionsWithOrigin(
        currentLat,
        currentLng,
        latitude,
        longitude,
        shopName
      );
    } catch (error) {
      console.error('Error getting current location:', error);
      // Fallback to fast method
      await this.openDirectionsFast(options);
    }
  }

  /**
   * Open directions to a location using the best available maps app
   */
  static async openDirections(options: DirectionsOptions): Promise<void> {
    // Use the fast method by default
    await this.openDirectionsFast(options);
  }

  /**
   * Open directions with both origin and destination - OPTIMIZED
   */
  private static async openDirectionsWithOrigin(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    shopName: string
  ): Promise<void> {
    const urls = this.buildDirectionUrls(originLat, originLng, destLat, destLng, shopName);
    
    // Try the most likely URLs first
    for (const url of urls) {
      try {
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
          return;
        }
      } catch (error) {
        continue;
      }
    }

    // Show fallback options if no apps work
    this.showFallbackOptions(destLat, destLng, shopName);
  }

  /**
   * Open directions to destination only (no origin specified) - OPTIMIZED
   */
  private static async openDirectionsToDestination(
    latitude: number,
    longitude: number,
    shopName: string
  ): Promise<void> {
    const urls = this.buildDestinationUrls(latitude, longitude, shopName);
    
    // Try the most likely URLs first, then fallback
    for (const url of urls) {
      try {
        // Quick check without extensive logging
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
          return;
        }
      } catch (error) {
        // Silently continue to next URL
        continue;
      }
    }

    // Show fallback options if no apps work
    this.showFallbackOptions(latitude, longitude, shopName);
  }

  /**
   * Build direction URLs with origin and destination - OPTIMIZED ORDER
   */
  private static buildDirectionUrls(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    shopName: string
  ): string[] {
    if (Platform.OS === 'ios') {
      return [
        // Apple Maps (most likely to work on iOS)
        `http://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}`,
        // Google Maps iOS app
        `comgooglemaps://?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}`,
        // Google Maps web (always works)
        `https://www.google.com/maps/dir/${originLat},${originLng}/${destLat},${destLng}`
      ];
    } else {
      return [
        // Google Maps Android navigation (most likely to work)
        `google.navigation:q=${destLat},${destLng}`,
        // Generic geo intent (works with most map apps)
        `geo:${destLat},${destLng}?q=${destLat},${destLng}(${encodeURIComponent(shopName)})`,
        // Google Maps web (always works)
        `https://www.google.com/maps/dir/${originLat},${originLng}/${destLat},${destLng}`
      ];
    }
  }

  /**
   * Build destination-only URLs - OPTIMIZED ORDER
   */
  private static buildDestinationUrls(
    latitude: number,
    longitude: number,
    shopName: string
  ): string[] {
    const encodedShopName = encodeURIComponent(shopName);
    
    if (Platform.OS === 'ios') {
      return [
        // Apple Maps (most likely to work on iOS)
        `http://maps.apple.com/?daddr=${latitude},${longitude}`,
        // Google Maps iOS app
        `comgooglemaps://?daddr=${latitude},${longitude}`,
        // Google Maps web (always works)
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      ];
    } else {
      return [
        // Generic geo intent (works with most Android map apps)
        `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedShopName})`,
        // Google Maps Android navigation
        `google.navigation:q=${latitude},${longitude}`,
        // Google Maps web (always works)
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      ];
    }
  }

  /**
   * Show fallback options when no maps app can be opened
   */
  private static showFallbackOptions(
    latitude: number,
    longitude: number,
    shopName: string
  ): void {
    Alert.alert(
      "Open Maps",
      "Choose how to get directions:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open in Browser",
          onPress: () => {
            const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
            Linking.openURL(webUrl);
          }
        },
        {
          text: "Copy Coordinates",
          onPress: () => {
            Alert.alert("Coordinates", `${latitude}, ${longitude}\n\nPaste these coordinates into any maps app.`);
          }
        }
      ]
    );
  }

  /**
   * Show options to user for choosing maps app
   */
  static async showDirectionsOptions(options: DirectionsOptions): Promise<void> {
    const { latitude, longitude, shopName } = options;

    Alert.alert(
      "Get Directions",
      `Choose how to get directions to ${shopName}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Maps",
          onPress: () => this.openDirections(options)
        },
        {
          text: "Copy Address",
          onPress: () => {
            // If you want to add copy to clipboard functionality
            Alert.alert("Address", `${latitude}, ${longitude}`);
          }
        }
      ]
    );
  }
}
