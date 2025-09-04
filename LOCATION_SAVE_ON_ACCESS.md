# LOCATION SAVE ON ACCESS IMPLEMENTATION

## ✅ CHANGES MADE

### **CustomerHome.tsx - Added Location Saving Functionality**

I've added minimal changes to save user location to database every time CustomerHome is accessed, without changing any existing functionality:

#### **1. Added UpdateUserProfile Mutation**
```typescript
// Mutation for updating user data in database
const updateUserProfile = useMutation(api.users.updateUserProfile);
```

#### **2. Added saveLocationToDatabase Function**
```typescript
const saveLocationToDatabase = async (latitude: number, longitude: number) => {
  try {
    // Get address using reverse geocoding
    let address = '';
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode.length > 0) {
        const addressData = reverseGeocode[0];
        address = [
          addressData.street,
          addressData.city,
          addressData.region,
          addressData.postalCode,
        ].filter(Boolean).join(', ');
      }
    } catch (error) {
      console.log('Could not get address:', error);
    }

    // Update location in database
    await updateUserProfile({
      userId: user._id,
      location: {
        lat: latitude,
        lng: longitude,
        address: address,
      },
    });

    console.log('✅ User location saved to database:', {
      lat: latitude,
      lng: longitude,
      address: address,
    });
  } catch (error) {
    console.error('❌ Error saving user location to database:', error);
  }
};
```

#### **3. Added useEffect to Save Location on Access**
```typescript
// Save user location to database when CustomerHome is accessed
useEffect(() => {
  const saveUserLocationOnAccess = async () => {
    try {
      console.log('📍 CustomerHome accessed - attempting to save user location...');
      
      // Check location permission
      const { status } = await Location.getForegroundPermissionsAsync();
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      
      if (status === 'granted' && isLocationEnabled) {
        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        // Save to database
        await saveLocationToDatabase(location.coords.latitude, location.coords.longitude);
      } else {
        console.log('⚠️ Location permission not granted or services disabled - cannot save location');
      }
    } catch (error) {
      console.error('❌ Error saving location on CustomerHome access:', error);
    }
  };

  // Save location every time CustomerHome is accessed
  saveUserLocationOnAccess();
}, []); // Empty dependency array means this runs only once when component mounts
```

## 🎯 BEHAVIOR

### **When This Triggers:**
- ✅ Every time user logs in and goes to CustomerHome
- ✅ Every time user opens app with existing session and accesses CustomerHome
- ✅ User location is captured with latitude, longitude, and formatted address
- ✅ Location is saved to database with timestamp (lastUpdated)

### **What Remains Unchanged:**
- ✅ All existing CustomerHome functionality works exactly the same
- ✅ Location permission popup behavior unchanged
- ✅ Shop searching and filtering unchanged
- ✅ Cart, wishlist, favorites functionality unchanged
- ✅ All UI components and animations unchanged

## 🧪 TESTING

### **Test 1: Login and Access CustomerHome**
1. User logs in → Gets redirected to CustomerHome
2. CustomerHome loads → Location permission checked
3. If granted → Location captured and saved to database ✅
4. Console shows: "✅ User location saved to database"

### **Test 2: Existing Session Access**
1. User opens app with saved session
2. Navigates to CustomerHome
3. Location is captured and saved again ✅
4. Fresh location data in database

### **Test 3: No Location Permission**
1. User has denied location permission
2. Opens CustomerHome
3. Console shows: "⚠️ Location permission not granted - cannot save location"
4. No errors, app continues normally ✅

## 🎉 RESULT

Now every time a user accesses CustomerHome (whether through login or direct access with existing session), their current location will be saved to the database for accurate advertisement targeting!
