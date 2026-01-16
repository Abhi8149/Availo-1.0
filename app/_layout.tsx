// app/_layout.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { View } from 'react-native';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from "expo-router";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { OneSignalService } from "../services/oneSignalService";
import { Linking } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

// Complete auth session immediately on app load
WebBrowser.maybeCompleteAuthSession();

// Safely get Convex URL with error handling
const getConvexUrl = () => {
  const url = process.env.EXPO_PUBLIC_CONVEX_URL;
  if (!url) {
    console.error('❌ EXPO_PUBLIC_CONVEX_URL is not configured');
    throw new Error('Missing required environment variable: EXPO_PUBLIC_CONVEX_URL');
  }
  return url;
};

// Get Clerk publishable key
const getClerkPublishableKey = () => {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) {
    console.error('❌ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured');
    throw new Error('Missing required environment variable: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
  }
  return key;
};

// Token cache for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const convex = new ConvexReactClient(getConvexUrl(), {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  useEffect(() => {
    // Initialize OneSignal
    console.log('🚀 Root layout mounting - initializing OneSignal...');
    OneSignalService.initialize();

    // Deep link handler
    const handleDeepLink = (url: string) => {
      console.log('🔗 Deep link received:', url);
      
      try {
        // Handle OAuth callback URLs - navigate to home instead of showing error
        if (url.includes('oauth-native-callback') || 
            url.includes('oauth-callback') || 
            url.includes('oauth') ||
            url === 'goshop://' ||
            url === 'goshop:///' ||
            url.includes('clerk')) {
          console.log('✅ OAuth callback detected - navigating to home');
          console.log('📋 Full OAuth URL:', url);
          
          // Extract and log session ID if present
          const sessionMatch = url.match(/created_session_id=([^&]+)/);
          if (sessionMatch) {
            console.log('✅ Session ID found:', sessionMatch[1]);
          }
          
          // Navigate to home - the LoginScreen will handle the rest
          setTimeout(() => {
            router.replace('/');
          }, 100);
          return;
        }
        
        // Handle advertisement deep links
        if (url.startsWith('goshop://advertisement/')) {
          const advertisementId = url.replace('goshop://advertisement/', '');
          console.log('📱 Opening advertisement:', advertisementId);
          
          // Set the global variable immediately
          (global as typeof globalThis & { pendingAdvertisementId?: string }).pendingAdvertisementId = advertisementId;
          
          // Navigate to home page
          router.replace('/');
          
          console.log('✅ Advertisement ID set and navigation triggered');
        }
      } catch (error) {
        console.error('❌ Error handling deep link:', error);
      }
    };

    // Listen for deep links when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('🔗 URL event received:', event.url);
      handleDeepLink(event.url);
    });

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 Initial URL found:', url);
        handleDeepLink(url);
      }
    }).catch((error) => {
      console.error('❌ Error getting initial URL:', error);
    });

    return () => {
      console.log('🧹 Cleaning up deep link subscription');
      subscription?.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <ClerkProvider 
        publishableKey={getClerkPublishableKey()} 
        tokenCache={tokenCache}
      >
        {/* StatusBar always visible, matching notification modal */}
        <StatusBar style="dark" backgroundColor="#FAFAFA" translucent={false} />
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
          <ConvexProvider client={convex}>
            <ClerkLoaded>
              <Stack screenOptions={{ headerShown: false }} />
            </ClerkLoaded>
          </ConvexProvider>
        </View>
      </ClerkProvider>
    </ErrorBoundary>
  );
}