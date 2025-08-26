# GoMaps Pro API Setup Guide

## 🗺️ Setting up GoMaps Pro for Address Search

### 1. **What is GoMaps Pro?**
GoMaps Pro is a fully compatible and performance-driven replacement for the Google Maps API. It uses the same API endpoints and response formats as Google Maps, but with potentially better pricing and performance.

**Key Benefits:**
- ✅ Drop-in replacement for Google Maps API
- ✅ Same API endpoints and response formats
- ✅ No backend or frontend code changes required
- ✅ Better pricing compared to Google Maps
- ✅ Independent from Google's infrastructure

### 2. **Getting Started with GoMaps Pro**

#### Step 1: Sign Up
1. Go to [GoMaps Pro](https://app.gomaps.pro/)
2. Create your account
3. Set up your company and project

#### Step 2: Get Your API Key
1. Navigate to **Apis** section in your dashboard
2. Copy your API key
3. The API key works with all Google Maps compatible endpoints

#### Step 3: Configure Your App
Add your GoMaps Pro API key to your `.env.local` file:

```env
# GoMaps Pro API Configuration
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_gomaps_pro_api_key_here
```

### 3. **API Endpoints Used**

Our app uses these GoMaps Pro endpoints (compatible with Google Maps):

- **Places Autocomplete**: `https://maps.gomaps.pro/maps/api/place/autocomplete/json`
- **Place Details**: `https://maps.gomaps.pro/maps/api/place/details/json`
- **Geocoding**: `https://maps.gomaps.pro/maps/api/geocode/json`

### 4. **Features Implemented**

#### ✅ Address Autocomplete
- Real-time search suggestions as you type
- Structured address formatting (main text + secondary text)
- Country-specific results (currently set to India)

#### ✅ Place Details
- Automatic coordinate extraction when selecting an address
- Formatted address information
- Place ID for unique identification

#### ✅ Current Location Detection
- GPS-based location detection
- Reverse geocoding to get address from coordinates
- Cross-platform support (iOS, Android, Web)

#### ✅ Manual Override
- Users can still manually enter coordinates if needed
- Validation for coordinate ranges (-90 to 90 for latitude, -180 to 180 for longitude)

### 5. **How It Works in Your App**

#### Address Input Process:
1. **User types address** → Autocomplete suggestions appear
2. **User selects suggestion** → Coordinates auto-fill
3. **Or user taps location icon** → GPS location detected and address filled
4. **Manual editing** → Users can still edit coordinates manually

#### Technical Flow:
```
User Input → GoMaps Pro API → Autocomplete Results → 
User Selection → Place Details API → Coordinates & Address →
Form Auto-fill
```

### 6. **Pricing Comparison**

| Feature | Google Maps API | GoMaps Pro |
|---------|----------------|------------|
| Autocomplete | $2.83/1K requests | Potentially lower |
| Place Details | $17/1K requests | Potentially lower |
| Geocoding | $5/1K requests | Potentially lower |
| Free Tier | $200/month credit | Check current plans |

### 7. **Configuration Options**

You can customize the behavior in `services/goMapsPlaces.ts`:

```typescript
// Change country restriction (currently India)
url += '&components=country:in'; // Change 'in' to your country code

// Adjust search radius (currently 50km)
url += `&location=${location.lat},${location.lng}&radius=50000`;
```

### 8. **Testing Your Setup**

1. **Start your development server**:
   ```bash
   npm start
   ```

2. **Test address search**:
   - Open the app and try to add a new shop
   - Type in the address field to see autocomplete suggestions
   - Try the current location button (on a physical device)

3. **Verify API calls**:
   - Check your browser's network tab (for web)
   - Look for calls to `maps.gomaps.pro`
   - Ensure you get proper responses

### 9. **Troubleshooting**

#### Common Issues:

1. **"GoMaps Pro API key is not configured" error**:
   - Ensure `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is set in `.env.local`
   - Restart your development server after adding the variable

2. **"API request failed" error**:
   - Check that your GoMaps Pro API key is valid
   - Verify your account has sufficient credits
   - Check the GoMaps Pro dashboard for usage limits

3. **Location permission denied**:
   - Ensure location permissions are properly configured in `app.json`
   - Test on a physical device (simulators may not support location)

4. **No search results**:
   - Check the country restriction in `goMapsPlaces.ts`
   - Verify the search radius and location bias settings

### 10. **Monitoring and Analytics**

- **GoMaps Pro Dashboard**: Monitor your API usage and costs
- **Request Logs**: Track API calls and response times
- **Error Monitoring**: Set up alerts for API failures

### 11. **Migration Benefits**

Since you're using GoMaps Pro as a drop-in replacement:
- ✅ **No code changes required** beyond changing the base URL
- ✅ **Same response formats** as Google Maps API
- ✅ **Existing validation and error handling** still works
- ✅ **Future Google Maps features** likely supported

### 12. **Next Steps**

1. **Test thoroughly** in development
2. **Monitor usage** in the GoMaps Pro dashboard
3. **Consider upgrading** to a paid plan based on usage
4. **Implement caching** for frequently searched locations
5. **Add error fallbacks** for API unavailability

---

**Your app is now configured to use GoMaps Pro!** The address search functionality should work seamlessly with your existing API key.
