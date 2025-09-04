import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { OneSignalService } from '../../services/oneSignalService';

export default function TestNotificationScreen() {
  useEffect(() => {
    checkEnvironmentVariables();
  }, []);

  const checkEnvironmentVariables = () => {
    const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
    const restApiKey = process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY;
    
    console.log('OneSignal App ID:', appId ? 'Set' : 'Missing');
    console.log('OneSignal REST API Key:', restApiKey ? 'Set' : 'Missing');
  };

  const testOneSignalSetup = async () => {
    try {
      const playerId = await OneSignalService.getPlayerId();
      Alert.alert(
        'OneSignal Status',
        playerId ? `Player ID: ${playerId.substring(0, 20)}...` : 'Player ID not available'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('OneSignal Error', message);
    }
  };

  const testLocationPermission = async () => {
    try {
      const { LocationService } = await import('../../services/locationService');
      const location = await LocationService.getCurrentLocation();
      
      if (location) {
        Alert.alert(
          'Location Test',
          `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}\nAddress: ${location.address || 'Not available'}`
        );
      } else {
        Alert.alert('Location Test', 'Failed to get location');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Location Error', message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>OneSignal Test Screen</Text>
      
      <TouchableOpacity style={styles.button} onPress={testOneSignalSetup}>
        <Text style={styles.buttonText}>Test OneSignal Setup</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testLocationPermission}>
        <Text style={styles.buttonText}>Test Location Permission</Text>
      </TouchableOpacity>

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>Testing Instructions:</Text>
        <Text style={styles.instructionText}>
          1. Test OneSignal setup to get Player ID{'\n'}
          2. Test location permission{'\n'}
          3. Register as customer (grant location){'\n'}
          4. Register as shopkeeper{'\n'}
          5. Create shop with location{'\n'}
          6. Create advertisement{'\n'}
          7. Check customer device for notification
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
