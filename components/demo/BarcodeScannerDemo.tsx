import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import BarcodeScanner from '../common/BarcodeScanner';
import { useConvex } from 'convex/react';
import { ProductData } from '../../services/productApiService';

/**
 * Demo component to test the barcode scanner functionality
 * This component can be used to test the scanner independently
 */
export default function BarcodeScannerDemo() {
  const [showScanner, setShowScanner] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  const [lastProductData, setLastProductData] = useState<ProductData | null>(null);
  const convex = useConvex();

  const handleBarcodeScanned = (barcode: string, productData?: ProductData) => {
    setLastScannedBarcode(barcode);
    setLastProductData(productData || null);
    setShowScanner(false);
    
    const sourceInfo = productData?.source === 'local' 
      ? 'Found in your database' 
      : productData?.found 
        ? `Found via ${productData.source}` 
        : 'Product not found in any database';
    
    Alert.alert(
      'Universal Barcode Scanner Result',
      `Barcode: ${barcode}\n${sourceInfo}\n${productData?.found ? `Product: ${productData.name}` : 'Ready for manual entry'}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Universal Barcode Scanner Demo</Text>
      
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => setShowScanner(true)}
      >
        <Text style={styles.scanButtonText}>Start Universal Scanning</Text>
      </TouchableOpacity>

      {lastScannedBarcode && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Last Scan Result:</Text>
          <Text style={styles.resultText}>Barcode: {lastScannedBarcode}</Text>
          {lastProductData && (
            <>
              <Text style={styles.resultText}>
                Product: {lastProductData.name || 'Unknown'}
              </Text>
              <Text style={styles.resultText}>
                Brand: {lastProductData.brand || 'N/A'}
              </Text>
              <Text style={styles.resultText}>
                Category: {lastProductData.category || 'N/A'}
              </Text>
              <Text style={styles.resultText}>
                Source: {lastProductData.source || 'Unknown'}
              </Text>
              <Text style={styles.resultText}>
                Found: {lastProductData.found ? 'Yes' : 'No'}
              </Text>
            </>
          )}
        </View>
      )}

      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
        convex={convex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
});
