# Clerk OAuth Configuration Fix Guide

## Error: `api_response_error` - OAuth Configuration Issue

This error occurs when Clerk can't complete the OAuth flow, usually due to misconfiguration in either Clerk Dashboard or Google Cloud Console.

---

## 🔧 Step-by-Step Fix

### Step 1: Verify Clerk Dashboard Configuration

1. **Go to Clerk Dashboard**: https://dashboard.clerk.com

2. **Select Your Application**
   - Make sure you're in the correct application (test or production)
   - Note: Your test key is `pk_test_c2hhcmluZy1zdGFyZmlzaC04Ny5jbGVyay5hY2NvdW50cy5kZXYk`
   - This means your Clerk domain is: `sharing-starfish-87.clerk.accounts.dev`

3. **Check Application Mode**
   - Navigate to **Settings** → **General**
   - Check if the application is active (not paused or suspended)
   - Verify the environment (Development/Staging/Production)

### Step 2: Configure Google OAuth Provider

1. **Navigate to Social Connections**
   ```
   Clerk Dashboard → User & Authentication → Social Connections
   ```

2. **Enable Google Provider**
   - Click on **Google** provider
   - Toggle it **ON** (should be blue/enabled)
   - Click **Configure** or **Settings**

3. **Verify Redirect URI**
   - You should see the Clerk redirect URI listed:
     ```
     https://sharing-starfish-87.clerk.accounts.dev/v1/oauth_callback
     ```
   - **COPY THIS EXACT URL** - you'll need it for Google Cloud Console

### Step 3: Configure Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials

2. **Select or Create Project**
   - If you don't have a project, create one named "GoShop"
   - Select the project from the dropdown

3. **Enable Required APIs**
   - Go to **APIs & Services** → **Library**
   - Search for and enable:
     - **Google+ API** (or **People API**)
     - **Google Identity Services**

4. **Configure OAuth Consent Screen**
   ```
   APIs & Services → OAuth consent screen
   ```
   
   Fill in:
   - **App name**: GoShop
   - **User support email**: Your email
   - **App domain** (optional):
     - Homepage: https://shopstatus.live (or your domain)
   - **Authorized domains**: 
     - `clerk.accounts.dev`
     - `clerk.dev`
   - **Developer contact**: Your email
   
   **Scopes** (add these):
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   
   **Test users** (if in testing mode):
   - Add your Google email addresses that will test the app

5. **Create OAuth 2.0 Client ID**
   ```
   APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   ```
   
   Configuration:
   - **Application type**: Web application
   - **Name**: GoShop - Clerk
   
   **Authorized JavaScript origins**: (Add these)
   ```
   https://sharing-starfish-87.clerk.accounts.dev
   https://clerk.dev
   ```
   
   **Authorized redirect URIs**: (Add BOTH)
   ```
   https://sharing-starfish-87.clerk.accounts.dev/v1/oauth_callback
   https://accounts.clerk.dev/v1/oauth_callback
   ```

6. **Copy Credentials**
   - After creating, you'll get:
     - **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
     - **Client Secret** (random string)
   - **Keep these safe!**

### Step 4: Link Google to Clerk

1. **Return to Clerk Dashboard**
   - Go back to: **User & Authentication** → **Social Connections** → **Google**

2. **Paste Google Credentials**
   - **Client ID**: Paste the Client ID from Google Cloud Console
   - **Client Secret**: Paste the Client Secret
   - Click **Save**

3. **Verify Configuration**
   - Google should now show as **Enabled** with a green checkmark
   - Test connection if there's a test button

### Step 5: Update App Configuration (if needed)

Your current `.env.local` has:
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c2hhcmluZy1zdGFyZmlzaC04Ny5jbGVyay5hY2NvdW50cy5kZXYk
```

**Verify this matches your Clerk Dashboard:**
1. Go to **API Keys** in Clerk Dashboard
2. Copy the **Publishable Key** (test or live)
3. Make sure it matches your `.env.local`

**If you need to switch between test and production:**

For **Test/Development**:
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c2hhcmluZy1zdGFyZmlzaC04Ny5jbGVyay5hY2NvdW50cy5kZXYk
```

