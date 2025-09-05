import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OneSignalService } from '../../services/oneSignalService';
import { LocationService } from '../../services/locationService';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface LocationOneSignalDebugProps {
  userId: Id<"users">;
  userRole: string;
}

export default function LocationOneSignalDebug({ userId, userRole }: LocationOneSignalDebugProps) {
  const [oneSignalId, setOneSignalId] = useState<string>('');
  const [location, setLocation] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const updateUserProfile = useMutation(api.users.updateUserProfile);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testOneSignal = async () => {
    addLog('🔄 Testing OneSignal...');
    try {
      const playerId = await OneSignalService.getPlayerId();
      setOneSignalId(playerId || 'Not available');
      addLog(`📱 OneSignal Player ID: ${playerId || 'Not available'}`);
      
      if (playerId) {
        OneSignalService.setUserTags({
          userId: userId.toString(),
          role: userRole,
          testTag: 'debug-test'
        });
        addLog('✅ OneSignal tags set');
      }
    } catch (error) {
      addLog(`❌ OneSignal Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testLocation = async () => {
    addLog('📍 Testing Location...');
    try {
      const userLocation = await LocationService.getCurrentLocation();
      setLocation(userLocation);
      if (userLocation) {
        addLog(`🗺️ Location: ${userLocation.lat}, ${userLocation.lng}`);
        addLog(`📍 Address: ${userLocation.address || 'Not available'}`);
        
        // Update OneSignal with location
        OneSignalService.setUserLocation(userLocation.lat, userLocation.lng);
        addLog('✅ OneSignal location updated');
      } else {
        addLog('❌ Location not available');
      }
    } catch (error) {
      addLog(`❌ Location Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const saveToDatabase = async () => {
    if (!oneSignalId && !location) {
      Alert.alert('Error', 'No data to save. Test OneSignal and Location first.');
      return;
    }

    setTesting(true);
    addLog('💾 Saving to database...');
    
    try {
      await updateUserProfile({
        userId,
        location: location ? {
          lat: location.lat,
          lng: location.lng,
          address: location.address,
        } : undefined,
        oneSignalPlayerId: oneSignalId || undefined,
        pushNotificationsEnabled: !!oneSignalId,
      });
      addLog('✅ Data saved to database successfully');
      Alert.alert('Success', 'Data saved to database!');
    } catch (error) {
      addLog(`❌ Database Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Error', 'Failed to save to database');
    } finally {
      setTesting(false);
    }
  };

  const runFullTest = async () => {
    setLogs([]);
    addLog('🧪 Starting full test...');
    await testOneSignal();
    await testLocation();
    addLog('🏁 Test completed');
  };

  useEffect(() => {
    runFullTest();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Location & OneSignal Debug</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.label}>User ID:</Text>
        <Text style={styles.value}>{userId}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>User Role:</Text>
        <Text style={styles.value}>{userRole}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>OneSignal ID:</Text>
        <Text style={[styles.value, { color: oneSignalId ? '#16A34A' : '#DC2626' }]}>
          {oneSignalId || 'Not available'}
        </Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>Location:</Text>
        <Text style={[styles.value, { color: location ? '#16A34A' : '#DC2626' }]}>
          {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Not available'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testOneSignal}>
          <Ionicons name="notifications" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Test OneSignal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testLocation}>
          <Ionicons name="location" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Test Location</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.saveButton, testing && styles.buttonDisabled]} 
          onPress={saveToDatabase}
          disabled={testing}
        >
          <Ionicons name="save" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Save to DB</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.refreshButton]} onPress={runFullTest}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Run Full Test</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logsContainer}>
        <Text style={styles.logsTitle}>📋 Debug Logs:</Text>
        <ScrollView style={styles.logsScroll}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logEntry}>{log}</Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    flex: 1,
    minWidth: '45%',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#16A34A',
  },
  refreshButton: {
    backgroundColor: '#F59E0B',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  logsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  logsScroll: {
    maxHeight: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
  },
  logEntry: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
