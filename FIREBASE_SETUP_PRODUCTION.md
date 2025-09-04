# Firebase Configuration for OneSignal (Production)

## Step 1: Get google-services.json
1. Go to https://console.firebase.google.com
2. Create project or use existing: "GoShop"
3. Add Android app:
   - Package name: com.shopstatus.app
   - App nickname: GoShop
4. Download google-services.json
5. Place it in your project root folder

## Step 2: Configure OneSignal with Firebase
1. Go to OneSignal dashboard
2. Settings → Platforms → Google Android (FCM)
3. Upload the google-services.json file
4. Save configuration

## Step 3: Set Production Mode
✅ Already updated in app.json:
- OneSignal plugin mode set to "production"

## Step 4: Environment Variables
✅ Already configured in .env.production:
- EXPO_PUBLIC_ONESIGNAL_APP_ID
- EXPO_PUBLIC_ONESIGNAL_REST_API_KEY

## Step 5: Convex Environment Variables
Add these to your Convex production environment:
- ONESIGNAL_APP_ID=3de46348-ec6d-4e68-8a4c-81536e45c73c
- ONESIGNAL_REST_API_KEY=os_v2_app_hxsggshmnvhgrcsmqfjw4rohhsqkzpm3jujusr4susrsp5janrsm6xhcx23tsyt63wopr44ycrxp6mnzpjhe3z2hdiwmjg5cktuwnfy
