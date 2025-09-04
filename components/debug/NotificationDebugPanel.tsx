import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { OneSignalService } from '../../services/oneSignalService';
import { LocationService } from '../../services/locationService';

export default function NotificationDebugPanel({ userId }: { userId: Id<"users"> }) {
  const [playerIdStatus, setPlayerIdStatus] = useState('Checking...');
  const [locationStatus, setLocationStatus] = useState('Checking...');
  const [nearbyUsers, setNearbyUsers] = useState(0);

  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const user = useQuery(api.users.getUser, { userId });

  useEffect(() => {
    checkOneSignalStatus();
    checkLocationStatus();
  }, []);

  const checkOneSignalStatus = async () => {
    try {
      const playerId = await OneSignalService.getPlayerId();
      setPlayerIdStatus(playerId ? `Active: ${playerId.substring(0, 20)}...` : 'Not available');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setPlayerIdStatus(`Error: ${message}`);
    }
  };

  const checkLocationStatus = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setLocationStatus(`Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`);
        
        // Update location in database
        await updateUserProfile({
          userId,
          location: {
            lat: location.lat,
            lng: location.lng,
            address: location.address,
          },
        });
      } else {
        setLocationStatus('Permission denied or unavailable');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setLocationStatus(`Error: ${message}`);
    }
  };

  const testNotificationSend = async () => {
    try {
      // This would be called from shopkeeper side
      Alert.alert('Test Info', 'This button simulates notification sending from shopkeeper side');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={styles.debugPanel}>
      <Text style={styles.title}>🔧 Debug Panel</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>OneSignal Player ID:</Text>
        <Text style={styles.value}>{playerIdStatus}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Location Status:</Text>
        <Text style={styles.value}>{locationStatus}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>User Role:</Text>
        <Text style={styles.value}>{user?.role || 'Loading...'}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Push Enabled:</Text>
        <Text style={styles.value}>{user?.pushNotificationsEnabled ? '✅' : '❌'}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={checkOneSignalStatus}>
        <Text style={styles.buttonText}>Refresh OneSignal</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={checkLocationStatus}>
        <Text style={styles.buttonText}>Refresh Location</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  debugPanel: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#495057',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#212529',
    flex: 2,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    marginBottom: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
});