For **Production** (when ready):
```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuc2hvcHN0YXR1cy5saXZlJA
```

### Step 6: Restart and Test

1. **Clear Metro bundler cache**
   ```bash
   npx expo start --clear
   ```

2. **Test the OAuth flow**
   - Open your app
   - Try "Continue with Google"
   - Should redirect to Google login
   - Should complete successfully

---

## 🐛 Additional Troubleshooting

### Error Persists?

**Check 1: OAuth Consent Screen Status**
- If it's in "Testing" mode, only test users can sign in
- Add your email to test users, OR
- Publish the OAuth consent screen for production use

**Check 2: Redirect URI Mismatch**
- Error: `redirect_uri_mismatch`
- Solution: Ensure redirect URIs in Google Console **exactly match** Clerk's URIs
- They are case-sensitive and must include `https://`

**Check 3: API Not Enabled**
- Error: `access_denied` or `API not enabled`
- Solution: Enable Google+ API or People API in Google Cloud Console

**Check 4: Client ID/Secret Wrong**
- Error: `invalid_client`
- Solution: Re-copy Client ID and Secret from Google Console to Clerk

**Check 5: Clerk App Suspended**
- Check Clerk Dashboard for any warnings or suspension notices
- Verify billing is active (if on paid plan)

### Debug Mode

Enable more verbose logging in your app:

1. Open [GoogleSignInButton.tsx](components/auth/GoogleSignInButton.tsx)
2. The comprehensive error logging is already implemented (lines 67-111)
3. Check your terminal/console for detailed error output when testing

Look for:
- `Error Code:` - tells you the specific error type
- `Clerk Error Code:` - Clerk-specific error details
- `Full Error Object:` - complete error data

### Common Error Codes

| Error Code | Meaning | Fix |
|------------|---------|-----|
| `api_response_error` | Clerk API configuration issue | Check Google OAuth setup in Clerk |
| `oauth_callback_invalid` | Redirect URI mismatch | Update redirect URIs in Google Console |
| `invalid_client` | Wrong Client ID/Secret | Re-enter credentials in Clerk |
| `access_denied` | User denied access or API disabled | Enable APIs in Google Console |
| `redirect_uri_mismatch` | Redirect URI doesn't match | Copy exact URI from Clerk to Google |

---

## ✅ Verification Checklist

Before testing again, verify:

- [ ] Google OAuth is **ENABLED** in Clerk Dashboard (toggle is ON)
- [ ] Client ID and Secret are pasted in Clerk
- [ ] Redirect URIs in Google Console include `https://sharing-starfish-87.clerk.accounts.dev/v1/oauth_callback`
- [ ] Authorized domains include `clerk.accounts.dev`
- [ ] Google+ API or People API is enabled
- [ ] OAuth consent screen is configured
- [ ] Test users are added (if in testing mode)
- [ ] Clerk publishable key in `.env.local` matches dashboard
- [ ] Metro bundler restarted after env changes
- [ ] No typos in any URLs or credentials

---

## 🚀 Testing the Fix

1. **Restart your development server**
   ```bash
   npx expo start --clear
   ```

2. **Open app and test**
   - Click "Continue with Google"
   - Should redirect to Google login page
   - Select your Google account
   - Should redirect back to app successfully
   - New users should see role selection

3. **Check logs**
   - Terminal should show: `✅ OAuth session created`
   - Should NOT show `❌ GOOGLE SIGN-IN ERROR CAUGHT`

---

## 📞 Still Need Help?

If error persists after following all steps:

1. **Check Clerk Status**: https://status.clerk.com
2. **Review Clerk Logs**: Dashboard → Logs → Authentication
3. **Copy full error details** from terminal and check Clerk documentation
4. **Contact Clerk Support**: Include your error code and app ID

---

## 🔗 Quick Links

- [Clerk Dashboard](https://dashboard.clerk.com)
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- [Clerk OAuth Docs](https://clerk.com/docs/authentication/social-connections/google)
- [Your Clerk App Domain](https://sharing-starfish-87.clerk.accounts.dev)

---

**Last Updated**: January 6, 2026
