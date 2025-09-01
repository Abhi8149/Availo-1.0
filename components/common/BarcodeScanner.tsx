import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Vibration,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { ProductApiService, ProductData as ApiProductData } from '../../services/productApiService';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string, productData?: ApiProductData) => void;
  convex?: any; // Convex client for database access
}

export default function BarcodeScanner({ visible, onClose, onBarcodeScanned, convex }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [debounceTimeout, setDebounceTimeout] = useState<number | null>(null);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setLastScannedCode('');
      setTorchOn(false);
      setLoading(false);
    }
  }, [visible]);

  const fetchProductData = async (barcode: string): Promise<ApiProductData> => {
    try {
      setLoading(true);
      
      if (!convex) {
        console.warn('Convex client not provided, using external APIs only');
        // Fallback to external APIs only
        const result = await ProductApiService.tryExternalApis(barcode);
        return result;
      }
      
      // Use the universal product service
      const productData = await ProductApiService.getProductDetails(barcode, convex);
      return productData;
      
    } catch (error) {
      console.error('Error fetching product data:', error);
      return {
        name: 'Error loading product data',
        brand: '',
        category: '',
        description: '',
        source: 'manual',
        found: false
      };
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    // Prevent duplicate scans with debouncing
    if (scanned || data === lastScannedCode) {
      return;
    }

    // Clear any existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    setScanned(true);
    setLastScannedCode(data);
    
    // Vibrate to give feedback
    Vibration.vibrate(100);

    try {
      // Fetch product data from Open Food Facts API
      const productData = await fetchProductData(data);
      
      // Call the callback with barcode and product data
      onBarcodeScanned(data, productData);
      
      // Show success message with source information
      const sourceMessage = productData.source === 'local' 
        ? 'Found in your database' 
        : productData.found 
          ? `Found via ${productData.source}` 
          : 'Product not found in any database';
          
      Alert.alert(
        'Barcode Scanned!', 
        `Barcode: ${data}\n${sourceMessage}\n${productData.found ? `Product: ${productData.name}` : 'Please enter details manually'}`,
        [
          {
            text: 'OK',
            onPress: () => onClose()
          }
        ]
      );
    } catch (error) {
      console.error('Error processing barcode:', error);
      Alert.alert('Error', 'Failed to process barcode. Please try again.');
      setScanned(false);
    }

    // Reset scanned state after a delay to allow for rescanning
    const timeout = setTimeout(() => {
      setScanned(false);
      setLastScannedCode('');
    }, 2000) as unknown as number;
    
    setDebounceTimeout(timeout);
  };

  const toggleTorch = () => {
    setTorchOn(!torchOn);
  };

  const resetScanner = () => {
    setScanned(false);
    setLastScannedCode('');
    setLoading(false);
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      setDebounceTimeout(null);
    }
  };

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Text>Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.permissionText}>No access to camera</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "upc_a", "code128", "qr"],
          }}
          enableTorch={torchOn}
        />
        
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top section with cancel button */}
          <View style={styles.topSection}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
          </View>

          {/* Center section with scanning frame */}
          <View style={styles.centerSection}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.instructionText}>
              {loading ? 'Loading product details...' : 'Point camera at barcode'}
            </Text>
            {loading && <ActivityIndicator size="large" color="white" style={styles.loader} />}
          </View>

          {/* Bottom section with torch and scan again buttons */}
          <View style={styles.bottomSection}>
            <TouchableOpacity style={styles.torchButton} onPress={toggleTorch}>
              <Ionicons 
                name={torchOn ? "flashlight" : "flashlight-outline"} 
                size={30} 
                color="white" 
              />
              <Text style={styles.torchText}>
                {torchOn ? 'Torch On' : 'Torch Off'}
              </Text>
            </TouchableOpacity>
            
            {scanned && (
              <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
                <Ionicons name="refresh" size={24} color="white" />
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topSection: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 50,
    paddingRight: 20,
  },
  centerSection: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    padding: 10,
  },
  scanFrame: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'white',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
  },
  loader: {
    marginTop: 20,
  },
  torchButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    minWidth: 80,
  },
  torchText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  scanAgainButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  scanAgainText: {
    color: 'white',
    fontSize: 14,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
