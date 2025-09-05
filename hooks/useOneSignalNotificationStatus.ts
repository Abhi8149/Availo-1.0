import { useState, useEffect, useCallback } from 'react';
import { OneSignalService } from '../services/oneSignalService';

interface NotificationStatus {
  hasPermission: boolean;
  isSubscribed: boolean;
  playerId: string | null;
  canReceiveNotifications: boolean;
}

export function useOneSignalNotificationStatus() {
  const [status, setStatus] = useState<NotificationStatus>({
    hasPermission: false,
    isSubscribed: false,
    playerId: null,
    canReceiveNotifications: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const notificationStatus = await OneSignalService.getNotificationStatus();
      setStatus(notificationStatus);
    } catch (err) {
      console.error('Error checking notification status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await OneSignalService.requestNotificationPermission();
      if (granted) {
        await checkStatus(); // Refresh status after permission change
      }
      return granted;
    } catch (err) {
      console.error('Error requesting permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to request permission');
      return false;
    }
  }, [checkStatus]);

  const toggleSubscription = useCallback(async (): Promise<boolean> => {
    try {
      await OneSignalService.setNotificationSubscription(!status.isSubscribed);
      await checkStatus(); // Refresh status after subscription change
      return true;
    } catch (err) {
      console.error('Error toggling subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle subscription');
      return false;
    }
  }, [status.isSubscribed, checkStatus]);

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    try {
      // First check if we have permission
      if (!status.hasPermission) {
        const granted = await requestPermission();
        if (!granted) return false;
      }
      
      // Then enable subscription if not already enabled
      if (!status.isSubscribed) {
        return await toggleSubscription();
      }
      
      return true;
    } catch (err) {
      console.error('Error enabling notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
      return false;
    }
  }, [status.hasPermission, status.isSubscribed, requestPermission, toggleSubscription]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    // Status
    ...status,
    loading,
    error,
    
    // Actions
    checkStatus,
    requestPermission,
    toggleSubscription,
    enableNotifications,
    
    // Computed values
    needsPermission: !status.hasPermission,
    needsSubscription: status.hasPermission && !status.isSubscribed,
    isFullyEnabled: status.canReceiveNotifications,
  };
}

// Simple function to check if notifications are properly set up
export async function canUserReceiveNotifications(): Promise<boolean> {
  try {
    const status = await OneSignalService.getNotificationStatus();
    return status.canReceiveNotifications;
  } catch (error) {
    console.error('Error checking notification capability:', error);
    return false;
  }
}

// Function to ensure notifications are enabled (requests permission and subscription if needed)
export async function ensureNotificationsEnabled(): Promise<{
  success: boolean;
  needsManualSetup: boolean;
  message: string;
}> {
  try {
    const status = await OneSignalService.getNotificationStatus();
    
    if (status.canReceiveNotifications) {
      return {
        success: true,
        needsManualSetup: false,
        message: 'Notifications are already enabled'
      };
    }
    
    // Try to request permission if not granted
    if (!status.hasPermission) {
      const granted = await OneSignalService.requestNotificationPermission();
      if (!granted) {
        return {
          success: false,
          needsManualSetup: true,
          message: 'Permission denied. Please enable notifications in device settings.'
        };
      }
    }
    
    // Try to enable subscription if not subscribed
    if (!status.isSubscribed) {
      try {
        await OneSignalService.setNotificationSubscription(true);
      } catch (error) {
        return {
          success: false,
          needsManualSetup: true,
          message: 'Failed to enable notification subscription. Please try again.'
        };
      }
    }
    
    // Verify final status
    const finalStatus = await OneSignalService.getNotificationStatus();
    
    return {
      success: finalStatus.canReceiveNotifications,
      needsManualSetup: !finalStatus.canReceiveNotifications,
      message: finalStatus.canReceiveNotifications 
        ? 'Notifications enabled successfully!' 
        : 'Please check your notification settings'
    };
    
  } catch (error) {
    console.error('Error ensuring notifications enabled:', error);
    return {
      success: false,
      needsManualSetup: true,
      message: 'Error setting up notifications. Please try again.'
    };
  }
}
