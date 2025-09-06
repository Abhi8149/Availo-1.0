import { OneSignal } from 'react-native-onesignal';
import { Platform } from 'react-native';

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID!;
const ONESIGNAL_REST_API_KEY = process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY!;
console.log('OneSingal Id in oneSingalService',ONESIGNAL_APP_ID)
console.log('OneSingal Rest API key in oneSingalService',ONESIGNAL_REST_API_KEY)

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
    const permission=OneSignal.Notifications.requestPermission(true);
    console.log('📱 OneSignal: Requested notification permission',permission);

    // Set up notification handlers
    this.setupNotificationHandlers();
    console.log('✅ OneSignal: Initialization complete');
  }

  static setupNotificationHandlers() {
    console.log('🔔 Setting up OneSignal notification handlers...');
    
    // Handle notification opened
    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('🔔 OneSignal: notification clicked!', JSON.stringify(event, null, 2));
      const { notification, result } = event;
      
      console.log('🔔 Notification data:', notification);
      console.log('🔔 Result data:', result);
      console.log('🔔 Additional data:', notification.additionalData);
      
      // Handle action button clicks
      if (result.actionId) {
        console.log('🔘 Notification action clicked:', result.actionId);
        this.handleActionButtonClick(result.actionId, notification.additionalData);
      } else {
        // Handle regular notification click
        console.log('🔔 Regular notification click detected');
        if (notification.additionalData) {
          this.handleNotificationData(notification.additionalData);
        } else {
          console.warn('⚠️ No additional data found in notification');
        }
      }
    });

    // Handle notification received while app is in foreground
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      console.log('🔔 OneSignal: notification received in foreground:', event);
      // Display the notification
      event.getNotification().display();
    });
    
    console.log('✅ OneSignal notification handlers setup complete');
  }

  static handleActionButtonClick(actionId: string, additionalData: any) {
    console.log('🔘 Handling action button click:', actionId, additionalData);
    
    if (actionId === 'view_offer' && additionalData?.type === 'advertisement') {
      // Navigate to advertisement (same as regular click)
      this.handleNotificationData(additionalData);
    } else if (actionId === 'get_directions' && additionalData?.latitude && additionalData?.longitude) {
      // Open directions to the shop
      const { latitude, longitude } = additionalData;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      
      // Try to open in Google Maps app, fallback to browser
      import('expo-linking').then(({ default: Linking }) => {
        Linking.openURL(url).catch((err) => {
          console.error('❌ Error opening directions:', err);
        });
      });
    }
  }

  static handleNotificationData(additionalData: any) {
    console.log('🔔 Handling notification data:', JSON.stringify(additionalData, null, 2));
    
    // Handle different types of notifications
    if (additionalData.type === 'advertisement') {
      console.log('📱 Navigate to advertisement:', additionalData.advertisementId);
      
      // Store the advertisement data for navigation
      this.pendingAdvertisementNavigation = {
        advertisementId: additionalData.advertisementId,
        shopId: additionalData.shopId,
        shopName: additionalData.shopName,
        hasDiscount: additionalData.hasDiscount,
        discountPercentage: additionalData.discountPercentage,
        discountText: additionalData.discountText,
        latitude: additionalData.latitude,
        longitude: additionalData.longitude,
      };
      
      console.log('📝 Stored navigation data:', this.pendingAdvertisementNavigation);
      
      // Set a flag that the app can check
      this.shouldShowNotifications = true;
      console.log('🚩 Set shouldShowNotifications to true');
      
      // Trigger a custom event for the app to listen to
      if (this.notificationNavigationCallback) {
        console.log('📞 Calling notification navigation callback...');
        this.notificationNavigationCallback(this.pendingAdvertisementNavigation);
      } else {
        console.warn('⚠️ No notification navigation callback set! Data will be pending for CustomerHome.');
        console.log('📋 Navigation data stored for when CustomerHome mounts');
      }
      
    } else if (additionalData.type === 'new_order') {
      console.log('🛒 New order notification received:', additionalData.orderId);
      
      // Store the order data for navigation
      this.pendingOrderNavigation = {
        orderId: additionalData.orderId,
        shopId: additionalData.shopId,
        customerId: additionalData.customerId,
        totalAmount: additionalData.totalAmount,
        orderType: additionalData.orderType,
      };
      
      console.log('📝 Stored order navigation data:', this.pendingOrderNavigation);
      
      // Set a flag that the app can check
      this.shouldShowOrders = true;
      console.log('🚩 Set shouldShowOrders to true');
      
      // Trigger callback for order navigation
      if (this.orderNavigationCallback) {
        console.log('📞 Calling order navigation callback...');
        this.orderNavigationCallback(this.pendingOrderNavigation);
      } else {
        console.warn('⚠️ No order navigation callback set! Data will be pending for ShopkeeperHome.');
        console.log('📋 Order navigation data stored for when ShopkeeperHome mounts');
      }
      
    } else if (additionalData.type === 'shop') {
      console.log('🏪 Navigate to shop:', additionalData.shopId);
      // Handle shop navigation logic here
    } else if (additionalData.type === 'order') {
      console.log('📦 Navigate to order:', additionalData.orderId);
      // Handle order navigation logic here
    } else {
      console.warn('⚠️ Unknown notification type:', additionalData.type);
    }
  }

  // Store pending navigation data
  static pendingAdvertisementNavigation: any = null;
  static pendingOrderNavigation: any = null;
  static shouldShowNotifications: boolean = false;
  static shouldShowOrders: boolean = false;
  static notificationNavigationCallback: ((data: any) => void) | null = null;
  static orderNavigationCallback: ((data: any) => void) | null = null;

  // Method to set navigation callback
  static setNotificationNavigationCallback(callback: ((data: any) => void) | null) {
    console.log('📞 Setting notification navigation callback...');
    this.notificationNavigationCallback = callback;
    
    // If there's pending navigation data and a callback is being set, trigger it immediately
    if (callback && this.hasPendingNavigation()) {
      console.log('📋 Found pending navigation data, triggering callback immediately');
      const pendingData = this.getPendingNavigationData();
      if (pendingData) {
        setTimeout(() => {
          console.log('📞 Calling callback with pending data:', pendingData);
          callback(pendingData);
        }, 100); // Small delay to ensure the component is ready
      }
    }
  }

  // Method to set order navigation callback
  static setOrderNavigationCallback(callback: ((data: any) => void) | null) {
    console.log('📞 Setting order navigation callback...');
    this.orderNavigationCallback = callback;
    
    // If there's pending order data and a callback is being set, trigger it immediately
    if (callback && this.hasPendingOrderNavigation()) {
      console.log('📋 Found pending order data, triggering callback immediately');
      const pendingData = this.getPendingOrderData();
      if (pendingData) {
        setTimeout(() => {
          console.log('📞 Calling order callback with pending data:', pendingData);
          callback(pendingData);
        }, 100); // Small delay to ensure the component is ready
      }
    }
  }

  // Method to clear pending navigation
  static clearPendingNavigation() {
    this.pendingAdvertisementNavigation = null;
    this.shouldShowNotifications = false;
  }

  // Method to clear pending order navigation
  static clearPendingOrderNavigation() {
    this.pendingOrderNavigation = null;
    this.shouldShowOrders = false;
  }

  // Method to check if there's pending navigation
  static hasPendingNavigation(): boolean {
    return this.shouldShowNotifications && this.pendingAdvertisementNavigation !== null;
  }

  // Method to check if there's pending order navigation
  static hasPendingOrderNavigation(): boolean {
    return this.shouldShowOrders && this.pendingOrderNavigation !== null;
  }

  // Method to get pending navigation data
  static getPendingNavigationData() {
    return this.pendingAdvertisementNavigation;
  }

  // Method to get pending order data
  static getPendingOrderData() {
    return this.pendingOrderNavigation;
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

  // Check if user has granted notification permissions
  static async hasNotificationPermission(): Promise<boolean> {
    try {
      const permission = await OneSignal.Notifications.getPermissionAsync();
      console.log('🔔 OneSignal: Current notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('❌ OneSignal: Error checking notification permission:', error);
      return false;
    }
  }

  // Check if user is subscribed to notifications
  static async isSubscribed(): Promise<boolean> {
    try {
      // Check if user has opted in to notifications
      const optedIn = await OneSignal.User.pushSubscription.getOptedIn();
      console.log('📲 OneSignal: User subscription status (opted in):', optedIn);
      return optedIn;
    } catch (error) {
      console.error('❌ OneSignal: Error checking subscription status:', error);
      return false;
    }
  }

  // Get comprehensive notification status
  static async getNotificationStatus(): Promise<{
    hasPermission: boolean;
    isSubscribed: boolean;
    playerId: string | null;
    canReceiveNotifications: boolean;
  }> {
    try {
      const [hasPermission, isSubscribed, playerId] = await Promise.all([
        this.hasNotificationPermission(),
        this.isSubscribed(),
        this.getPlayerId()
      ]);

      const canReceiveNotifications = hasPermission && isSubscribed && !!playerId;

      const status = {
        hasPermission,
        isSubscribed,
        playerId,
        canReceiveNotifications
      };

      console.log('📊 OneSignal: Complete notification status:', status);
      return status;
    } catch (error) {
      console.error('❌ OneSignal: Error getting notification status:', error);
      return {
        hasPermission: false,
        isSubscribed: false,
        playerId: null,
        canReceiveNotifications: false
      };
    }
  }

  // Request notification permission if not granted
  static async requestNotificationPermission(): Promise<boolean> {
    try {
      console.log('🔔 OneSignal: Requesting notification permission...');
      const granted = await OneSignal.Notifications.requestPermission(true);
      console.log('📱 OneSignal: Permission request result:', granted);
      return granted;
    } catch (error) {
      console.error('❌ OneSignal: Error requesting permission:', error);
      return false;
    }
  }

  // Enable/disable notifications (subscription)
  static async setNotificationSubscription(enabled: boolean): Promise<void> {
    try {
      console.log('🔄 OneSignal: Setting notification subscription to:', enabled);
      if (enabled) {
        OneSignal.User.pushSubscription.optIn();
      } else {
        OneSignal.User.pushSubscription.optOut();
      }
      console.log('✅ OneSignal: Subscription updated successfully');
    } catch (error) {
      console.error('❌ OneSignal: Error updating subscription:', error);
      throw error;
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
