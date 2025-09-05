import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { OneSignalService } from '../../services/oneSignalService';

interface NotificationStatus {
  hasPermission: boolean;
  isSubscribed: boolean;
  playerId: string | null;
  canReceiveNotifications: boolean;
}

export default function NotificationStatusChecker() {
  const [status, setStatus] = useState<NotificationStatus>({
    hasPermission: false,
    isSubscribed: false,
    playerId: null,
    canReceiveNotifications: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    setLoading(true);
    try {
      const notificationStatus = await OneSignalService.getNotificationStatus();
      setStatus(notificationStatus);
    } catch (error) {
      console.error('Error checking notification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      const granted = await OneSignalService.requestNotificationPermission();
      if (granted) {
        Alert.alert('Success', 'Notification permission granted!');
        checkNotificationStatus(); // Refresh status
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request notification permission.');
    }
  };

  const toggleSubscription = async () => {
    try {
      await OneSignalService.setNotificationSubscription(!status.isSubscribed);
      Alert.alert('Success', `Notifications ${!status.isSubscribed ? 'enabled' : 'disabled'}!`);
      checkNotificationStatus(); // Refresh status
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification subscription.');
    }
  };

  const getStatusIcon = (isEnabled: boolean) => isEnabled ? '✅' : '❌';
  const getStatusText = (isEnabled: boolean) => isEnabled ? 'Enabled' : 'Disabled';

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Checking notification status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Status</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusItem}>
          {getStatusIcon(status.hasPermission)} Permission: {getStatusText(status.hasPermission)}
        </Text>
        
        <Text style={styles.statusItem}>
          {getStatusIcon(status.isSubscribed)} Subscription: {getStatusText(status.isSubscribed)}
        </Text>
        
        <Text style={styles.statusItem}>
          {getStatusIcon(!!status.playerId)} Player ID: {status.playerId ? 'Available' : 'Not Available'}
        </Text>
        
        <View style={styles.overallStatus}>
          <Text style={[
            styles.overallStatusText,
            { color: status.canReceiveNotifications ? '#16A34A' : '#DC2626' }
          ]}>
            {getStatusIcon(status.canReceiveNotifications)} 
            Can Receive Notifications: {getStatusText(status.canReceiveNotifications)}
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {!status.hasPermission && (
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Request Permission</Text>
          </TouchableOpacity>
        )}
        
        {status.hasPermission && (
          <TouchableOpacity style={styles.button} onPress={toggleSubscription}>
            <Text style={styles.buttonText}>
              {status.isSubscribed ? 'Disable' : 'Enable'} Notifications
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.refreshButton} onPress={checkNotificationStatus}>
          <Text style={styles.refreshButtonText}>Refresh Status</Text>
        </TouchableOpacity>
      </View>

      {status.playerId && (
        <View style={styles.playerIdContainer}>
          <Text style={styles.playerIdLabel}>Player ID:</Text>
          <Text style={styles.playerIdText}>{status.playerId}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1F2937',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusItem: {
    fontSize: 16,
    marginBottom: 8,
    color: '#374151',
  },
  overallStatus: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  overallStatusText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  playerIdContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  playerIdLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  playerIdText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
});
