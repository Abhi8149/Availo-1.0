# Google OAuth Setup Guide

## 🔧 Setting up Google OAuth for ShopStatus

### 1. **Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google+ API** and **Google OAuth2 API**

### 2. **Configure OAuth Consent Screen**
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required fields:
   - App name: `ShopStatus`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes: `email`, `profile`, `openid`
5. Save and continue

### 3. **Create OAuth Credentials**
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Add authorized redirect URIs:
   - For development: `https://auth.expo.io/@your-username/shop-status`
   - For production: Your app's redirect URI
5. Save and copy the **Client ID** and **Client Secret**

### 4. **Configure Environment Variables**
Create a `.env.local` file in your project root:

```env
CONVEX_DEPLOYMENT=your_convex_deployment
EXPO_PUBLIC_CONVEX_URL=your_convex_url

# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### 5. **Update app.json (Optional)**
Add Google configuration to your `app.json`:

```json
{
  "expo": {
    "scheme": "shopstatus",
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

### 6. **Test the Integration**
1. Start your development server: `npm start`
2. Try signing in with Google on both login and register screens
3. The app will automatically create user accounts for new Google users

## 🎯 **Features Included:**

### **Login Screen:**
- **Email/Password login** (existing users)
- **Google Sign-In button** with proper styling
- **Automatic account creation** for new Google users
- **Role selection** for first-time Google users

### **Register Screen:**
- **Manual registration** with role selection
- **Google Sign-Up button** 
- **Seamless integration** with existing flow

## 🔒 **Security Notes:**
- Client secrets should be kept secure
- Use environment variables for sensitive data
- Consider implementing proper password hashing for production
- Add rate limiting for authentication endpoints

## 🚀 **Ready to Use!**
Once configured, users can:
1. **Sign in with existing accounts** (email/password)
2. **Sign up with Google** (automatic account creation)
3. **Choose their role** (shopkeeper/customer) on first Google sign-in
4. **Seamless experience** across all authentication methods