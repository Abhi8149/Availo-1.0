import { OneSignal } from 'react-native-onesignal';
import { Platform } from 'react-native';

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID!;
const ONESIGNAL_REST_API_KEY = process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY!;

export class OneSignalService {
  static initialize() {
    if (!ONESIGNAL_APP_ID) {
      console.warn('⚠️ OneSignal App ID not found in environment variables');
      return;
    }

    console.log('🚀 Initializing OneSignal with App ID:', ONESIGNAL_APP_ID.substring(0, 8) + '...');

    // Initialize OneSignal
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Request notification permission
    OneSignal.Notifications.requestPermission(true);
    console.log('📱 OneSignal: Requested notification permission');

    // Set up notification handlers
    this.setupNotificationHandlers();
    console.log('✅ OneSignal: Initialization complete');
  }

  static setupNotificationHandlers() {
    // Handle notification opened
    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('OneSignal: notification clicked:', event);
      const { notification } = event;
      if (notification.additionalData) {
        this.handleNotificationData(notification.additionalData);
      }
    });

    // Handle notification received while app is in foreground
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      console.log('OneSignal: notification received in foreground:', event);
      // Display the notification
      event.getNotification().display();
    });
  }

  static handleNotificationData(additionalData: any) {
    // Handle different types of notifications
    if (additionalData.type === 'advertisement') {
      console.log('Navigate to advertisement:', additionalData.advertisementId);
      // You can add navigation logic here
    } else if (additionalData.type === 'shop') {
      console.log('Navigate to shop:', additionalData.shopId);
      // You can add navigation logic here
    }
  }

  // Get user's OneSignal Player ID
  static async getPlayerId(): Promise<string | null> {
    try {
      console.log('🔄 OneSignal: Getting player ID...');
      const deviceState = await OneSignal.User.getOnesignalId();
      console.log('📱 OneSignal: Player ID result:', deviceState);
      return deviceState;
    } catch (error) {
      console.error('❌ OneSignal: Error getting player ID:', error);
      return null;
    }
  }

  // Set user tags for targeting
  static setUserTags(tags: Record<string, string>) {
    OneSignal.User.addTags(tags);
  }

  // Send notification to specific player IDs
  static async sendNotificationToPlayers(
    playerIds: string[],
    title: string,
    message: string,
    additionalData?: Record<string, any>
  ) {
    try {
      if (!ONESIGNAL_REST_API_KEY) {
        throw new Error('OneSignal REST API key not found');
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          include_player_ids: playerIds,
          headings: { en: title },
          contents: { en: message },
          data: additionalData,
          android_accent_color: 'FF9C27B0',
          small_icon: 'ic_notification',
          large_icon: 'ic_launcher',
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`OneSignal API error: ${result.errors?.[0] || 'Unknown error'}`);
      }

      return {
        success: true,
        id: result.id,
        recipients: result.recipients,
        errors: result.errors || [],
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send notification to all users within a radius
  static async sendLocationBasedNotification(
    lat: number,
    lng: number,
    radius: number,
    title: string,
    message: string,
    additionalData?: Record<string, any>
  ) {
    try {
      if (!ONESIGNAL_REST_API_KEY) {
        throw new Error('OneSignal REST API key not found');
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          included_segments: ['All'],
          filters: [
            {
              field: 'location',
              radius: radius * 1000, // Convert km to meters
              lat: lat,
              long: lng,
            },
            {
              operator: 'AND',
            },
            {
              field: 'tag',
              key: 'role',
              relation: '=',
              value: 'customer',
            },
          ],
          headings: { en: title },
          contents: { en: message },
          data: additionalData,
          android_accent_color: 'FF9C27B0',
          small_icon: 'ic_notification',
          large_icon: 'ic_launcher',
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`OneSignal API error: ${result.errors?.[0] || 'Unknown error'}`);
      }

      return {
        success: true,
        id: result.id,
        recipients: result.recipients,
        errors: result.errors || [],
      };
    } catch (error) {
      console.error('Error sending location-based notification:', error);
      throw error;
    }
  }

  // Update user location in OneSignal
  static setUserLocation(lat: number, lng: number) {
    try {
      console.log('📍 OneSignal: Setting user location:', { lat, lng });
      OneSignal.Location.setShared(true);
      // Note: OneSignal will automatically get the device location when setShared(true) is called
      console.log('✅ OneSignal: Location sharing enabled');
    } catch (error) {
      console.error('❌ OneSignal: Error setting location:', error);
    }
  }
}
