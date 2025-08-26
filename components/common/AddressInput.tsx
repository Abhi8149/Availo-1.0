import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationIQService, PlacePrediction } from '../../services/locationIQService';

interface AddressInputProps {
  value: string;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (latitude: string, longitude: string) => void;
  style?: any;
}

export default function AddressInput({
  value,
  onAddressChange,
  onCoordinatesChange,
  style,
}: AddressInputProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const searchPlaces = async (searchText: string) => {
    if (!searchText || searchText.trim().length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }
    setIsLoading(true);
    try {
      const results = await LocationIQService.searchPlaces(searchText);
      setPredictions(results);
      setShowPredictions(results.length > 0);
    } catch (error) {
      console.error('Error searching places:', error);
      Alert.alert('Error', 'Failed to search places. Please check your LocationIQ API key configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    setQuery(text);
    onAddressChange(text);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 300);
  };

  const handlePlaceSelect = async (prediction: PlacePrediction) => {
    setIsLoading(true);
    setShowPredictions(false);
    try {
      // LocationIQ autocomplete already returns lat/lon
      setQuery(prediction.display_name);
      onAddressChange(prediction.display_name);
      onCoordinatesChange(prediction.lat, prediction.lon);
    } catch (error) {
      console.error('Error getting place details:', error);
      Alert.alert('Error', 'Failed to get place details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      // Use expo-location for device location
      const { status } = await import('expo-location').then(mod => mod.requestForegroundPermissionsAsync());
      if (status !== 'granted') {
        Alert.alert('Location Error', 'Location permission not granted.');
        setIsGettingLocation(false);
        return;
      }
      const location = await import('expo-location').then(mod => mod.getCurrentPositionAsync({ accuracy: 6 }));
      const address = await LocationIQService.reverseGeocode(location.coords.latitude, location.coords.longitude);
      if (!address) {
        Alert.alert('Reverse Geocoding Error', 'Failed to get address for current location.');
        setIsGettingLocation(false);
        return;
      }
      setQuery(address);
      onAddressChange(address);
      onCoordinatesChange(location.coords.latitude.toString(), location.coords.longitude.toString());
    } catch (error:any) {
      console.error('Error in handleCurrentLocation:', error);
      Alert.alert('Location/Geocoding Error', `An error occurred while getting your location or address.\n\n${error?.message || error}`);
    } finally {
      setIsGettingLocation(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleTextChange}
          placeholder="Search for address..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          onFocus={() => setShowPredictions(predictions.length > 0)}
        />
        
        <View style={styles.inputActions}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Ionicons name="locate" size={20} color="#2563EB" />
            )}
          </TouchableOpacity>
          
          {isLoading && (
            <ActivityIndicator size="small" color="#6B7280" style={styles.loadingIndicator} />
          )}
        </View>
      </View>

      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <ScrollView
            style={styles.predictionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {predictions.map((item, index) => (
              <TouchableOpacity
                key={item.place_id + '-' + index}
                style={styles.predictionItem}
                onPress={() => handlePlaceSelect(item)}
              >
                <View style={styles.predictionContent}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <View style={styles.predictionText}>
                    <Text style={styles.predictionMainText}>
                      {item.display_name}
                    </Text>
                    {/* You can add more details here if PlacePrediction provides them, e.g. item.type or item.class */}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingRight: 60,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1F2937',
    minHeight: 80,
  },
  inputActions: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationButton: {
    padding: 4,
  },
  loadingIndicator: {
    marginLeft: 4,
  },
  predictionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  predictionsList: {
    flex: 1,
  },
  predictionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  predictionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  predictionText: {
    flex: 1,
  },
  predictionMainText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  predictionSecondaryText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
