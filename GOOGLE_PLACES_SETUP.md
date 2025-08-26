# Google Places API Setup Guide

## 🗺️ Setting up Google Places API for Address Search

### 1. **Enable Google Places API**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your existing project (or create a new one)
3. Navigate to **APIs & Services** → **Library**
4. Search for and enable the following APIs:
   - **Places API (New)**
   - **Geocoding API**
   - **Maps JavaScript API** (optional, for future map features)

### 2. **Create API Key for Places API**
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the generated API key
4. Click **Restrict Key** to secure it:
   - **Application restrictions**: Choose based on your deployment
     - For development: None (not recommended for production)
     - For mobile: Android/iOS apps with package names
     - For web: HTTP referrers with your domain
   - **API restrictions**: Select "Restrict key" and choose:
     - Places API (New)
     - Geocoding API

### 3. **Update Environment Variables**
Add the following to your `.env.local` file:

```env
# Existing variables...
CONVEX_DEPLOYMENT=your_convex_deployment
EXPO_PUBLIC_CONVEX_URL=your_convex_url
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here

# Google Places API Configuration
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_places_api_key_here
```

### 4. **Configure App Permissions**
Add location permissions to your `app.json`:

```json
{
  "expo": {
    "permissions": [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION"
    ],
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app needs access to location to help you add your shop's address.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app needs access to location to help you add your shop's address."
      }
    }
  }
}
```

### 5. **Features Included**

#### ✅ Address Autocomplete
- Real-time search suggestions from Google Places
- Structured address formatting (main text + secondary text)
- Automatic coordinate extraction

#### ✅ Current Location Detection
- GPS-based location detection
- Reverse geocoding to get address from coordinates
- Cross-platform support (iOS, Android, Web)

#### ✅ Manual Override
- Users can still manually enter coordinates if needed
- Validation for coordinate ranges

### 6. **Usage in AddShopModal**

The enhanced `AddShopModal` now includes:

1. **Smart Address Input**: 
   - Type to search for addresses
   - Select from autocomplete suggestions
   - Automatic coordinate filling

2. **Current Location Button**: 
   - Tap the location icon to use GPS
   - Automatically fills address and coordinates

3. **Manual Entry**: 
   - Coordinates are still editable
   - Validation ensures proper lat/lng ranges

### 7. **API Costs (Approximate)**

- **Autocomplete**: $2.83 per 1,000 requests
- **Place Details**: $17 per 1,000 requests  
- **Geocoding**: $5 per 1,000 requests
- **Reverse Geocoding**: $5 per 1,000 requests

*Note: Google provides $200 monthly credit, which covers substantial usage for most apps.*

### 8. **Security Best Practices**

1. **Restrict API Keys**: Always restrict your API keys by application and API
2. **Monitor Usage**: Set up billing alerts in Google Cloud Console
3. **Environment Variables**: Never commit API keys to version control
4. **Rate Limiting**: Implement client-side debouncing (already included)

### 9. **Troubleshooting**

#### Common Issues:

1. **"API key not configured" error**:
   - Ensure `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is set in `.env.local`
   - Restart your development server after adding the variable

2. **"This API project is not authorized" error**:
   - Check that Places API is enabled in Google Cloud Console
   - Verify API key restrictions allow your app/domain

3. **Location permission denied**:
   - Ensure location permissions are properly configured in `app.json`
   - Test on a physical device (simulators may not support location)

4. **No search results**:
   - Check the country restriction in `googlePlaces.ts` (currently set to India)
   - Modify or remove the `components=country:in` parameter as needed

### 10. **Next Steps**

Consider adding these enhancements:
- Map view for visual address selection
- Saved addresses for shopkeepers
- Address validation and formatting
- Offline address storage
- Multiple address suggestions with distance indicators

---

**Note**: Make sure to test the integration thoroughly before deploying to production, and monitor your API usage to avoid unexpected charges.
