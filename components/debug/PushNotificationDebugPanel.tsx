import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function PushNotificationDebugPanel() {
  const [isLoading, setIsLoading] = useState(false);
  
  // Get debug info about OneSignal users
  const oneSignalUsers = useQuery(api.users.debugOneSignalUsers);
  const sendTestNotification = useAction(api.advertisements.sendPushNotificationToNearbyUsers);

  const handleTestNotification = async () => {
    if (!oneSignalUsers || oneSignalUsers.length === 0) {
      Alert.alert('Error', 'No users found to send notifications to');
      return;
    }

    setIsLoading(true);
    try {
      // Find a test shop (you might need to replace with actual shop data)
      const testShopLat = 28.6139; // Delhi coordinates as example
      const testShopLng = 77.2090;
      
      const result = await sendTestNotification({
        advertisementId: "test_ad_id" as any, // This would be a real advertisement ID
        shopId: "test_shop_id" as any,       // This would be a real shop ID
        shopLat: testShopLat,
        shopLng: testShopLng,
        radiusKm: 50, // Large radius for testing
      });

      Alert.alert(
        'Test Result',
        `Success: ${result.success}\nSent to: ${result.sentCount} users\nError: ${result.error || 'None'}`
      );
    } catch (error) {
      Alert.alert('Error', `Failed to send test notification: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const enabledUsers = oneSignalUsers?.filter(user => 
    user.hasOneSignalId && user.pushEnabled && user.hasLocation && user.role === 'customer'
  ) || [];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Push Notification Debug Panel</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>OneSignal Users Summary</Text>
        <Text style={styles.stat}>Total Users: {oneSignalUsers?.length || 0}</Text>
        <Text style={styles.stat}>Users with OneSignal ID: {oneSignalUsers?.filter(u => u.hasOneSignalId).length || 0}</Text>
        <Text style={styles.stat}>Users with Location: {oneSignalUsers?.filter(u => u.hasLocation).length || 0}</Text>
        <Text style={styles.stat}>Push Enabled: {oneSignalUsers?.filter(u => u.pushEnabled).length || 0}</Text>
        <Text style={styles.stat}>Ready for Notifications: {enabledUsers.length}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Details</Text>
        {oneSignalUsers?.map((user, index) => (
          <View key={user._id} style={styles.userCard}>
            <Text style={styles.userName}>{user.name} ({user.role})</Text>
            <Text style={styles.userDetail}>
              Location: {user.hasLocation ? `${user.location?.lat?.toFixed(4)}, ${user.location?.lng?.toFixed(4)}` : '❌ Missing'}
            </Text>
            <Text style={styles.userDetail}>
              OneSignal: {user.hasOneSignalId ? `✅ ${user.oneSignalId}` : '❌ Missing'}
            </Text>
            <Text style={styles.userDetail}>
              Push Enabled: {user.pushEnabled ? '✅ Yes' : '❌ No'}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.testButton, isLoading && styles.disabledButton]} 
        onPress={handleTestNotification}
        disabled={isLoading || enabledUsers.length === 0}
      >
        <Text style={styles.testButtonText}>
          {isLoading ? 'Sending...' : `Send Test Notification (${enabledUsers.length} users)`}
        </Text>
      </TouchableOpacity>

      <Text style={styles.instructions}>
        Instructions:{'\n'}
        1. Make sure users have location data saved{'\n'}
        2. Ensure OneSignal player IDs are captured during login{'\n'}
        3. Check that push notifications are enabled{'\n'}
        4. Verify OneSignal credentials in environment variables
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stat: {
    fontSize: 16,
    marginBottom: 5,
  },
  userCard: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userDetail: {
    fontSize: 14,
    marginBottom: 2,
  },
  testButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
