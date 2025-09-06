import { useState, useEffect } from 'react';
import { OneSignalService } from '../services/oneSignalService';

export interface NotificationNavigationData {
  advertisementId: string;
  shopId: string;
  shopName: string;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountText?: string;
  latitude?: number;
  longitude?: number;
}

export const useNotificationNavigation = () => {
  const [shouldShowNotifications, setShouldShowNotifications] = useState(false);
  const [navigationData, setNavigationData] = useState<NotificationNavigationData | null>(null);

  useEffect(() => {
    console.log('🪝 useNotificationNavigation hook initializing...');
    
    // Set up the callback for OneSignal service
    const callback = (data: NotificationNavigationData) => {
      console.log('🔔 Notification navigation triggered in hook:', data);
      setNavigationData(data);
      setShouldShowNotifications(true);
      console.log('✅ Hook state updated: shouldShowNotifications=true, navigationData set');
    };
    
    console.log('📞 Setting up OneSignal notification callback...');
    OneSignalService.setNotificationNavigationCallback(callback);

    // Check for any pending navigation on mount (this might be redundant now but keeping for safety)
    if (OneSignalService.hasPendingNavigation()) {
      console.log('📋 Found pending navigation on mount (backup check)');
      const pendingData = OneSignalService.getPendingNavigationData();
      if (pendingData) {
        console.log('📝 Setting pending navigation data (backup):', pendingData);
        setNavigationData(pendingData);
        setShouldShowNotifications(true);
      }
    } else {
      console.log('📋 No pending navigation found on mount');
    }

    return () => {
      console.log('🧹 Cleaning up notification navigation hook');
      // Clean up callback
      OneSignalService.notificationNavigationCallback = null;
    };
  }, []);

  const clearNavigation = () => {
    setShouldShowNotifications(false);
    setNavigationData(null);
    OneSignalService.clearPendingNavigation();
  };

  const handleNotificationPress = () => {
    // This will be called when the user wants to see notifications
    setShouldShowNotifications(true);
  };

  return {
    shouldShowNotifications,
    navigationData,
    clearNavigation,
    handleNotificationPress,
  };
};
