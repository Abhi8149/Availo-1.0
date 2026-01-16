# 🔧 Clerk OAuth - Final Fix for api_response_error

## Issue Identified

Your app uses custom scheme `goshop://` but Clerk OAuth wasn't properly configured to handle the redirect back to your native app.

## ✅ What I Just Fixed

### 1. Updated `app.json` - Added Clerk OAuth Handlers

**Android** - Added intent filter for Clerk callback:
```json
{
  "action": "VIEW",
  "autoVerify": true,
  "data": [
    {
      "scheme": "https",
      "host": "sharing-starfish-87.clerk.accounts.dev",
      "pathPrefix": "/oauth-callback"
    }
  ],
  "category": ["BROWSABLE", "DEFAULT"]
}
```

**iOS** - Added associated domains:
```json
"associatedDomains": [
  "applinks:sharing-starfish-87.clerk.accounts.dev"
]
```

---

## 🚀 Required Steps - YOU MUST DO THIS

### Step 1: Restart Development Server

Clear everything and restart:
```bash
npx expo start --clear
```

### Step 2: **CRITICAL** - Add Mobile Redirect URIs to Google Cloud Console

This is likely what's missing! You need to add **BOTH web AND mobile** redirect URIs:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID (GoShop - Clerk)
3. Under **Authorized redirect URIs**, add **ALL** of these:

```
https://sharing-starfish-87.clerk.accounts.dev/v1/oauth_callback
https://sharing-starfish-87.clerk.accounts.dev/v1/oauth-native-callback
https://clerk.sharing-starfish-87.clerk.accounts.dev/v1/oauth_callback
https://accounts.clerk.dev/v1/oauth_callback
goshop://oauth-callback
goshop://
```

4. Click **Save**

### Step 3: Verify Clerk Dashboard Settings

1. Go to https://dashboard.clerk.com
2. Navigate to: **User & Authentication** → **Social Connections** → **Google**
3. Click **Configure** or **Settings**
4. Look for **"Redirect URLs"** or **"Callback URLs"**
5. You should see something like:
   ```
   https://sharing-starfish-87.clerk.accounts.dev/v1/oauth_callback
   ```
6. Copy this EXACT URL to Google Cloud Console (Step 2 above)

### Step 4: Check OAuth Consent Screen Status

1. In Google Cloud Console: **APIs & Services** → **OAuth consent screen**
2. Check the **Publishing status**:
   - If **"Testing"**: Add your email to **Test users** list
   - If **"In production"**: You're good to go
3. If in Testing mode and you haven't added test users:
   - Click **"ADD USERS"** under Test users section
   - Add your Google email address
   - Click **Save**

### Step 5: Rebuild Your App (For Production APK)

If you're testing on a production APK:
```bash
# For development build
eas build --profile development --platform android

# For production build
eas build --profile production --platform android
```

For Expo Go (development):
```bash
npx expo start --clear
```

---

## 🧪 Testing the Fix

1. **Clear app data** (if on physical device):
   - Go to Settings → Apps → Availo → Storage → Clear Data

2. **Open the app fresh**

3. **Click "Continue with Google"**

4. **Watch the terminal logs**:
   - Look for: `✅ OAuth session created`
   - Should NOT see: `❌ api_response_error`

5. **Complete the flow**:
   - Select Google account
   - Grant permissions
   - Should redirect back to app successfully

---

## 🔍 Why This Happens

### The Problem
When you click "Continue with Google":
1. App opens browser/webview
2. User logs in with Google
3. Google redirects to Clerk: `https://sharing-starfish-87.clerk.accounts.dev/v1/oauth_callback`
4. Clerk processes auth
5. **Clerk tries to redirect back to your app**
6. ❌ **This is where it fails** if redirect URIs aren't configured

### The Solution
- Added intent filters (Android) and associated domains (iOS) so your app can receive the redirect
- Added native callback URLs to Google Cloud Console
- This allows Clerk to properly redirect back to your app after authentication

---

## 🐛 Additional Troubleshooting

### Still Getting `api_response_error`?

**Check 1: Verify Redirect URIs Match**
```bash
# In terminal, run this to see your Clerk domain
echo "Your Clerk domain: sharing-starfish-87.clerk.accounts.dev"
```

Make sure ALL redirect URIs in Google Cloud Console include this domain.

**Check 2: Check Clerk Logs**
1. Go to Clerk Dashboard
2. Click **Logs** in sidebar
3. Look for recent OAuth attempts
4. Check for any error messages

**Check 3: Verify Environment**
```bash
# Check if key is loaded
npx expo start --clear

# In the terminal output, look for:
# ✅ Using Clerk publishable key: pk_test_...
```

**Check 4: Test with Different Google Account**
- Try signing in with a different Google account
- If one works and another doesn't, it's an OAuth consent screen test user issue

**Check 5: Check Network**
- Some corporate networks block OAuth redirects
- Try on mobile data instead of WiFi
- Try on a different network

---

## 📱 Platform-Specific Notes

### For Android Development (Expo Go)
- The fix in `app.json` will be picked up automatically
- Just restart Metro: `npx expo start --clear`

### For Android Production APK
- Must rebuild after changing `app.json`
- Run: `eas build --profile production --platform android`

### For iOS
- Associated domains require proper provisioning
- For development, may work without rebuild
- For production, must rebuild with updated config

---

## ✅ Expected Behavior After Fix

When you click "Continue with Google":

1. ✅ Browser/WebView opens with Google login
2. ✅ You select Google account
3. ✅ Google asks for permission (first time)
4. ✅ Redirects to Clerk
5. ✅ **App automatically comes back to foreground**
6. ✅ Login completes successfully
7. ✅ New users see role selection modal
8. ✅ Redirects to dashboard

**Logs you should see:**
```
🔐 Starting Google OAuth flow...
📝 OAuth result: { createdSessionId: 'sess_...', ... }
✅ OAuth session created: sess_...
✅ Session activated
```

---

## 🆘 If Still Not Working

1. **Copy the FULL error from terminal**
   - Look for the section: `❌ GOOGLE SIGN-IN ERROR CAUGHT`
   - Copy all the error details

2. **Check these specific fields**:
   - `Error Code:` 
   - `Error Message:`
   - `Clerk Error Code:`

3. **Common error codes after this fix**:
   - `redirect_uri_mismatch` → URIs in Google Console don't match
   - `invalid_client` → Wrong Client ID/Secret in Clerk
   - `access_denied` → User not in test users list (if OAuth is in Testing)

---

## 📞 Need More Help?

If the error persists, share:
1. The exact error code from the terminal
2. Screenshot of your Google Cloud Console redirect URIs
3. Screenshot of your Clerk Dashboard Google settings
4. Whether you're testing on Expo Go or production APK

---

**Last Updated**: January 6, 2026
**Your Clerk Domain**: `sharing-starfish-87.clerk.accounts.dev`
**Your App Scheme**: `goshop://`
