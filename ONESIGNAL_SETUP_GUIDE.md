# OneSignal Push Notifications Setup Guide

## Overview
This implementation adds OneSignal push notifications to your GoShop app. When shopkeepers create advertisements, push notifications are automatically sent to all customers within a 5km radius of the shop.

## Features Implemented

### 1. User Location Tracking
- ✅ User locations are saved in the database
- ✅ Location is automatically captured during registration and login (for customers)
- ✅ Location permission is requested appropriately
- ✅ Location updates are sent to OneSignal for targeting

### 2. OneSignal Integration
- ✅ OneSignal SDK initialized in app layout
- ✅ Player IDs are captured and stored in database
- ✅ User tags are set for targeting (role, userId, email, name)
- ✅ Push notification service with location-based targeting

### 3. Advertisement Push Notifications
- ✅ Automatic push notifications when shopkeepers create advertisements
- ✅ 5km radius targeting around shop location
- ✅ Rich notification content with shop name and discount info
- ✅ Fallback to in-app notifications
- ✅ Re-notification feature for existing advertisements

### 4. Database Schema Updates
- ✅ Added user location fields (lat, lng, address, lastUpdated)
- ✅ Added OneSignal player ID storage
- ✅ Added push notification preferences

## What You Need to Do

### 1. Create OneSignal Account
1. Go to [OneSignal](https://onesignal.com) and create a free account
2. Create a new app in OneSignal dashboard
3. Choose "React Native" as the platform
4. Note down your App ID and REST API Key

### 2. Configure Environment Variables

Add these to your `.env.local` file:
```bash
# OneSignal Configuration
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_app_id_here
EXPO_PUBLIC_ONESIGNAL_REST_API_KEY=your_rest_api_key_here
```

Also add these to your **Convex environment variables** (in Convex dashboard):
```bash
ONESIGNAL_APP_ID=your_app_id_here
ONESIGNAL_REST_API_KEY=your_rest_api_key_here
```

### 3. Update Android Configuration (for production)

For Android push notifications to work properly, you'll need to:

1. **Get Firebase credentials** (OneSignal uses FCM for Android):
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a project or use existing one
   - Add Android app with package name: `com.shopstatus.app`
   - Download `google-services.json`

2. **Configure OneSignal with Firebase**:
   - In OneSignal dashboard, go to Settings > Platforms
   - Click "Google Android (FCM)"
   - Upload your `google-services.json` file

### 4. Build and Test

```bash
# Install dependencies (already done)
npm install

# Generate native code (required for OneSignal)
npx expo prebuild --clean

# Run on device (push notifications don't work in simulators)
npx expo run:android
# or
npx expo run:ios
```

## How It Works

### 1. User Registration/Login
- Users grant location permission
- Location is saved to database
- OneSignal player ID is captured
- User tags are set for targeting

### 2. Advertisement Creation
- Shopkeeper creates advertisement
- System finds all customers within 5km of shop
- Push notifications sent via OneSignal API
- In-app notifications created as backup

### 3. Notification Targeting
- Location-based: Only users within 5km radius
- Role-based: Only customers receive notifications
- Device-based: Only users with push notifications enabled

## Testing

### 1. Test User Registration
1. Register as a customer
2. Grant location permission
3. Check that location is saved in database

### 2. Test Advertisement Creation
1. Register as a shopkeeper
2. Create a shop with location
3. Create an advertisement
4. Check that nearby customers receive push notifications

### 3. Test Notification Reception
1. Ensure customer users have location within 5km of shop
2. Check that notifications appear in device notification tray
3. Test notification click handling

## Troubleshooting

### Common Issues

1. **Notifications not sending**:
   - Check OneSignal credentials in environment variables
   - Verify users have location data and are within 5km
   - Check network connectivity

2. **Notifications not received**:
   - Test on physical device (not simulator)
   - Check notification permissions are granted
   - Verify OneSignal player ID is captured

3. **Location not working**:
   - Check location permissions
   - Test on physical device with GPS enabled
   - Verify location services are enabled

### Debug Information

The implementation includes detailed logging:
- OneSignal initialization status
- Location capture results
- Push notification send results
- Error messages for troubleshooting

## Security Considerations

1. **API Keys**: Keep OneSignal REST API key secure - only use in server environment
2. **Location Privacy**: Location data is only used for notification targeting
3. **Permissions**: Proper permission handling for location and notifications
4. **Data Protection**: User data is stored securely in Convex database

## Performance Notes

1. **Battery Usage**: Location updates are optimized (30 second intervals, 100m distance)
2. **Network Usage**: Push notifications are sent server-side, not from client
3. **Database Efficiency**: Location queries use proper indexing for fast lookups

## Future Enhancements

Potential improvements you can add:
1. Notification scheduling
2. Custom notification sounds
3. Rich media notifications (images)
4. Notification analytics
5. User notification preferences
6. Geofencing for automatic location updates

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Test on physical devices, not simulators
4. Check OneSignal dashboard for delivery status
