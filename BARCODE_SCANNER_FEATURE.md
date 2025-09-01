# Barcode Scanner Feature

## Overview
A comprehensive barcode scanner has been integrated into the "Add Items" screen of the Shop Status app. This feature allows shopkeepers to easily add products by scanning their barcodes and automatically retrieving product information.

## Features

### 🔍 **Barcode Scanning**
- **Camera Integration**: Uses `expo-camera` with `CameraView` API for reliable barcode detection
- **Supported Formats**: 
  - EAN-13 (most common retail barcodes)
  - UPC-A (North American standard)
  - Code 128 (versatile format)
  - QR codes
- **Real-time Scanning**: Instant detection and feedback

### 🌟 **User Experience**
- **Full-screen Camera**: Immersive scanning experience
- **Visual Guide**: Semi-transparent overlay rectangle to guide scanning
- **Haptic Feedback**: Device vibration on successful scan
- **Torch Control**: Toggle flashlight for low-light scanning
- **Permission Handling**: Automatic camera permission requests

### 🤖 **Smart Product Detection**
- **API Integration**: Connects to Open Food Facts database
- **Auto-fill**: Automatically populates product name and brand
- **Fallback**: Shows "Not Found in Database" for unknown products
- **Loading States**: Visual feedback during API requests

### 📱 **UI Components**

#### **Add Items Form Enhancement**
- **Barcode Input Field**: Manual entry option with scan button
- **Brand Field**: Auto-populated from API response
- **Smart Category**: Auto-selects "food" category for detected products

#### **Scanner Interface**
- **Cancel Button**: Top-positioned close option
- **Scanning Frame**: Visual scanning guide with corner indicators
- **Torch Toggle**: Bottom-positioned flashlight control
- **Scan Again**: Option to rescan after successful detection

## Technical Implementation

### **Components Structure**
```
components/
├── common/
│   └── BarcodeScanner.tsx          # Standalone scanner component
└── shopkeeper/
    └── AddItemModal.tsx            # Enhanced with barcode integration
```

### **Database Schema Updates**
```typescript
items: {
  // ... existing fields
  barcode: v.optional(v.string()),   // Scanned barcode value
  brand: v.optional(v.string()),     // Product brand from API
}
```

### **API Integration**
- **Endpoint**: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
- **Response Handling**: Extracts product name and brand information
- **Error Handling**: Graceful fallback for unknown products

### **Key Features**

#### **Debouncing & Duplicate Prevention**
- Prevents multiple scans of the same barcode
- 2-second timeout between scans
- Visual feedback for scan completion

#### **Enhanced Search**
- Items now searchable by barcode and brand
- Improved item discovery and management

#### **Data Persistence**
- Barcode and brand stored in Convex database
- Available for future reference and analytics

## Usage Flow

1. **Open Add Items**: Shopkeeper navigates to add item form
2. **Scan Option**: Taps "Scan" button next to barcode field
3. **Camera Access**: Grants camera permission if prompted
4. **Scan Barcode**: Points camera at product barcode
5. **Auto-fill**: Form automatically populates with product details
6. **Manual Edit**: Adjust any details as needed
7. **Save Item**: Complete the item addition process

## Benefits

### **For Shopkeepers**
- ⚡ **Faster Item Entry**: Reduce typing and manual data entry
- 📊 **Accurate Data**: Consistent product information from database
- 🏷️ **Professional Inventory**: Standardized product names and brands
- 🔍 **Easy Management**: Search items by barcode or brand

### **For Customers**
- 🛍️ **Better Discovery**: Find products by scanning barcodes
- 📱 **Consistent Info**: Reliable product information across shops
- 🔎 **Enhanced Search**: Search by brand names and barcodes

## Configuration

### **Required Dependencies**
```json
{
  "expo-camera": "^16.1.11",
  "expo-haptics": "~14.1.4"
}
```

### **Permissions Required**
- Camera access for barcode scanning
- No additional permissions needed

## Future Enhancements

### **Potential Improvements**
- 🌐 **Multiple APIs**: Integrate additional product databases
- 🏪 **Local Products**: Support for local/regional product databases
- 📊 **Analytics**: Track most scanned products
- 🔄 **Batch Scanning**: Scan multiple items in sequence
- 💰 **Price Suggestions**: Auto-populate prices from market data

### **Advanced Features**
- 📸 **Image Recognition**: Visual product identification
- 🏷️ **Custom Barcodes**: Generate internal barcodes for local products
- 📦 **Inventory Integration**: Link with supply chain systems
- 🔔 **Stock Alerts**: Notifications for low-stock items

## Testing

### **Test Scenarios**
1. **Valid Barcode**: Scan known product (e.g., Coca-Cola)
2. **Unknown Barcode**: Scan custom/unknown barcode
3. **Low Light**: Test torch functionality
4. **Permission Denied**: Handle camera access denial
5. **Network Issues**: Test offline graceful degradation

### **Sample Test Barcodes**
- **Coca-Cola**: 5449000000996
- **iPhone**: 888462108799
- **Generic Food**: Any grocery item barcode

## Support

### **Troubleshooting**
- **Camera Not Working**: Check permissions in device settings
- **Scanning Issues**: Ensure good lighting and steady hand
- **API Failures**: Check internet connection

### **Performance Tips**
- Use adequate lighting for better scan accuracy
- Hold device steady during scanning
- Clean camera lens for optimal performance

## Security & Privacy

### **Data Handling**
- ✅ Barcode data stored locally in your database
- ✅ No personal information transmitted to external APIs
- ✅ Product data retrieved from public Open Food Facts database
- ✅ Camera access only during active scanning

### **Compliance**
- Follows mobile app best practices for camera usage
- Respects user privacy and permission models
- No unauthorized data collection or transmission
