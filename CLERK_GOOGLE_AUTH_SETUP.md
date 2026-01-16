# Clerk Google Authentication Setup Guide

## ✅ What's Been Implemented

### 1. **Clerk SDK Integration**
- Installed `@clerk/clerk-expo` package
- Integrated `ClerkProvider` in `app/_layout.tsx`
- Added secure token caching with `expo-secure-store`

### 2. **Components Created**
- **GoogleSignInButton.tsx**: Google OAuth button with Clerk integration
- **RoleSelectionModal.tsx**: Beautiful modal for customer/shopkeeper selection
- **Updated LoginScreen.tsx**: Added Google Sign-In with role selection flow

### 3. **Backend (Convex)**
- **New Mutation**: `handleGoogleOAuthUser` in `convex/users.ts`
  - Handles new user creation
  - Links existing users by email
  - Stores Clerk user ID
  - Requires role selection for new users
- **Schema Update**: Added `clerkUserId` field to users table

### 4. **Authentication Flow**
```
User clicks "Continue with Google"
    ↓
Clerk OAuth popup (Google login)
    ↓
Check if user exists in Convex
    ↓
├─ Existing user → Login directly
└─ New user → Show role selection modal
              ↓
         User selects role (Customer/Shopkeeper)
              ↓
         Create user in Convex with selected role
              ↓
         Complete login
```

---

## 🔧 Setup Instructions

### Step 1: Get Clerk Publishable Key

1. Go to your Clerk Dashboard: https://dashboard.clerk.com
2. Select your application (or create a new one)
3. Navigate to **API Keys** in the sidebar
4. Copy the **Publishable Key** (starts with `pk_test_` or `pk_live_`)

### Step 2: Configure Environment Variables

Add to your `.env.local` file:
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

**Note**: Already added to `.env.example` template

### Step 3: Configure Google OAuth in Clerk Dashboard

1. In Clerk Dashboard, go to **User & Authentication** → **Social Connections**
2. Click **Add OAuth provider**
3. Select **Google**
4. You'll see instructions to:
   - Create OAuth credentials in Google Cloud Console
   - Add redirect URIs for Clerk
   - Copy Client ID and Client Secret to Clerk

### Step 4: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable **Google+ API** (if not already enabled)
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen:
   - App name: "GoShop"
   - User support email: your email
   - Developer contact: your email
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "GoShop - Clerk"
   - Authorized redirect URIs: Copy from Clerk dashboard (usually looks like `https://your-clerk-app.clerk.accounts.dev/v1/oauth_callback`)
7. Copy **Client ID** and **Client Secret**
8. Paste them into Clerk Dashboard

### Step 5: Test the Integration

1. Push schema changes to Convex:
   ```bash
   npx convex dev
   ```

2. Add your Clerk key to `.env.local`

3. Start your app:
   ```bash
   npx expo start
   ```

4. Test the flow:
   - Tap "Continue with Google"
   - Sign in with Google account
   - If new user: Select role (Customer/Shopkeeper)
   - Should redirect to appropriate dashboard

---

## 🎨 Features Included

### Role Selection Modal
- Beautiful, modern UI
- Clear distinction between Customer and Shopkeeper roles
- Icon-based visual design
- Can't be dismissed (must select a role)

### Google Sign-In Button
- Matches your app's design system
- Shows loading state
- Google logo included
- Error handling

### Seamless Integration
- Works alongside existing email/password login
- OneSignal integration maintained
- Location services maintained
- Same user profile structure

---

## 📱 User Experience

### For New Users (Google Sign-In)
1. Click "Continue with Google"
2. Select Google account
3. Choose role: Customer or Shopkeeper
4. Automatically logged in
5. Redirect to appropriate dashboard

### For Existing Users
1. Click "Continue with Google"
2. Select Google account
3. Automatically logged in (no role selection)
4. Redirect to dashboard based on existing role

### For Email Users
- Can continue using email/password login
- Can later link Google account in settings (future feature)

---

## 🔐 Security Features

- ✅ Secure token caching with `expo-secure-store`
- ✅ Clerk handles OAuth flow securely
- ✅ No passwords stored for OAuth users
- ✅ Clerk user ID stored separately from internal user ID
- ✅ Email verification handled by Google

---

## 🐛 Troubleshooting

### "Missing Clerk Publishable Key" Error
- Ensure `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is in `.env.local`
- Restart Metro bundler after adding env variable
- Check key format: should start with `pk_test_` or `pk_live_`

### Google Sign-In Button Not Working
- Verify Google OAuth is enabled in Clerk Dashboard
- Check redirect URIs are correctly set in Google Cloud Console
- Ensure Clerk app is in "Development" or "Production" mode (not paused)

### Role Modal Not Showing
- Check browser console for errors
- Verify `handleGoogleOAuthUser` mutation exists in Convex
- Ensure schema has been pushed to Convex

### "User Already Exists" Error
- This is normal for existing email users
- User will be linked automatically by email
- Their existing role is preserved

---

## 📊 Testing Checklist

- [ ] Google Sign-In button appears on login screen
- [ ] Clicking button opens Google OAuth popup
- [ ] Selecting Google account completes authentication
- [ ] New users see role selection modal
- [ ] Selecting "Customer" creates customer account
- [ ] Selecting "Shopkeeper" creates shopkeeper account
- [ ] Existing users skip role selection
- [ ] User profile includes Google photo
- [ ] OneSignal integration works
- [ ] Location permissions work
- [ ] Redirects to correct dashboard

---

## 🚀 Next Steps

### Optional Enhancements
1. **Profile Settings**
   - Allow users to change role (with confirmation)
   - Link/unlink Google account
   - View connected accounts

2. **Additional OAuth Providers**
   - Apple Sign-In (required for iOS)
   - Facebook Login
   - GitHub Login (for developers)

3. **Multi-Account Support**
   - Single Google account with multiple roles
   - Switch between customer/shopkeeper modes

4. **Enhanced Security**
   - Two-factor authentication
   - Login activity log
   - Device management

---

## 📝 Files Modified

### New Files
- `components/auth/GoogleSignInButton.tsx`
- `components/auth/RoleSelectionModal.tsx`

### Modified Files
- `app/_layout.tsx` - Added ClerkProvider wrapper
- `components/auth/LoginScreen.tsx` - Integrated Google Sign-In
- `convex/users.ts` - Added handleGoogleOAuthUser mutation
- `convex/schema.ts` - Added clerkUserId field
- `.env.example` - Added Clerk key template

---

## 🔗 Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Expo Setup](https://clerk.com/docs/quickstarts/expo)
- [Google OAuth Setup](https://clerk.com/docs/authentication/social-connections/google)
- [Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/securestore/)

---

## ✨ Summary

Your app now supports:
- ✅ Google OAuth authentication via Clerk
- ✅ Role selection for new users
- ✅ Seamless integration with existing auth system
- ✅ Secure token management
- ✅ Beautiful, modern UI components

All you need to do is:
1. Get your Clerk publishable key
2. Add it to `.env.local`
3. Configure Google OAuth in Clerk Dashboard
4. Test the flow!
