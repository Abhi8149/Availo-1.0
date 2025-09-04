import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { OneSignalService } from '../../services/oneSignalService';

export const OneSignalDiagnosticPanel = () => {
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [diagnosisResults, setDiagnosisResults] = useState<any>(null);
  
  // Get all users with OneSignal data
  const oneSignalUsers = useQuery(api.users.debugOneSignalUsers);

  const runFullDiagnosis = async () => {
    try {
      // Get current device's OneSignal player ID
      const playerId = await OneSignalService.getPlayerId();
      setCurrentPlayerId(playerId);

      console.log('🔍 Running OneSignal Diagnosis...');
      
      const results = {
        currentDevicePlayerId: playerId,
        isValidUUID: playerId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId) : false,
        totalUsers: oneSignalUsers?.length || 0,
        usersWithPlayerIds: oneSignalUsers?.filter(u => u.hasOneSignalId).length || 0,
        usersWithValidPlayerIds: oneSignalUsers?.filter(u => 
          u.oneSignalId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.oneSignalId.replace('...', '00000'))
        ).length || 0,
        usersWithLocation: oneSignalUsers?.filter(u => u.hasLocation).length || 0,
        usersWithPushEnabled: oneSignalUsers?.filter(u => u.pushEnabled).length || 0,
        readyUsers: oneSignalUsers?.filter(u => 
          u.hasOneSignalId && u.hasLocation && u.pushEnabled && u.role === 'customer'
        ).length || 0,
      };

      setDiagnosisResults(results);

      // Show results in alert
      Alert.alert(
        'OneSignal Diagnosis Results',
        `Current Device: ${playerId ? 'Connected' : 'Not Connected'}\n` +
        `Valid UUID: ${results.isValidUUID ? 'Yes' : 'No'}\n` +
        `Users Ready for Push: ${results.readyUsers}/${results.totalUsers}\n` +
        `Users with Player IDs: ${results.usersWithPlayerIds}\n` +
        `Users with Location: ${results.usersWithLocation}\n` +
        `Push Enabled: ${results.usersWithPushEnabled}`
      );

    } catch (error) {
      console.error('Diagnosis failed:', error);
      Alert.alert('Diagnosis Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testSinglePlayerNotification = async () => {
    if (!currentPlayerId) {
      Alert.alert('Error', 'No player ID available. Run diagnosis first.');
      return;
    }

    try {
      console.log('🧪 Testing single player notification...');
      
      // Test with OneSignal REST API directly
      const oneSignalAppId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
      const oneSignalRestApiKey = process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY;

      if (!oneSignalAppId || !oneSignalRestApiKey) {
        Alert.alert('Error', 'OneSignal credentials not found in environment');
        return;
      }

      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${oneSignalRestApiKey}`,
        },
        body: JSON.stringify({
          app_id: oneSignalAppId,
          include_player_ids: [currentPlayerId],
          headings: { en: "OneSignal Test" },
          contents: { en: "Direct API test notification" },
          data: { type: "test" },
        }),
      });

      const result = await response.json();
      
      console.log('Test notification result:', result);
      
      if (response.ok && (!result.errors || result.errors.length === 0)) {
        Alert.alert('Success!', 'Test notification sent successfully!');
      } else {
        Alert.alert(
          'Test Failed', 
          `Status: ${response.status}\nErrors: ${result.errors?.join(', ') || 'Unknown error'}`
        );
      }

    } catch (error) {
      console.error('Test notification failed:', error);
      Alert.alert('Test Error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>OneSignal Diagnostic Panel</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Device</Text>
        <Text style={styles.info}>Player ID: {currentPlayerId || 'Not Available'}</Text>
        {currentPlayerId && (
          <Text style={styles.info}>
            Valid UUID: {/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentPlayerId) ? '✅' : '❌'}
          </Text>
        )}
      </View>

      {diagnosisResults && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosis Results</Text>
          <Text style={styles.stat}>Total Users: {diagnosisResults.totalUsers}</Text>
          <Text style={styles.stat}>Users with Player IDs: {diagnosisResults.usersWithPlayerIds}</Text>
          <Text style={styles.stat}>Users with Valid IDs: {diagnosisResults.usersWithValidPlayerIds}</Text>
          <Text style={styles.stat}>Users with Location: {diagnosisResults.usersWithLocation}</Text>
          <Text style={styles.stat}>Push Enabled: {diagnosisResults.usersWithPushEnabled}</Text>
          <Text style={[styles.stat, styles.highlight]}>
            Ready for Push: {diagnosisResults.readyUsers}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Details</Text>
        {oneSignalUsers?.map((user, index) => (
          <View key={index} style={styles.userItem}>
            <Text style={styles.userName}>{user.name} ({user.role})</Text>
            <Text style={styles.userDetail}>
              OneSignal: {user.hasOneSignalId ? `✅ ${user.oneSignalId}` : '❌ Missing'}
            </Text>
            <Text style={styles.userDetail}>
              Location: {user.hasLocation ? '✅ Available' : '❌ Missing'}
            </Text>
            <Text style={styles.userDetail}>
              Push: {user.pushEnabled ? '✅ Enabled' : '❌ Disabled'}
            </Text>
            {user.oneSignalId && (
              <Text style={styles.userDetail}>
                Valid UUID: {/^[0-9a-f]{8}-[0-9a-f]{4}/.test(user.oneSignalId.replace('...', '0000')) ? '✅' : '❌'}
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity style={styles.button} onPress={runFullDiagnosis}>
          <Text style={styles.buttonText}>Run Full Diagnosis</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testSinglePlayerNotification}>
          <Text style={styles.buttonText}>Test Current Device</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Common Issues & Solutions</Text>
        <Text style={styles.help}>
          1. "All included players are not subscribed":{'\n'}
          → Users haven't granted notification permissions{'\n'}
          → OneSignal player IDs are invalid or outdated{'\n'}
          → Users unsubscribed from notifications{'\n\n'}
          
          2. Invalid UUID format:{'\n'}
          → OneSignal not properly initialized{'\n'}
          → Player ID not captured during login{'\n\n'}
          
          3. No users ready for push:{'\n'}
          → Check location permissions{'\n'}
          → Verify push notification settings{'\n'}
          → Ensure users have valid OneSignal IDs
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  stat: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  highlight: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  userItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
    marginBottom: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userDetail: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  buttonSection: {
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  help: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});

export default OneSignalDiagnosticPanel;
