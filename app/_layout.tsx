// app/_layout.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { View } from 'react-native';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from "expo-router";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { OneSignalService } from "../services/oneSignalService";
import { Linking } from 'react-native'; // Add this import
import { router } from 'expo-router'; // Add this import

// Safely get Convex URL with error handling
const getConvexUrl = () => {
  const url = process.env.EXPO_PUBLIC_CONVEX_URL;
  if (!url) {
    console.error('❌ EXPO_PUBLIC_CONVEX_URL is not configured');
    throw new Error('Missing required environment variable: EXPO_PUBLIC_CONVEX_URL');
  }
  return url;
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
        // Reduced delay to prevent hanging
        setTimeout(() => handleDeepLink(url), 300);
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
      {/* StatusBar always visible, matching notification modal */}
      <StatusBar style="dark" backgroundColor="#FAFAFA" translucent={false} />
      <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <ConvexProvider client={convex}>
          <Stack screenOptions={{ headerShown: false }} />
        </ConvexProvider>
      </View>
    </ErrorBoundary>
  );
}