# PUSH NOTIFICATION TROUBLESHOOTING & FIXES

## ❌ IDENTIFIED ISSUES

### **1. OneSignal Configuration Issues**
- ❌ Missing OneSignal App ID in app.json extra config
- ❌ Inconsistent environment variable usage
- ❌ Missing detailed error logging

### **2. Player ID Collection Issues**
- ❌ OneSignal player IDs may not be properly captured during login
- ❌ Users may not have push notifications enabled
- ❌ Location data may be missing for users

### **3. API Call Issues**
- ❌ OneSignal REST API errors not properly logged
- ❌ Invalid player ID formats
- ❌ Network/credential issues

## ✅ FIXES APPLIED

### **1. Fixed app.json Configuration**
```json
{
  "plugins": [
    [
      "onesignal-expo-plugin",
      {
        "mode": "production",
        "devTeam": "47J7RWYXLY"
      }
    ]
  ],
  "extra": {
    "EXPO_PUBLIC_ONESIGNAL_APP_ID": "3de46348-ec6d-4e68-8a4c-81536e45c73c"
  }
}
```

### **2. Enhanced Error Logging in advertisements.ts**
```typescript
console.log('🔐 OneSignal Config Check:', {
  hasAppId: !!oneSignalAppId,
  appIdPreview: oneSignalAppId ? oneSignalAppId.substring(0, 8) + '...' : 'MISSING',
  hasRestApiKey: !!oneSignalRestApiKey,
  playerIdsCount: playerIds.length,
  playerIds: playerIds
});

console.log('📤 Sending OneSignal notification:', {
  app_id: oneSignalAppId,
  playerIds: playerIds,
  title: title,
  message: message
});

console.log('📨 OneSignal Response:', {
  status: response.status,
  ok: response.ok,
  result: result
});
```

### **3. Improved User Filtering with Logging**
Added detailed logging in `getNearbyUsers` to track:
- How many users have push notifications enabled
- Distance calculations for each user
- OneSignal player ID validation

### **4. Created Debug Panel**
Added `PushNotificationDebugPanel.tsx` to help diagnose issues:
- Shows all users and their OneSignal status
- Displays location and push notification settings
- Allows testing push notifications

## 🔧 DEBUGGING STEPS

### **Step 1: Check User OneSignal Setup**
1. Use the debug panel or run this in Convex dashboard:
```javascript
// In Convex dashboard, run this query
api.users.debugOneSignalUsers()
```

2. Verify users have:
   - ✅ OneSignal player ID
   - ✅ Location data (lat/lng)
   - ✅ Push notifications enabled
   - ✅ Role set to "customer"

### **Step 2: Check Environment Variables**
Verify in Convex dashboard environment variables:
```bash
ONESIGNAL_APP_ID=3de46348-ec6d-4e68-8a4c-81536e45c73c
ONESIGNAL_REST_API_KEY=os_v2_app_hxsggshmnvhgrcsmqfjw4rohhsqkzpm3jujusr4susrsp5janrsm6xhcx23tsyt63wopr44ycrxp6mnzpjhe3z2hdiwmjg5cktuwnfy
```

### **Step 3: Test Advertisement Creation**
1. Create an advertisement
2. Check console logs for:
   - "🔐 OneSignal Config Check" - Should show valid credentials
   - "👥 All users with push enabled" - Should show > 0 users
   - "🎯 Nearby users found" - Should show users within radius
   - "📤 Sending OneSignal notification" - Should show valid player IDs
   - "📨 OneSignal Response" - Should show success response

### **Step 4: Common Issues & Solutions**

#### **Issue: "No nearby users found"**
```typescript
// Solution: Check user location and push settings
const users = await ctx.runQuery(api.users.debugOneSignalUsers);
console.log(users);
```

#### **Issue: "OneSignal credentials not configured"**
```bash
# Solution: Set environment variables in Convex dashboard
ONESIGNAL_APP_ID=your_app_id
ONESIGNAL_REST_API_KEY=your_rest_api_key
```

#### **Issue: "Invalid player IDs"**
```typescript
// Solution: Check OneSignal initialization in app
// Ensure OneSignal.initialize() is called properly
OneSignal.initialize("3de46348-ec6d-4e68-8a4c-81536e45c73c");
```

#### **Issue: "API error 400/401"**
- Check OneSignal App ID matches in all places
- Verify REST API key is correct
- Ensure player IDs are valid UUIDs

## 🧪 TESTING PROCEDURE

### **Test 1: Debug Panel Check**
1. Add debug panel to your app temporarily
2. Check user OneSignal status
3. Verify all required data is present

### **Test 2: Manual OneSignal Test**
1. Go to OneSignal dashboard
2. Send test notification to specific player IDs
3. Verify notifications appear on device

### **Test 3: Advertisement Test**
1. Create advertisement with detailed logging
2. Check all console outputs
3. Verify notifications appear

### **Test 4: Production Environment**
1. Ensure all environment variables are set
2. Test on physical device (not simulator)
3. Check notification permissions are granted

## 🎯 EXPECTED RESULTS

After fixes, you should see:
1. ✅ Console logs showing valid OneSignal config
2. ✅ Users found with valid player IDs
3. ✅ Successful OneSignal API response
4. ✅ Push notifications appearing on devices

## 🚨 IMPORTANT NOTES

1. **Simulators**: Push notifications don't work on iOS simulators
2. **Permissions**: Users must grant notification permissions
3. **Background App**: App must be in background/closed to see push notifications
4. **Network**: Ensure device has internet connection
5. **OneSignal Dashboard**: Check for any API limits or issues

Use the enhanced logging to identify exactly where the issue occurs and follow the debugging steps to resolve it!
